package dev.interview;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** Inherits the concurrency, archival, session and search regressions on real MySQL. */
@EnabledIfEnvironmentVariable(
  named = "MYSQL_TEST_URL",
  matches = "jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/[a-zA-Z0-9_]+_test(?:\\?.*)?"
)
class MySqlIntegrationTest extends RegressionTest {

  @DynamicPropertySource
  static void mysql(DynamicPropertyRegistry properties) {
    properties.add("spring.datasource.url", () -> System.getenv("MYSQL_TEST_URL"));
    properties.add("spring.datasource.username", () ->
      System.getenv().getOrDefault("MYSQL_TEST_USER", "interview")
    );
    properties.add("spring.datasource.password", () -> System.getenv("MYSQL_TEST_PASSWORD"));
  }

  @Test
  void actualMysql84AndAllMigrationsAreUsed() {
    assertTrue(db.queryForObject("SELECT VERSION()", String.class).startsWith("8.4."));
    // 全部迁移成功应用：历史总行数与成功行数一致，新增迁移无需更新此断言。
    assertEquals(
      db.queryForObject("SELECT COUNT(*) FROM flyway_schema_history", Integer.class),
      db.queryForObject(
        "SELECT COUNT(*) FROM flyway_schema_history WHERE success=TRUE",
        Integer.class
      )
    );
    assertTrue(
      db.queryForObject("SELECT @@collation_database", String.class).startsWith("utf8mb4")
    );
  }
}
