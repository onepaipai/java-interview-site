package dev.interview;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import dev.interview.knowledge.AiGate;
import dev.interview.question.QuestionSearchIndex;
import dev.interview.question.QuestionService;
import dev.interview.shared.OperationalMetrics;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(
  properties = {
    "spring.datasource.url=jdbc:h2:mem:architecture;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "app.admin-password=test-admin-password",
    "app.seed-path=./target/no-architecture-seed.md",
    "app.upload-dir=./target/architecture-uploads",
  }
)
@AutoConfigureMockMvc
class ArchitectureTest {

  @Test
  void aColdProjectionNeverCachesAnUncommittedAnswer() {
    long category = questions.category("cold_" + UUID.randomUUID());
    long id = questions.save(
      null,
      new QuestionService.Edit("cold", category, "基础", "CommittedBaseline", 0, List.of(), null)
    );
    new TransactionTemplate(transactions).executeWithoutResult(tx -> {
      questions.save(
        id,
        new QuestionService.Edit("cold", category, "基础", "MustNotLeak", 0, List.of(), 0)
      );
      index.changed(new dev.interview.shared.KnowledgeChanged(null));
      assertEquals("committedbaseline", index.snapshot().get(id).body());
      tx.setRollbackOnly();
    });
    assertEquals("committedbaseline", index.snapshot().get(id).body());
  }

  @Test
  void contractFieldsMatchActualSummaryAndDetail() throws Exception {
    long category = questions.category("wire_" + UUID.randomUUID());
    long id = questions.save(
      null,
      new QuestionService.Edit("wire", category, "基础", "body", 0, List.of(), null)
    );
    var json = new com.fasterxml.jackson.databind.ObjectMapper();
    var schemas = json
      .readTree(java.nio.file.Path.of("../docs/openapi.json").toFile())
      .path("components")
      .path("schemas");
    for (String type : List.of("Summary", "Detail")) {
      String path = type.equals("Summary")
        ? "/api/questions?category=" + category
        : "/api/questions/" + id;
      var response = mvc
        .perform(get(path).with(user("admin")))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();
      var actual = json.readTree(response);
      if (type.equals("Summary")) actual = actual.path("items").get(0);
      var expectedKeys = new TreeSet<String>();
      schemas.path(type).path("properties").fieldNames().forEachRemaining(expectedKeys::add);
      var actualKeys = new TreeSet<String>();
      actual.fieldNames().forEachRemaining(actualKeys::add);
      assertEquals(expectedKeys, actualKeys, type);
    }
  }

  @Test
  void productionVolumeRejectsASecondBackend(
    @org.junit.jupiter.api.io.TempDir java.nio.file.Path directory
  ) throws Exception {
    try (var first = new dev.interview.shared.SingleInstanceGuard(true, directory.toString())) {
      assertThrows(IllegalStateException.class, () ->
        new dev.interview.shared.SingleInstanceGuard(true, directory.toString())
      );
    }
    try (var restarted = new dev.interview.shared.SingleInstanceGuard(true, directory.toString())) {
      assertNotNull(restarted);
    }
  }

  @Test
  void twoBusyAiSlotsRejectAndThenRecover() throws Exception {
    var gate = new AiGate(10, 2, new OperationalMetrics());
    var entered = new CountDownLatch(2);
    var release = new CountDownLatch(1);
    var executor = Executors.newFixedThreadPool(2);
    try {
      var futures = new ArrayList<Future<String>>();
      for (String name : List.of("one", "two"))
        futures.add(
          executor.submit(() ->
            gate.execute(
              () -> name,
              () -> {
                entered.countDown();
                try {
                  release.await(3, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                  Thread.currentThread().interrupt();
                  throw new IllegalStateException(e);
                }
                return name;
              }
            )
          )
        );
      assertTrue(entered.await(2, TimeUnit.SECONDS));
      assertEquals(
        429,
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () ->
          gate.execute(() -> "third", () -> "denied")
        )
          .getStatusCode()
          .value()
      );
      release.countDown();
      for (var future : futures) future.get(3, TimeUnit.SECONDS);
      assertEquals("recovered", gate.execute(() -> "third", () -> "recovered"));
      assertEquals(2, gate.availableSlots());
    } finally {
      release.countDown();
      executor.shutdownNow();
    }
  }

  @Autowired
  QuestionService questions;

  @Autowired
  QuestionSearchIndex index;

  @org.springframework.test.context.bean.override.mockito.MockitoSpyBean
  JdbcTemplate db;

  @Autowired
  PlatformTransactionManager transactions;

  @Autowired
  MockMvc mvc;

  @Test
  void summaryContractOmitsBodyAndPrivateOrPersistenceFields() throws Exception {
    long category = questions.category("summary_" + UUID.randomUUID());
    long id = questions.save(
      null,
      new QuestionService.Edit(
        "HashMap contract",
        category,
        "基础",
        "## 参考回答\n\n1. HashMap 保留原有大小写。",
        0,
        List.of(),
        null
      )
    );
    mvc
      .perform(get("/api/questions?category=" + category).with(user("admin").roles("ADMIN")))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items[0].answered").value(true))
      .andExpect(jsonPath("$.items[0].preview").value("HashMap 保留原有大小写。"))
      .andExpect(jsonPath("$.items[0].answer").doesNotExist())
      .andExpect(jsonPath("$.items[0].note").doesNotExist())
      .andExpect(jsonPath("$.items[0].source_key").doesNotExist());
    mvc
      .perform(get("/api/questions/" + id).with(user("admin")))
      .andExpect(jsonPath("$.answer").exists());
  }

  @Test
  void searchesReuseProjectionAndOnlyCommittedChangesInvalidateIt() {
    long user = db.queryForObject("SELECT id FROM accounts WHERE username='admin'", Long.class);
    long category = questions.category("projection_" + UUID.randomUUID());
    long id = questions.save(
      null,
      new QuestionService.Edit("Projection", category, "基础", "OriginalMarker", 0, List.of(), null)
    );
    index.snapshot();
    org.mockito.Mockito.clearInvocations(db);
    questions.list(user, "OriginalMarker", category, "", "", "", false, false, false, false, 1, 15);
    questions.location(id, category, "OriginalMarker", false, 15);
    long scans = org.mockito.Mockito.mockingDetails(db)
      .getInvocations()
      .stream()
      .filter(
        i ->
          i.getArguments().length > 0 &&
          i.getArgument(0) instanceof String sql &&
          sql.contains("SELECT id,title,answer FROM questions")
      )
      .count();
    assertEquals(0, scans);
    new TransactionTemplate(transactions).executeWithoutResult(tx -> {
      questions.save(
        id,
        new QuestionService.Edit(
          "Projection",
          category,
          "基础",
          "UncommittedMarker",
          0,
          List.of(),
          0
        )
      );
      tx.setRollbackOnly();
    });
    assertEquals(
      1L,
      questions
        .list(user, "OriginalMarker", category, "", "", "", false, false, false, false, 1, 15)
        .get("total")
    );
    questions.save(
      id,
      new QuestionService.Edit("Projection", category, "基础", "CommittedMarker", 0, List.of(), 0)
    );
    assertEquals(
      1L,
      questions
        .list(user, "CommittedMarker", category, "", "", "", false, false, false, false, 1, 15)
        .get("total")
    );
    assertEquals(
      0L,
      questions
        .list(user, "OriginalMarker", category, "", "", "", false, false, false, false, 1, 15)
        .get("total")
    );
  }

  @Test
  void missingPutTargetsAndOversizedSearchReturnClientErrors() throws Exception {
    mvc
      .perform(
        put("/api/admin/tags/999999999")
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
          .contentType("application/json")
          .content("{\"name\":\"missing\"}")
      )
      .andExpect(status().isNotFound());
    mvc
      .perform(
        put("/api/admin/documents/999999999")
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
          .contentType("application/json")
          .content("{\"title\":\"missing\",\"content\":\"body\"}")
      )
      .andExpect(status().isNotFound());
    mvc
      .perform(get("/api/questions").param("search", "x".repeat(3001)).with(user("admin")))
      .andExpect(status().isBadRequest());
    mvc.perform(get("/api/admin/metrics").with(user("reader"))).andExpect(status().isForbidden());
    mvc.perform(get("/api/test-environment")).andExpect(status().isNotFound());
  }

  @Test
  void concurrentQuestionsCanShareANewTagAcrossModules() throws Exception {
    long first = questions.category("tag_first_" + UUID.randomUUID()),
      second = questions.category("tag_second_" + UUID.randomUUID());
    String tag = "shared_" + UUID.randomUUID();
    var start = new CountDownLatch(1);
    var executor = Executors.newFixedThreadPool(2);
    try {
      var futures = new ArrayList<Future<Long>>();
      for (long category : List.of(first, second))
        futures.add(
          executor.submit(() -> {
            start.await();
            return questions.save(
              null,
              new QuestionService.Edit("tag", category, "基础", "", 0, List.of(tag), null)
            );
          })
        );
      start.countDown();
      for (var future : futures) assertTrue(future.get(5, TimeUnit.SECONDS) > 0);
      assertEquals(
        1,
        db.queryForObject("SELECT COUNT(*) FROM tags WHERE name=?", Integer.class, tag)
      );
    } finally {
      executor.shutdownNow();
    }
  }

  @Test
  void accountBudgetAndFailedWorkReleaseSlots() {
    var gate = new AiGate(2, 2, new OperationalMetrics());
    // 失败的调用退还预留：模型故障不消耗额度，槽位立即释放。
    assertThrows(IllegalStateException.class, () ->
      gate.execute(
        () -> "reader",
        () -> {
          throw new IllegalStateException();
        }
      )
    );
    assertEquals("ok", gate.execute(() -> "reader", () -> "ok"));
    assertEquals("ok", gate.execute(() -> "reader", () -> "ok"));
    assertEquals(
      429,
      assertThrows(org.springframework.web.server.ResponseStatusException.class, () ->
        gate.execute(() -> "reader", () -> "denied")
      )
        .getStatusCode()
        .value()
    );
    assertEquals(2, gate.availableSlots());
    assertEquals("other", gate.execute(() -> "other", () -> "other"));
  }
}
