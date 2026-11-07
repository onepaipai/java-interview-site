package dev.interview.question;

import dev.interview.shared.KnowledgeChanged;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Single-instance, derived projection. Only committed content invalidates cleaned text. */
@Component
public class QuestionSearchIndex {

  public record Document(
    String title,
    String body,
    String content,
    String preview,
    int answerChars
  ) {}

  private final JdbcTemplate db;
  private final Map<Long, Document> documents = new HashMap<>();
  private final Set<Long> dirty = new HashSet<>();
  private final java.util.concurrent.atomic.AtomicLong totalChars =
    new java.util.concurrent.atomic.AtomicLong();
  private boolean reload = true;

  QuestionSearchIndex(JdbcTemplate db) {
    this.db = db;
  }

  /** Raw answer characters held by the projection; the write path keeps this within budget. */
  public long answerCharacters() {
    return totalChars.get();
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
  public synchronized void changed(KnowledgeChanged change) {
    if (change.source() == null) reload = true;
    else if (change.source().startsWith("question:")) dirty.add(
      Long.parseLong(change.source().substring(9))
    );
  }

  @org.springframework.transaction.annotation.Transactional(
    readOnly = true,
    propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW
  )
  public synchronized Map<Long, Document> snapshot() {
    if (reload) {
      var replacement = new HashMap<Long, Document>();
      long[] total = { 0 };
      db.query("SELECT id,title,answer FROM questions", r -> {
        String answer = r.getString(3);
        total[0] += answer.length();
        replacement.put(r.getLong(1), document(r.getString(2), answer));
      });
      documents.clear();
      documents.putAll(replacement);
      totalChars.set(total[0]);
      reload = false;
      dirty.clear();
    } else if (!dirty.isEmpty()) {
      for (long id : dirty) {
        var rows = db.query(
          "SELECT title,answer FROM questions WHERE id=?",
          (r, n) -> document(r.getString(1), r.getString(2)),
          id
        );
        var old = documents.get(id);
        int oldChars = old == null ? 0 : old.answerChars();
        if (rows.isEmpty()) {
          documents.remove(id);
          totalChars.addAndGet(-oldChars);
        } else {
          documents.put(id, rows.get(0));
          totalChars.addAndGet(rows.get(0).answerChars() - oldChars);
        }
      }
      dirty.clear();
    }
    return Map.copyOf(documents);
  }

  private static Document document(String title, String answer) {
    String content = QuestionSearch.plain(answer);
    String body = content.toLowerCase(Locale.ROOT);
    String preview = QuestionSearch.plain(
      QuestionSearch.withoutReferences(answer)
        .replaceFirst("(?s)^.*?## 参考回答\\s*", "")
        .replaceAll("<!--[^>]*-->", "")
        .replaceAll("(?m)^> 场景与约束：.*$", "")
        .split("\\n## ", 2)[0]
    );
    preview = preview.replaceFirst("^1[.、]\\s*", "");
    return new Document(QuestionSearch.text(title), body, content, preview, answer.length());
  }

  public static List<Long> order(
    List<Long> candidates,
    Map<Long, Document> snapshot,
    String query
  ) {
    record Hit(long id, int rank) {}
    return candidates
      .stream()
      .filter(snapshot::containsKey)
      .map(id -> {
        var d = snapshot.get(id);
        return new Hit(id, QuestionSearch.rankText(d.title(), d.body(), query));
      })
      .filter(hit -> hit.rank() >= 0)
      .sorted(Comparator.comparingInt(Hit::rank))
      .map(Hit::id)
      .toList();
  }

  public static String excerpt(Document document, String query) {
    if (document == null) return "";
    String text = query.isBlank() ? document.preview() : document.content();
    int position = 0;
    if (!query.isBlank()) for (String word : query.strip().toLowerCase(Locale.ROOT).split("\\s+")) {
      int found = text.toLowerCase(Locale.ROOT).indexOf(word);
      if (found >= 0) {
        position = Math.max(0, found - 30);
        break;
      }
    }
    int end = Math.min(text.length(), position + 160);
    return (
      (position > 0 ? "…" : "") + text.substring(position, end) + (end < text.length() ? "…" : "")
    );
  }
}
