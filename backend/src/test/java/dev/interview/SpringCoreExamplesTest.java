package dev.interview;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
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
import org.springframework.transaction.annotation.Transactional;

/** Execute the code actually printed in the answers, then a narrow H2 rollback comparison. */
class SpringCoreExamplesTest {

  @ParameterizedTest
  @CsvSource({
    "4, PrototypeLookupExample, true:false",
    "7, BeanPhasesExample, definition:instance",
    "9, ProxyBoundaryExample, 1:2",
  })
  void publishedJavaExamplesCompileAndMatchExpectedResult(
    int number,
    String className,
    String expected
  ) throws Exception {
    String answer = Files.readString(
      Path.of("../content/explanations/generated/spring-basics-" + number + ".md")
    );
    String source = answer.split("~~~java\\R", 2)[1].split("~~~", 2)[0].strip();
    Path directory = Path.of("target/spring-content-examples", className);
    Files.createDirectories(directory);
    Path file = directory.resolve(className + ".java");
    Files.writeString(file, source, StandardCharsets.UTF_8);
    var compiler = ToolProvider.getSystemJavaCompiler();
    assertNotNull(compiler, "Run tests with the Java 17 JDK");
    String classPath = System.getProperty(
      "surefire.test.class.path",
      System.getProperty("java.class.path")
    );
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
        classPath,
        "-d",
        directory.toString(),
        file.toString()
      ),
      "Published example must compile without substituting a test-only implementation"
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
    var evidence = Map.of(
      "question",
      "spring-basics/" + number,
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
    );
    Files.writeString(
      directory.resolve("execution.json"),
      new ObjectMapper().writerWithDefaultPrettyPrinter().writeValueAsString(evidence)
    );
  }

  @Configuration(proxyBeanMethods = false)
  @EnableTransactionManagement(proxyTargetClass = true)
  static class Config {

    @Bean
    DataSource dataSource() {
      return new DriverManagerDataSource("jdbc:h2:mem:spring-core-examples", "sa", "");
    }

    @Bean
    JdbcTemplate jdbc(DataSource dataSource) {
      return new JdbcTemplate(dataSource);
    }

    @Bean
    PlatformTransactionManager transactionManager(DataSource dataSource) {
      return new DataSourceTransactionManager(dataSource);
    }

    @Bean
    Writes writes(JdbcTemplate jdbc) {
      return new Writes(jdbc);
    }
  }

  static class Writes {

    private final JdbcTemplate jdbc;

    Writes(JdbcTemplate jdbc) {
      this.jdbc = jdbc;
    }

    @Transactional
    public void runtimeFailure() {
      jdbc.update("INSERT INTO rollback_example(id) VALUES(1)");
      throw new IllegalStateException("runtime failure");
    }

    @Transactional
    public void checkedFailure() throws Exception {
      jdbc.update("INSERT INTO rollback_example(id) VALUES(2)");
      throw new Exception("checked failure");
    }

    @Transactional(rollbackFor = Exception.class)
    public void checkedFailureWithRule() throws Exception {
      jdbc.update("INSERT INTO rollback_example(id) VALUES(3)");
      throw new Exception("explicit rollback");
    }
  }

  // No test-level transaction: query only after each service proxy invocation has completed.
  @Test
  void realDatabaseStateDistinguishesDefaultAndExplicitRollbackRules() {
    try (var context = new AnnotationConfigApplicationContext(Config.class)) {
      JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
      // Keep the embedded database alive across the independent observation connections.
      jdbc.execute("SET DB_CLOSE_DELAY -1");
      jdbc.execute("CREATE TABLE rollback_example(id INT PRIMARY KEY)");
      try {
        Writes writes = context.getBean(Writes.class);
        assertTrue(org.springframework.aop.support.AopUtils.isAopProxy(writes));
        assertThrows(IllegalStateException.class, writes::runtimeFailure);
        assertEquals(
          0,
          jdbc.queryForObject("SELECT COUNT(*) FROM rollback_example", Integer.class)
        );
        assertThrows(Exception.class, writes::checkedFailure);
        assertEquals(
          1,
          jdbc.queryForObject("SELECT COUNT(*) FROM rollback_example", Integer.class)
        );
        assertThrows(Exception.class, writes::checkedFailureWithRule);
        assertEquals(
          java.util.List.of(2),
          jdbc.queryForList("SELECT id FROM rollback_example", Integer.class)
        );
      } finally {
        jdbc.execute("DROP TABLE rollback_example");
        jdbc.execute("SHUTDOWN");
      }
    }
  }
}
