package dev.interview.question;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.*;

/** Explicit wire contract; persistence-only fields never leak through SELECT *. */
public final class QuestionDtos {

  private QuestionDtos() {}

  public record Page<T>(List<T> items, long total, int page, int size) {}

  public record Summary(
    long id,
    String title,
    @JsonProperty("category_id") long categoryId,
    String category,
    String difficulty,
    @JsonProperty("sort_order") int sortOrder,
    int version,
    boolean answered,
    String preview,
    List<String> tags,
    String mastery,
    boolean favorite,
    @JsonProperty("next_review") String nextReview
  ) {
    public static Summary from(Map<String, Object> r) {
      return new Summary(
        number(r, "id"),
        string(r, "title"),
        number(r, "category_id"),
        string(r, "category"),
        string(r, "difficulty"),
        (int) number(r, "sort_order"),
        (int) number(r, "version"),
        bool(r, "answered"),
        string(r, "preview"),
        QuestionDtos.tags(r),
        string(r, "mastery"),
        bool(r, "favorite"),
        timestamp(r, "next_review")
      );
    }
  }

  public record Detail(
    long id,
    String title,
    @JsonProperty("category_id") long categoryId,
    String category,
    String difficulty,
    String answer,
    @JsonProperty("sort_order") int sortOrder,
    int version,
    List<String> tags,
    String mastery,
    boolean favorite,
    String note,
    @JsonProperty("review_count") int reviewCount,
    @JsonProperty("next_review") String nextReview
  ) {
    public static Detail from(Map<String, Object> r) {
      return new Detail(
        number(r, "id"),
        string(r, "title"),
        number(r, "category_id"),
        string(r, "category"),
        string(r, "difficulty"),
        string(r, "answer"),
        (int) number(r, "sort_order"),
        (int) number(r, "version"),
        QuestionDtos.tags(r),
        string(r, "mastery"),
        bool(r, "favorite"),
        string(r, "note"),
        (int) number(r, "review_count"),
        timestamp(r, "next_review")
      );
    }
  }

  @SuppressWarnings("unchecked")
  public static Page<Summary> page(Map<String, Object> r) {
    return new Page<>(
      ((List<Map<String, Object>>) r.get("items")).stream().map(Summary::from).toList(),
      number(r, "total"),
      (int) number(r, "page"),
      (int) number(r, "size")
    );
  }

  private static long number(Map<String, Object> r, String key) {
    return ((Number) r.getOrDefault(key, 0)).longValue();
  }

  private static String string(Map<String, Object> r, String key) {
    return Objects.toString(r.get(key), "");
  }

  private static boolean bool(Map<String, Object> r, String key) {
    return Boolean.TRUE.equals(r.get(key)) || (r.get(key) instanceof Number n && n.intValue() != 0);
  }

  /** 时间戳转 ISO-8601 字符串（浏览器可稳定解析）；NULL 保持 null 表示未排期。 */
  private static String timestamp(Map<String, Object> r, String key) {
    Object value = r.get(key);
    if (value instanceof java.sql.Timestamp t) {
      return t.toInstant().toString();
    }
    return null;
  }

  @SuppressWarnings("unchecked")
  private static List<String> tags(Map<String, Object> r) {
    return List.copyOf((List<String>) r.getOrDefault("tags", List.of()));
  }
}
