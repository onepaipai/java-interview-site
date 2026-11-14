<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银导出沙盘:事务里把"写明细"丢给线程池,明细写入时事务标志为 false——写入游离在事务外,主事务回滚后明细却留下。用实测说明 ThreadLocal 绑定的边界与异步事务的正确做法。

1. 事务上下文存在 ThreadLocal:换线程即丢失。实测:调用方事务=true,同一时刻异步线程事务=false。
2. 后果:异步线程的数据库操作走独立连接、无事务(或自动提交),与主事务的提交/回滚完全脱钩——不是"慢点生效",是根本不受控。
3. 正确做法按需求选:需要同事务就在事务内同步做;需要异步就让它自带事务边界(@Async 方法加 @Transactional 或显式模板)并配幂等与补偿。

## 参考分析

### 机制:ThreadLocal 绑定与线程池的错位

Spring 事务把 ConnectionHolder 绑在 ThreadLocal(TransactionSynchronizationManager);线程池复用线程,任务在别的线程上执行,拿不到绑定;更隐蔽的是"污染"风险:若在异步线程里手动 set 了资源,任务结束不清理会污染下一个任务。实测直接量化了边界:同一业务流,调用方与池内线程的事务标志一个 true 一个 false——它们在事务视角下是两个世界。

### 实证:调用方与异步线程的标志对照

本机实验(Spring 6.2.19 + H2):外层 TransactionTemplate 事务中向单线程池提交查询事务标志:
```
Q8 调用方事务=true 异步线程事务=false
```
验证:同程序重跑一致。推论即事故链:主事务回滚后,异步线程已落库的"明细"成为孤儿数据——对账才暴露。与第 19 题(安全上下文同样不跨线程)同一根因:ThreadLocal 系资源都需显式传播。

### 取舍:异步与事务的四种组合

组合一,事务内同步执行:放弃异步,保原子性——数据必须与主事务同生共死时选。组合二,异步+独立事务:@Async 方法加 @Transactional(新事务),主事务结果通过消息/状态传递——要处理"主事务回滚但异步已跑"的补偿。组合三,提交后异步:@TransactionalEventListener(AFTER_COMMIT)触发异步——主事务提交才发,天然避免孤儿(第 9/10 题)。组合四,异步+幂等重试:任务表加任务 ID,执行幂等(任务系统三件套,分布式 41 题)。评审问句:这个异步任务的数据库写入,在主事务回滚后是否仍然正确?

## 案例

### 验证:在事务内与异步任务内各打印一次 isActualTransa

验证:在事务内与异步任务内各打印一次 isActualTransactionActive(),输出 true/false 即边界证据;再把该断言写成测试(异步路径的数据可见性随主事务回滚仍存在),固化 ThreadLocal 不跨线程的事实。

### 追问链:异步事务三刀

一刀:"@Async 加 @Transactional 就一定生效吗?"——@Async 本身是代理,事务注解在异步方法上生效(该方法在新线程里经代理进入事务);但调用方的事务不会传播过去——两个独立事务,不是继承。二刀:"TransactionContext 传播工具能用吗?"——手工复制 ThreadLocal 的做法(复制连接绑定)不被支持:连接被两个线程并发使用是线程安全问题,官方立场是传播事务上下文到并发线程属于未定义行为。三刀:"怎么测异步边界?"——测试里断言异步路径的事务标志与数据可见性(主事务回滚后异步数据的状态),把脱钩行为固化成用例。

## 总结点

1. ThreadLocal 不跨线程,事务也是
2. 异步要自带事务边界
3. 提交后异步,天然不孤儿
