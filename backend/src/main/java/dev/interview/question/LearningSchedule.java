package dev.interview.question;

import java.sql.Timestamp;
import java.util.List;

/** 自评后的间隔复习排期：按掌握度与已复习次数推导下次到期时间。 */
final class LearningSchedule {

  private LearningSchedule() {}

  /** PARTIAL 的间隔梯度（天）：随复习次数递增，封顶 30 天。 */
  private static final List<Integer> PARTIAL_DAYS = List.of(1, 3, 7, 14, 30);

  private static final long DAY_MILLIS = 24L * 60 * 60 * 1000;

  /**
   * 计算下次到期时间。
   *
   * @param mastery 本次自评结果（NEW/NO/PARTIAL/YES）
   * @param reviewCount 自评后的复习次数（含本次，从 1 起）
   * @param now 自评时间
   * @return 下次到期时间；YES/NEW 退出调度返回 null
   */
  static Timestamp next(String mastery, int reviewCount, Timestamp now) {
    if (!"NO".equals(mastery) && !"PARTIAL".equals(mastery)) {
      return null;
    }
    int days;
    if ("NO".equals(mastery)) {
      days = 1;
    } else {
      int index = Math.min(Math.max(reviewCount, 1) - 1, PARTIAL_DAYS.size() - 1);
      days = PARTIAL_DAYS.get(index);
    }
    return new Timestamp(now.getTime() + days * DAY_MILLIS);
  }
}
