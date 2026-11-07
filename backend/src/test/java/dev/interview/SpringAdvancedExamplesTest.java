package dev.interview;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import javax.sql.DataSource;
import javax.tools.ToolProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

class SpringAdvancedExamplesTest {

  @ParameterizedTest
  @CsvSource({
    "3, PropagationSavepointExample, [1]:[2]",
    "4, RollbackOnlyExample, true:0",
    "19, SecurityContextPoolExample, alice:anonymous",
  })
  void printedProgramsExecuteWithoutReplacingTheirSource(
    int number,
    String className,
    String expected
  ) throws Exception {
    String answer = Files.readString(
      Path.of("../content/explanations/generated/spring-advanced-" + number + ".md")
    );
    String source = answer.split("~~~java\\R", 2)[1].split("~~~", 2)[0].strip();
    Path directory = Path.of("target/spring-advanced-examples", className);
    Files.createDirectories(directory);
    Path file = directory.resolve(className + ".java");
    Files.writeString(file, source, StandardCharsets.UTF_8);
    var compiler = ToolProvider.getSystemJavaCompiler();
    assertNotNull(compiler);
    assertEquals(
      0,
      compiler.run(
        null,
        null,
        null,
        "--release",
        "17",
        "-encoding",
        "UTF-8",
        "-classpath",
        System.getProperty("surefire.test.class.path", System.getProperty("java.class.path")),
        "-d",
        directory.toString(),
        file.toString()
      )
    );
    Object actual;
    try (
      var loader = new URLClassLoader(
        new java.net.URL[] { directory.toUri().toURL() },
        getClass().getClassLoader()
      )
    ) {
      actual = loader.loadClass(className).getMethod("verify").invoke(null);
      assertEquals(expected, actual);
    }
    Files.writeString(
      directory.resolve("execution.json"),
      new ObjectMapper()
        .writerWithDefaultPrettyPrinter()
        .writeValueAsString(
          Map.of(
            "question",
            "spring-advanced/" + number,
            "sourceSha256",
            HexFormat.of().formatHex(
              MessageDigest.getInstance("SHA-256").digest(source.getBytes(StandardCharsets.UTF_8))
            ),
            "result",
            actual,
            "runtime",
            System.getProperty("java.version"),
            "springVersion",
            org.springframework.core.SpringVersion.getVersion()
          )
        )
    );
  }

  record Fact(int id, boolean fail) {}

  static class Probe {

    final List<Integer> committed = new ArrayList<>();

    @TransactionalEventListener
    public void accept(Fact fact) {
      committed.add(fact.id());
      if (fact.fail()) throw new IllegalStateException("expected listener failure");
    }
  }

  @Configuration(proxyBeanMethods = false)
  @EnableTransactionManagement
  static class Config {

    @Bean
    DataSource source() {
      return new DriverManagerDataSource("jdbc:h2:mem:advanced-events;DB_CLOSE_DELAY=-1", "sa", "");
    }

    @Bean
    JdbcTemplate jdbc(DataSource source) {
      return new JdbcTemplate(source);
    }

    @Bean
    PlatformTransactionManager manager(DataSource source) {
      return new DataSourceTransactionManager(source);
    }

    @Bean
    Probe probe() {
      return new Probe();
    }
  }

  // No automatic test transaction: these templates really complete before assertions.
  @Test
  void actualTransactionalListenerRunsOnCommitButNotRollbackOrNoTransaction() {
    try (var context = new AnnotationConfigApplicationContext(Config.class)) {
      var jdbc = context.getBean(JdbcTemplate.class);
      var tx = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
      var probe = context.getBean(Probe.class);
      jdbc.execute("CREATE TABLE item(id INT PRIMARY KEY)");
      try {
        tx.executeWithoutResult(status -> {
          jdbc.update("INSERT INTO item VALUES(1)");
          context.publishEvent(new Fact(1, false));
          assertEquals(List.of(), probe.committed);
        });
        assertEquals(List.of(1), probe.committed);
        assertThrows(IllegalStateException.class, () ->
          tx.executeWithoutResult(status -> {
            jdbc.update("INSERT INTO item VALUES(2)");
            context.publishEvent(new Fact(2, false));
            throw new IllegalStateException("rollback");
          })
        );
        context.publishEvent(new Fact(3, false));
        assertEquals(List.of(1), probe.committed);
        // AFTER_COMMIT event phase uses completion processing: log the listener error,
        // keep committed data, and do not assume the direct afterCommit exception contract.
        assertDoesNotThrow(() ->
          tx.executeWithoutResult(status -> {
            jdbc.update("INSERT INTO item VALUES(4)");
            context.publishEvent(new Fact(4, true));
          })
        );
        assertEquals(List.of(1, 4), probe.committed);
        assertEquals(
          List.of(1, 4),
          jdbc.queryForList("SELECT id FROM item ORDER BY id", Integer.class)
        );
      } finally {
        jdbc.execute("SHUTDOWN");
      }
    }
  }

  @Test
  void directAfterCommitFailurePropagatesWhileTheDatabaseRowIsAlreadyCommitted() {
    try (var context = new AnnotationConfigApplicationContext(Config.class)) {
      var jdbc = context.getBean(JdbcTemplate.class);
      var tx = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
      jdbc.execute("CREATE TABLE item(id INT PRIMARY KEY)");
      try {
        assertThrows(IllegalStateException.class, () ->
          tx.executeWithoutResult(status -> {
            jdbc.update("INSERT INTO item VALUES(1)");
            TransactionSynchronizationManager.registerSynchronization(
              new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                  throw new IllegalStateException("expected direct callback failure");
                }
              }
            );
          })
        );
        assertEquals(List.of(1), jdbc.queryForList("SELECT id FROM item", Integer.class));
      } finally {
        jdbc.execute("SHUTDOWN");
      }
    }
  }
}
