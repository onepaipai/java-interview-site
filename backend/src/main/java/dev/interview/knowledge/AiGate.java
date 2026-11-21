package dev.interview.knowledge;

import static org.springframework.http.HttpStatus.*;

import dev.interview.shared.OperationalMetrics;
import java.security.Principal;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** A single-node admission boundary for both chat and embedding work. */
@Component
public class AiGate {

  private final Semaphore slots;
  private final Set<String> active = ConcurrentHashMap.newKeySet();
  private final Map<String, Deque<Long>> usage = new HashMap<>();
  private final int requestsPerHour;
  private final OperationalMetrics metrics;

  public AiGate(
    @Value("${app.ai.requests-per-hour:30}") int requestsPerHour,
    @Value("${app.ai.max-concurrent:2}") int maxConcurrent,
    OperationalMetrics metrics
  ) {
    if (requestsPerHour < 1) throw new IllegalArgumentException("AI 请求额度必须为正数");
    if (maxConcurrent < 1) throw new IllegalArgumentException("AI 并发槽位必须为正数");
    this.slots = new Semaphore(maxConcurrent);
    this.requestsPerHour = requestsPerHour;
    this.metrics = metrics;
  }

  private synchronized void reserve(String name) {
    long now = System.nanoTime(),
      cutoff = now - TimeUnit.HOURS.toNanos(1);
    usage.values().forEach(queue -> {
      while (!queue.isEmpty() && queue.peekFirst() < cutoff) queue.removeFirst();
    });
    usage.entrySet().removeIf(entry -> entry.getValue().isEmpty());
    if (!usage.containsKey(name) && usage.size() >= 10000) throw new ResponseStatusException(
      TOO_MANY_REQUESTS,
      "AI 额度记录已满，请稍后重试"
    );
    var queue = usage.computeIfAbsent(name, k -> new ArrayDeque<>());
    if (queue.size() >= requestsPerHour) throw new ResponseStatusException(
      TOO_MANY_REQUESTS,
      "本账号已达到每小时 AI 请求额度"
    );
    queue.addLast(now);
  }

  public <T> T execute(Principal user, Supplier<T> work) {
    String name = user.getName();
    if (!active.add(name)) {
      metrics.increment("ai.rejected.concurrent");
      throw new ResponseStatusException(TOO_MANY_REQUESTS, "已有 AI 请求正在处理，请稍后重试");
    }
    boolean acquired = slots.tryAcquire();
    long start = System.nanoTime();
    boolean reserved = false;
    try {
      if (!acquired) {
        metrics.increment("ai.rejected.busy");
        throw new ResponseStatusException(TOO_MANY_REQUESTS, "AI 服务繁忙，请稍后重试");
      }
      reserve(name);
      reserved = true;
      metrics.increment("ai.accepted");
      T result = work.get();
      metrics.increment("ai.succeeded");
      return result;
    } catch (ResponseStatusException e) {
      metrics.increment("ai.status." + e.getStatusCode().value());
      refundOnFailure(name, reserved);
      throw e;
    } catch (RuntimeException e) {
      metrics.increment("ai.failed");
      refundOnFailure(name, reserved);
      throw e;
    } finally {
      metrics.add("ai.duration.nanos", System.nanoTime() - start);
      if (acquired) slots.release();
      active.remove(name);
    }
  }

  /** 上游调用失败时退还本次预留，让模型故障不消耗用户每小时额度。 */
  private synchronized void refundOnFailure(String name, boolean reserved) {
    if (!reserved) return;
    var queue = usage.get(name);
    if (queue != null && !queue.isEmpty()) queue.removeLast();
    metrics.increment("ai.refunded");
  }

  public int availableSlots() {
    return slots.availablePermits();
  }
}
