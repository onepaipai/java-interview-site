import java.sql.DriverManager;
import java.util.HashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.sql.DataSource;
import org.h2.jdbcx.JdbcDataSource;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.annotation.Transactional;

/** Standalone learning fixtures. Only creates dedicated H2 in-memory databases. */
public class ExplanationCases {
    public static void main(String[] args) throws Exception {
        hashKeys();
        transactionBoundaries();
        conditionalStockUpdate();
    }

    static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    static final class MutableKey {
        long accountId;
        MutableKey(long accountId) { this.accountId = accountId; }
        @Override public int hashCode() { return Long.hashCode(accountId); }
        @Override public boolean equals(Object other) {
            return other instanceof MutableKey key && accountId == key.accountId;
        }
    }
    record AccountKey(long tenantId, long accountId) {}
    record CollidingKey(long id) {
        @Override public int hashCode() { return 42; }
    }

    static void hashKeys() {
        var broken = new HashMap<MutableKey, String>();
        var key = new MutableKey(1);
        broken.put(key, "account");
        key.accountId = 2;
        check(broken.get(key) == null, "Expected the Java 17 mutable-key failure");
        check(broken.size() == 1, "The unreachable entry still occupies the map");

        var fixed = new HashMap<AccountKey, String>();
        fixed.put(new AccountKey(10, 1), "account");
        check("account".equals(fixed.get(new AccountKey(10, 1))), "Equivalent immutable key must work");
        check(fixed.get(new AccountKey(20, 1)) == null, "Tenants must remain isolated");

        var collisions = new HashMap<CollidingKey, String>();
        collisions.put(new CollidingKey(1), "first");
        collisions.put(new CollidingKey(2), "second");
        check(collisions.size() == 2, "Hash collision alone must not overwrite a distinct key");
        check("second".equals(collisions.get(new CollidingKey(2))), "Collision lookup must preserve equals semantics");
        System.out.println("PASS hash keys: mutation failure, immutable identity, tenant isolation, collisions");
    }

    @Configuration
    @EnableTransactionManagement(proxyTargetClass = true)
    public static class CaseConfig {
        @Bean public DataSource dataSource() {
            var dataSource = new JdbcDataSource();
            dataSource.setURL("jdbc:h2:mem:explanation_transactions;DB_CLOSE_DELAY=-1");
            dataSource.setUser("sa");
            return dataSource;
        }
        @Bean public JdbcTemplate jdbc(DataSource dataSource) { return new JdbcTemplate(dataSource); }
        @Bean public PlatformTransactionManager transactionManager(DataSource dataSource) {
            return new DataSourceTransactionManager(dataSource);
        }
        @Bean public BrokenOrderService broken(JdbcTemplate jdbc) { return new BrokenOrderService(jdbc); }
        @Bean public OrderWriter writer(JdbcTemplate jdbc) { return new OrderWriter(jdbc); }
        @Bean public CheckoutService checkout(OrderWriter writer) { return new CheckoutService(writer); }
    }

    public static class BrokenOrderService {
        private final JdbcTemplate jdbc;
        public BrokenOrderService(JdbcTemplate jdbc) { this.jdbc = jdbc; }
        public void checkout(long id) { insertAndFail(id); }
        @Transactional public void insertAndFail(long id) {
            jdbc.update("INSERT INTO demo_orders(id) VALUES(?)", id);
            throw new IllegalStateException("Simulated failure after insert");
        }
    }

    public static class OrderWriter {
        private final JdbcTemplate jdbc;
        public OrderWriter(JdbcTemplate jdbc) { this.jdbc = jdbc; }
        @Transactional public void insertAndFail(long id) {
            jdbc.update("INSERT INTO demo_orders(id) VALUES(?)", id);
            throw new IllegalStateException("Simulated failure after insert");
        }
    }

    public static class CheckoutService {
        private final OrderWriter writer;
        public CheckoutService(OrderWriter writer) { this.writer = writer; }
        public void checkout(long id) { writer.insertAndFail(id); }
    }

    static void expectFailure(Runnable action) {
        try { action.run(); }
        catch (IllegalStateException expected) { return; }
        throw new AssertionError("Expected a simulated failure");
    }

    static void transactionBoundaries() {
        // No test-managed outer transaction: the actual entry point must establish its boundary.
        try (var context = new AnnotationConfigApplicationContext(CaseConfig.class)) {
            var jdbc = context.getBean(JdbcTemplate.class);
            jdbc.execute("CREATE TABLE demo_orders(id BIGINT PRIMARY KEY)");
            expectFailure(() -> context.getBean(BrokenOrderService.class).checkout(1));
            check(jdbc.queryForObject("SELECT COUNT(*) FROM demo_orders WHERE id=1", Integer.class) == 1,
                "Self-invocation should leave the auto-committed insert in this scenario");
            expectFailure(() -> context.getBean(CheckoutService.class).checkout(2));
            check(jdbc.queryForObject("SELECT COUNT(*) FROM demo_orders WHERE id=2", Integer.class) == 0,
                "External proxy call must roll back the runtime exception");
            System.out.println("PASS transactions: self-call persisted=1, external proxy persisted=0");
        }
    }

    static void conditionalStockUpdate() throws Exception {
        String url = "jdbc:h2:mem:explanation_stock;DB_CLOSE_DELAY=-1";
        try (var connection = DriverManager.getConnection(url, "sa", ""); var statement = connection.createStatement()) {
            statement.execute("CREATE TABLE stock(sku_id BIGINT PRIMARY KEY,available INT NOT NULL CHECK(available>=0))");
            statement.execute("INSERT INTO stock VALUES(1,1)");
        }
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            java.util.concurrent.Callable<Integer> buyer = () -> {
                try (var connection = DriverManager.getConnection(url, "sa", "")) {
                    connection.setAutoCommit(false);
                    ready.countDown();
                    if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Start gate timed out");
                    try (var update = connection.prepareStatement(
                            "UPDATE stock SET available=available-? WHERE sku_id=? AND available>=?")) {
                        update.setInt(1, 1); update.setLong(2, 1); update.setInt(3, 1);
                        int changed = update.executeUpdate();
                        connection.commit();
                        return changed;
                    } catch (Exception error) {
                        connection.rollback();
                        throw error;
                    }
                }
            };
            var first = executor.submit(buyer);
            var second = executor.submit(buyer);
            check(ready.await(10, TimeUnit.SECONDS), "Both buyers must connect independently");
            start.countDown();
            check(first.get(10, TimeUnit.SECONDS) + second.get(10, TimeUnit.SECONDS) == 1,
                "Only one buyer may deduct the final item");
            try (var connection = DriverManager.getConnection(url, "sa", "");
                 var statement = connection.createStatement();
                 var result = statement.executeQuery("SELECT available FROM stock WHERE sku_id=1")) {
                check(result.next() && result.getInt(1) == 0, "Remaining stock must be zero");
            }
            System.out.println("PASS stock (H2 demonstration): buyers=2, successful deductions=1, remaining=0");
        } finally {
            start.countDown();
            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);
        }
    }
}
