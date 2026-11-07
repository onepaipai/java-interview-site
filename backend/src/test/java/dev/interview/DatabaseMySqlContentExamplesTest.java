package dev.interview;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/** Runs inherited printed SQL only when the explicitly isolated MySQL gate is configured. */
@EnabledIfEnvironmentVariable(
  named = "MYSQL_TEST_URL",
  matches = "jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/[a-zA-Z0-9_]+_test(?:\\?.*)?"
)
class DatabaseMySqlContentExamplesTest extends DatabaseBasicsExamplesTest {

  @Override
  protected String engine() {
    return "mysql";
  }

  @Override
  protected DriverManagerDataSource source() {
    String url = System.getenv("MYSQL_TEST_URL");
    assertNotNull(url);
    assertTrue(
      url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/[a-zA-Z0-9_]+_test(?:\\?.*)?")
    );
    var source = new DriverManagerDataSource(
      url,
      System.getenv().getOrDefault("MYSQL_TEST_USER", "interview"),
      System.getenv("MYSQL_TEST_PASSWORD")
    );
    try (var connection = source.getConnection()) {
      assertTrue(connection.getMetaData().getDatabaseProductVersion().startsWith("8.4."));
      assertTrue(connection.getCatalog().endsWith("_test"));
    } catch (java.sql.SQLException error) {
      throw new IllegalStateException(error);
    }
    return source;
  }

  @Test
  void explicitlyIsolatedMysql84IsAvailable() throws Exception {
    try (var connection = source().getConnection()) {
      assertEquals("MySQL", connection.getMetaData().getDatabaseProductName());
    }
  }
}
