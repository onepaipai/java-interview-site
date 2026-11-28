package dev.interview.question;

import static org.springframework.http.HttpStatus.*;

import dev.interview.shared.KnowledgeChanged;
import dev.interview.shared.MarkdownImporter;
import java.sql.*;
import java.util.*;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.support.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class QuestionService {

  public Map<String, Object> snapshot(long user, boolean trash, int page, int size) {
    return repository.snapshot(user, trash, page, size);
  }

  final QuestionRepository repository;
  final QuestionSearchIndex index;

  @org.springframework.beans.factory.annotation.Value(
    "${app.search.max-answer-characters:20000000}"
  )
  long maxAnswerCharacters;

  @org.springframework.beans.factory.annotation.Autowired
  org.springframework.context.ApplicationEventPublisher events;

  QuestionService(QuestionRepository repository, QuestionSearchIndex index) {
    this.repository = repository;
    this.index = index;
  }

  public long insert(String sql, Object... args) {
    return repository.insert(sql, args);
  }

  public long category(String name) {
    return repository.category(name);
  }

  public Map<String, Object> question(long id, long user, boolean trash) {
    return repository.question(id, user, trash);
  }

  public List<String> tags(long id) {
    return repository.tags(id);
  }

  public static String searchTerm(String search) {
    return QuestionRepository.searchTerm(search);
  }

  public Map<String, Integer> location(
    long id,
    Long category,
    String search,
    boolean global,
    int size
  ) {
    return location(id, category, search, global, false, 0, size);
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
    return repository.location(id, category, search, global, weak, user, size);
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
    return repository.list(
      user,
      search,
      category,
      difficulty,
      mastery,
      tag,
      favorite,
      weak,
      trash,
      page,
      size
    );
  }

  @Transactional
  public void delete(long id) {
    if (!repository.delete(id)) throw new ResponseStatusException(NOT_FOUND, "题目不存在");
    events.publishEvent(new KnowledgeChanged("question:" + id));
  }

  @Transactional
  public void restore(long id) {
    repository.restore(id);
    events.publishEvent(new KnowledgeChanged("question:" + id));
  }

  public record Edit(
    String title,
    long categoryId,
    String difficulty,
    String answer,
    int sortOrder,
    List<String> tags,
    Integer version
  ) {}

  static void validateSearch(String search) {
    if (search == null || search.length() > 3000) throw new IllegalArgumentException(
      "搜索词不能超过 3000 字符"
    );
  }

  void validate(Edit e) {
    if (
      e == null ||
      e.title() == null ||
      e.title().isBlank() ||
      e.title().length() > 1000 ||
      e.answer() == null ||
      e.answer().length() > 200000 ||
      e.difficulty() == null ||
      !List.of("基础", "进阶", "高级", "专家").contains(e.difficulty()) ||
      e.tags() == null ||
      e.tags().size() > 20 ||
      e
        .tags()
        .stream()
        .anyMatch(t -> t == null || t.isBlank() || t.length() > 80)
    ) throw new IllegalArgumentException();
    if (!repository.lockCategory(e.categoryId())) throw new ResponseStatusException(
      BAD_REQUEST,
      "请选择有效分类"
    );
  }

  @Transactional
  public Map<String, Integer> moveQuestions(List<Long> ids, long categoryId) {
    if (
      ids == null ||
      ids.isEmpty() ||
      ids.size() > 1000 ||
      ids.stream().anyMatch(Objects::isNull) ||
      new HashSet<>(ids).size() != ids.size()
    ) throw new IllegalArgumentException();
    if (!repository.lockCategory(categoryId)) throw new ResponseStatusException(
      BAD_REQUEST,
      "请选择有效分类"
    );
    int moved = repository.bulkMove(ids, categoryId);
    if (moved != ids.size()) throw new ResponseStatusException(
      CONFLICT,
      "部分题目不存在或已删除，请重新选择后重试"
    );
    for (long id : ids) events.publishEvent(new KnowledgeChanged("question:" + id));
    return Map.of("moved", moved, "skipped", 0);
  }

  @Transactional
  public long save(Long id, Edit e) {
    validate(e);
    Long current = id == null ? null : repository.answerLength(id);
    if (id != null && current == null) throw new ResponseStatusException(NOT_FOUND, "题目不存在");
    long projected =
      index.answerCharacters() -
      (current == null ? 0 : current) +
      (e.answer() == null ? 0 : e.answer().length());
    if (projected > maxAnswerCharacters) throw new ResponseStatusException(
      PAYLOAD_TOO_LARGE,
      "题库内容总量已达上限，无法继续保存"
    );
    id = repository.write(id, e);
    repository.replaceTags(id, e.tags());
    events.publishEvent(new KnowledgeChanged("question:" + id));
    return id;
  }

  @Transactional
  public Map<String, Integer> importItems(
    List<MarkdownImporter.Item> items,
    List<MarkdownImporter.Document> documents,
    String mode
  ) {
    if (
      mode == null ||
      !List.of("skip", "update").contains(mode) ||
      items == null ||
      items.size() > 5000 ||
      documents == null ||
      documents.size() > 1000 ||
      items.stream().anyMatch(Objects::isNull) ||
      documents.stream().anyMatch(Objects::isNull)
    ) throw new IllegalArgumentException();
    int added = 0,
      updated = 0,
      skipped = 0;
    Set<String> seen = new HashSet<>();
    for (var i : items) {
      if (
        i.sourceKey() == null ||
        !i.sourceKey().matches("[a-f0-9]{64}") ||
        !seen.add(i.sourceKey()) ||
        i.category() == null ||
        i.category().isBlank() ||
        i.category().length() > 200
      ) throw new ResponseStatusException(BAD_REQUEST, "导入项的分类或唯一标识无效/重复");
      var existing = repository.imported(i.sourceKey());
      long cid = category(i.category());
      var e = new Edit(
        i.title(),
        cid,
        i.difficulty(),
        i.answer(),
        i.sortOrder(),
        i.tags(),
        existing.isEmpty() ? null : ((Number) existing.get(0).get("version")).intValue()
      );
      validate(e);
      if (existing.isEmpty()) {
        long id = save(null, e);
        repository.sourceKey(id, i.sourceKey());
        added++;
      } else if (mode.equals("update") && !Boolean.TRUE.equals(existing.get(0).get("deleted"))) {
        save(((Number) existing.get(0).get("id")).longValue(), e);
        updated++;
      } else skipped++;
    }
    for (var d : documents) {
      if (
        d.title() == null ||
        d.title().isBlank() ||
        d.title().length() > 200 ||
        d.content() == null ||
        d.content().length() > 2_000_000
      ) throw new IllegalArgumentException();
      repository.importDocument(d, mode);
    }
    markImportedDocuments(documents);
    events.publishEvent(new KnowledgeChanged(null));
    return Map.of("added", added, "updated", updated, "skipped", skipped);
  }

  public void markImportedDocuments(List<MarkdownImporter.Document> documents) {
    repository.markImported(documents);
  }
}
