<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/tx-propagation.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Spring 6.2 / JDBC 教学实验：外层订单事务调用 REQUIRED 内层服务，内层写入后抛运行时异常，外层捕获并尝试正常返回，观察真实提交结果。

1. 常见原因是内层参与同一个物理事务并把它标记为 rollback-only，外层捕获异常后仍尝试提交；管理器回滚并以 UnexpectedRollbackException 防止调用方误以为提交成功。
2. 捕获异常只改变 Java 控制流，不会自动清除事务的回滚状态。数据库或其他参与者也可能标记回滚，不能仅靠是否看见内层异常来判断。
3. 按业务决定整体失败、使用可支持的保存点，或把真正独立的操作分离；不要吞掉该异常并返回成功，也不要为消除报错随意改成 REQUIRES_NEW。

## 参考分析

### 共享事务：逻辑方法不同，最终提交只有一次

外层和内层都使用 REQUIRED 时，通常各有逻辑事务作用域，却共同参与同一个物理事务。内层异常经过事务边界后，管理器可能把共享事务标成只能回滚。外层方法继续执行不意味着数据库允许它恢复提交，最后的异常是在报告这个已经确定的失败状态。类比合租水电费：一个室友（内层）拖欠（标记回滚），月底（外层提交）统一结算失败——catch 自己的账单改变不了总表。

### 控制流：catch 无法倒转资源状态

捕获运行时异常可以让业务代码继续，但已设置的 rollback-only 或数据库事务错误并不会因此消失。与方法内部自行捕获、异常根本未到达拦截器的情况不同，这里内层事务边界已观察到失败。排查时应记录异常经过哪个代理、参与哪个管理器，以及最终失败发生在业务方法还是提交阶段。

### 修复：让返回语义与提交结果一致

如果订单必须整体原子，应让失败传播并返回可解释的失败；如果某一步允许局部撤销，可评估保存点及管理器支持。真正独立的审计才考虑独立事务，并接受其可能与业务失败并存。不能尝试把 rollback-only 改回可提交，或者重试整个控制器来掩盖已产生的副作用。

## 案例

### 完整程序：内层失败被捕获仍无法提交

以下程序用两个默认 REQUIRED 模板构造共享事务，内层异常穿出模板后才被外层捕获，避免与方法内部吞异常混淆。预期 verify 返回 true:0，表示提交时观察到 UnexpectedRollbackException，最终没有记录。它证明的是 JDBC 本地事务这条窄路径。

~~~java
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.transaction.UnexpectedRollbackException;
import org.springframework.transaction.support.TransactionTemplate;
public class RollbackOnlyExample {
  public static String verify() {
    var ds = new DriverManagerDataSource("jdbc:h2:mem:rollback-only-example;DB_CLOSE_DELAY=-1", "sa", "");
    var jdbc = new JdbcTemplate(ds);
    var manager = new DataSourceTransactionManager(ds);
    var outer = new TransactionTemplate(manager);
    var inner = new TransactionTemplate(manager);
    jdbc.execute("CREATE TABLE item(id INT PRIMARY KEY)");
    boolean rejected = false;
    try {
      try {
        outer.executeWithoutResult(status -> {
          jdbc.update("INSERT INTO item VALUES(1)");
          try {
            inner.executeWithoutResult(shared -> {
              jdbc.update("INSERT INTO item VALUES(2)");
              throw new IllegalStateException("inner failed");
            });
          } catch (IllegalStateException expected) { }
        });
      } catch (UnexpectedRollbackException expected) { rejected = true; }
      return rejected + ":" + jdbc.queryForObject("SELECT COUNT(*) FROM item", Integer.class);
    } finally { jdbc.execute("SHUTDOWN"); }
  }
}
~~~

### 定位追问：异常在哪里被捕获很关键

对照把异常捕获移到 inner.executeWithoutResult 的回调内部，使其没有穿过内层事务边界；在没有其他回滚原因时，结果可能变成正常提交。分别记录最终行数和回滚状态，解释改变的是事务边界看到的异常，不是 catch 具有清除回滚标记的能力。代理版本还需额外验证调用确实经过受管对象。

## 总结点

1. 室友欠费，总表照样结不出
2. 共享事务可能已被标记回滚
3. 捕获异常不清除资源失败状态
4. 最终响应要匹配提交结果
