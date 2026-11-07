package dev.interview.account;

import java.time.Clock;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Single-node brute-force throttle for login attempts, keyed by username plus source IP. A key is
 * locked out for {@code lockout} after {@code maxFailures} consecutive failures; the lockout is
 * fixed and does not extend while blocked, and successes reset the counter. Tracked keys are
 * capped so unbounded distinct sources cannot grow the map.
 */
@Component
public class LoginThrottle {

  static final int MAX_KEYS = 10_000;

  static final class Attempt {

    final AtomicInteger failures = new AtomicInteger();
    volatile long updated;
    volatile long blockedUntil;
  }

  private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();
  private final Clock clock;
  private final int maxFailures;
  private final long lockoutMillis;

  LoginThrottle(
    Clock clock,
    @Value("${app.login.max-failures:5}") int maxFailures,
    @Value("${app.login.lockout-minutes:15}") long lockoutMinutes
  ) {
    if (maxFailures < 1) throw new IllegalArgumentException("登录失败阈值必须为正数");
    if (lockoutMinutes < 1) throw new IllegalArgumentException("登录锁定时长必须为正数");
    this.clock = clock;
    this.maxFailures = maxFailures;
    this.lockoutMillis = Duration.ofMinutes(lockoutMinutes).toMillis();
  }

  boolean blocked(String username, String ip) {
    var attempt = attempts.get(key(username, ip));
    return attempt != null && clock.millis() < attempt.blockedUntil;
  }

  long retryAfterMillis(String username, String ip) {
    var attempt = attempts.get(key(username, ip));
    if (attempt == null) return 0;
    return Math.max(0, attempt.blockedUntil - clock.millis());
  }

  void recordFailure(String username, String ip) {
    var attempt = attempts.computeIfAbsent(key(username, ip), k -> {
      if (attempts.size() >= MAX_KEYS) return null;
      return new Attempt();
    });
    if (attempt == null) return;
    synchronized (attempt) {
      if (clock.millis() < attempt.blockedUntil) return;
      attempt.failures.incrementAndGet();
      attempt.updated = clock.millis();
      if (attempt.failures.get() >= maxFailures) attempt.blockedUntil =
        clock.millis() + lockoutMillis;
    }
  }

  void recordSuccess(String username, String ip) {
    attempts.remove(key(username, ip));
  }

  static String key(String username, String ip) {
    return (
      (username == null ? "" : username.strip().toLowerCase(java.util.Locale.ROOT)) +
      "|" +
      (ip == null ? "" : ip)
    );
  }
}
