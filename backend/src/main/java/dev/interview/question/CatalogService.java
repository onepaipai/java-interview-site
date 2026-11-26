package dev.interview.question;

import static org.springframework.http.HttpStatus.*;

import dev.interview.shared.KnowledgeChanged;
import java.util.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CatalogService {

  private final CatalogRepository repository;
  private final ApplicationEventPublisher events;

  CatalogService(CatalogRepository repository, ApplicationEventPublisher events) {
    this.repository = repository;
    this.events = events;
  }

  private static String name(String name, int max) {
    if (name == null || name.isBlank() || name.length() > max) throw new IllegalArgumentException();
    return name.strip();
  }

  public List<Map<String, Object>> categories() {
    return repository.categories();
  }

  public List<Map<String, Object>> archived() {
    return repository.archivedCategories();
  }

  @Transactional
  public void restore(long id) {
    if (!repository.lockArchivedCategory(id)) throw new ResponseStatusException(
      NOT_FOUND,
      "归档模块不存在"
    );
    String name = repository.archivedName(id);
    if (
      name == null || name.isBlank() || repository.nameTaken(name)
    ) throw new ResponseStatusException(CONFLICT, "同名模块已存在，无法取消归档");
    repository.restoreCategory(id);
    events.publishEvent(new KnowledgeChanged(null));
  }

  public List<Map<String, Object>> tags() {
    return repository.tags();
  }

  @Transactional
  public long category(String name, Integer order) {
    return repository.createCategory(name(name, 200), order == null ? 0 : order);
  }

  @Transactional
  public void category(long id, String name, Integer order) {
    if (
      !repository.renameCategory(id, name(name, 200), order == null ? 0 : order)
    ) throw new ResponseStatusException(NOT_FOUND, "分类不存在");
  }

  @Transactional
  public void archive(long id) {
    if (!repository.lockCategory(id)) throw new ResponseStatusException(NOT_FOUND, "模块不存在");
    if (repository.activeQuestions(id) > 0) throw new ResponseStatusException(
      CONFLICT,
      "模块仍有题目，请先将题目移到其他模块"
    );
    repository.archiveCategory(id);
    events.publishEvent(new KnowledgeChanged(null));
  }

  @Transactional
  public void tag(String name) {
    repository.createTag(name(name, 80));
  }

  @Transactional
  public void tag(long id, String name) {
    if (!repository.renameTag(id, name(name, 80))) throw new ResponseStatusException(
      NOT_FOUND,
      "标签不存在"
    );
  }

  @Transactional
  public void deleteTag(long id) {
    repository.deleteTag(id);
  }

  public List<Map<String, Object>> documents() {
    return repository.documents();
  }

  public Map<String, Object> document(long id) {
    return repository
      .document(id)
      .stream()
      .findFirst()
      .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "资料不存在"));
  }

  private static void document(String title, String content) {
    name(title, 200);
    // 与导入/导出链路上限对齐:预留至 6MB
    if (content == null || content.length() > 6_000_000) throw new IllegalArgumentException();
  }

  @Transactional
  public long createDocument(String title, String content) {
    document(title, content);
    long id = repository.createDocument(title, content);
    events.publishEvent(new KnowledgeChanged("seed:" + id));
    return id;
  }

  @Transactional
  public void updateDocument(long id, String title, String content) {
    document(title, content);
    if (!repository.updateDocument(id, title, content)) throw new ResponseStatusException(
      NOT_FOUND,
      "资料不存在"
    );
    events.publishEvent(new KnowledgeChanged("seed:" + id));
  }

  @Transactional
  public void deleteDocument(long id) {
    repository.deleteDocument(id);
    events.publishEvent(new KnowledgeChanged("seed:" + id));
  }

  public List<Map<String, Object>> exportDocuments() {
    return repository.exportDocuments();
  }

  public String export() {
    var out = new StringBuilder("# Java 面试题库\n\n");
    String group = "";
    int number = 1;
    for (var q : repository.exportQuestions()) {
      String current = q.get("difficulty") + " / " + q.get("category");
      if (!group.equals(current)) {
        group = current;
        out
          .append("\n## ")
          .append(q.get("difficulty"))
          .append("\n### ")
          .append(q.get("category"))
          .append("\n\n");
      }
      out.append(number++).append(". ").append(q.get("title")).append("\n");
      for (String line : q.get("answer").toString().split("\n", -1))
        out.append("    ").append(line).append("\n");
      out.append("\n");
    }
    return out.toString();
  }
}
