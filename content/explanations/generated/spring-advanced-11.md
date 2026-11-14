<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银账务沙盘:afterCommit 回调里更新"已结算"标记,偶发发现标记没生效——回调的连接与事务上下文与主事务不同,写库语义取决于回调内部自己怎么开事务。用仓库真实测试的对照行为说明正确写法。

1. afterCommit 阶段主事务已提交且资源已解绑:回调里直接用"同线程的 JdbcTemplate"可能拿到新连接、自动提交——写入了但语义不受控(部分驱动/池配置下甚至写不进)。
2. 真实测试对照(本仓库):直接注册的 afterCommit 回调抛异常会传播给调用方,但数据已提交——异常与数据是两回事。
3. 正确写法:回调内显式开新事务(REQUIRES_NEW 或 TransactionTemplate),或把动作转成任务/事件异步化;绝不假设"还在主事务里"。

## 参考分析

### 机制:回调时刻的资源状态

事务同步器触发 afterCommit 时:连接的提交已完成,但 Spring 的资源解绑(TxSynchronization 的 afterCompletion 阶段)与回调执行顺序决定了回调内 ThreadLocal 里可能还挂着旧连接持有者——用它写库,语句跑在"已提交事务的连接"上,后续该连接归还池时未提交写入会被回滚;或拿到池的新连接走自动提交。两种形态都叫"写了但没按预期提交"。这正是"回调里要显式事务边界"的机制根源。

### 实证:直接回调的异常与数据行为

本仓库后端测试(SpringAdvancedExamplesTest,真实上下文 + H2)对直接注册 afterCommit 抛异常的断言:
```
assertThrows(IllegalStateException) → 异常传播给调用方
SELECT id FROM item → 该行已提交保留
```
解读:数据已落库(提交在前),异常却在调用方炸出——"异常可见但不可回滚"。对照 @TransactionalEventListener(AFTER_COMMIT)形态:监听器异常被吞不传播(第 10 题)。两种注册方式的差异必须写进团队文档,否则排查时互相矛盾。

### 取舍:回调内写库的三种正确姿势

姿势一,显式新事务:回调体内 TransactionTemplate(REQUIRES_NEW 语义)执行写——边界明确,失败可在回调内捕获并落补偿。姿势二,转任务:回调只写"待办"(幂等键),执行器异步处理——失败可见可重试(第 10 题三件套)。姿势三,不写库:回调只做纯内存动作(清本地缓存、发进程内事件),库操作交给事件监听器配独立事务。共同禁忌:在回调里假设 ThreadLocal 事务上下文仍然有效。

## 案例

### 验证:按本仓库对照测试写两个用例:直接注册 afterCommit

验证:按本仓库对照测试写两个用例:直接注册 afterCommit 抛异常(断言异常传播且数据已提交)与事件监听器形态(断言异常被吞)——两种注册方式的异常可见性差异由此固化,回调内写库必须显式开新事务的用例单独覆盖。

### 追问链:afterCommit 三刀

一刀:"为什么有时回调里写库成功了?"——自动提交模式下每条语句独立提交,单语句写入"看起来成功";但这脱离事务控制(失败无回滚、与其他写入不一致),成功只是侥幸。二刀:"afterCompletion 与 afterCommit 的资源状态?"——afterCompletion 在资源清理阶段,连旧连接持有者都不可靠;任何数据库操作都要自建边界。三刀:"怎么测试回调的写库语义?"——按仓库测试形态:回调内写一行,事务外断言该行的可见性与回调异常的传播性——把连接语义锁进 CI。

## 总结点

1. 回调里没有主事务,边界自己开
2. 写了不等于提交,侥幸不是语义
3. 能转任务的别在回调里写
