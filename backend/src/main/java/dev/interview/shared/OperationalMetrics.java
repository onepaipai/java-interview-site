package dev.interview.shared;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.LongAdder;
import org.springframework.stereotype.Component;

/** Bounded, aggregate operational counters; no prompts, keys or user identifiers. */
@Component
public class OperationalMetrics {

  private final Map<String, LongAdder> values = new ConcurrentHashMap<>();

  public void increment(String name) {
    add(name, 1);
  }

  public void add(String name, long amount) {
    values.computeIfAbsent(name, k -> new LongAdder()).add(amount);
  }

  public Map<String, Long> snapshot() {
    var result = new TreeMap<String, Long>();
    values.forEach((key, value) -> result.put(key, value.sum()));
    return Collections.unmodifiableMap(result);
  }
}
