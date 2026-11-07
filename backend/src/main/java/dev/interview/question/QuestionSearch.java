package dev.interview.question;

import java.util.*;
import java.util.regex.Pattern;

/** Search learning content, excluding publication metadata and link destinations. */
public final class QuestionSearch {

  private static final Pattern REFERENCES = Pattern.compile(
    "<details\\b[^>]*class=[\"'][^\"']*\\bexplanation-references\\b[^\"']*[\"'][^>]*>[\\s\\S]*?</details\\s*>",
    Pattern.CASE_INSENSITIVE
  );
  private static final Pattern HIDDEN = Pattern.compile(
    "<(script|style)\\b[^>]*>[\\s\\S]*?</\\1\\s*>",
    Pattern.CASE_INSENSITIVE
  );
  private static final Pattern TAGS = Pattern.compile(
    "<!--[^>]*-->|</?[a-z][^>]*>",
    Pattern.CASE_INSENSITIVE
  );
  private static final Pattern LINKS = Pattern.compile("!?\\[([^\\]]*)\\]\\([^\\n)]*\\)");

  public static String withoutReferences(String source) {
    return REFERENCES.matcher(source).replaceAll(" ");
  }

  public static String text(String source) {
    return plain(source).toLowerCase(Locale.ROOT);
  }

  public static String plain(String source) {
    String value = withoutReferences(source);
    value = HIDDEN.matcher(value).replaceAll(" ");
    value = TAGS.matcher(value).replaceAll(" ");
    value = LINKS.matcher(value).replaceAll("$1");
    return value
      .replaceAll("(?m)^ {0,3}#{1,6}\\s+", " ")
      .replaceAll("[`*]", "")
      .replace("__", "")
      .replaceAll("\\s+", " ")
      .strip();
  }

  /** Exact title, title prefix, title phrase, title terms, then answer matches. */
  public static int rank(String title, String answer, String query) {
    return rankText(text(title), text(answer), query);
  }

  public static int rankText(String name, String body, String query) {
    String term = query.strip().toLowerCase(Locale.ROOT);
    var words = term.split("\\s+");
    String content = name + " " + body;
    if (Arrays.stream(words).anyMatch(word -> !content.contains(word))) return -1;
    if (name.equals(term)) return 0;
    if (name.startsWith(term)) return 1;
    if (name.contains(term)) return 2;
    if (Arrays.stream(words).allMatch(name::contains)) return 3;
    return 4;
  }

  public static List<Long> order(List<Map<String, Object>> candidates, String query) {
    record Hit(long id, int rank) {}
    // Stable sorting preserves the normal module/question order within a rank.
    return candidates
      .stream()
      .map(row ->
        new Hit(
          ((Number) row.get("id")).longValue(),
          rank(row.get("title").toString(), row.get("answer").toString(), query)
        )
      )
      .filter(hit -> hit.rank() >= 0)
      .sorted(Comparator.comparingInt(Hit::rank))
      .map(Hit::id)
      .toList();
  }
}
