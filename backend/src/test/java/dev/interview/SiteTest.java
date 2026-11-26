package dev.interview;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.interview.question.QuestionService;
import dev.interview.shared.MarkdownImporter;
import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
  properties = {
    "spring.datasource.url=jdbc:h2:mem:tests;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "app.admin-password=test-admin-password",
    "app.seed-path=../content/Java.md",
    "app.upload-dir=./target/test-uploads",
  }
)
@AutoConfigureMockMvc
class SiteTest {

  @Autowired
  MockMvc mvc;

  @Autowired
  JdbcTemplate db;

  @Autowired
  PasswordEncoder encoder;

  @Autowired
  MarkdownImporter parser;

  @Autowired
  QuestionService service;

  @Autowired
  ObjectMapper json;

  long cid() {
    return db.queryForObject("SELECT MIN(id) FROM categories", Long.class);
  }

  QuestionService.Edit edit(String title) {
    return new QuestionService.Edit(title, cid(), "基础", "答案", 1, List.of("测试"), null);
  }

  @Test
  void seedAndParser() throws Exception {
    var result = parser.parse(Files.readString(Path.of("../content/Java.md")));
    assertEquals(165, result.questions().size());
    assertTrue(
      result
        .questions()
        .stream()
        .anyMatch(q -> q.title().contains("JVM"))
    );
    assertTrue(
      result
        .documents()
        .stream()
        .anyMatch(d -> d.title().contains("冲刺"))
    );
    assertEquals(
      165,
      result.questions().stream().map(MarkdownImporter.Item::sourceKey).distinct().count()
    );
    var fenced = parser.parse(
      "## 基础\n### 并发\n1. 题一\n    ```java\n    2. 代码不是题\n    ## 代码标题\n    ```\n2. 题二\n"
    );
    assertEquals(2, fenced.questions().size());
    assertTrue(fenced.questions().get(0).answer().contains("代码不是题"));
  }

  @Test
  void loginAndPermissions() throws Exception {
    mvc.perform(get("/api/questions")).andExpect(status().isUnauthorized());
    mvc
      .perform(formLogin("/api/login").user("admin").password("test-admin-password"))
      .andExpect(status().isOk());
    mvc
      .perform(
        post("/api/admin/categories")
          .with(user("student").roles("USER"))
          .with(csrf())
          .contentType("application/json")
          .content("{\"name\":\"越权\"}")
      )
      .andExpect(status().isForbidden());
    mvc
      .perform(
        post("/api/admin/categories")
          .with(user("admin").roles("ADMIN"))
          .contentType("application/json")
          .content("{\"name\":\"没有csrf\"}")
      )
      .andExpect(status().isForbidden());
    mvc
      .perform(get("/api/questions?trash=true").with(user("student").roles("USER")))
      .andExpect(status().isForbidden());
  }

  @Test
  void crudConflictTrashAndFilters() throws Exception {
    long id = service.save(null, edit("唯一测试题-" + UUID.randomUUID()));
    mvc
      .perform(
        put("/api/admin/questions/" + id)
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
          .contentType("application/json")
          .content(
            json.writeValueAsString(
              new QuestionService.Edit("改名测试", cid(), "高级", "新答案", 2, List.of("测试"), 0)
            )
          )
      )
      .andExpect(status().isOk());
    mvc
      .perform(
        put("/api/admin/questions/" + id)
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
          .contentType("application/json")
          .content(
            json.writeValueAsString(
              new QuestionService.Edit("并发修改", cid(), "高级", "覆盖", 2, List.of(), 0)
            )
          )
      )
      .andExpect(status().isConflict());
    mvc
      .perform(
        get("/api/questions?search=改名测试&difficulty=高级&tag=测试").with(
          user("admin").roles("ADMIN")
        )
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.total").value(1));
    mvc
      .perform(
        delete("/api/admin/questions/" + id)
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
      )
      .andExpect(status().isOk());
    mvc
      .perform(get("/api/questions/" + id).with(user("admin").roles("ADMIN")))
      .andExpect(status().isNotFound());
    mvc
      .perform(
        post("/api/admin/questions/" + id + "/restore")
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
      )
      .andExpect(status().isOk());
    mvc
      .perform(get("/api/questions/" + id).with(user("admin").roles("ADMIN")))
      .andExpect(jsonPath("$.title").value("改名测试"));
  }

  @Test
  void weakReviewLocationUsesTheSameUserScopedQueue() throws Exception {
    long first = service.save(null, edit("复习队列第一题"));
    long second = service.save(null, edit("复习队列第二题"));
    long third = service.save(null, edit("复习队列非薄弱题"));
    for (long id : List.of(first, second)) {
      mvc
        .perform(
          put("/api/questions/" + id + "/progress")
            .with(user("admin").roles("ADMIN"))
            .with(csrf())
            .contentType("application/json")
            .content("{\"mastery\":\"NO\",\"favorite\":false,\"note\":\"\",\"reviewed\":true}")
        )
        .andExpect(status().isOk());
    }

    mvc
      .perform(get("/api/questions?weak=true&page=1&size=1").with(user("admin").roles("ADMIN")))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.total").value(2))
      .andExpect(jsonPath("$.items.length()").value(1));
    mvc
      .perform(
        get("/api/questions/" + second + "/location?weak=true&size=1").with(
          user("admin").roles("ADMIN")
        )
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.page").value(2))
      .andExpect(jsonPath("$.total").value(2));
    mvc
      .perform(
        get("/api/questions/" + third + "/location?weak=true&size=1").with(
          user("admin").roles("ADMIN")
        )
      )
      .andExpect(status().isNotFound());
  }

  @Test
  void learningIsPrivate() throws Exception {
    String learner = "student-" + UUID.randomUUID().toString().substring(0, 8);
    db.update(
      "INSERT INTO accounts(username,password,role) VALUES(?,?,'USER')",
      learner,
      encoder.encode("student-password")
    );
    long id = service.save(null, edit("学习隔离测试"));
    mvc
      .perform(
        put("/api/questions/" + id + "/progress")
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
          .contentType("application/json")
          .content(
            "{\"mastery\":\"NO\",\"favorite\":true,\"note\":\"我的私密笔记\",\"reviewed\":true}"
          )
      )
      .andExpect(status().isOk());
    mvc
      .perform(get("/api/questions/" + id).with(user(learner).roles("USER")))
      .andExpect(jsonPath("$.note").value(""))
      .andExpect(jsonPath("$.favorite").value(false))
      .andExpect(jsonPath("$.mastery").value("NEW"));
    mvc
      .perform(get("/api/questions/" + id).with(user("admin").roles("ADMIN")))
      .andExpect(jsonPath("$.note").value("我的私密笔记"))
      .andExpect(jsonPath("$.review_count").value(1));
  }

  @Test
  void repeatedImportAndRollback() throws Exception {
    var p = parser.parse(Files.readString(Path.of("../content/Java.md")));
    assertEquals(165, service.importItems(p.questions(), p.documents(), "skip").get("skipped"));
    String key = MarkdownImporter.key(UUID.randomUUID().toString());
    var good = new MarkdownImporter.Item(key, "合法题", "临时分类", "基础", "", 0, List.of());
    var bad = new MarkdownImporter.Item(
      MarkdownImporter.key(key),
      "错误题",
      "临时分类",
      "错误难度",
      "",
      1,
      List.of()
    );
    assertThrows(IllegalArgumentException.class, () ->
      service.importItems(List.of(good, bad), List.of(), "skip")
    );
    assertEquals(
      0,
      db.queryForObject("SELECT COUNT(*) FROM questions WHERE source_key=?", Integer.class, key)
    );
  }

  @Test
  void exportAndLocation() throws Exception {
    String markdown = mvc
      .perform(get("/api/admin/export").with(user("admin").roles("ADMIN")))
      .andExpect(status().isOk())
      .andReturn()
      .getResponse()
      .getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    long active = db.queryForObject(
      "SELECT COUNT(*) FROM questions WHERE deleted=FALSE",
      Long.class
    );
    var exported = parser.parse(markdown);
    assertEquals(active, exported.questions().size());
    var memory = exported
      .questions()
      .stream()
      .filter(q -> q.title().contains("JVM 内存区域"))
      .findFirst()
      .orElseThrow();
    assertEquals(
      db
        .queryForObject(
          "SELECT answer FROM questions WHERE title=? AND deleted=FALSE",
          String.class,
          memory.title()
        )
        .strip(),
      memory.answer()
    );
    mvc
      .perform(get("/api/questions/165/location").with(user("admin").roles("ADMIN")))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.page").isNumber());
    mvc
      .perform(get("/api/admin/export/documents").with(user("admin").roles("ADMIN")))
      .andExpect(status().isOk());
  }

  @Test
  void utf8PreviewAndRejectSvg() throws Exception {
    mvc
      .perform(
        multipart("/api/admin/import/preview")
          .file(
            new MockMultipartFile(
              "file",
              "题库.md",
              "text/plain",
              "## 进阶\n### JVM\n1. 回收器\n    - 要点：G1".getBytes(
                java.nio.charset.StandardCharsets.UTF_8
              )
            )
          )
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.questions[0].title").value("回收器"));
    mvc
      .perform(
        multipart("/api/admin/uploads")
          .file(
            new MockMultipartFile(
              "file",
              "evil.svg",
              "image/svg+xml",
              "<svg onload='alert(1)'/>".getBytes()
            )
          )
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
      )
      .andExpect(status().isBadRequest());
  }

  @Test
  void archiveEmptyModuleKeepsHistoryAndReleasesName() throws Exception {
    String name = "归档模块-" + UUID.randomUUID();
    long category = service.category(name);
    long id = service.save(
      null,
      new QuestionService.Edit("历史题目", category, "基础", "历史回答", 0, List.of(), null)
    );
    mvc
      .perform(
        delete("/api/admin/categories/" + category)
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
      )
      .andExpect(status().isConflict());
    mvc
      .perform(
        delete("/api/admin/questions/" + id)
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
      )
      .andExpect(status().isOk());
    mvc
      .perform(
        delete("/api/admin/categories/" + category)
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
      )
      .andExpect(status().isOk());
    assertEquals(
      1,
      db.queryForObject(
        "SELECT COUNT(*) FROM questions WHERE id=? AND deleted=TRUE",
        Integer.class,
        id
      )
    );
    assertEquals(
      name,
      db.queryForObject(
        "SELECT archived_name FROM categories WHERE id=? AND deleted=TRUE",
        String.class,
        category
      )
    );
    assertEquals(
      "历史回答",
      service
        .question(
          id,
          db.queryForObject("SELECT id FROM accounts WHERE username='admin'", Long.class),
          true
        )
        .get("answer")
    );
    var visible = mvc
      .perform(get("/api/categories").with(user("admin").roles("ADMIN")))
      .andReturn()
      .getResponse()
      .getContentAsString();
    assertFalse(visible.contains(name));
    assertNotEquals(category, service.category(name));
    assertThrows(org.springframework.web.server.ResponseStatusException.class, () ->
      service.save(
        null,
        new QuestionService.Edit("无效模块", category, "基础", "", 0, List.of(), null)
      )
    );
  }

  @Test
  void restoreArchivedCategoryReusesOriginalName() throws Exception {
    String name = "恢复模块-" + UUID.randomUUID();
    long category = service.category(name);
    long id = service.save(
      null,
      new QuestionService.Edit("历史题", category, "基础", "历史答案", 0, List.of(), null)
    );
    mvc
      .perform(
        delete("/api/admin/questions/" + id)
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
      )
      .andExpect(status().isOk());
    mvc
      .perform(
        delete("/api/admin/categories/" + category)
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
      )
      .andExpect(status().isOk());
    String archived = mvc
      .perform(get("/api/admin/categories/archived").with(user("admin").roles("ADMIN")))
      .andReturn()
      .getResponse()
      .getContentAsString();
    assertTrue(archived.contains(name));

    mvc
      .perform(
        post("/api/admin/categories/" + category + "/unarchive")
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
      )
      .andExpect(status().isOk());
    assertEquals(
      name,
      db.queryForObject("SELECT name FROM categories WHERE id=?", String.class, category)
    );
    assertEquals(
      false,
      db.queryForObject("SELECT deleted FROM categories WHERE id=?", Boolean.class, category)
    );
    assertTrue(
      mvc
        .perform(get("/api/categories").with(user("admin").roles("ADMIN")))
        .andReturn()
        .getResponse()
        .getContentAsString()
        .contains(name)
    );

    long other = service.category(name + "-占用");
    mvc
      .perform(
        delete("/api/admin/categories/" + category)
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
      )
      .andExpect(status().isOk());
    mvc
      .perform(
        put("/api/admin/categories/" + other)
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content("{\"name\":\"" + name + "\",\"sortOrder\":0}")
      )
      .andExpect(status().isOk());
    mvc
      .perform(
        post("/api/admin/categories/" + category + "/unarchive")
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
      )
      .andExpect(status().isConflict());
  }
}
