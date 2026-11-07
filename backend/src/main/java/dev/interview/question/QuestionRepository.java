package dev.interview.question;

import static org.springframework.http.HttpStatus.*;

import dev.interview.shared.MarkdownImporter;
import java.sql.*;
import java.util.*;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.support.*;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

@Repository
public class QuestionRepository {

  public Map<String, Object> snapshot(long user, boolean trash, int page, int size) {
    if (page < 1 || page > 100000 || size < 1 || size > 100) throw new IllegalArgumentException();
    var rows = db.queryForList(
      "SELECT q.id,q.title,q.category_id,q.difficulty,q.answer,q.sort_order,q.deleted,q.version,q.source_key,q.created_at,q.updated_at,COALESCE(c.archived_name,c.name) AS category,COALESCE(p.mastery,'NEW') AS mastery,COALESCE(p.favorite,FALSE) AS favorite,COALESCE(p.note,'') AS note FROM questions q JOIN categories c ON c.id=q.category_id LEFT JOIN progress p ON p.question_id=q.id AND p.user_id=? WHERE q.deleted=? ORDER BY q.id LIMIT ? OFFSET ?",
      user,
      trash,
      size,
      (page - 1) * size
    );
    for (var row : rows) row.put("tags", tags(((Number) row.get("id")).longValue()));
    return Map.of(
      "items",
      rows,
      "total",
      db.queryForObject("SELECT COUNT(*) FROM questions WHERE deleted=?", Long.class, trash),
      "page",
      page,
      "size",
      size
    );
  }

  final JdbcTemplate db;
  final QuestionSearchIndex searchIndex;

  QuestionRepository(JdbcTemplate db, QuestionSearchIndex searchIndex) {
    this.db = db;
    this.searchIndex = searchIndex;
  }

  public long insert(String sql, Object... args) {
    KeyHolder key = new GeneratedKeyHolder();
    db.update(c -> {
      PreparedStatement p = c.prepareStatement(sql, new String[] { "id" });
      for (int i = 0; i < args.length; i++) p.setObject(i + 1, args[i]);
      return p;
    }, key);
    return Objects.requireNonNull(key.getKey()).longValue();
  }

  public long answerLength(long id) {
    var value = db.queryForObject(
      "SELECT LENGTH(answer) FROM questions WHERE id=?",
      Long.class,
      id
    );
    return value == null ? 0 : value;
  }

  public long category(String name) {
    var ids = db.queryForList("SELECT id FROM categories WHERE name=?", Long.class, name);
    return ids.isEmpty() ? insert("INSERT INTO categories(name) VALUES(?)", name) : ids.get(0);
  }

  public Map<String, Object> question(long id, long user, boolean trash) {
    var rows = db.queryForList(
      "SELECT q.*,COALESCE(c.archived_name,c.name) AS category,COALESCE(p.mastery,'NEW') AS mastery,COALESCE(p.favorite,FALSE) AS favorite,COALESCE(p.note,'') AS note,COALESCE(p.review_count,0) AS review_count FROM questions q JOIN categories c ON c.id=q.category_id LEFT JOIN progress p ON p.question_id=q.id AND p.user_id=? WHERE q.id=? AND q.deleted=?",
      user,
      id,
      trash
    );
    if (rows.isEmpty()) throw new ResponseStatusException(NOT_FOUND, "题目不存在");
    var row = rows.get(0);
    row.put("tags", tags(id));
    return row;
  }

  List<String> tags(long id) {
    return db.queryForList(
      "SELECT t.name FROM tags t JOIN question_tags qt ON qt.tag_id=t.id WHERE qt.question_id=? ORDER BY t.name",
      String.class,
      id
    );
  }

  static String searchTerm(String search) {
    return (
      "%" +
      search.toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_") +
      "%"
    );
  }

  public Map<String, Integer> location(
    long id,
    Long category,
    String search,
    boolean global,
    boolean weak,
    long user,
    int size
  ) {
    validateSearch(search);
    if (size < 1 || size > 100) throw new IllegalArgumentException();
    var found = db.queryForList(
      "SELECT category_id FROM questions WHERE id=? AND deleted=FALSE",
      Long.class,
      id
    );
    if (found.isEmpty()) throw new ResponseStatusException(NOT_FOUND, "题目不存在");
    if (!global && !weak && category == null) category = found.get(0);
    var args = new ArrayList<Object>();
    String sql =
      "SELECT q.id FROM questions q JOIN categories c ON c.id=q.category_id WHERE q.deleted=FALSE";
    if (category != null) {
      sql += " AND q.category_id=?";
      args.add(category);
    }
    if (weak) {
      sql +=
        " AND EXISTS(SELECT 1 FROM progress p WHERE p.question_id=q.id AND p.user_id=? AND p.mastery IN ('NO','PARTIAL'))";
      args.add(user);
    }
    List<Long> ids;
    if (search.isBlank()) ids = db.queryForList(
      sql + " ORDER BY c.sort_order,c.id,q.sort_order,q.id",
      Long.class,
      args.toArray()
    );
    else ids = QuestionSearchIndex.order(
      db.queryForList(
        sql + " ORDER BY c.sort_order,c.id,q.sort_order,q.id",
        Long.class,
        args.toArray()
      ),
      searchIndex.snapshot(),
      search
    );
    int position = ids.indexOf(id);
    if (position < 0) throw new ResponseStatusException(NOT_FOUND, "当前筛选中没有该题目");
    return Map.of("page", position / size + 1, "index", position, "total", ids.size());
  }

  public Map<String, Object> list(
    long user,
    String search,
    Long category,
    String difficulty,
    String mastery,
    String tag,
    boolean favorite,
    boolean weak,
    boolean trash,
    int page,
    int size
  ) {
    validateSearch(search);
    if (page < 1 || page > 100000 || size < 1 || size > 100) throw new IllegalArgumentException();
    var args = new ArrayList<Object>();
    args.add(user);
    args.add(trash);
    String where =
      " FROM questions q JOIN categories c ON c.id=q.category_id LEFT JOIN progress p ON p.question_id=q.id AND p.user_id=? WHERE q.deleted=?";
    if (category != null) {
      where += " AND q.category_id=?";
      args.add(category);
    }
    if (!difficulty.isBlank()) {
      where += " AND q.difficulty=?";
      args.add(difficulty);
    }
    if (!mastery.isBlank()) {
      where += " AND COALESCE(p.mastery,'NEW')=?";
      args.add(mastery);
    }
    if (!tag.isBlank()) {
      where +=
        " AND EXISTS(SELECT 1 FROM question_tags qt JOIN tags t ON t.id=qt.tag_id WHERE qt.question_id=q.id AND t.name=?)";
      args.add(tag);
    }
    if (favorite) where += " AND p.favorite=TRUE";
    if (weak) where += " AND p.mastery IN ('NO','PARTIAL')";
    List<Long> ranked = null;
    var projection = searchIndex.snapshot();
    if (!search.isBlank()) ranked = QuestionSearchIndex.order(
      db.queryForList(
        "SELECT q.id" + where + " ORDER BY c.sort_order,c.id,q.sort_order,q.id",
        Long.class,
        args.toArray()
      ),
      projection,
      search
    );
    long total =
      ranked == null
        ? db.queryForObject("SELECT COUNT(*)" + where, Long.class, args.toArray())
        : ranked.size();
    List<Long> pageIds =
      ranked == null
        ? null
        : ranked
            .stream()
            .skip((long) (page - 1) * size)
            .limit(size)
            .toList();
    if (pageIds != null) {
      if (pageIds.isEmpty()) return Map.of(
        "items",
        List.of(),
        "total",
        total,
        "page",
        page,
        "size",
        size
      );
      where += " AND q.id IN (" + String.join(",", Collections.nCopies(pageIds.size(), "?")) + ")";
      args.addAll(pageIds);
    }
    args.add(size);
    args.add(pageIds == null ? (page - 1) * size : 0);
    var rows = db.queryForList(
      "SELECT q.id,q.title,q.category_id,q.difficulty,q.sort_order,q.version,CHAR_LENGTH(q.answer)>0 AS answered,COALESCE(c.archived_name,c.name) AS category,COALESCE(p.mastery,'NEW') AS mastery,COALESCE(p.favorite,FALSE) AS favorite" +
        where +
        " ORDER BY c.sort_order,c.id,q.sort_order,q.id LIMIT ? OFFSET ?",
      args.toArray()
    );
    if (pageIds != null) {
      // IDs have already been paginated before fetching their full records.
      rows.sort(
        Comparator.comparingInt(row -> pageIds.indexOf(((Number) row.get("id")).longValue()))
      );
    }
    // Load tags once per page instead of one query per question.
    var pageTags = new HashMap<Long, List<String>>();
    if (!rows.isEmpty()) {
      String placeholders = String.join(",", Collections.nCopies(rows.size(), "?"));
      Object[] ids = rows
        .stream()
        .map(row -> row.get("id"))
        .toArray();
      db.query(
        "SELECT qt.question_id,t.name FROM tags t JOIN question_tags qt ON qt.tag_id=t.id WHERE qt.question_id IN (" +
          placeholders +
          ") ORDER BY t.name",
        r -> {
          pageTags.computeIfAbsent(r.getLong(1), key -> new ArrayList<>()).add(r.getString(2));
        },
        ids
      );
    }
    rows.forEach(row -> {
      long id = ((Number) row.get("id")).longValue();
      row.put("tags", pageTags.getOrDefault(id, List.of()));
      row.put("preview", QuestionSearchIndex.excerpt(projection.get(id), search));
    });
    return Map.of("items", rows, "total", total, "page", page, "size", size);
  }

  static void validateSearch(String search) {
    if (search == null || search.length() > 3000) throw new IllegalArgumentException(
      "搜索词不能超过 3000 字符"
    );
  }

  public boolean lockCategory(long id) {
    return !db
      .queryForList(
        "SELECT id FROM categories WHERE id=? AND deleted=FALSE FOR UPDATE",
        Long.class,
        id
      )
      .isEmpty();
  }

  public long write(Long id, QuestionService.Edit e) {
    if (id == null) return insert(
      "INSERT INTO questions(title,category_id,difficulty,answer,sort_order) VALUES(?,?,?,?,?)",
      e.title().strip(),
      e.categoryId(),
      e.difficulty(),
      e.answer(),
      e.sortOrder()
    );
    if (
      e.version() == null ||
      db.update(
        "UPDATE questions SET title=?,category_id=?,difficulty=?,answer=?,sort_order=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND deleted=FALSE",
        e.title().strip(),
        e.categoryId(),
        e.difficulty(),
        e.answer(),
        e.sortOrder(),
        id,
        e.version()
      ) == 0
    ) throw new ResponseStatusException(CONFLICT, "题目已被修改或删除，请重新加载后编辑");
    return id;
  }

  public void replaceTags(long id, List<String> tags) {
    db.update("DELETE FROM question_tags WHERE question_id=?", id);
    for (String name : new LinkedHashSet<>(tags.stream().map(String::strip).toList())) {
      db.update("INSERT INTO tags(name) VALUES(?) ON DUPLICATE KEY UPDATE name=name", name);
      long tag = db.queryForObject("SELECT id FROM tags WHERE name=?", Long.class, name);
      db.update("INSERT INTO question_tags(question_id,tag_id) VALUES(?,?)", id, tag);
    }
  }

  public List<Map<String, Object>> imported(String key) {
    return db.queryForList("SELECT id,deleted,version FROM questions WHERE source_key=?", key);
  }

  public void sourceKey(long id, String key) {
    db.update("UPDATE questions SET source_key=? WHERE id=?", key, id);
  }

  public void importDocument(MarkdownImporter.Document d, String mode) {
    int count = db.queryForObject(
      "SELECT COUNT(*) FROM documents WHERE title=?",
      Integer.class,
      d.title()
    );
    if (count == 0) db.update(
      "INSERT INTO documents(title,content,imported) VALUES(?,?,TRUE)",
      d.title(),
      d.content()
    );
    else if (mode.equals("update")) db.update(
      "UPDATE documents SET content=?,imported=TRUE WHERE title=?",
      d.content(),
      d.title()
    );
  }

  public void markImported(List<MarkdownImporter.Document> documents) {
    for (var d : documents)
      db.update(
        "UPDATE documents SET imported=TRUE WHERE title=? AND content=? AND imported=FALSE",
        d.title(),
        d.content()
      );
  }

  public boolean delete(long id) {
    return (
      db.update(
        "UPDATE questions SET deleted=TRUE,version=version+1 WHERE id=? AND deleted=FALSE",
        id
      ) == 1
    );
  }

  public void restore(long id) {
    var categories = db.queryForList(
      "SELECT category_id FROM questions WHERE id=? AND deleted=TRUE",
      Long.class,
      id
    );
    if (categories.isEmpty()) throw new ResponseStatusException(NOT_FOUND, "回收站中没有该题");
    if (!lockCategory(categories.get(0))) throw new ResponseStatusException(
      CONFLICT,
      "题目所属模块已归档，需先重新安排模块后恢复"
    );
    if (
      db.update(
        "UPDATE questions SET deleted=FALSE,version=version+1 WHERE id=? AND deleted=TRUE",
        id
      ) == 0
    ) throw new ResponseStatusException(NOT_FOUND, "回收站中没有该题");
  }
}
