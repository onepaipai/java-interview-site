<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/tx-propagation.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 / Spring 6.2 JDBC 本地事务教学实验：订单和可选附加项写入同一数据库。比较内层失败只撤销附加项，以及审计独立提交后外层失败两种业务要求。

1. NESTED 在受支持的 JDBC 场景通常用同一物理事务的保存点：内层可回滚到保存点，但内层成功并不意味着数据已独立提交，外层回滚仍会撤销它。
2. REQUIRES_NEW 挂起外层并建立独立物理事务，提交和回滚独立；外层资源通常仍占用，内层需要额外连接并可能等待外层持有的锁。
3. 是否支持嵌套取决于管理器、驱动及资源，不能把 JDBC 保存点结论推广到所有 JPA、JTA 或响应式事务。先确定需要哪种失败边界，再选传播方式。

## 参考分析

### 保存点：局部撤销仍属于一次最终提交

外层先写订单，内层写可选附加项后失败，可以回退保存点并允许外层继续。前提是事务管理器和资源支持该机制，且异常被放在适当边界处理。内层正常结束只是保留本事务中的修改，外层最终提交才使它们提交；NESTED 不是低成本的独立提交替代品。类比游戏存档：NESTED 是同一局里的检查点（回读档不结束整局），REQUIRES_NEW 是另开新局——检查点救不了整局重开的场景。

### 独立事务：隔离提交但增加资源和锁关系

REQUIRES_NEW 可以先提交审计再让外层回滚，但外层挂起不代表释放其连接与锁。内层若访问外层未提交的同一资源，仍可能等待甚至超时；高并发时也要核算连接池。独立提交适用于明确允许审计等数据与业务最终结果分开的场景，而不是为了绕开异常就普遍使用。

### 失败含义：先写验收矩阵再选注解

分别回答内层失败后外层能否成功、内层成功后外层失败是否保留内层，以及外层未提交数据是否必须被内层读取。三项要求不一定能同时满足。真实调用还需经过代理或程序化事务边界，自调用没有应用内层传播规则时，不能把结果误判成 NESTED 与 REQUIRES_NEW 行为相同。

## 案例

### 完整程序：保存点撤销与独立提交对照

以下程序在项目 Java 17 测试类路径运行，使用 H2 和 DataSourceTransactionManager，通过 TransactionTemplate 明确建立边界，避免把代理问题混入传播实验。预期返回 [1]:[2]：第一轮只保留外层，第二轮只保留独立内层。H2 结果不代表已验证目标 MySQL 的锁等待。

~~~java
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
public class PropagationSavepointExample {
  public static String verify() {
    var ds = new DriverManagerDataSource("jdbc:h2:mem:savepoint-example;DB_CLOSE_DELAY=-1", "sa", "");
    var jdbc = new JdbcTemplate(ds);
    var manager = new DataSourceTransactionManager(ds);
    var outer = new TransactionTemplate(manager);
    var nested = new TransactionTemplate(manager);
    nested.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);
    var separate = new TransactionTemplate(manager);
    separate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    jdbc.execute("CREATE TABLE item(id INT PRIMARY KEY)");
    try {
      outer.executeWithoutResult(status -> {
        jdbc.update("INSERT INTO item VALUES(1)");
        try {
          nested.executeWithoutResult(inner -> {
            jdbc.update("INSERT INTO item VALUES(2)");
            throw new IllegalStateException("optional item failed");
          });
        } catch (IllegalStateException expected) { }
      });
      String first = jdbc.queryForList("SELECT id FROM item ORDER BY id", Integer.class).toString();
      jdbc.update("DELETE FROM item");
      try {
        outer.executeWithoutResult(status -> {
          jdbc.update("INSERT INTO item VALUES(1)");
          separate.executeWithoutResult(inner -> jdbc.update("INSERT INTO item VALUES(2)"));
          throw new IllegalStateException("outer failed");
        });
      } catch (IllegalStateException expected) { }
      return first + ":" + jdbc.queryForList("SELECT id FROM item ORDER BY id", Integer.class);
    } finally { jdbc.execute("SHUTDOWN"); }
  }
}
~~~

### 追问：内层成功之后外层失败

给保存点路径再加一组内层成功、外层抛错的对照，读取事务结束后的行数，预期外层和内层都被撤销。再在目标数据库组织两个独立事务访问相同行，验证连接与锁等待预算；不能从上面不同主键的实验推断独立事务没有竞争。业务应明确可选项撤销和审计留痕各自的含义，避免用传播注解替代失败协议。

## 总结点

1. 存档不结束整局，新局另付成本
2. 保存点不是独立提交
3. 独立事务仍有连接和锁成本
4. 先定义失败矩阵再选传播
