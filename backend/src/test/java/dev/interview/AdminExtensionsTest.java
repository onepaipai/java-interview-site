package dev.interview;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.interview.question.QuestionService;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
  properties = {
    "spring.datasource.url=jdbc:h2:mem:admin_ext;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "app.admin-password=test-admin-password",
    "app.seed-path=../content/Java.md",
    "app.upload-dir=./target/admin-ext-uploads",
  }
)
@AutoConfigureMockMvc
class AdminExtensionsTest {

  @Autowired
  MockMvc mvc;

  @Autowired
  JdbcTemplate db;

  @Autowired
  QuestionService service;

  @Autowired
  ObjectMapper json;

  @Test
  void batchMoveUpdatesOnlyCategoryAndRollsBackOnMissingId() throws Exception {
    long from = service.category("批量移动源-" + UUID.randomUUID());
    long to = service.category("批量移动目标-" + UUID.randomUUID());
    long first = service.save(
      null,
      new QuestionService.Edit("题一", from, "基础", "答案一", 0, List.of(), null)
    );
    long second = service.save(
      null,
      new QuestionService.Edit("题二", from, "基础", "答案二", 1, List.of(), null)
    );
    String body = json.writeValueAsString(Map.of("ids", List.of(first, second), "categoryId", to));

    mvc
      .perform(
        post("/api/admin/questions/batch-move")
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(body)
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.moved").value(2));
    assertEquals(
      to,
      db.queryForObject("SELECT category_id FROM questions WHERE id=?", Long.class, first)
    );
    assertEquals(
      "答案一",
      db.queryForObject("SELECT answer FROM questions WHERE id=?", String.class, first)
    );
    assertEquals(
      0,
      db.queryForObject(
        "SELECT COUNT(*) FROM questions WHERE category_id=? AND deleted=FALSE",
        Integer.class,
        from
      )
    );

    String bad = json.writeValueAsString(
      Map.of("ids", List.of(first, 999999999L), "categoryId", from)
    );
    mvc
      .perform(
        post("/api/admin/questions/batch-move")
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(bad)
      )
      .andExpect(status().isConflict());
    assertEquals(
      to,
      db.queryForObject("SELECT category_id FROM questions WHERE id=?", Long.class, first)
    );
  }

  @Test
  void backupReturnsFullStructure() throws Exception {
    String body = mvc
      .perform(get("/api/admin/backup").with(user("admin").roles("ADMIN")))
      .andExpect(status().isOk())
      .andReturn()
      .getResponse()
      .getContentAsString();
    Map<String, Object> backup = json.readValue(body, Map.class);
    assertEquals(1, ((Number) backup.get("version")).intValue());
    assertTrue(backup.containsKey("categories"));
    assertTrue(backup.containsKey("archivedCategories"));
    assertTrue(backup.containsKey("tags"));
    assertTrue(backup.containsKey("documents"));
    assertTrue(backup.containsKey("questions"));
    assertTrue(backup.containsKey("trash"));
    assertTrue(backup.containsKey("publications"));
    assertFalse(((List<?>) backup.get("questions")).isEmpty());
    assertTrue(((String) backup.get("scope")).contains("仅限当前管理员"));
  }

  @Test
  void reviewWriteRequiresEvidenceForVerified() throws Exception {
    String body = mvc
      .perform(get("/api/admin/reviews").with(user("admin").roles("ADMIN")))
      .andExpect(status().isOk())
      .andReturn()
      .getResponse()
      .getContentAsString();
    Map<String, Object> summary = json.readValue(body, Map.class);
    List<Map<String, Object>> items = (List<Map<String, Object>>) summary.get("items");
    assertFalse(items.isEmpty());
    String key = (String) items.get(0).get("sourceKey");

    String invalid = json.writeValueAsString(
      Map.of("status", "verified", "applicableVersion", "", "evidence", List.of(), "reviewer", "")
    );
    mvc
      .perform(
        put("/api/admin/reviews/" + key)
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(invalid)
      )
      .andExpect(status().isBadRequest());

    String valid = json.writeValueAsString(
      Map.of(
        "status",
        "verified",
        "applicableVersion",
        "JDK 17",
        "evidence",
        List.of("https://docs.oracle.com/javase/17/"),
        "reviewer",
        "e2e-reviewer"
      )
    );
    mvc
      .perform(
        put("/api/admin/reviews/" + key)
          .with(user("admin").roles("ADMIN"))
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(valid)
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status").value("verified"));
    assertEquals(
      "verified",
      db.queryForObject(
        "SELECT status FROM explanation_reviews WHERE source_key=?",
        String.class,
        key
      )
    );
  }
}
