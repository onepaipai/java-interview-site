package dev.interview.shared;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.regex.*;
import org.springframework.stereotype.Component;

@Component
public class MarkdownImporter {

  public record Item(
    String sourceKey,
    String title,
    String category,
    String difficulty,
    String answer,
    int sortOrder,
    List<String> tags
  ) {}

  public record Document(String title, String content) {}

  public record Preview(List<Item> questions, List<Document> documents, List<String> warnings) {}

  static final Pattern NUMBER = Pattern.compile("^\\s{0,3}(\\d+)[.)]\\s+(.+)$");
  static final Pattern HEADING = Pattern.compile("^(#{1,6})\\s+(.+)$");

  /** Keep standalone imported reference material, never historical copies of questions/answers. */
  public String referenceOnly(String markdown) {
    var out = new StringBuilder();
    boolean question = false;
    String fence = null;
    for (String line : markdown.split("\\R", -1)) {
      String trimmed = line.stripLeading();
      if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
        String marker = trimmed.substring(0, 3);
        if (fence == null) fence = marker;
        else if (fence.equals(marker)) fence = null;
      }
      var heading = HEADING.matcher(line);
      if (fence == null && heading.matches() && heading.group(1).length() <= 3) question = false;
      if (fence == null && NUMBER.matcher(line).matches()) question = true;
      if (!question) out.append(line).append('\n');
    }
    String result = out.toString().strip();
    return result.lines().anyMatch(l -> !l.isBlank() && !HEADING.matcher(l).matches())
      ? result
      : "";
  }

  public static String key(String s) {
    try {
      return HexFormat.of().formatHex(
        MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8))
      );
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  public Preview parse(String markdown) {
    // 上限随题库规模调整:16 个深度模块后全量导出约 3.5MB,预留至 6MB
    if (markdown == null || markdown.length() > 6_000_000) throw new IllegalArgumentException();
    List<Item> items = new ArrayList<>();
    List<Document> docs = new ArrayList<>();
    List<String> warnings = new ArrayList<>();
    String section = "未分类",
      category = "未分类",
      difficulty = "基础",
      title = null,
      number = null;
    StringBuilder answer = new StringBuilder(),
      body = new StringBuilder();
    String fence = null;
    Set<String> seen = new HashSet<>();
    int order = 0;
    for (String line : markdown.replace("\r\n", "\n").replace("\r", "\n").split("\n", -1)) {
      String trimmed = line.stripLeading();
      if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
        String marker = trimmed.substring(0, 3);
        if (fence == null) fence = marker;
        else if (fence.equals(marker)) fence = null;
        if (title != null) answer.append(line).append("\n");
        body.append(line).append("\n");
        continue;
      }
      var heading = HEADING.matcher(line);
      var numbered = NUMBER.matcher(line);
      if (fence == null && heading.matches() && heading.group(1).length() <= 3) {
        if (title != null) {
          items.add(item(section, number, title, category, difficulty, answer.toString(), order++));
          title = null;
          answer.setLength(0);
        }
        int level = heading.group(1).length();
        if (level == 2) {
          if (!body.toString().isBlank()) docs.add(new Document(section, body.toString().strip()));
          body.setLength(0);
          section = heading.group(2);
          category = section;
          difficulty = level(section);
        } else if (level == 3) {
          category = heading.group(2);
        }
        body.append(line).append("\n");
        continue;
      }
      if (fence == null && numbered.matches()) {
        if (title != null) {
          items.add(item(section, number, title, category, difficulty, answer.toString(), order++));
          answer.setLength(0);
        }
        number = numbered.group(1);
        title = numbered.group(2).strip();
        String k = section + "/" + number;
        if (!seen.add(k)) warnings.add("重复编号：" + k + "，请在预览中修正");
      } else if (title != null) {
        answer.append(line).append("\n");
      }
      body.append(line).append("\n");
    }
    if (title != null) items.add(
      item(section, number, title, category, difficulty, answer.toString(), order)
    );
    if (!body.toString().isBlank()) docs.add(new Document(section, body.toString().strip()));
    long empty = items
      .stream()
      .filter(i -> i.answer().isBlank())
      .count();
    if (empty > 0) warnings.add(empty + " 道题没有原始答案，导入后显示待补充");
    if (markdown.matches("(?s).*!\\[[^]]*]\\((?!https?://|/uploads/)[^)]+\\).*")) warnings.add(
      "存在相对路径图片，请上传图片后更新链接"
    );
    return new Preview(items, docs, warnings);
  }

  private Item item(
    String section,
    String number,
    String title,
    String category,
    String difficulty,
    String answer,
    int order
  ) {
    String[] lines = answer.split("\n", -1);
    boolean indented = Arrays.stream(lines)
      .filter(l -> !l.isBlank())
      .allMatch(l -> l.startsWith("    "));
    if (indented) answer = String.join(
      "\n",
      Arrays.stream(lines)
        .map(l -> l.startsWith("    ") ? l.substring(4) : l)
        .toList()
    );
    return new Item(
      key(section + "/" + number),
      title,
      category,
      difficulty,
      answer.strip(),
      order,
      category.contains("⭐") ? List.of("重点") : List.of()
    );
  }

  private String level(String s) {
    if (s.contains("进阶")) return "进阶";
    if (s.contains("高级")) return "高级";
    if (s.contains("专家")) return "专家";
    return "基础";
  }
}
