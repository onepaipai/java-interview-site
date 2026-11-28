package dev.interview.question;

import java.sql.Timestamp;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class LearningRepository {

  private final JdbcTemplate db;

  LearningRepository(JdbcTemplate db) {
    this.db = db;
  }

  public void progress(long user, long id, LearningService.Progress p, Timestamp now) {
    db.update(
      "INSERT INTO progress(user_id,question_id,note) VALUES(?,?,'') ON DUPLICATE KEY UPDATE user_id=user_id",
      user,
      id
    );
    // 排期按自评后的复习次数计算；仅保存笔记/收藏（reviewed=false）不改动既有排期
    Integer count = db.queryForObject(
      "SELECT review_count FROM progress WHERE user_id=? AND question_id=?",
      Integer.class,
      user,
      id
    );
    Timestamp next = null;
    if (p.reviewed()) {
      next = LearningSchedule.next(p.mastery(), count + 1, now);
    }
    db.update(
      "UPDATE progress SET mastery=?,favorite=?,note=?,review_count=review_count+?,reviewed_at=CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE reviewed_at END,next_review=CASE WHEN ? THEN ? ELSE next_review END WHERE user_id=? AND question_id=?",
      p.mastery(),
      p.favorite(),
      p.note(),
      p.reviewed() ? 1 : 0,
      p.reviewed(),
      p.reviewed(),
      next,
      user,
      id
    );
  }

  public Map<String, Object> stats(long user) {
    var stats = db.queryForMap(
      "SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN p.mastery='YES' THEN 1 ELSE 0 END),0) AS mastered,COALESCE(SUM(CASE WHEN p.mastery IN ('NO','PARTIAL') THEN 1 ELSE 0 END),0) AS weak,COALESCE(SUM(CASE WHEN p.mastery IN ('NO','PARTIAL') AND (p.next_review IS NULL OR p.next_review<=CURRENT_TIMESTAMP) THEN 1 ELSE 0 END),0) AS due,COALESCE(SUM(CASE WHEN p.favorite=TRUE THEN 1 ELSE 0 END),0) AS favorites FROM questions q LEFT JOIN progress p ON p.question_id=q.id AND p.user_id=? WHERE q.deleted=FALSE",
      user
    );
    stats.put(
      "categories",
      db.queryForList(
        "SELECT c.name,COUNT(*) AS total,SUM(CASE WHEN p.mastery='YES' THEN 1 ELSE 0 END) AS mastered FROM questions q JOIN categories c ON c.id=q.category_id LEFT JOIN progress p ON p.question_id=q.id AND p.user_id=? WHERE q.deleted=FALSE GROUP BY c.id,c.name ORDER BY total DESC",
        user
      )
    );
    return stats;
  }

  public List<Map<String, Object>> export(long user) {
    return db.queryForList(
      "SELECT q.title,p.* FROM progress p JOIN questions q ON q.id=p.question_id WHERE p.user_id=?",
      user
    );
  }
}
