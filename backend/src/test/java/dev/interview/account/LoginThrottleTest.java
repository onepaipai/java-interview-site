package dev.interview.account;

import static org.junit.jupiter.api.Assertions.*;

import java.time.*;
import org.junit.jupiter.api.Test;

class LoginThrottleTest {

  /** Controllable clock so lockout windows can be advanced deterministically. */
  static final class MutableClock extends Clock {

    private Instant instant = Instant.parse("2026-01-01T00:00:00Z");

    void advance(Duration d) {
      instant = instant.plus(d);
    }

    @Override
    public ZoneId getZone() {
      return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
      return this;
    }

    @Override
    public Instant instant() {
      return instant;
    }
  }

  private final MutableClock clock = new MutableClock();
  private final LoginThrottle throttle = new LoginThrottle(clock, 3, 15);

  @Test
  void blocksAfterConsecutiveFailuresAndRecovers() {
    throttle.recordFailure("admin", "10.0.0.1");
    throttle.recordFailure("admin", "10.0.0.1");
    assertFalse(throttle.blocked("admin", "10.0.0.1"));
    throttle.recordFailure("admin", "10.0.0.1");
    assertTrue(throttle.blocked("admin", "10.0.0.1"));
    assertTrue(throttle.retryAfterMillis("admin", "10.0.0.1") > 0);
    clock.advance(Duration.ofMinutes(15));
    assertFalse(throttle.blocked("admin", "10.0.0.1"));
    assertEquals(0, throttle.retryAfterMillis("admin", "10.0.0.1"));
  }

  @Test
  void blockedAttemptsDoNotExtendLockout() {
    for (int i = 0; i < 5; i++) throttle.recordFailure("admin", "10.0.0.2");
    var expected = throttle.retryAfterMillis("admin", "10.0.0.2");
    clock.advance(Duration.ofMinutes(1));
    throttle.recordFailure("admin", "10.0.0.2");
    clock.advance(Duration.ofMinutes(1));
    throttle.recordFailure("admin", "10.0.0.2");
    assertEquals(
      expected - Duration.ofMinutes(2).toMillis(),
      throttle.retryAfterMillis("admin", "10.0.0.2")
    );
  }

  @Test
  void successResetsFailures() {
    throttle.recordFailure("admin", "10.0.0.3");
    throttle.recordFailure("admin", "10.0.0.3");
    throttle.recordSuccess("admin", "10.0.0.3");
    throttle.recordFailure("admin", "10.0.0.3");
    throttle.recordFailure("admin", "10.0.0.3");
    assertFalse(throttle.blocked("admin", "10.0.0.3"));
  }

  @Test
  void keysAreIsolatedAndNormalized() {
    throttle.recordFailure("admin", "10.0.0.4");
    throttle.recordFailure("admin", "10.0.0.4");
    throttle.recordFailure(" admin ", "10.0.0.4");
    assertTrue(throttle.blocked("ADMIN", "10.0.0.4"));
    assertFalse(throttle.blocked("admin", "10.0.0.5"));
    assertFalse(throttle.blocked("root", "10.0.0.4"));
  }

  @Test
  void unknownUsernamesShareNoState() {
    throttle.recordFailure(null, "10.0.0.6");
    throttle.recordFailure(null, "10.0.0.6");
    throttle.recordFailure(null, "10.0.0.6");
    assertTrue(throttle.blocked(null, "10.0.0.6"));
    assertFalse(throttle.blocked("admin", "10.0.0.6"));
  }

  @Test
  void trackedKeysAreCapped() {
    var wide = new LoginThrottle(clock, 1, 15);
    for (int i = 0; i < LoginThrottle.MAX_KEYS + 100; i++) wide.recordFailure("u" + i, "ip");
    // The cap drops new keys instead of growing the map; earliest keys still count.
    assertTrue(wide.blocked("u0", "ip"));
    assertFalse(wide.blocked("u" + (LoginThrottle.MAX_KEYS + 50), "ip"));
  }

  @Test
  void rejectsNonPositiveConfiguration() {
    assertThrows(IllegalArgumentException.class, () -> new LoginThrottle(clock, 0, 15));
    assertThrows(IllegalArgumentException.class, () -> new LoginThrottle(clock, 5, 0));
  }
}
