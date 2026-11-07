package dev.interview.publication;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.interview.shared.KnowledgeChanged;
import dev.interview.shared.MarkdownImporter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.regex.Pattern;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Update only known published baselines; user edits and archived content take precedence. */
@Service
public class ExplanationImporter {

  private final ObjectMapper json;
  private final JdbcTemplate db;
  private final ApplicationEventPublisher events;
  private static final List<String> SECTIONS = List.of("参考回答", "参考分析", "案例", "总结点");
  private static final Pattern HASH = Pattern.compile("[a-f0-9]{64}");

  ExplanationImporter(ObjectMapper json, JdbcTemplate db, ApplicationEventPublisher events) {
    this.json = json;
    this.db = db;
    this.events = events;
  }

  public record Entry(
    String sourceKey,
    String title,
    String baselineAnswerSha256,
    String answerSha256,
    String file,
    String topic,
    List<String> references
  ) {}

  public record Manifest(String version, int count, List<Entry> entries) {}

  public record Skipped(long questionId, String reason) {}

  public record Report(
    int updated,
    int already,
    int modified,
    int archived,
    int missing,
    int conflicts,
    List<Skipped> skipped
  ) {}

  private record Prepared(Entry entry, String answer) {}

  @Transactional(rollbackFor = Exception.class)
  public Report importAll(Path manifestPath) throws IOException {
    if (!Files.isRegularFile(manifestPath)) return new Report(0, 0, 0, 0, 0, 0, List.of());
    var manifest = json.readValue(manifestPath.toFile(), Manifest.class);
    if (
      manifest.version() == null ||
      !manifest.version().matches("explanations-v[1-9][0-9]*") ||
      manifest.entries() == null ||
      manifest.count() != manifest.entries().size() ||
      manifest.count() == 0
    ) throw new IllegalArgumentException("解析清单版本或数量无效");
    Path root = manifestPath.toAbsolutePath().normalize().getParent().toRealPath();
    var prepared = new ArrayList<Prepared>();
    var keys = new HashSet<String>();
    // Validate every file before obtaining locks or changing any answer.
    for (var entry : manifest.entries()) {
      if (
        entry.sourceKey() == null ||
        !HASH.matcher(entry.sourceKey()).matches() ||
        !keys.add(entry.sourceKey()) ||
        entry.title() == null ||
        entry.title().isBlank() ||
        entry.file() == null ||
        entry.baselineAnswerSha256() == null ||
        !HASH.matcher(entry.baselineAnswerSha256()).matches() ||
        entry.answerSha256() == null ||
        !HASH.matcher(entry.answerSha256()).matches()
      ) throw new IllegalArgumentException("解析条目无效或来源重复");
      Path file = root.resolve(entry.file()).normalize();
      if (
        !file.startsWith(root) || !file.toRealPath().startsWith(root)
      ) throw new IllegalArgumentException("解析路径越界");
      String answer = Files.readString(file, StandardCharsets.UTF_8);
      if (
        answer.length() > 100_000 || !MarkdownImporter.key(answer).equals(entry.answerSha256())
      ) throw new IllegalArgumentException("解析文件摘要不匹配：" + entry.file());
      validateSections(answer);
      prepared.add(new Prepared(entry, answer));
    }
    // An ordinary restart (including retained edits/deletions) needs no write locks.
    String packVersion = db.queryForObject(
      "SELECT pack_version FROM explanation_pack_state WHERE id=1",
      String.class
    );
    boolean olderPack = versionNumber(packVersion).compareTo(versionNumber(manifest.version())) > 0;
    var snapshot = new HashMap<String, Map<String, Object>>();
    for (var row : db.queryForList(
      "SELECT q.source_key,q.id,q.title,q.answer,q.deleted,c.deleted AS category_deleted,p.answer_hash AS published_hash,p.pack_version FROM questions q JOIN categories c ON c.id=q.category_id LEFT JOIN explanation_publications p ON p.question_id=q.id WHERE q.source_key IS NOT NULL"
    ))
      snapshot.put(row.get("source_key").toString(), row);
    int ready = 0,
      unchanged = 0,
      retained = 0,
      removed = 0,
      absent = 0;
    var retainedItems = new ArrayList<Skipped>();
    for (var item : prepared) {
      var entry = item.entry();
      var row = snapshot.get(entry.sourceKey());
      if (row == null) {
        absent++;
        continue;
      }
      long id = ((Number) row.get("id")).longValue();
      if (
        Boolean.TRUE.equals(row.get("deleted")) || Boolean.TRUE.equals(row.get("category_deleted"))
      ) {
        removed++;
        retainedItems.add(new Skipped(id, "archived"));
        continue;
      }
      String digest = MarkdownImporter.key(row.get("answer").toString());
      String reason = !entry.title().equals(row.get("title")) ? "title-edited" : null;
      if (reason == null && digest.equals(entry.answerSha256())) {
        unchanged++;
        continue;
      }
      if (
        reason == null &&
        (olderPack ||
          (row.get("pack_version") != null &&
            versionNumber(row.get("pack_version").toString()).compareTo(
              versionNumber(manifest.version())
            ) > 0))
      ) reason = "newer-publication";
      String expected =
        row.get("published_hash") == null
          ? entry.baselineAnswerSha256()
          : row.get("published_hash").toString();
      if (reason == null && !digest.equals(expected)) reason = "answer-edited";
      if (reason == null) ready++;
      else {
        retained++;
        retainedItems.add(new Skipped(id, reason));
      }
    }
    if (ready == 0) {
      recordPackVersion(manifest.version());
      return report(
        new Report(0, unchanged, retained, removed, absent, 0, List.copyOf(retainedItems))
      );
    }
    // Use the same category-first lock order as archival/restoration.
    db.queryForList(
      "SELECT id FROM categories WHERE deleted=FALSE ORDER BY id FOR UPDATE",
      Long.class
    );
    String lockedVersion = db.queryForObject(
      "SELECT pack_version FROM explanation_pack_state WHERE id=1 FOR UPDATE",
      String.class
    );
    if (
      versionNumber(lockedVersion).compareTo(versionNumber(manifest.version())) > 0
    ) throw new IllegalStateException("更新期间已有更高版本解析发布，请重新检查清单");
    int updated = 0,
      already = 0,
      modified = 0,
      archived = 0,
      missing = 0,
      conflicts = 0;
    var skipped = new ArrayList<Skipped>();
    for (var item : prepared) {
      var entry = item.entry();
      var rows = db.queryForList(
        "SELECT q.id,q.title,q.answer,q.version,q.deleted,c.deleted AS category_deleted FROM questions q JOIN categories c ON c.id=q.category_id WHERE q.source_key=?",
        entry.sourceKey()
      );
      if (rows.isEmpty()) {
        missing++;
        continue;
      }
      var row = rows.get(0);
      long id = ((Number) row.get("id")).longValue();
      if (
        Boolean.TRUE.equals(row.get("deleted")) || Boolean.TRUE.equals(row.get("category_deleted"))
      ) {
        archived++;
        skipped.add(new Skipped(id, "archived"));
        continue;
      }
      String previous = (String) row.get("answer");
      String digest = MarkdownImporter.key(previous);
      if (!entry.title().equals(row.get("title"))) {
        modified++;
        skipped.add(new Skipped(id, "title-edited"));
        continue;
      }
      if (digest.equals(entry.answerSha256())) {
        already++;
        continue;
      }
      var publications = db.queryForList(
        "SELECT answer_hash,pack_version FROM explanation_publications WHERE question_id=?",
        id
      );
      if (
        !publications.isEmpty() &&
        versionNumber(publications.get(0).get("pack_version").toString()).compareTo(
          versionNumber(manifest.version())
        ) > 0
      ) {
        modified++;
        skipped.add(new Skipped(id, "newer-publication"));
        continue;
      }
      String expected = publications.isEmpty()
        ? entry.baselineAnswerSha256()
        : publications.get(0).get("answer_hash").toString();
      if (!digest.equals(expected)) {
        modified++;
        skipped.add(new Skipped(id, "answer-edited"));
        continue;
      }
      int version = ((Number) row.get("version")).intValue();
      int changed = db.update(
        "UPDATE questions SET answer=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND deleted=FALSE",
        item.answer(),
        id,
        version
      );
      if (changed != 1) {
        conflicts++;
        skipped.add(new Skipped(id, "version-conflict"));
        continue;
      }
      if (publications.isEmpty()) db.update(
        "INSERT INTO explanation_publications(question_id,pack_version,answer_hash,original_answer,original_version) VALUES(?,?,?,?,?)",
        id,
        manifest.version(),
        entry.answerSha256(),
        previous,
        version
      );
      else db.update(
        "UPDATE explanation_publications SET pack_version=?,answer_hash=?,applied_at=CURRENT_TIMESTAMP WHERE question_id=?",
        manifest.version(),
        entry.answerSha256(),
        id
      );
      updated++;
    }
    if (updated > 0) events.publishEvent(new KnowledgeChanged(null));
    recordPackVersion(manifest.version());
    return report(
      new Report(updated, already, modified, archived, missing, conflicts, List.copyOf(skipped))
    );
  }

  private void recordPackVersion(String incoming) {
    String previous = db.queryForObject(
      "SELECT pack_version FROM explanation_pack_state WHERE id=1",
      String.class
    );
    if (versionNumber(previous).compareTo(versionNumber(incoming)) < 0) db.update(
      "UPDATE explanation_pack_state SET pack_version=? WHERE id=1 AND pack_version=?",
      incoming,
      previous
    );
  }

  private static Report report(Report result) {
    LoggerFactory.getLogger(ExplanationImporter.class).info("Explanation publication: {}", result);
    return result;
  }

  private static java.math.BigInteger versionNumber(String version) {
    return new java.math.BigInteger(version.substring("explanations-v".length()));
  }

  static void validateSections(String answer) {
    boolean deep = answer.contains("<!-- explanation:deep -->");
    if (
      answer.length() > 100_000 ||
      Pattern.compile("待补充|待完善|\\bTODO\\b|xxxx").matcher(answer).find()
    ) {
      throw new IllegalArgumentException("解析内容未完成或过长");
    }
    var headings = new ArrayList<String>();
    var blocks = new ArrayList<List<String>>();
    char fence = 0;
    int fenceSize = 0;
    int diagrams = 0;
    for (String line : answer.split("\\R")) {
      var marker = Pattern.compile("^ {0,3}(`{3,}|~{3,})(.*)$").matcher(line);
      if (marker.matches()) {
        char kind = marker.group(1).charAt(0);
        int size = marker.group(1).length();
        if (fence == 0) {
          if (
            headings.isEmpty() ||
            !(
              headings.get(headings.size() - 1).equals("案例") ||
              (deep && headings.get(headings.size() - 1).equals("参考分析"))
            )
          ) throw new IllegalArgumentException("代码块只能位于案例段落");
          fence = kind;
          fenceSize = size;
        } else if (fence == kind && size >= fenceSize && marker.group(2).isBlank()) fence = 0;
        continue;
      }
      if (fence != 0) continue;
      if (line.matches("^#{1,6}\\s+.*")) {
        if (
          deep &&
          line.startsWith("### ") &&
          !headings.isEmpty() &&
          List.of("参考分析", "案例").contains(headings.get(headings.size() - 1))
        ) {
          blocks.get(blocks.size() - 1).add(line);
          continue;
        }
        if (!line.startsWith("## ")) throw new IllegalArgumentException("解析仅允许指定二级标题");
        headings.add(line.substring(3).strip());
        blocks.add(new ArrayList<>());
      } else if (!blocks.isEmpty() && !line.isBlank()) blocks.get(blocks.size() - 1).add(line);
    }
    if (
      fence != 0 ||
      !(headings.equals(SECTIONS) || headings.equals(List.of("参考回答", "案例", "总结点")))
    ) throw new IllegalArgumentException("解析必须包含回答、可选分析、案例和最后总结");
    if (deep) {
      if (!headings.equals(SECTIONS)) throw new IllegalArgumentException(
        "深入题解必须包含完整分析"
      );
      validateDeepBlocks(blocks);
      return;
    }
    for (int block = 0; block < headings.size(); block++) {
      int section = SECTIONS.indexOf(headings.get(block));
      int points = 0;
      boolean outcome = false;
      for (String line : blocks.get(block)) {
        if (section == 2 && line.matches("^!\\[[^]]*]\\(/explanations/[a-z0-9-]+\\.svg\\)$")) {
          diagrams++;
          continue;
        }
        var point = Pattern.compile("^(\\d+)\\.\\s+(.+)$").matcher(line);
        if (
          !point.matches() || Integer.parseInt(point.group(1)) != ++points
        ) throw new IllegalArgumentException("解析要点必须连续编号，且总结之后不能追加内容");
        String text = point.group(2).replace("*", "").replace("`", "");
        int limit = section == 3 ? 22 : section == 2 ? 145 : section == 1 ? 110 : 80;
        if (text.codePointCount(0, text.length()) > limit) throw new IllegalArgumentException(
          "解析要点超出简短阅读长度"
        );
        outcome |= text.matches(".*(验证|预期|结果).*");
      }
      int max = section == 3 ? 4 : section == 2 ? 8 : 6;
      if (
        points < (section < 2 ? 1 : 2) || points > max || (section == 2 && !outcome)
      ) throw new IllegalArgumentException("解析段落缺少完整要点或案例验证结果");
    }
    if (diagrams > 1) throw new IllegalArgumentException("每题最多一张流程图");
  }

  private static void validateDeepBlocks(List<List<String>> blocks) {
    for (int index : List.of(0, 3)) {
      int count = 0;
      for (String line : blocks.get(index)) {
        if (
          line.equals("<!-- explanation:deep -->") ||
          (index == 0 && line.startsWith("> 场景与约束："))
        ) continue;
        var point = Pattern.compile("^(\\d+)\\.\\s+(.+)$").matcher(line);
        if (
          !point.matches() ||
          Integer.parseInt(point.group(1)) != ++count ||
          point.group(2).codePointCount(0, point.group(2).length()) > (index == 0 ? 180 : 60)
        ) {
          throw new IllegalArgumentException("口述结论与总结必须简洁且连续编号");
        }
      }
      if (count < 2 || count > 5) throw new IllegalArgumentException("口述结论或总结数量无效");
    }
    for (int index : List.of(1, 2)) {
      long count = blocks
        .get(index)
        .stream()
        .filter(line -> line.startsWith("### "))
        .count();
      if (
        count < (index == 1 ? 3 : 2) ||
        count > 6 ||
        String.join("\n", blocks.get(index)).length() < 240
      ) throw new IllegalArgumentException("深入题解缺少机制分析或故障推演");
    }
    if (
      !Pattern.compile("验证|预期|结果")
        .matcher(String.join("\n", blocks.get(2)))
        .find()
    ) throw new IllegalArgumentException("案例缺少可观察结果");
    int diagrams = 0;
    for (var block : blocks)
      for (String line : block) {
        var image = Pattern.compile("!\\[[^]]*]\\(([^)]+)\\)").matcher(line);
        while (image.find()) {
          if (
            ++diagrams > 1 || !image.group(1).matches("/explanations/[a-z0-9-]+\\.svg")
          ) throw new IllegalArgumentException("题解图片必须是单张本地流程图");
        }
      }
  }
}
