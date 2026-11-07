package dev.interview.knowledge;

import static org.springframework.http.HttpStatus.NOT_FOUND;

import dev.interview.question.QuestionSearch;
import dev.interview.shared.KnowledgeChanged;
import dev.interview.shared.MarkdownImporter;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

/** Reconciles committed source changes; ordinary reads do not rescan the question bank. */
@Component
public class KnowledgeIndex {

  private final JdbcTemplate db;
  private final MarkdownImporter parser;
  private final TransactionTemplate transaction;
  private final Set<String> dirty = new HashSet<>();
  private boolean reconcile = true;
  private long revision;

  KnowledgeIndex(JdbcTemplate db, MarkdownImporter parser, PlatformTransactionManager manager) {
    this.db = db;
    this.parser = parser;
    this.transaction = new TransactionTemplate(manager);
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
  public synchronized void changed(KnowledgeChanged change) {
    if (change.source() == null) reconcile = true;
    else dirty.add(change.source());
  }

  public synchronized long refresh(boolean force) {
    if (force) reconcile = true;
    if (!reconcile && dirty.isEmpty()) return revision;
    transaction.executeWithoutResult(status -> {
      if (reconcile) {
        var sources = new ArrayList<Source>();
        sources.addAll(questions(null));
        sources.addAll(documents(null));
        sources.addAll(uploads(null));
        var fingerprints = new HashMap<String, String>();
        db.query("SELECT DISTINCT source_key,fingerprint FROM ai_chunks", r -> {
          fingerprints.put(r.getString(1), r.getString(2));
        });
        for (var source : sources) {
          write(source, fingerprints.remove(source.key()));
        }
        for (String obsolete : fingerprints.keySet()) remove(obsolete);
      } else {
        for (String key : dirty) {
          long id = Long.parseLong(key.substring(key.indexOf(':') + 1));
          var sources = key.startsWith("question:")
            ? questions(id)
            : key.startsWith("seed:")
              ? documents(id)
              : uploads(id);
          if (sources.isEmpty()) remove(key);
          else {
            var current = db.queryForList(
              "SELECT fingerprint FROM ai_chunks WHERE source_key=? LIMIT 1",
              String.class,
              key
            );
            write(sources.get(0), current.isEmpty() ? null : current.get(0));
          }
        }
      }
    });
    reconcile = false;
    dirty.clear();
    return ++revision;
  }

  public synchronized long vectorsChanged() {
    return ++revision;
  }

  public record Source(String key, String title, Long questionId, String content) {}

  /** Read the same eligible source used by the index, without exposing archived questions. */
  public Source source(String key) {
    if (
      key == null || !key.matches("(?:question|seed|upload):[1-9][0-9]{0,18}")
    ) throw new IllegalArgumentException("来源标识无效");
    long id;
    try {
      id = Long.parseLong(key.substring(key.indexOf(':') + 1));
    } catch (NumberFormatException error) {
      throw new IllegalArgumentException("来源标识无效");
    }
    var sources = key.startsWith("question:")
      ? questions(id)
      : key.startsWith("seed:")
        ? documents(id)
        : uploads(id);
    if (sources.isEmpty() || sources.get(0).content().isBlank()) throw new ResponseStatusException(
      NOT_FOUND,
      "来源已移除或不可用"
    );
    return sources.get(0);
  }

  private List<Source> questions(Long id) {
    String sql =
      "SELECT q.id,q.title,q.answer FROM questions q JOIN categories c ON c.id=q.category_id WHERE q.deleted=FALSE AND c.deleted=FALSE";
    if (id != null) sql += " AND q.id=?";
    return db.query(
      sql,
      (r, n) ->
        new Source(
          "question:" + r.getLong(1),
          r.getString(2),
          r.getLong(1),
          r.getString(2) + "\n" + r.getString(3)
        ),
      id == null ? new Object[] {} : new Object[] { id }
    );
  }

  private List<Source> documents(Long id) {
    String sql =
      "SELECT id,title,content,imported FROM documents" + (id == null ? "" : " WHERE id=?");
    return db.query(
      sql,
      (r, n) ->
        new Source(
          "seed:" + r.getLong(1),
          r.getString(2),
          null,
          r.getBoolean(4) ? parser.referenceOnly(r.getString(3)) : r.getString(3)
        ),
      id == null ? new Object[] {} : new Object[] { id }
    );
  }

  private List<Source> uploads(Long id) {
    return db.query(
      "SELECT id,title,content FROM ai_documents" + (id == null ? "" : " WHERE id=?"),
      (r, n) -> new Source("upload:" + r.getLong(1), r.getString(2), null, r.getString(3)),
      id == null ? new Object[] {} : new Object[] { id }
    );
  }

  private void remove(String key) {
    db.update("DELETE FROM ai_chunks WHERE source_key=?", key);
  }

  private void write(Source source, String previous) {
    if (source.content().isBlank()) {
      remove(source.key());
      return;
    }
    // Remove publication boilerplate before splitting so a long reference block cannot
    // leak into later fragments. Full source preview still reads the original content.
    String indexedContent = QuestionSearch.withoutReferences(source.content());
    String fingerprint = KnowledgeService.digest(source.title() + "\n" + indexedContent);
    if (fingerprint.equals(previous)) return;
    remove(source.key());
    var chunks = KnowledgeService.split(indexedContent);
    var rows = new ArrayList<Object[]>();
    for (int n = 0; n < chunks.size(); n++) rows.add(new Object[] {
      source.key(),
      fingerprint,
      source.title(),
      source.questionId(),
      n,
      chunks.get(n),
    });
    db.batchUpdate(
      "INSERT INTO ai_chunks(source_key,fingerprint,title,question_id,chunk_no,content) VALUES(?,?,?,?,?,?)",
      rows
    );
  }
}
