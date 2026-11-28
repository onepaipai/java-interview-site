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

  private static final String SELECT_ROW =
    "SELECT q.id,q.source_key,q.title,p.answer_hash,COALESCE(r.status,'pending') AS status,COALESCE(r.applicable_version,'') AS applicable_version,COALESCE(r.evidence,'[]') AS evidence,COALESCE(r.reviewer,'') AS reviewer,r.updated_at FROM questions q JOIN explanation_publications p ON p.question_id=q.id LEFT JOIN explanation_reviews r ON r.source_key=q.source_key";

  private static final String ROW_STATUS = "COALESCE(r.status,'pending')";

  private Row mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
    return new Row(
      rs.getLong("id"),
      rs.getString("source_key"),
      rs.getString("title"),
      rs.getString("answer_hash"),
      rs.getString("status"),
      rs.getString("applicable_version"),
      rs.getString("evidence"),
      rs.getString("reviewer"),
      rs.getString("updated_at")
    );
  }

  /** 单条定位：保存审核结论时不再全量拉取列表。 */
  public Row findBySourceKey(String sourceKey) {
    var rows = db.query(
      SELECT_ROW + " WHERE q.source_key=?",
      (rs, rowNum) -> mapRow(rs),
      sourceKey
    );
    return rows.isEmpty() ? null : rows.get(0);
  }

  /** 按状态过滤的分页列表；status 为 null 时返回全部。 */
  public List<Row> list(String status, int size, long offset) {
    var args = new ArrayList<Object>();
    String where = "";
    if (status != null) {
      where = " WHERE " + ROW_STATUS + "=?";
      args.add(status);
    }
    args.add(size);
    args.add(offset);
    return db.query(
      SELECT_ROW + where + " ORDER BY q.id LIMIT ? OFFSET ?",
      (rs, rowNum) -> mapRow(rs),
      args.toArray()
    );
  }

  public long count(String status) {
    if (status == null) {
      return db.queryForObject(
        "SELECT COUNT(*) FROM questions q JOIN explanation_publications p ON p.question_id=q.id",
        Long.class
      );
    }
    return db.queryForObject(
      "SELECT COUNT(*) FROM questions q JOIN explanation_publications p ON p.question_id=q.id LEFT JOIN explanation_reviews r ON r.source_key=q.source_key WHERE " +
        ROW_STATUS +
        "=?",
      Long.class,
      status
    );
  }

  /** 全量状态聚合，供统计标签使用；与列表过滤条件无关。 */
  public Map<String, Integer> counts() {
    var result = new LinkedHashMap<String, Integer>();
    db.query(
      "SELECT " +
        ROW_STATUS +
        " AS status,COUNT(*) AS total FROM questions q JOIN explanation_publications p ON p.question_id=q.id LEFT JOIN explanation_reviews r ON r.source_key=q.source_key GROUP BY " +
        ROW_STATUS,
      row -> {
        result.put(row.getString("status"), row.getInt("total"));
      }
    );
    return result;
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
