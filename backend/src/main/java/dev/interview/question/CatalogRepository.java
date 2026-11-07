package dev.interview.question;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CatalogRepository {

  private final JdbcTemplate db;
  private final QuestionRepository keys;

  CatalogRepository(JdbcTemplate db, QuestionRepository keys) {
    this.db = db;
    this.keys = keys;
  }

  public List<Map<String, Object>> categories() {
    return db.queryForList(
      "SELECT c.id,c.name,c.sort_order,c.deleted,c.archived_name,(SELECT COUNT(*) FROM questions q WHERE q.category_id=c.id AND q.deleted=FALSE) AS question_count FROM categories c WHERE c.deleted=FALSE ORDER BY c.sort_order,c.id"
    );
  }

  public long createCategory(String name, int order) {
    return keys.insert("INSERT INTO categories(name,sort_order) VALUES(?,?)", name, order);
  }

  public boolean renameCategory(long id, String name, int order) {
    return (
      db.update(
        "UPDATE categories SET name=?,sort_order=? WHERE id=? AND deleted=FALSE",
        name,
        order,
        id
      ) > 0
    );
  }

  public boolean lockCategory(long id) {
    return keys.lockCategory(id);
  }

  public long activeQuestions(long id) {
    return db.queryForObject(
      "SELECT COUNT(*) FROM questions WHERE category_id=? AND deleted=FALSE",
      Long.class,
      id
    );
  }

  public void archiveCategory(long id) {
    db.update(
      "UPDATE categories SET archived_name=name,name=?,deleted=TRUE WHERE id=?",
      "__archived__" + UUID.randomUUID(),
      id
    );
  }

  public List<Map<String, Object>> tags() {
    return db.queryForList("SELECT id,name FROM tags ORDER BY name");
  }

  public void createTag(String name) {
    db.update("INSERT INTO tags(name) VALUES(?)", name);
  }

  public boolean renameTag(long id, String name) {
    return db.update("UPDATE tags SET name=? WHERE id=?", name, id) > 0;
  }

  public void deleteTag(long id) {
    db.update("DELETE FROM question_tags WHERE tag_id=?", id);
    db.update("DELETE FROM tags WHERE id=?", id);
  }

  public List<Map<String, Object>> documents() {
    return db.queryForList("SELECT id,title FROM documents ORDER BY id");
  }

  public List<Map<String, Object>> document(long id) {
    return db.queryForList("SELECT id,title,content FROM documents WHERE id=?", id);
  }

  public long createDocument(String title, String content) {
    return keys.insert("INSERT INTO documents(title,content) VALUES(?,?)", title, content);
  }

  public boolean updateDocument(long id, String title, String content) {
    return db.update("UPDATE documents SET title=?,content=? WHERE id=?", title, content, id) > 0;
  }

  public void deleteDocument(long id) {
    db.update("DELETE FROM documents WHERE id=?", id);
  }

  public List<Map<String, Object>> exportDocuments() {
    return db.queryForList("SELECT id,title,content,imported FROM documents ORDER BY id");
  }

  public List<Map<String, Object>> exportQuestions() {
    return db.queryForList(
      "SELECT q.title,q.answer,q.difficulty,c.name AS category FROM questions q JOIN categories c ON c.id=q.category_id WHERE q.deleted=FALSE ORDER BY q.difficulty,c.sort_order,c.id,q.sort_order,q.id"
    );
  }
}
