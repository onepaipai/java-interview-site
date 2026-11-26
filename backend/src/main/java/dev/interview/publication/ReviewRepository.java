package dev.interview.publication;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional
public class ReviewRepository {

  private final JdbcTemplate db;

  public ReviewRepository(JdbcTemplate db) {
    this.db = db;
  }

  public record Row(
    long questionId,
    String sourceKey,
    String title,
    String answerSha256,
    String status,
    String applicableVersion,
    String evidence,
    String reviewer,
    String updatedAt
  ) {}

  public List<Row> list() {
    return db.query(
      "SELECT q.id,q.source_key,q.title,p.answer_hash,COALESCE(r.status,'pending') AS status,COALESCE(r.applicable_version,'') AS applicable_version,COALESCE(r.evidence,'[]') AS evidence,COALESCE(r.reviewer,'') AS reviewer,r.updated_at FROM questions q JOIN explanation_publications p ON p.question_id=q.id LEFT JOIN explanation_reviews r ON r.source_key=q.source_key WHERE q.source_key IS NOT NULL ORDER BY q.id",
      (rs, rowNum) ->
        new Row(
          rs.getLong("id"),
          rs.getString("source_key"),
          rs.getString("title"),
          rs.getString("answer_hash"),
          rs.getString("status"),
          rs.getString("applicable_version"),
          rs.getString("evidence"),
          rs.getString("reviewer"),
          rs.getString("updated_at")
        )
    );
  }

  public void upsert(
    String sourceKey,
    String answerSha256,
    String status,
    String applicableVersion,
    String evidence,
    String reviewer
  ) {
    int updated = db.update(
      "UPDATE explanation_reviews SET answer_sha256=?,status=?,applicable_version=?,evidence=?,reviewer=?,updated_at=CURRENT_TIMESTAMP WHERE source_key=?",
      answerSha256,
      status,
      applicableVersion,
      evidence,
      reviewer,
      sourceKey
    );
    if (updated == 0) db.update(
      "INSERT INTO explanation_reviews(source_key,answer_sha256,status,applicable_version,evidence,reviewer,updated_at) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)",
      sourceKey,
      answerSha256,
      status,
      applicableVersion,
      evidence,
      reviewer
    );
  }
}
