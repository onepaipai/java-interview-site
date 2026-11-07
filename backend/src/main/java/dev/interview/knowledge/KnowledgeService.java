package dev.interview.knowledge;

import static org.springframework.http.HttpStatus.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.interview.question.QuestionSearch;
import dev.interview.question.QuestionService;
import dev.interview.shared.KnowledgeChanged;
import dev.interview.shared.OperationalMetrics;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class KnowledgeService {

  @jakarta.annotation.PostConstruct
  void validateCapacity() {
    if (
      maxCharacters < 1 || maxChunks < 1 || maxVectorBytes < 1
    ) throw new IllegalArgumentException("知识库容量预算必须为正数");
  }

  private final JdbcTemplate db;
  private final QuestionService questions;
  private final ModelClient model;
  private final ObjectMapper json;
  private final KnowledgeIndex index;
  private final ApplicationEventPublisher events;
  private final TransactionTemplate transaction;
  private Snapshot cached;

  @org.springframework.beans.factory.annotation.Value("${app.knowledge.max-characters:5000000}")
  long maxCharacters = 5000000;

  @org.springframework.beans.factory.annotation.Value("${app.knowledge.max-chunks:10000}")
  int maxChunks = 10000;

  @org.springframework.beans.factory.annotation.Value("${app.knowledge.max-vector-bytes:134217728}")
  long maxVectorBytes = 134217728;

  @org.springframework.beans.factory.annotation.Autowired
  OperationalMetrics metrics;

  private static final Pattern WORDS = Pattern.compile("[a-z0-9_]+|[\\p{IsHan}]+");

  KnowledgeService(
    JdbcTemplate db,
    QuestionService questions,
    ModelClient model,
    ObjectMapper json,
    KnowledgeIndex index,
    ApplicationEventPublisher events,
    PlatformTransactionManager manager
  ) {
    this.db = db;
    this.questions = questions;
    this.model = model;
    this.json = json;
    this.index = index;
    this.events = events;
    this.transaction = new TransactionTemplate(manager);
  }

  public record Source(
    long id,
    String key,
    String title,
    Long questionId,
    int chunk,
    String content,
    double score
  ) {}

  private record Entry(Source source, int length, double[] vector) {}

  private record Posting(int document, int count) {}

  private record Snapshot(
    long revision,
    String identity,
    List<Entry> entries,
    Map<String, List<Posting>> postings,
    double average
  ) {}

  static List<String> split(String text) {
    var chunks = new ArrayList<String>();
    for (int start = 0; start < text.length(); ) {
      int end = Math.min(start + 1000, text.length());
      if (end < text.length()) {
        int line = text.lastIndexOf('\n', end);
        if (line > start + 650) end = line;
      }
      chunks.add(text.substring(start, end));
      if (end == text.length()) break;
      start = Math.max(start + 1, end - 120);
    }
    return chunks;
  }

  static String digest(String text) {
    try {
      return HexFormat.of().formatHex(
        MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8))
      );
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  /** Explicit reconciliation for maintenance and external database changes. */
  public void sync() {
    index.refresh(true);
  }

  public Map<String, Object> status() {
    index.refresh(false);
    return Map.of(
      "enabled",
      model.ready(),
      "model",
      model.model,
      "embeddingConfigured",
      !model.embeddingModel.isBlank(),
      "chunks",
      db.queryForObject("SELECT COUNT(*) FROM ai_chunks", Long.class),
      "vectors",
      db.queryForObject(
        "SELECT COUNT(*) FROM ai_chunks WHERE embedding IS NOT NULL AND embedding_model=?",
        Long.class,
        model.embeddingIdentity()
      ),
      "documents",
      db.queryForObject("SELECT COUNT(*) FROM ai_documents", Long.class)
    );
  }

  public record LibrarySource(
    String key,
    String title,
    String kind,
    Long questionId,
    long chunks
  ) {}

  private static final String SOURCE_GROUP =
    "SELECT source_key,MAX(title) AS title,MAX(question_id) AS question_id,COUNT(*) AS chunks FROM ai_chunks GROUP BY source_key";
  private static final String SOURCE_KIND =
    "CASE WHEN question_id IS NOT NULL THEN 'question' WHEN source_key LIKE 'upload:%' THEN 'upload' ELSE 'reference' END";

  public Map<String, Object> sources(String kind, String query, int page, int size) {
    if (
      !List.of("all", "question", "reference", "upload").contains(kind) ||
      query.length() > 200 ||
      page < 1 ||
      page > 100000 ||
      size < 1 ||
      size > 50
    ) throw new IllegalArgumentException("来源筛选或分页参数无效");
    index.refresh(false);
    var counts = new LinkedHashMap<String, Long>();
    for (String type : List.of("question", "reference", "upload")) counts.put(type, 0L);
    db.query(
      "SELECT " +
        SOURCE_KIND +
        " AS kind,COUNT(*) AS total FROM (" +
        SOURCE_GROUP +
        ") s GROUP BY " +
        SOURCE_KIND,
      row -> {
        counts.put(row.getString("kind"), row.getLong("total"));
      }
    );
    String from = " FROM (" + SOURCE_GROUP + ") s WHERE 1=1";
    var args = new ArrayList<Object>();
    if (!kind.equals("all")) {
      from += " AND " + SOURCE_KIND + "=?";
      args.add(kind);
    }
    if (!query.isBlank()) {
      from += " AND LOWER(title) LIKE ? ESCAPE '!'";
      args.add(QuestionService.searchTerm(query.strip()));
    }
    long total = db.queryForObject("SELECT COUNT(*)" + from, Long.class, args.toArray());
    args.add(size);
    args.add((page - 1) * size);
    var items = db.query(
      "SELECT source_key,title,question_id,chunks" +
        from +
        " ORDER BY CASE WHEN source_key LIKE 'upload:%' THEN 0 WHEN question_id IS NOT NULL THEN 1 ELSE 2 END,LOWER(title),source_key LIMIT ? OFFSET ?",
      (row, n) -> {
        Long questionId = row.getObject("question_id") == null ? null : row.getLong("question_id");
        String key = row.getString("source_key");
        return new LibrarySource(
          key,
          row.getString("title"),
          questionId != null ? "question" : key.startsWith("upload:") ? "upload" : "reference",
          questionId,
          row.getLong("chunks")
        );
      },
      args.toArray()
    );
    return Map.of("items", items, "total", total, "page", page, "size", size, "counts", counts);
  }

  public List<Map<String, Object>> documents() {
    return db.queryForList(
      "SELECT id,title,CHAR_LENGTH(content) AS characters,created_at FROM ai_documents ORDER BY id DESC"
    );
  }

  public KnowledgeIndex.Source source(String key) {
    return index.source(key);
  }

  public synchronized long add(String title, String text) {
    if (
      title == null ||
      title.isBlank() ||
      title.length() > 200 ||
      text == null ||
      text.isBlank() ||
      text.length() > 500000
    ) throw new ResponseStatusException(BAD_REQUEST, "标题为 1–200 字，文档为 1–500000 字");
    index.refresh(false);
    // Commit before releasing this single-instance upload lock, including AFTER_COMMIT notifications.
    return transaction.execute(status -> {
      if (
        db.queryForObject("SELECT COUNT(*) FROM ai_documents", Integer.class) >= 50
      ) throw new ResponseStatusException(BAD_REQUEST, "知识库最多上传 50 份文档");
      long characters = db.queryForObject(
        "SELECT COALESCE(SUM(CHAR_LENGTH(content)),0) FROM ai_documents",
        Long.class
      );
      long chunks = db.queryForObject("SELECT COUNT(*) FROM ai_chunks", Long.class);
      if (
        characters + text.length() > maxCharacters || chunks + split(text).size() > maxChunks
      ) throw new ResponseStatusException(BAD_REQUEST, "知识库容量预算不足，请精简或删除旧资料");
      long id = questions.insert(
        "INSERT INTO ai_documents(title,content) VALUES(?,?)",
        title.strip(),
        text
      );
      events.publishEvent(new KnowledgeChanged("upload:" + id));
      return id;
    });
  }

  @Transactional
  public void delete(long id) {
    if (
      db.update("DELETE FROM ai_documents WHERE id=?", id) == 0
    ) throw new ResponseStatusException(NOT_FOUND, "文档不存在");
    events.publishEvent(new KnowledgeChanged("upload:" + id));
  }

  static Map<String, Integer> tokens(String input) {
    var result = new HashMap<String, Integer>();
    var matcher = WORDS.matcher(input.toLowerCase(Locale.ROOT));
    while (matcher.find()) {
      String word = matcher.group();
      if (word.charAt(0) < 128 || word.length() == 1) result.merge(word, 1, Integer::sum);
      else for (int i = 0; i < word.length() - 1; i++) result.merge(
        word.substring(i, i + 2),
        1,
        Integer::sum
      );
    }
    return result;
  }

  private synchronized Snapshot snapshot() {
    long revision = index.refresh(false);
    String identity = model.embeddingIdentity();
    if (
      cached != null && cached.revision() == revision && cached.identity().equals(identity)
    ) return cached;
    long start = System.nanoTime();
    if (
      db.queryForObject("SELECT COUNT(*) FROM ai_chunks", Long.class) > maxChunks
    ) throw new ResponseStatusException(
      SERVICE_UNAVAILABLE,
      "知识分片超过检索容量预算，请管理员精简资料"
    );
    var entries = new ArrayList<Entry>();
    var postings = new HashMap<String, List<Posting>>();
    long[] totalLength = { 0 };
    long[] vectorBytes = { 0 };
    db.query(
      connection -> {
        var statement = connection.prepareStatement(
          "SELECT id,source_key,title,question_id,chunk_no,content,embedding_model,embedding FROM ai_chunks ORDER BY id",
          java.sql.ResultSet.TYPE_FORWARD_ONLY,
          java.sql.ResultSet.CONCUR_READ_ONLY
        );
        statement.setFetchSize(
          connection.getMetaData().getDatabaseProductName().equals("MySQL")
            ? Integer.MIN_VALUE
            : 256
        );
        return statement;
      },
      row -> {
        var source = new Source(
          row.getLong("id"),
          row.getString("source_key"),
          row.getString("title"),
          row.getObject("question_id") == null ? null : row.getLong("question_id"),
          row.getInt("chunk_no"),
          row.getString("content"),
          0
        );
        var counts = tokens(QuestionSearch.text(source.title() + " " + source.content()));
        int length = counts.values().stream().mapToInt(Integer::intValue).sum(),
          document = entries.size();
        counts.forEach((term, count) ->
          postings.computeIfAbsent(term, k -> new ArrayList<>()).add(new Posting(document, count))
        );
        double[] vector = null;
        if (
          identity.equals(row.getString("embedding_model")) && row.getString("embedding") != null
        ) {
          try {
            // Account for encoded JSON as well as the decoded doubles before retaining it.
            String encoded = row.getString("embedding");
            if (vectorBytes[0] + encoded.length() * 2L + 8192L * 8 <= maxVectorBytes) {
              vector = json.readValue(encoded, double[].class);
              vectorBytes[0] += encoded.length() * 2L + vector.length * 8L;
            } else metrics.increment("knowledge.vectors.budgetSkipped");
          } catch (Exception ignored) {
            /* A corrupt vector does not disable keyword retrieval. */
          }
        }
        entries.add(new Entry(source, length, vector));
        totalLength[0] += length;
      }
    );
    cached = new Snapshot(
      revision,
      identity,
      List.copyOf(entries),
      postings,
      Math.max(1, (double) totalLength[0] / Math.max(1, entries.size()))
    );
    metrics.increment("knowledge.snapshot.rebuilds");
    metrics.add("knowledge.snapshot.duration.nanos", System.nanoTime() - start);
    return cached;
  }

  public List<Source> search(String query, boolean semantic) {
    var snapshot = snapshot();
    var scores = new HashMap<Integer, Double>();
    for (String term : tokens(query).keySet()) {
      var matches = snapshot.postings().getOrDefault(term, List.of());
      double idf = Math.log(
        1 + (snapshot.entries().size() - matches.size() + .5) / (matches.size() + .5)
      );
      for (var posting : matches) {
        var entry = snapshot.entries().get(posting.document());
        double score =
          (idf * posting.count() * 2.2) /
          (posting.count() + 1.2 * (.25 + (.75 * entry.length()) / snapshot.average()));
        scores.merge(posting.document(), score, Double::sum);
      }
    }
    if (
      semantic &&
      model.ready() &&
      !model.embeddingModel.isBlank() &&
      snapshot
        .entries()
        .stream()
        .anyMatch(e -> e.vector() != null)
    ) {
      try {
        double[] vector = model.embed(List.of(query)).get(0);
        for (int i = 0; i < snapshot.entries().size(); i++) {
          var entry = snapshot.entries().get(i);
          if (entry.vector() != null) {
            double similarity = cosine(vector, entry.vector());
            if (similarity > .3) scores.merge(i, similarity * 8, Double::sum);
          }
        }
      } catch (ResponseStatusException ignored) {
        metrics.increment("knowledge.semantic.fallbacks");
      }
    }
    return scores
      .entrySet()
      .stream()
      .sorted(
        Map.Entry.<Integer, Double>comparingByValue().reversed().thenComparingInt(Map.Entry::getKey)
      )
      .limit(6)
      .map(score -> {
        var s = snapshot.entries().get(score.getKey()).source();
        return new Source(
          s.id(),
          s.key(),
          s.title(),
          s.questionId(),
          s.chunk(),
          s.content(),
          score.getValue()
        );
      })
      .toList();
  }

  static double cosine(double[] a, double[] b) {
    if (a.length != b.length) return 0;
    double dot = 0,
      x = 0,
      y = 0;
    for (int i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      x += a[i] * a[i];
      y += b[i] * b[i];
    }
    return x == 0 || y == 0 ? 0 : dot / Math.sqrt(x * y);
  }

  public Map<String, Integer> embedAll() {
    index.refresh(false);
    var rows = db.queryForList(
      "SELECT id,content,fingerprint FROM ai_chunks WHERE embedding IS NULL OR embedding_model<>? ORDER BY id LIMIT 16",
      model.embeddingIdentity()
    );
    int done = 0;
    if (!rows.isEmpty()) {
      var vectors = model.embed(
        rows
          .stream()
          .map(r -> r.get("content").toString())
          .toList()
      );
      for (int i = 0; i < rows.size(); i++) {
        try {
          done += db.update(
            "UPDATE ai_chunks SET embedding=?,embedding_model=? WHERE id=? AND fingerprint=?",
            json.writeValueAsString(vectors.get(i)),
            model.embeddingIdentity(),
            rows.get(i).get("id"),
            rows.get(i).get("fingerprint")
          );
        } catch (java.io.IOException e) {
          throw new IllegalStateException(e);
        }
      }
      index.vectorsChanged();
    }
    return Map.of(
      "indexed",
      done,
      "remaining",
      db.queryForObject(
        "SELECT COUNT(*) FROM ai_chunks WHERE embedding IS NULL OR embedding_model<>?",
        Integer.class,
        model.embeddingIdentity()
      )
    );
  }
}
