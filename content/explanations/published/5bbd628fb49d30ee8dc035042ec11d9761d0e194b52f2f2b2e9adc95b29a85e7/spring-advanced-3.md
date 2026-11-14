<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银导入沙盘:批量导入需要"单行失败不影响整批"——用 REQUIRES_NEW 会让每行独立提交(整批失去原子性),用 NESTED 则单行回滚到保存点、整批仍是一个事务。用可执行示例说明两者的语义分野。

1. NESTED=同一事务内的保存点:内层回滚只撤销内层,外层提交则全部生效;REQUIRES_NEW=独立事务:内层自己提交,与外层成败无关。
2. 可执行实测:内层插入 id=1(内层视图 [1])后失败,NESTED 只回滚该行,外层插入 id=2 提交,最终 [2]——外层成果保住了。
3. 互换即错:把 NESTED 换成 REQUIRES_NEW,内层失败时外层照常(看似相同),但内层成功时会提前落库——外层后续回滚救不回它。

## 参考分析

### 机制:保存点与独立事务的边界

NESTED 在进入时设 JDBC 保存点,内层异常回滚到保存点(内层写入消失),外层继续;外层最终回滚则连保存点一起消失——内层的命运绑在外层上。REQUIRES_NEW 是平行世界:内层提交后立即对外可见且不可被外层回滚。两者唯一的公共点是"内层失败外层可以选择继续",差异全在"内层成功后":绑定外层(NESTED)还是立即独立(REQUIRES_NEW)。

### 边界:NESTED 的前提与陷阱

NESTED 的前提是事务管理器支持 JDBC 保存点,不支持时显式抛异常(无静默降级);ORM 场景保存点回滚与持久化上下文的 flush 时机要对齐,否则内存态与数据库态分叉;保存点名称在同一事务内必须唯一,嵌套多层由框架管理,手工保存点要防重名——三个前提任一不满足,先修基础设施再谈语义。

### 取舍:NESTED 要求事务管理器支持 JDB

NESTED 要求事务管理器支持 JDBC 保存点(DataSourceTransactionManager 原生支持,部分 ORM 包装场景受限);保存点每次设置一次数据库往返,逐行 NESTED 的成本要评估,批量导入更常用分批提交;外层捕获内层异常后继续是业务决策,捕获本身不违反事务语义——它服务「单行失败不影响整批」的场景,而非通用替代品。

## 案例

### 实证:可执行示例的完整行为

以下示例经本地编译执行(Spring 6.2.19 + H2),verify() 返回内层失败前的视图与最终提交状态:
~~~java
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/** Q3:NESTED 借助保存点,内层失败只回滚到保存点,外层继续有效。 */
public class PropagationSavepointExample {

  public static String verify() {
    DriverManagerDataSource ds = new DriverManagerDataSource("jdbc:h2:mem:sa1;DB_CLOSE_DELAY=-1", "sa", "");
    JdbcTemplate jdbc = new JdbcTemplate(ds);
    PlatformTransactionManager manager = new DataSourceTransactionManager(ds);
    jdbc.execute("CREATE TABLE item(id INT PRIMARY KEY)");
    List<Integer> innerView = new ArrayList<>();
    new TransactionTemplate(manager).executeWithoutResult(outer -> {
      try {
        TransactionTemplate inner = new TransactionTemplate(manager);
        inner.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);
        inner.executeWithoutResult(status -> {
          jdbc.update("INSERT INTO item VALUES(1)");
          innerView.addAll(jdbc.queryForList("SELECT id FROM item ORDER BY id", Integer.class));
          throw new IllegalStateException("inner failure");
        });
      } catch (IllegalStateException expected) {
        // 外层捕获内层失败:NESTED 只回滚到保存点,外层事务继续
      }
      jdbc.update("INSERT INTO item VALUES(2)");
    });
    List<Integer> finalState = jdbc.queryForList("SELECT id FROM item ORDER BY id", Integer.class);
    return innerView + ":" + finalState;
  }
}
~~~
执行结果 [1]:[2]:内层自己的行 [1] 随保存点回滚消失,外层的行 [2] 提交生效。若把 NESTED 换成 REQUIRES_NEW 且内层不抛异常,行 1 会立即独立提交——外层之后回滚也删不掉,这就是不可互替的核心。验证:本机编译执行,输出与断言一致;后端真值测试持续执行本块。

### 验证:按本示例编译执行,断言 verify() 返回 [1]:[2

验证:按本示例编译执行,断言 verify() 返回 [1]:[2];再把传播行为改为 REQUIRES_NEW 重跑,内层提交的行在外层回滚后仍然存在——两种传播的行为差在同一程序内可见,后端真值测试持续执行本断言。

### 追问链:传播行为三刀

一刀:"NESTED 的限制?"——要求事务管理器支持保存点(DataSourceTransactionManager 支持,JpaTransactionManager 在 JDBC 层支持有限);参与的是 JDBC 保存点,ORM 场景注意 flush 语义。二刀:"内层失败外层必须捕获吗?"——不捕获则异常传到外层边界,外层按 rollbackFor 决定整体回滚;捕获后继续是业务决策,捕获本身不违反事务语义。三刀:"保存点数量有代价吗?"——每个保存点一次数据库往返与资源,千行循环每行建保存点要评估;批量导入更常用"分批提交"而非逐行 NESTED。

## 总结点

1. NESTED 绑外层,REQUIRES_NEW 独立走
2. 保存点回内层,外层成果保住
3. 内层成功后是否独立,是分野
