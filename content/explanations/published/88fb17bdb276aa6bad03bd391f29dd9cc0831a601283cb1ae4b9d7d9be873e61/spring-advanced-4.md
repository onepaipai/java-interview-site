<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银下单沙盘:内层事务失败被外层 try-catch 吞掉,外层提交时抛 UnexpectedRollbackException,日志一片"提交失败"却找不到业务异常。用可执行示例重现这条调用链与正确处理。

1. 典型调用链:内层事务(REQUIRED 参与)抛异常被外层捕获→内层已把共享事务标记 rollback-only→外层正常走完→提交时发现只读标记,抛 UnexpectedRollbackException。
2. 可执行实测:外层插入 1、内层插入 2 后抛异常被吞,提交抛 UnexpectedRollbackException,两行全部回滚(0 行)。
3. 根因是"吞了异常却想提交":捕获内层异常后必须要么重新标记回滚,要么改传播级别让内层独立;吞掉装没事必然炸在提交点。

## 参考分析

### 第二步扩展① 机制:rollback-only 标记的传播

- 内层 REQUIRED 参与外层事务时,内层模板捕获到异常会调用回滚——由于事务是共享的,这个"回滚"只能作用于整个事务,实现为把外层事务标记为 rollback-only。
- 外层随后"正常完成"并尝试提交,事务管理器看到 rollback-only 标记,拒绝提交并抛 UnexpectedRollbackException——异常发生点(提交处)与业务异常点(内层)相距数层,这就是日志难查的原因。
- 该异常是协议在说:有人吞了本不该吞的异常。

### 第二步扩展② 边界:两个易混形态

- 本题主线是外层吞内层异常后的提交期炸弹。
- 第二个易混形态是测试环境——@Transactional 测试事务的回滚语义与真实提交不同(第 37 题),用它复现提交期异常会得到完全不同的结果。
- 排查时先确认异常发生在提交点(堆栈含提交帧),再对号入座,两条链路的修复动作不同。

### 第二步扩展③ 取舍:捕获内层异常后的三条出路

- 捕获内层异常后的三条出路——不捕获(让异常传播,整体回滚最简单)、捕获后显式 setRollbackOnly(明确放弃,返回值表达失败)、内层改 REQUIRES_NEW 独立成败(注意第 2 题的双连接代价与主回滚子不回滚的语义差异)——三条出路按业务语义选。
- 吞掉异常装没事是唯一禁止项,rollback-only 的提交点炸弹由此而来。

## 案例

### 第三步发散·验证与推演 实证:可执行示例重现整条链

- 以下示例经本地编译执行(Spring 6.2.19 + H2),verify() 返回"是否抛 UnexpectedRollbackException:最终行数":
~~~java
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.UnexpectedRollbackException;
import org.springframework.transaction.support.TransactionTemplate;

/** Q4:内层参与外层事务后失败会标记 rollback-only,外层吞异常提交仍抛 UnexpectedRollbackException。 */
public class RollbackOnlyExample {

  public static String verify() {
    DriverManagerDataSource ds = new DriverManagerDataSource("jdbc:h2:mem:ro1;DB_CLOSE_DELAY=-1", "sa", "");
    JdbcTemplate jdbc = new JdbcTemplate(ds);
    PlatformTransactionManager manager = new DataSourceTransactionManager(ds);
    jdbc.execute("CREATE TABLE item(id INT PRIMARY KEY)");
    boolean unexpected = false;
    try {
      new TransactionTemplate(manager).executeWithoutResult(outer -> {
        jdbc.update("INSERT INTO item VALUES(1)");
        try {
          new TransactionTemplate(manager).executeWithoutResult(inner -> {
            jdbc.update("INSERT INTO item VALUES(2)");
            throw new IllegalStateException("inner failure");
          });
        } catch (IllegalStateException ignored) {
          // 外层吞掉异常,以为可以继续提交
        }
      });
    } catch (UnexpectedRollbackException e) {
      unexpected = true;
    }
    Integer rows = jdbc.queryForObject("SELECT COUNT(*) FROM item", Integer.class);
    return unexpected + ":" + rows;
  }
}
~~~
- 执行结果 true:0:异常确实抛出,且外层内层两行全部回滚。
- 正确姿势三选一:不吞(让异常传播回滚)、捕获后显式 setRollbackOnly(明确放弃)、内层改 REQUIRES_NEW 独立成败(注意第 2 题的连接代价)。
- 验证:本机编译执行,后端真值测试持续执行本块。

### 第三步发散·追问① 验证:按本示例编译执行,断言 verify() 返回 true:0

- 验证:按本示例编译执行,断言 verify() 返回 true:0(提交点抛 UnexpectedRollbackException 且两行全回滚)。
- 再把外层 catch 改为显式 setRollbackOnly 重跑,异常变为预期回滚、语义清晰。

### 第三步发散·追问扩展 追问链:UnexpectedRollback 三刀

- **Q1：为什么提示是 Unexpected?**
  - 答：事务管理器视角:业务代码没有要求回滚(吞了异常),但事务已被标记回滚,提交行为与代码意图不符,故称"意外回滚"。
- **Q2：@Transactional 的全局回滚规则会绕开吗?**
  - 答：不会:RuntimeException 进内层照样标 rollback-only;checked 异常默认不回滚、不标记,外层可正常提交——所以该异常几乎总与 RuntimeException 的吞掉有关。
- **Q3：网关层统一 catch Throwable 是不是隐患?**
  - 答：是:它吞掉事务异常后必然炸在更远的提交点;捕获要窄,回滚要显式。

## 总结点

1. 吞异常想提交,提交点必炸
2. rollback-only 是协议的抗议
3. 要么传播,要么显式回滚
