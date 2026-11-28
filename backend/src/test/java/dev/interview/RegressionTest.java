package dev.interview;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import dev.interview.knowledge.KnowledgeService;
import dev.interview.publication.SeniorQuestionImporter;
import dev.interview.question.LearningService;
import dev.interview.question.QuestionService;
import dev.interview.shared.KnowledgeChanged;
import dev.interview.shared.MarkdownImporter;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.PayloadApplicationEvent;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(
  properties = {
    "spring.datasource.url=jdbc:h2:mem:regressions;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "app.admin-password=test-admin-password",
    "app.seed-path=../content/Java.md",
    "app.upload-dir=./target/test-uploads",
  }
)
@AutoConfigureMockMvc
class RegressionTest {

  @Autowired
  MockMvc mvc;

  @org.springframework.test.context.bean.override.mockito.MockitoSpyBean
  JdbcTemplate db;

  @Autowired
  PasswordEncoder encoder;

  @Autowired
  QuestionService questions;

  @Autowired
  LearningService learning;

  @Autowired
  KnowledgeService knowledge;

  @Autowired
  MarkdownImporter parser;

  @Autowired
  SeniorQuestionImporter senior;

  @Autowired
  PlatformTransactionManager manager;

  @Autowired
  ConfigurableApplicationContext context;

  @Test
  void searchPaginationAndQuestionLocationUseTheSameRelevantOrder() {
    long category = questions.category("search_order_" + UUID.randomUUID());
    String term = "RaftProof_" + UUID.randomUUID();
    long body = questions.save(
      null,
      new QuestionService.Edit("其他题", category, "基础", term, 0, List.of(), null)
    );
    long prefix = questions.save(
      null,
      new QuestionService.Edit(term + " 选举", category, "基础", "正文", 0, List.of(), null)
    );
    long exact = questions.save(
      null,
      new QuestionService.Edit(term, category, "基础", "正文", 0, List.of(), null)
    );
    long metadata = questions.save(
      null,
      new QuestionService.Edit(
        "TCP 无关题",
        category,
        "基础",
        "<details class=\"explanation-references\">" + term + "</details>真正的 TCP 回答",
        0,
        List.of(),
        null
      )
    );
    try {
      List<Long> expected = List.of(exact, prefix, body);
      for (int page = 1; page <= 3; page++) {
        var result = questions.list(0, term, category, "", "", "", false, false, false, false, page, 1);
        assertEquals(3L, ((Number) result.get("total")).longValue());
        var rows = (List<Map<String, Object>>) result.get("items");
        assertEquals(
          expected.get(page - 1).longValue(),
          ((Number) rows.get(0).get("id")).longValue()
        );
        assertEquals(
          page,
          questions.location(expected.get(page - 1), category, term, false, 1).get("page")
        );
      }
      assertThrows(org.springframework.web.server.ResponseStatusException.class, () ->
        questions.location(metadata, category, term, false, 1)
      );
      assertTrue(
        (
          (List<?>) questions
            .list(0, term, category, "", "", "", false, false, false, false, 4, 1)
            .get("items")
        ).isEmpty()
      );
    } finally {
      db.update(
        "DELETE FROM question_tags WHERE question_id IN (?,?,?,?)",
        body,
        prefix,
        exact,
        metadata
      );
      db.update("DELETE FROM questions WHERE category_id=?", category);
      db.update("DELETE FROM categories WHERE id=?", category);
    }
  }

  @Test
  void restoringWaitsForModuleArchivalAndCannotCreateAnOrphan() throws Exception {
    long category = questions.category("restore_race_" + UUID.randomUUID());
    long id = questions.save(
      null,
      new QuestionService.Edit("待恢复题目", category, "基础", "原答案", 0, List.of(), null)
    );
    db.update("UPDATE questions SET deleted=TRUE WHERE id=?", id);
    var attempting = new CountDownLatch(1);
    var executor = Executors.newSingleThreadExecutor();
    String lockSql = "SELECT id FROM categories WHERE id=? AND deleted=FALSE FOR UPDATE";
    org.mockito.Mockito.doAnswer(call -> {
      attempting.countDown();
      return call.callRealMethod();
    })
      .when(db)
      .queryForList(lockSql, Long.class, category);
    try {
      Future<org.springframework.test.web.servlet.MvcResult> request = new TransactionTemplate(
        manager
      ).execute(tx -> {
        db.queryForList("SELECT id FROM categories WHERE id=? FOR UPDATE", Long.class, category);
        var future = executor.submit(() ->
          mvc
            .perform(
              post("/api/admin/questions/" + id + "/restore")
                .with(user("admin").roles("ADMIN"))
                .with(csrf())
            )
            .andReturn()
        );
        try {
          assertTrue(attempting.await(5, TimeUnit.SECONDS));
        } catch (InterruptedException error) {
          Thread.currentThread().interrupt();
          throw new IllegalStateException(error);
        }
        db.update(
          "UPDATE categories SET deleted=TRUE,archived_name=name,name=? WHERE id=?",
          "__archived__" + UUID.randomUUID(),
          category
        );
        return future;
      });
      assertEquals(409, request.get(10, TimeUnit.SECONDS).getResponse().getStatus());
      assertTrue(db.queryForObject("SELECT deleted FROM questions WHERE id=?", Boolean.class, id));
    } finally {
      org.mockito.Mockito.doCallRealMethod().when(db).queryForList(lockSql, Long.class, category);
      executor.shutdownNow();
    }
  }

  @Test
  void documentLimitIncludesThePreviousUploadBeforeItsLockIsReleased() throws Exception {
    String prefix = "upload_race_" + UUID.randomUUID();
    int original = db.queryForObject("SELECT COUNT(*) FROM ai_documents", Integer.class);
    for (int n = original; n < 49; n++) db.update(
      "INSERT INTO ai_documents(title,content) VALUES(?,?)",
      prefix + n,
      "测试资料"
    );
    var committing = new CountDownLatch(1);
    var release = new CountDownLatch(1);
    var secondStarted = new CountDownLatch(1);
    var first = new AtomicBoolean(true);
    ApplicationListener<ApplicationEvent> listener = event -> {
      if (
        event instanceof PayloadApplicationEvent<?> payload &&
        payload.getPayload() instanceof KnowledgeChanged change &&
        change.source() != null &&
        change.source().startsWith("upload:") &&
        first.compareAndSet(true, false)
      ) TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          public void beforeCommit(boolean readOnly) {
            committing.countDown();
            try {
              if (!release.await(10, TimeUnit.SECONDS)) throw new IllegalStateException(
                "Commit gate timed out"
              );
            } catch (InterruptedException error) {
              Thread.currentThread().interrupt();
              throw new IllegalStateException(error);
            }
          }
        }
      );
    };
    context.addApplicationListener(listener);
    var executor = Executors.newFixedThreadPool(2);
    try {
      var one = executor.submit(() -> knowledge.add(prefix + "first", "第一份并发资料"));
      assertTrue(committing.await(5, TimeUnit.SECONDS));
      var two = executor.submit(() -> {
        secondStarted.countDown();
        return knowledge.add(prefix + "second", "第二份并发资料");
      });
      assertTrue(secondStarted.await(5, TimeUnit.SECONDS));
      assertThrows(TimeoutException.class, () -> two.get(200, TimeUnit.MILLISECONDS));
      release.countDown();
      assertTrue(one.get(10, TimeUnit.SECONDS) > 0);
      var failure = assertThrows(ExecutionException.class, () -> two.get(10, TimeUnit.SECONDS));
      var rejected = assertInstanceOf(
        org.springframework.web.server.ResponseStatusException.class,
        failure.getCause()
      );
      assertEquals(400, rejected.getStatusCode().value());
      assertEquals(50, db.queryForObject("SELECT COUNT(*) FROM ai_documents", Integer.class));
    } finally {
      release.countDown();
      executor.shutdownNow();
      executor.awaitTermination(10, TimeUnit.SECONDS);
      context.removeApplicationListener(listener);
      db.update("DELETE FROM ai_documents WHERE title LIKE ?", prefix + "%");
      knowledge.sync();
    }
  }

  @Test
  void passwordChangeRevokesOtherRealLoginSessions() throws Exception {
    String name = "session_" + UUID.randomUUID().toString().substring(0, 8);
    db.update(
      "INSERT INTO accounts(username,password,role) VALUES(?,?,'USER')",
      name,
      encoder.encode("old-password-123")
    );
    var current = (MockHttpSession) mvc
      .perform(formLogin("/api/login").user(name).password("old-password-123"))
      .andExpect(status().isOk())
      .andReturn()
      .getRequest()
      .getSession(false);
    var other = (MockHttpSession) mvc
      .perform(formLogin("/api/login").user(name).password("old-password-123"))
      .andExpect(status().isOk())
      .andReturn()
      .getRequest()
      .getSession(false);
    mvc
      .perform(
        put("/api/me/password")
          .session(current)
          .with(csrf())
          .contentType("application/json")
          .content("{\"oldPassword\":\"old-password-123\",\"newPassword\":\"new-password-123\"}")
      )
      .andExpect(status().isOk());
    mvc.perform(get("/api/me").session(current)).andExpect(status().isOk());
    mvc.perform(get("/api/me").session(other)).andExpect(status().isUnauthorized());
    mvc
      .perform(formLogin("/api/login").user(name).password("old-password-123"))
      .andExpect(status().isUnauthorized());
    mvc
      .perform(formLogin("/api/login").user(name).password("new-password-123"))
      .andExpect(status().isOk());
  }

  @Test
  void locationsUseTheSameModuleAndSearchScopeAsLists() throws Exception {
    long category = questions.category("location_" + UUID.randomUUID());
    var ids = new ArrayList<Long>();
    for (int n = 1; n <= 18; n++) ids.add(
      questions.save(
        null,
        new QuestionService.Edit(
          "scope_probe_" + n,
          category,
          "高级",
          "分页参考回答",
          n,
          List.of(),
          null
        )
      )
    );
    mvc
      .perform(
        get("/api/questions/" + ids.get(0) + "/location?size=15").with(user("admin").roles("ADMIN"))
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.page").value(1));
    mvc
      .perform(
        get("/api/questions/" + ids.get(15) + "/location?size=15").with(
          user("admin").roles("ADMIN")
        )
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.page").value(2));
    var filtered = questions.location(ids.get(15), category, "scope_probe_16", false, 15);
    assertEquals(1, filtered.get("page"));
    assertEquals(1, filtered.get("total"));
    var global = questions.location(ids.get(15), null, "scope_probe_", true, 15);
    assertEquals(2, global.get("page"));
    assertEquals(18, global.get("total"));
    assertThrows(org.springframework.web.server.ResponseStatusException.class, () ->
      questions.location(ids.get(15), null, "no_match", false, 15)
    );
  }

  @Test
  void reviewScheduleSchedulesThenExpiresWeakQuestions() throws Exception {
    long category = questions.category("schedule_" + UUID.randomUUID());
    String marker = "schedule_probe_" + UUID.randomUUID().toString().replace("-", "");
    long id = questions.save(
      null,
      new QuestionService.Edit(marker, category, "高级", "排期参考回答", 0, List.of(), null)
    );
    long user = db.queryForObject("SELECT id FROM accounts WHERE username='admin'", Long.class);
    int dueBefore = ((Number) learning.stats(user).get("due")).intValue();
    int weakBefore = ((Number) learning.stats(user).get("weak")).intValue();
    // PARTIAL 首次自评：次日到期，计入弱项与今日到期
    learning.progress(user, id, new LearningService.Progress("PARTIAL", false, "", true));
    var next = db.queryForObject(
      "SELECT next_review FROM progress WHERE user_id=? AND question_id=?",
      java.sql.Timestamp.class,
      user,
      id
    );
    assertNotNull(next);
    assertTrue(
      next.getTime() > System.currentTimeMillis() &&
        next.getTime() <= System.currentTimeMillis() + 2L * 24 * 60 * 60 * 1000
    );
    // 刚自评的题排到明天：计入弱项，但不算今日到期
    assertEquals(weakBefore + 1, ((Number) learning.stats(user).get("weak")).intValue());
    assertEquals(dueBefore, ((Number) learning.stats(user).get("due")).intValue());
    assertEquals(
      0L,
      ((Number)
          questions
            .list(user, marker, null, "", "", "", false, false, true, false, 1, 30)
            .get("total"))
        .longValue()
    );
    // 排期时间流逝后进入今日到期队列
    db.update("UPDATE progress SET next_review=CURRENT_TIMESTAMP WHERE user_id=? AND question_id=?", user, id);
    assertEquals(dueBefore + 1, ((Number) learning.stats(user).get("due")).intValue());
    assertEquals(
      1L,
      ((Number)
          questions
            .list(user, marker, null, "", "", "", false, false, true, false, 1, 30)
            .get("total"))
        .longValue()
    );
    // 改 YES 后退出弱项与到期队列
    learning.progress(user, id, new LearningService.Progress("YES", false, "", true));
    assertEquals(dueBefore, ((Number) learning.stats(user).get("due")).intValue());
    assertEquals(weakBefore, ((Number) learning.stats(user).get("weak")).intValue());
    assertEquals(
      0L,
      ((Number)
          questions
            .list(user, marker, null, "", "", "", false, false, true, false, 1, 30)
            .get("total"))
        .longValue()
    );
  }

  @Test
  void importedHistoricalAnswersDisappearAfterEditsAndDeletes() throws Exception {
    String marker = "historical_" + UUID.randomUUID().toString().replace("-", "");
    var parsed = parser.parse(
      "## 回归原文\n### 历史模块\n1. " + marker + "\n    obsolete_answer_marker\n"
    );
    questions.importItems(parsed.questions(), parsed.documents(), "skip");
    long id = db.queryForObject(
      "SELECT id FROM questions WHERE source_key=?",
      Long.class,
      parsed.questions().get(0).sourceKey()
    );
    long category = db.queryForObject(
      "SELECT category_id FROM questions WHERE id=?",
      Long.class,
      id
    );
    assertTrue(
      knowledge
        .search(marker, false)
        .stream()
        .anyMatch(s -> Objects.equals(s.questionId(), id))
    );
    questions.save(
      id,
      new QuestionService.Edit(
        marker,
        category,
        "高级",
        "replacement_answer_marker",
        0,
        List.of(),
        0
      )
    );
    assertTrue(
      knowledge
        .search(marker, false)
        .stream()
        .noneMatch(s -> s.content().contains("obsolete_answer_marker"))
    );
    assertTrue(
      knowledge
        .search("replacement_answer_marker", false)
        .stream()
        .anyMatch(s -> Objects.equals(s.questionId(), id))
    );
    mvc
      .perform(
        delete("/api/admin/questions/" + id)
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
      )
      .andExpect(status().isOk());
    assertTrue(
      knowledge
        .search(marker, false)
        .stream()
        .noneMatch(s -> s.content().contains(marker))
    );
  }

  @Test
  void readsReuseIndexAndRolledBackChangesDoNotLeak() {
    knowledge.search("Java", false);
    var before = db.queryForList("SELECT id,fingerprint FROM ai_chunks ORDER BY id");
    org.mockito.Mockito.clearInvocations(db);
    knowledge.status();
    knowledge.search("JVM", false);
    knowledge.search("事务", false);
    var sql = org.mockito.Mockito.mockingDetails(db)
      .getInvocations()
      .stream()
      .filter(i -> i.getArguments().length > 0 && i.getArgument(0) instanceof String)
      .map(i -> (String) i.getArgument(0))
      .toList();
    assertTrue(
      sql
        .stream()
        .noneMatch(
          s -> s.contains("FROM questions") || s.equals("SELECT * FROM ai_chunks ORDER BY id")
        ),
      sql.toString()
    );
    assertEquals(before, db.queryForList("SELECT id,fingerprint FROM ai_chunks ORDER BY id"));
    String marker = "rollback_" + UUID.randomUUID().toString().replace("-", "");
    new TransactionTemplate(manager).executeWithoutResult(status -> {
      long category = db.queryForObject(
        "SELECT MIN(id) FROM categories WHERE deleted=FALSE",
        Long.class
      );
      questions.save(
        null,
        new QuestionService.Edit(
          marker,
          category,
          "高级",
          "不能出现在检索中的未提交内容",
          0,
          List.of(),
          null
        )
      );
      status.setRollbackOnly();
    });
    assertTrue(
      knowledge
        .search(marker, false)
        .stream()
        .noneMatch(s -> s.content().contains(marker))
    );
  }

  @Test
  void pageTagsUseOneBatchAndStillMatchTheQuestionDetails() {
    long user = db.queryForObject("SELECT id FROM accounts WHERE username='admin'", Long.class);
    org.mockito.Mockito.clearInvocations(db);
    var page = questions.list(user, "", null, "", "", "senior-v1", false, false, false, false, 1, 15);
    var batchCalls = org.mockito.Mockito.mockingDetails(db)
      .getInvocations()
      .stream()
      .filter(
        i ->
          i.getMethod().getName().equals("query") &&
          i.getMethod().getParameterCount() == 3 &&
          i.getMethod().getParameterTypes()[1] ==
            org.springframework.jdbc.core.RowCallbackHandler.class
      )
      .filter(i -> i.getArgument(0).toString().contains("SELECT qt.question_id,t.name"))
      .count();
    assertEquals(1, batchCalls);
    @SuppressWarnings("unchecked")
    var rows = (List<Map<String, Object>>) page.get("items");
    assertEquals(15, rows.size());
    for (var row : rows)
      assertEquals(questions.tags(((Number) row.get("id")).longValue()), row.get("tags"));
    assertTrue(
      (
        (List<?>) questions
          .list(
            user,
            "no_results_" + UUID.randomUUID(),
            null,
            "",
            "",
            "",
            false,
            false,
            false,
            false,
            1,
            15
          )
          .get("items")
      ).isEmpty()
    );
  }

  @Test
  void missingDifficultyIsAValidationErrorRatherThanAServerError() throws Exception {
    long category = db.queryForObject("SELECT MIN(id) FROM categories", Long.class);
    mvc
      .perform(
        post("/api/admin/questions")
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
          .contentType("application/json")
          .content(
            "{\"title\":\"无难度参数\",\"categoryId\":" +
              category +
              ",\"difficulty\":null,\"answer\":\"\",\"tags\":[]}"
          )
      )
      .andExpect(status().isBadRequest());
  }

  @Test
  void seniorPackHasFiftyUniqueAnsweredQuestionsPerModuleAndNeverOverwritesEdits()
    throws Exception {
    Path path = Path.of("../content/senior/manifest.json");
    assertEquals(21, senior.modules(path).size());
    for (var module : senior.modules(path)) {
      var rows = db.queryForList(
        "SELECT q.title,q.answer FROM questions q JOIN question_tags qt ON qt.question_id=q.id JOIN tags t ON t.id=qt.tag_id JOIN categories c ON c.id=q.category_id WHERE t.name='senior-v1' AND c.name=?",
        module.category()
      );
      assertTrue(rows.size() >= 50, module.id() + " 至少需要 50 道题");
      assertEquals(
        rows.size(),
        rows
          .stream()
          .map(r -> r.get("title"))
          .distinct()
          .count()
      );
      assertTrue(rows.stream().allMatch(r -> r.get("answer").toString().length() >= 50));
    }
    assertEquals(0, senior.importAll(path));
    String key = SeniorQuestionImporter.sourceKey("java-language", 1);
    db.update("UPDATE questions SET answer='管理员后续编辑',deleted=TRUE WHERE source_key=?", key);
    try {
      assertEquals(0, senior.importAll(path));
      assertEquals(
        "管理员后续编辑",
        db.queryForObject("SELECT answer FROM questions WHERE source_key=?", String.class, key)
      );
      assertTrue(
        db.queryForObject("SELECT deleted FROM questions WHERE source_key=?", Boolean.class, key)
      );
    } finally {
      db.update("UPDATE questions SET deleted=FALSE WHERE source_key=?", key);
    }
  }
}
