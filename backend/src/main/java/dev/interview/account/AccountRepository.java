package dev.interview.account;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AccountRepository {

  private final JdbcTemplate db;

  AccountRepository(JdbcTemplate db) {
    this.db = db;
  }

  public long id(String name) {
    return db
      .queryForList("SELECT id FROM accounts WHERE username=?", Long.class, name)
      .stream()
      .findFirst()
      .orElseThrow(() ->
        new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.UNAUTHORIZED,
          "账号已失效，请重新登录"
        )
      );
  }

  public Map<String, Object> me(String name) {
    return db.queryForMap(
      "SELECT id,username,role,last_question FROM accounts WHERE username=?",
      name
    );
  }

  public void health() {
    db.queryForObject("SELECT 1", Integer.class);
  }

  public boolean questionExists(long id) {
    return (
      db.queryForObject(
        "SELECT COUNT(*) FROM questions WHERE id=? AND deleted=FALSE",
        Integer.class,
        id
      ) > 0
    );
  }

  public void position(long id, long question) {
    db.update("UPDATE accounts SET last_question=? WHERE id=?", question, id);
  }

  public String password(long id) {
    return db.queryForObject("SELECT password FROM accounts WHERE id=?", String.class, id);
  }

  public void password(long id, String hash) {
    db.update("UPDATE accounts SET password=? WHERE id=?", hash, id);
  }

  public List<Map<String, Object>> accounts() {
    return db.queryForList("SELECT id,username,role,created_at FROM accounts ORDER BY id");
  }

  public void create(String username, String password) {
    db.update(
      "INSERT INTO accounts(username,password,role) VALUES(?,?,'USER')",
      username,
      password
    );
  }

  public Map<String, Object> account(long id) {
    return db
      .queryForList("SELECT username,role FROM accounts WHERE id=?", id)
      .stream()
      .findFirst()
      .orElseThrow(() ->
        new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.NOT_FOUND,
          "账号不存在"
        )
      );
  }

  public void rename(long id, String name) {
    db.update("UPDATE accounts SET username=? WHERE id=?", name, id);
  }

  public void delete(long id) {
    db.update("DELETE FROM progress WHERE user_id=?", id);
    db.update("DELETE FROM accounts WHERE id=?", id);
  }
}
