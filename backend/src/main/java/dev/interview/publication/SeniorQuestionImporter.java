package dev.interview.publication;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.interview.question.QuestionService;
import dev.interview.shared.MarkdownImporter;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** An additive, versioned content pack: edits and deliberate deletions always win. */
@Service
public class SeniorQuestionImporter {

  private final ObjectMapper json;
  private final JdbcTemplate db;
  private final QuestionService questions;

  SeniorQuestionImporter(ObjectMapper json, JdbcTemplate db, QuestionService questions) {
    this.json = json;
    this.db = db;
    this.questions = questions;
  }

  public record Module(String id, String category, String file, List<String> references) {}

  public record Manifest(String version, String audience, List<Module> modules) {}

  private record Entry(Module module, int number, String title, String answer) {}

  public List<Module> modules(Path manifest) throws java.io.IOException {
    return json.readValue(manifest.toFile(), Manifest.class).modules();
  }

  public static String sourceKey(String module, int number) {
    return MarkdownImporter.key("senior-v1/" + module + "/" + number);
  }

  @Transactional
  public int importAll(Path manifestPath) throws java.io.IOException {
    if (!Files.isRegularFile(manifestPath)) return 0;
    var manifest = json.readValue(manifestPath.toFile(), Manifest.class);
    // 模块数量由清单数据决定，只要求非空；逐模块仍受文件内容校验与最少行数门约束。
    if (
      !"senior-v1".equals(manifest.version()) ||
      manifest.modules() == null ||
      manifest.modules().isEmpty()
    ) throw new IllegalArgumentException("高级题包版本或模块清单无效");
    Path root = manifestPath.toAbsolutePath().normalize().getParent();
    var entries = new ArrayList<Entry>();
    var moduleIds = new HashSet<String>();
    for (var module : manifest.modules()) {
      if (
        !module.id().matches("[a-z0-9-]+") || !moduleIds.add(module.id())
      ) throw new IllegalArgumentException("重复的题包模块");
      Path file = root.resolve(module.file()).normalize();
      if (!file.startsWith(root)) throw new IllegalArgumentException("无效题包路径");
      var lines = Files.readAllLines(file, StandardCharsets.UTF_8)
        .stream()
        .filter(l -> !l.isBlank())
        .toList();
      if (lines.size() < 50) throw new IllegalArgumentException(module.id() + " 至少需要 50 道题");
      var titles = new HashSet<String>();
      for (int i = 0; i < lines.size(); i++) {
        String[] fields = lines.get(i).split("\t", -1);
        if (
          fields.length != 2 ||
          fields[0].isBlank() ||
          fields[0].length() > 1000 ||
          fields[1].length() < 40 ||
          !titles.add(fields[0])
        ) throw new IllegalArgumentException(module.id() + " 第 " + (i + 1) + " 题内容无效");
        entries.add(new Entry(module, i + 1, fields[0], fields[1]));
      }
    }
    int added = 0;
    var categories = new HashMap<String, Long>();
    var orders = new HashMap<Long, Integer>();
    for (var entry : entries) {
      String key = sourceKey(entry.module().id(), entry.number());
      if (
        db.queryForObject("SELECT COUNT(*) FROM questions WHERE source_key=?", Integer.class, key) >
        0
      ) continue;
      Long category = categories.get(entry.module().id());
      if (category == null) {
        // Follow an existing pack through a module rename; do not recreate archived modules.
        var existing = db.queryForList(
          "SELECT q.category_id FROM questions q JOIN categories c ON c.id=q.category_id WHERE q.source_key=? AND c.deleted=FALSE",
          Long.class,
          sourceKey(entry.module().id(), 1)
        );
        var named = db.queryForList(
          "SELECT id FROM categories WHERE name=? AND deleted=FALSE",
          Long.class,
          entry.module().category()
        );
        if (existing.isEmpty() && named.isEmpty()) continue;
        category = existing.isEmpty() ? named.get(0) : existing.get(0);
        categories.put(entry.module().id(), category);
      }
      long categoryId = category;
      int order =
        orders.computeIfAbsent(categoryId, id ->
          db.queryForObject(
            "SELECT COALESCE(MAX(sort_order),0) FROM questions WHERE category_id=?",
            Integer.class,
            id
          )
        ) + 1;
      orders.put(categoryId, order);
      String answer = "### 参考要点\n\n" + entry.answer().replace("；", "。\n\n");
      long id = questions.save(
        null,
        new QuestionService.Edit(
          entry.title(),
          categoryId,
          entry.module().id().equals("system-design") ? "专家" : "高级",
          answer,
          order,
          List.of("7–10 年", "经典面试", "senior-v1"),
          null
        )
      );
      db.update("UPDATE questions SET source_key=? WHERE id=?", key, id);
      added++;
    }
    return added;
  }
}
