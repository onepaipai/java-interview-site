<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银积分沙盘:支付成功后发布"充值成功"事件,测试里事件监听器时序不定、断言靠 sleep。用"发布接口抽象+同步测试通道+阶段断言"的形态说明可测试的事件设计。

1. 可测试性的三个前提:发布走统一接口(业务不直接摸 ApplicationEventPublisher 的细节)、监听器行为确定(阶段明确,第 9 题)、测试可在同步通道断言(记录器而非 sleep 等待)。
2. 形态:业务调 DomainEvents.publish(领域事件对象)——实现层 Spring 发布或消息队列可替换;测试装配"录制式监听器"(List 收集)断言事件内容与顺序,不需要异步等待。
3. 与第 38 题呼应:事务事件(提交后触发)的验证用真值测试形态——仓库后端测试就是范本(提交前列表为空,提交后追加)。

## 参考分析

### 机制:发布抽象与录制监听

直接依赖 ApplicationEventPublisher 的问题:测试要么起完整上下文,要么 mock publisher(断言弱)。抽象一层 DomainEvents 接口:生产代码语义化(publish(RechargeSucceeded)),实现可注入——Spring 实现走 TransactionalEventListener 体系,测试实现直接同步调监听器(或录制)。录制式监听:测试配置一个把事件收进 List 的监听器,断言"事件类型/载荷/顺序"——无 sleep、无竞态。

### 实证:阶段语义的测试范本(仓库真值测试)

本仓库后端测试(SpringAdvancedExamplesTest.actualTransactionalListenerRunsOnCommitButNotRollbackOrNoTransaction,真实 Spring 上下文 + H2)已固化可测试形态:
```
事务内发布 → committed 为空(未提交不触发)
提交后 → committed=[1]
回滚事务 → 不追加
监听器抛异常 → 已提交数据保留
```
解读:四个断言全部同步完成(无 sleep)——因为 @TransactionalEventListener 的阶段语义本身确定;测试的价值在于把语义锁进 CI。业务事件的测试套用此范本:同一事务边界、真提交、录制断言。

### 取舍:测试通道与生产通道的分岔

测试实现:录制器(同步、可断言)——单元/集成测试用。生产实现:Spring 事件(进程内,第 9 题)+关键事件经 outbox/MQ(跨实例,第 30 题)——可靠性分层。切换成本:接口化后替换实现即可,业务代码零改动。反模式:测试里 Thread.sleep(500) 等异步事件——时序不稳定造成 flaky,且掩盖阶段语义错误;凡见到 sleep 等事件,重构为阶段确定的同步断言。

## 案例

### 验证:按录制监听器形态断言事件类型、载荷与顺序(无 sleep 的

验证:按录制监听器形态断言事件类型、载荷与顺序(无 sleep 的同步断言);grep 测试代码禁止 sleep 等事件——出现即重构为阶段确定的同步断言。补充:事件载荷携带业务 ID 与关键快照字段,不携带实体引用;测试专用录制器与生产发布实现分离,业务代码不感知测试设施。

### 追问链:事件测试三刀

一刀:"事务事件测试要注意什么?"——必须在真事务里跑(TestTransaction 或模板,不用 @Transactional 测试回滚语义掩盖提交行为,第 37 题);按仓库范本在 finally 里 SHUTDOWN 数据源,防内存库串扰。二刀:"事件载荷的设计?"——携带业务 ID 与必要快照(金额、状态),不携带实体引用(懒加载陷阱);载荷即契约,加字段要兼容(第 41 题思路)。三刀:"异步消费的测试?"——消费端逻辑抽成纯函数(输入事件→副作用),异步壳只测投递;端到端用 Testcontainers 起真实 MQ(第 39 题)。

## 总结点

1. 发布走抽象,监听走录制
2. 阶段确定,断言同步
3. sleep 等事件是反模式
