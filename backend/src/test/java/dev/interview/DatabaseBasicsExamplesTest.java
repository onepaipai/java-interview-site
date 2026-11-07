package dev.interview;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/** Execute exact printed SQL. H2 results are not evidence of MySQL plans or locking. */
class DatabaseBasicsExamplesTest {

  protected String engine() {
    return "h2";
  }

  protected DriverManagerDataSource source() {
    return new DriverManagerDataSource("jdbc:h2:mem:database-content;MODE=MySQL", "sa", "");
  }

  @ParameterizedTest
  @CsvSource(
    value = {
      "database-basics-15|[[[\"3\"],[\"2\"]]]|[]",
      "database-basics-24|[[[\"4\",\"1\"]]]|[1,0]",
      "legacy-47|[[[\"1\",\"1\"],[\"2\",\"0\"]],[[\"1\",\"1\"]],[[\"1\",\"1\"]]]|[]",
    },
    delimiter = '|'
  )
  void exactPrintedSqlHasTheDocumentedRowsAndUpdateCounts(
    String file,
    String expectedQueries,
    String expectedUpdates
  ) throws Exception {
    String answer = Files.readString(Path.of("../content/explanations/generated/" + file + ".md"));
    var fence = java.util.regex.Pattern.compile("(?:~~~|```)sql\\R([\\s\\S]*?)(?:~~~|```)").matcher(
      answer
    );
    assertTrue(fence.find(), "SQL must come from the printed answer");
    String sql = fence.group(1).strip();
    List<List<List<String>>> queries = new ArrayList<>();
    List<Integer> updates = new ArrayList<>();
    String product;
    String version;
    try (var connection = source().getConnection(); var statement = connection.createStatement()) {
      product = connection.getMetaData().getDatabaseProductName();
      version = connection.getMetaData().getDatabaseProductVersion();
      for (String part : sql.split(";")) {
        if (part.isBlank()) continue;
        // These examples intentionally use only session temporary tables.
        assertTrue(
          part.stripLeading().matches("(?is)(CREATE TEMPORARY TABLE|INSERT INTO|UPDATE|SELECT) .*")
        );
        if (statement.execute(part)) {
          var rows = new ArrayList<List<String>>();
          try (var result = statement.getResultSet()) {
            int columns = result.getMetaData().getColumnCount();
            while (result.next()) {
              var row = new ArrayList<String>();
              for (int i = 1; i <= columns; i++) row.add(result.getString(i));
              rows.add(row);
            }
          }
          queries.add(rows);
        } else if (part.stripLeading().startsWith("UPDATE ")) {
          updates.add(statement.getUpdateCount());
        }
      }
    }
    var json = new ObjectMapper();
    assertEquals(expectedQueries, json.writeValueAsString(queries));
    assertEquals(expectedUpdates, json.writeValueAsString(updates));
    Path directory = Path.of("target/database-content-examples", engine(), file);
    Files.createDirectories(directory);
    Files.writeString(
      directory.resolve("execution.json"),
      json
        .writerWithDefaultPrettyPrinter()
        .writeValueAsString(
          Map.of(
            "file",
            file,
            "sourceSha256",
            HexFormat.of().formatHex(
              MessageDigest.getInstance("SHA-256").digest(sql.getBytes(StandardCharsets.UTF_8))
            ),
            "database",
            product,
            "databaseVersion",
            version,
            "queries",
            queries,
            "updates",
            updates,
            "meaning",
            "Only these result rows and update counts; no index-plan or concurrency claim"
          )
        )
    );
  }
}
