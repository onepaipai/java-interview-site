package dev.interview;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Execute two narrow claims from the answers; H2 is not a MySQL/Redis failure simulation. */
@SpringJUnitConfig(DeepAnswerExamplesTest.Config.class)
class DeepAnswerExamplesTest {

  @TestConfiguration
  @EnableTransactionManagement(proxyTargetClass = true)
  static class Config {

    @Bean
    DataSource dataSource() {
      return new DriverManagerDataSource("jdbc:h2:mem:deep-examples;DB_CLOSE_DELAY=-1", "sa", "");
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
    AuditService audit(JdbcTemplate jdbc) {
      return new AuditService(jdbc);
    }

    @Bean
    OrderService order(JdbcTemplate jdbc, AuditService audit) {
      return new OrderService(jdbc, audit);
    }
  }

  static class AuditService {

    final JdbcTemplate jdbc;

    AuditService(JdbcTemplate jdbc) {
      this.jdbc = jdbc;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record() {
      jdbc.update("INSERT INTO audit_example(id) VALUES(1)");
    }
  }

  static class OrderService {

    final JdbcTemplate jdbc;
    final AuditService audit;

    OrderService(JdbcTemplate jdbc, AuditService audit) {
      this.jdbc = jdbc;
      this.audit = audit;
    }

    @Transactional
    public void start(boolean crossBean) {
      jdbc.update("INSERT INTO order_example(id) VALUES(1)");
      if (crossBean) audit.record();
      else this.record();
      throw new IllegalStateException("rollback order");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record() {
      jdbc.update("INSERT INTO audit_example(id) VALUES(1)");
    }
  }

  @Autowired
  JdbcTemplate jdbc;

  @Autowired
  OrderService order;

  @BeforeEach
  void prepare() {
    jdbc.execute("CREATE TABLE IF NOT EXISTS order_example(id INT PRIMARY KEY)");
    jdbc.execute("CREATE TABLE IF NOT EXISTS audit_example(id INT PRIMARY KEY)");
    jdbc.execute("DELETE FROM order_example");
    jdbc.execute("DELETE FROM audit_example");
  }

  @Test
  void selfInvocationRollsBackAuditButCrossBeanCommitsAudit() {
    assertThrows(IllegalStateException.class, () -> order.start(false));
    assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM order_example", Integer.class));
    assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM audit_example", Integer.class));
    assertThrows(IllegalStateException.class, () -> order.start(true));
    assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM order_example", Integer.class));
    assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM audit_example", Integer.class));
  }

  @Test
  void actualPublishedSqlRejectsOlderAndRepeatedTokens() throws Exception {
    String answer = Files.readString(
      Path.of("../content/explanations/generated/distributed-16.md")
    );
    String sql = answer.split("```sql\\R", 2)[1].split("```", 2)[0].strip();
    jdbc.execute(
      "CREATE TABLE IF NOT EXISTS protected_resource(id INT PRIMARY KEY,payload VARCHAR(100),fence_token BIGINT NOT NULL)"
    );
    jdbc.update("DELETE FROM protected_resource");
    jdbc.update("INSERT INTO protected_resource VALUES(1,'initial',0)");
    var named = new NamedParameterJdbcTemplate(jdbc);
    assertEquals(1, named.update(sql, Map.of("id", 1, "payload", "new", "token", 42)));
    assertEquals(0, named.update(sql, Map.of("id", 1, "payload", "old", "token", 41)));
    assertEquals(0, named.update(sql, Map.of("id", 1, "payload", "retry", "token", 42)));
    assertEquals(
      "new",
      jdbc.queryForObject("SELECT payload FROM protected_resource WHERE id=1", String.class)
    );
  }
}
