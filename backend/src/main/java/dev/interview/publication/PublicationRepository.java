package dev.interview.publication;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PublicationRepository {

  private final JdbcTemplate db;

  public PublicationRepository(JdbcTemplate db) {
    this.db = db;
  }

  public record Baseline(
    long id,
    String title,
    int version,
    String answer,
    boolean deleted,
    String packVersion,
    String hash
  ) {}

  public List<Baseline> baselines() {
    return db.query(
      "SELECT q.id,q.title,q.version,q.answer,q.deleted,p.pack_version,p.answer_hash FROM questions q JOIN explanation_publications p ON p.question_id=q.id ORDER BY q.id",
      (row, n) ->
        new Baseline(
          row.getLong(1),
          row.getString(2),
          row.getInt(3),
          row.getString(4),
          row.getBoolean(5),
          row.getString(6),
          row.getString(7)
        )
    );
  }

  public String version() {
    return db.queryForObject(
      "SELECT pack_version FROM explanation_pack_state WHERE id=1",
      String.class
    );
  }
}
