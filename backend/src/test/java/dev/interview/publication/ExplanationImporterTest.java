package dev.interview.publication;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.interview.shared.MarkdownImporter;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(
  properties = {
    "spring.datasource.url=jdbc:h2:mem:explanation-tests;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "app.admin-password=test-admin-password",
    "app.upload-dir=./target/publication-uploads",
    "app.seed-path=./target/no-explanation-seed.md",
  }
)
@Transactional
class ExplanationImporterTest {

  @Autowired
  ExplanationImporter importer;

  @org.springframework.test.context.bean.override.mockito.MockitoSpyBean
  JdbcTemplate db;

  @Autowired
  ObjectMapper json;

  @Autowired
  MarkdownImporter markdown;

  @TempDir
  Path temp;

  final String body =
    "## 参考回答\n\n1. 精确结论。\n2. 明确边界。\n\n## 参考分析\n\n1. 原因。\n2. 取舍。\n\n## 案例\n\n1. 场景：并发。\n2. 操作：条件更新。\n3. 验证：仅一个成功。\n\n## 总结点\n\n1. 原子更新。\n2. 业务防重。\n";

  long question(String key, String answer, boolean deleted) {
    String category = "explanation_" + UUID.randomUUID();
    db.update("INSERT INTO categories(name) VALUES(?)", category);
    long categoryId = db.queryForObject(
      "SELECT id FROM categories WHERE name=?",
      Long.class,
      category
    );
    db.update(
      "INSERT INTO questions(title,category_id,difficulty,answer,sort_order,source_key,deleted) VALUES(?,?,'高级',?,42,?,?)",
      "标题",
      categoryId,
      answer,
      key,
      deleted
    );
    return db.queryForObject("SELECT id FROM questions WHERE source_key=?", Long.class, key);
  }

  ExplanationImporter.Entry entry(String key, String baseline, String name) throws Exception {
    Files.writeString(temp.resolve(name), body, StandardCharsets.UTF_8);
    return new ExplanationImporter.Entry(
      key,
      "标题",
      MarkdownImporter.key(baseline),
      MarkdownImporter.key(body),
      name,
      "test",
      List.of()
    );
  }

  Path pack(String version, ExplanationImporter.Entry... entries) throws Exception {
    Path path = temp.resolve("manifest.json");
    json.writeValue(
      path.toFile(),
      new ExplanationImporter.Manifest(version, entries.length, List.of(entries))
    );
    return path;
  }

  @Test
  void publishesOnlyAnswerOnceAndRetainsRollbackBaseline() throws Exception {
    String key = MarkdownImporter.key("first");
    long id = question(key, "短答案", false);
    var path = pack("explanations-v1", entry(key, "短答案", "one.md"));
    assertEquals(1, importer.importAll(path).updated());
    org.mockito.Mockito.clearInvocations(db);
    assertEquals(1, importer.importAll(path).already());
    org.mockito.Mockito.verify(db, org.mockito.Mockito.never()).queryForList(
      "SELECT id FROM categories WHERE deleted=FALSE ORDER BY id FOR UPDATE",
      Long.class
    );
    var row = db.queryForMap("SELECT * FROM questions WHERE id=?", id);
    assertEquals(body, row.get("answer"));
    assertEquals(1, ((Number) row.get("version")).intValue());
    assertEquals(42, ((Number) row.get("sort_order")).intValue());
    assertEquals("高级", row.get("difficulty"));
    assertEquals(
      "短答案",
      db.queryForObject(
        "SELECT original_answer FROM explanation_publications WHERE question_id=?",
        String.class,
        id
      )
    );
    assertEquals(
      1,
      db.queryForObject(
        "SELECT COUNT(*) FROM explanation_publications WHERE question_id=?",
        Integer.class,
        id
      )
    );
  }

  @Test
  void rejectsEmptySectionsWrongNumberingAndTextAfterSummary() {
    assertThrows(IllegalArgumentException.class, () ->
      ExplanationImporter.validateSections("## 参考回答\n## 参考分析\n## 案例\n## 总结点")
    );
    assertThrows(IllegalArgumentException.class, () ->
      ExplanationImporter.validateSections(body + "\n额外解释")
    );
    assertThrows(IllegalArgumentException.class, () ->
      ExplanationImporter.validateSections(body.replace("2. 明确边界", "3. 明确边界"))
    );
    assertThrows(IllegalArgumentException.class, () ->
      ExplanationImporter.validateSections(body.replace("3. 验证：仅一个成功。", "3. 处理：结束。"))
    );
    assertThrows(IllegalArgumentException.class, () ->
      ExplanationImporter.validateSections(body.replace("1. 原子更新。", "1. " + "长".repeat(23)))
    );
    ExplanationImporter.validateSections(
      body.replace(
        "2. 操作：条件更新。",
        "2. 操作：条件更新。\n\n````text\n```\n## 非正文标题\n````\n"
      )
    );
  }

  @Test
  void acceptsConciseAnswerWithoutInventingAnAnalysisSection() throws Exception {
    String concise = body
      .replace("## 参考分析\n\n1. 原因。\n2. 取舍。\n\n", "")
      .replace(
        "2. 操作：条件更新。",
        "2. 操作：条件更新。\n\n```sql\nUPDATE stock SET n=n-1 WHERE n>0;\n```\n"
      );
    ExplanationImporter.validateSections(concise);
    String key = MarkdownImporter.key("concise");
    long id = question(key, "基线", false);
    Files.writeString(temp.resolve("concise.md"), concise);
    var entry = new ExplanationImporter.Entry(
      key,
      "标题",
      MarkdownImporter.key("基线"),
      MarkdownImporter.key(concise),
      "concise.md",
      "test",
      List.of()
    );
    assertEquals(1, importer.importAll(pack("explanations-v5", entry)).updated());
    assertEquals(
      concise,
      db.queryForObject("SELECT answer FROM questions WHERE id=?", String.class, id)
    );
    assertThrows(IllegalArgumentException.class, () ->
      ExplanationImporter.validateSections(body.replace("1. 原因。\n2. 取舍。", ""))
    );
    assertThrows(IllegalArgumentException.class, () ->
      ExplanationImporter.validateSections(concise.replace("## 案例", "## 参考分析"))
    );
  }

  @Test
  void preservesManualAnswersTitlesAndArchivedQuestionsAndModules() throws Exception {
    String[] keys = { "edited-answer", "edited-title", "deleted-question", "archived-module" };
    var entries = new ArrayList<ExplanationImporter.Entry>();
    var ids = new ArrayList<Long>();
    for (String suffix : keys) {
      String key = MarkdownImporter.key(suffix);
      ids.add(question(key, "基线", false));
      entries.add(entry(key, "基线", suffix + ".md"));
    }
    db.update("UPDATE questions SET answer='人工修订',version=1 WHERE id=?", ids.get(0));
    db.update("UPDATE questions SET title='人工标题',version=1 WHERE id=?", ids.get(1));
    db.update("UPDATE questions SET deleted=TRUE WHERE id=?", ids.get(2));
    db.update(
      "UPDATE categories SET deleted=TRUE WHERE id=(SELECT category_id FROM questions WHERE id=?)",
      ids.get(3)
    );
    var report = importer.importAll(
      pack("explanations-v1", entries.toArray(ExplanationImporter.Entry[]::new))
    );
    assertEquals(0, report.updated());
    assertEquals(2, report.modified());
    assertEquals(2, report.archived());
    assertEquals(
      "人工修订",
      db.queryForObject("SELECT answer FROM questions WHERE id=?", String.class, ids.get(0))
    );
    assertEquals(
      0,
      db.queryForObject("SELECT COUNT(*) FROM explanation_publications", Integer.class)
    );
  }

  @Test
  void validatesWholePackBeforeAnyMutationAndRejectsTraversal() throws Exception {
    String key = MarkdownImporter.key("invalid");
    long id = question(key, "基线", false);
    var first = entry(key, "基线", "first.md");
    var second = entry(MarkdownImporter.key("second"), "基线", "second.md");
    Files.writeString(temp.resolve("second.md"), "损坏文件");
    assertThrows(IllegalArgumentException.class, () ->
      importer.importAll(pack("explanations-v1", first, second))
    );
    assertEquals(
      "基线",
      db.queryForObject("SELECT answer FROM questions WHERE id=?", String.class, id)
    );
    var outside = new ExplanationImporter.Entry(
      first.sourceKey(),
      first.title(),
      first.baselineAnswerSha256(),
      first.answerSha256(),
      "../outside.md",
      "test",
      List.of()
    );
    assertThrows(IllegalArgumentException.class, () ->
      importer.importAll(pack("explanations-v1", outside))
    );
  }

  @Test
  void newerPackPreservesEditsAndOlderPackCannotDowngrade() throws Exception {
    String key = MarkdownImporter.key("future");
    long id = question(key, "基线", false);
    var entry = entry(key, "基线", "one.md");
    importer.importAll(pack("explanations-v2", entry));
    db.update("UPDATE questions SET answer='人工补充',version=version+1 WHERE id=?", id);
    assertEquals(1, importer.importAll(pack("explanations-v3", entry)).modified());
    db.update("UPDATE questions SET answer=? WHERE id=?", body, id);
    String older = body.replace("精确结论", "旧版结论");
    Files.writeString(temp.resolve("old.md"), older);
    var old = new ExplanationImporter.Entry(
      key,
      "标题",
      MarkdownImporter.key("基线"),
      MarkdownImporter.key(older),
      "old.md",
      "test",
      List.of()
    );
    assertEquals(
      "newer-publication",
      importer.importAll(pack("explanations-v1", old)).skipped().get(0).reason()
    );
    assertEquals(
      body,
      db.queryForObject("SELECT answer FROM questions WHERE id=?", String.class, id)
    );
  }

  @Test
  void unchangedAnswerStillAdvancesPackVersionAndPreventsLaterDowngrade() throws Exception {
    String key = MarkdownImporter.key("unchanged-upgrade");
    long id = question(key, "基线", false);
    var same = entry(key, "基线", "same.md");
    importer.importAll(pack("explanations-v1", same));
    assertEquals(1, importer.importAll(pack("explanations-v3", same)).already());
    assertEquals(
      1,
      db.queryForObject("SELECT version FROM questions WHERE id=?", Integer.class, id)
    );
    String old = body.replace("精确结论", "旧版结论");
    Files.writeString(temp.resolve("older.md"), old);
    var older = new ExplanationImporter.Entry(
      key,
      "标题",
      same.baselineAnswerSha256(),
      MarkdownImporter.key(old),
      "older.md",
      "test",
      List.of()
    );
    assertEquals(
      "newer-publication",
      importer.importAll(pack("explanations-v2", older)).skipped().get(0).reason()
    );
    assertEquals(
      body,
      db.queryForObject("SELECT answer FROM questions WHERE id=?", String.class, id)
    );
  }

  @Test
  void publishedCatalogMatchesActualImportersByteForByte() throws Exception {
    Path root = Path.of("../content");
    var baselines = new HashMap<String, String>();
    var titles = new HashMap<String, String>();
    for (var item : markdown.parse(Files.readString(root.resolve("Java.md"))).questions()) {
      baselines.put(item.sourceKey(), item.answer());
      titles.put(item.sourceKey(), item.title());
    }
    var senior = json.readValue(
      root.resolve("senior/manifest.json").toFile(),
      SeniorQuestionImporter.Manifest.class
    );
    for (var module : senior.modules()) {
      var lines = Files.readAllLines(root.resolve("senior").resolve(module.file()));
      for (int n = 0; n < lines.size(); n++) {
        var fields = lines.get(n).split("\t", -1);
        String key = SeniorQuestionImporter.sourceKey(module.id(), n + 1);
        baselines.put(key, "### 参考要点\n\n" + fields[1].replace("；", "。\n\n"));
        titles.put(key, fields[0]);
      }
    }
    var pack = json.readValue(
      root.resolve("explanations/manifest.json").toFile(),
      ExplanationImporter.Manifest.class
    );
    assertEquals(1227, pack.count());
    assertEquals(baselines.size(), pack.count());
    for (var item : pack.entries()) {
      assertEquals(titles.get(item.sourceKey()), item.title());
      assertEquals(
        MarkdownImporter.key(baselines.get(item.sourceKey())),
        item.baselineAnswerSha256(),
        item.title()
      );
      String answer = Files.readString(root.resolve("explanations").resolve(item.file()));
      assertEquals(MarkdownImporter.key(answer), item.answerSha256());
      ExplanationImporter.validateSections(answer);
    }
  }

  @Test
  void richFormatAllowsReasoningButRejectsBrokenPublicationBoundaries() throws Exception {
    String deep = Files.readString(Path.of("../content/explanations/generated/distributed-16.md"));
    assertDoesNotThrow(() -> ExplanationImporter.validateSections(deep));
    assertThrows(IllegalArgumentException.class, () ->
      ExplanationImporter.validateSections(deep + "\n后置未编号内容")
    );
    assertThrows(IllegalArgumentException.class, () ->
      ExplanationImporter.validateSections(deep.replace("## 参考分析", "## 其他"))
    );
    assertThrows(IllegalArgumentException.class, () ->
      ExplanationImporter.validateSections(
        deep.replace("### 第二步扩展① 数据库条件更新", "# 数据库条件更新")
      )
    );
    assertThrows(IllegalArgumentException.class, () ->
      ExplanationImporter.validateSections(deep.replace("```sql", "~~~sql"))
    );
  }
}
