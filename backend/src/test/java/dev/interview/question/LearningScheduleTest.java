package dev.interview.question;

import static org.junit.jupiter.api.Assertions.*;

import java.sql.Timestamp;
import org.junit.jupiter.api.Test;

class LearningScheduleTest {

  private static final Timestamp NOW = Timestamp.valueOf("2026-11-28 12:00:00");
  private static final long DAY = 24L * 60 * 60 * 1000;

  @Test
  void noMasterySchedulesNextDayRegardlessOfCount() {
    assertEquals(NOW.getTime() + DAY, LearningSchedule.next("NO", 1, NOW).getTime());
    assertEquals(NOW.getTime() + DAY, LearningSchedule.next("NO", 9, NOW).getTime());
  }

  @Test
  void partialMasteryFollowsGradientByReviewCount() {
    assertEquals(NOW.getTime() + 1 * DAY, LearningSchedule.next("PARTIAL", 1, NOW).getTime());
    assertEquals(NOW.getTime() + 3 * DAY, LearningSchedule.next("PARTIAL", 2, NOW).getTime());
    assertEquals(NOW.getTime() + 7 * DAY, LearningSchedule.next("PARTIAL", 3, NOW).getTime());
    assertEquals(NOW.getTime() + 14 * DAY, LearningSchedule.next("PARTIAL", 4, NOW).getTime());
  }

  @Test
  void partialGradientCapsAtThirtyDays() {
    assertEquals(NOW.getTime() + 30 * DAY, LearningSchedule.next("PARTIAL", 5, NOW).getTime());
    assertEquals(NOW.getTime() + 30 * DAY, LearningSchedule.next("PARTIAL", 12, NOW).getTime());
  }

  @Test
  void yesAndNewExitTheScheduleWithNull() {
    assertNull(LearningSchedule.next("YES", 1, NOW));
    assertNull(LearningSchedule.next("NEW", 0, NOW));
  }
}
