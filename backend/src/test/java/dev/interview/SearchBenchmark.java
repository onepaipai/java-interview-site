package dev.interview;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.interview.question.*;
import java.lang.management.ManagementFactory;
import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/** Explicit diagnostic: mvn -Dtest=SearchBenchmark test. Not a production load test. */
@SpringBootTest(
  properties = {
    "spring.datasource.url=jdbc:h2:mem:search-benchmark;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "app.admin-password=test-admin-password",
    "app.seed-path=../content/Java.md",
    "app.upload-dir=./target/benchmark-uploads",
  }
)
class SearchBenchmark {

  @Autowired
  JdbcTemplate db;

  @Autowired
  QuestionSearchIndex index;

  record Measurement(double p50Millis, double p95Millis, long allocatedBytes, int iterations) {}

  @Test
  void compareRepeatedFullCleaningWithTheCommittedProjection() throws Exception {
    var rows = db.queryForList(
      "SELECT q.id,q.title,q.answer FROM questions q JOIN categories c ON c.id=q.category_id WHERE q.deleted=FALSE ORDER BY c.sort_order,c.id,q.sort_order,q.id"
    );
    var ids = rows
      .stream()
      .map(row -> ((Number) row.get("id")).longValue())
      .toList();
    var projection = index.snapshot();
    var queries = List.of(
      "HashMap",
      "事务",
      "Raft",
      "Spring",
      "volatile",
      "幂等",
      "索引",
      "线程池"
    );
    for (String query : queries)
      assertEquals(
        QuestionSearch.order(rows, query),
        QuestionSearchIndex.order(ids, projection, query)
      );
    var measurements = new LinkedHashMap<String, Measurement>();
    var bean = ManagementFactory.getThreadMXBean();
    var allocation = bean instanceof com.sun.management.ThreadMXBean value ? value : null;
    if (
      allocation != null && allocation.isThreadAllocatedMemorySupported()
    ) allocation.setThreadAllocatedMemoryEnabled(true);
    else allocation = null;
    for (boolean cached : List.of(false, true)) {
      var times = new ArrayList<Long>();
      long startBytes =
        allocation == null ? 0 : allocation.getThreadAllocatedBytes(Thread.currentThread().getId());
      for (int repeat = 0; repeat < 5; repeat++) for (String query : queries) {
        long start = System.nanoTime();
        if (cached) QuestionSearchIndex.order(ids, projection, query);
        else QuestionSearch.order(rows, query);
        times.add(System.nanoTime() - start);
      }
      long bytes =
        allocation == null
          ? -1
          : allocation.getThreadAllocatedBytes(Thread.currentThread().getId()) - startBytes;
      times.sort(Long::compareTo);
      measurements.put(
        cached ? "projection" : "fullCleaningBaseline",
        new Measurement(
          times.get(times.size() / 2) / 1e6,
          times.get((int) (times.size() * .95)) / 1e6,
          bytes,
          times.size()
        )
      );
    }
    var report = Map.of(
      "scope",
      "single-thread in-process ranking on actual published corpus; excludes database/network and is not production throughput",
      "questions",
      rows.size(),
      "queries",
      queries,
      "measurements",
      measurements
    );
    Files.createDirectories(Path.of("target"));
    new ObjectMapper()
      .writerWithDefaultPrettyPrinter()
      .writeValue(Path.of("target/search-benchmark.json").toFile(), report);
    System.out.println("Search benchmark: " + report);
  }
}
