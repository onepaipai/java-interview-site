<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银事务沙盘:Mock Repository 的 save 直接返回——事务的 commit、rollback、REQUIRES_NEW、隔离级别全部不覆盖,事务行为需要真实数据库验证。

1. Mock 的覆盖边界:Mock 掉 Repository 验证的是 Service 的编排逻辑(调了 save、参数对)——但回滚规则、传播行为、隔离级别全部不覆盖:事务是数据库行为,Mock 给不了。
2. 事务测试的三方案:@Transactional 测试自动回滚但掩盖提交行为(afterCommit 不触发、REQUIRES_NEW 假提交);TestTransaction 编程式提交/回滚显式控制;Testcontainers 真库完整覆盖。
3. 分工:Mock 测编排逻辑,真库测事务行为(回滚/传播/隔离),端到端测集成——事务缺陷必须由真库用例拦截。

## 参考分析

### 机制:Mock 的覆盖边界与事务测试

Mock 的覆盖边界:Mock 掉 Repository 验证 Service 编排逻辑调了 save、参数对——但事务回滚规则、传播行为、隔离级别全部不覆盖(事务是数据库行为)。事务测试方案:@Transactional 测试自动回滚掩盖提交行为,TestTransaction 编程式提交回滚显式控制,Testcontainers 真库。Mock 与真库分工:Mock 测编排,真库测事务,两层互补。

### 反例:自动回滚的三类盲区

@Transactional 测试的自动回滚掩盖提交行为——afterCommit 回调不触发(事务未真提交)、REQUIRES_NEW 内层是假提交、readOnly 提示不生效,三类盲区让它验证不了提交路径。TestTransaction 编程式控制:提交/回滚显式,弥补自动回滚盲区。Testcontainers 真库完整覆盖但成本高——三层按风险分配。

### 取舍:事务测试的分层

Mock 测编排(Service 调了哪些方法);真库测事务(回滚、传播、隔离);端到端测集成(全链路)。分层分工:Mock 密集、真库稀疏、端到端关键路径——按风险分配。度量:事务缺陷必须由真库用例拦截,Mock 全绿但缺真库覆盖即测试债,进改进清单跟踪。

## 案例

### 验证:事务测试的断言组

验证:Mock 盲区断言(Mock 掉 Repository 的测试不含事务行为审查);真库断言(Testcontainers 跑回滚传播用例);对照断言(Mock 全绿但真库发现回滚缺失——Mock 的局限实证)——三组固化事务测试纪律。

### 追问链:事务测试三刀

一刀:@Transactional 测试的盲区清单——afterCommit 不触发、REQUIRES_NEW 真提交缺失、readOnly 不生效,三类盲区。二刀:TestTransaction 编程式控制——提交/回滚显式,弥补自动回滚盲区。三刀:事务测试的分层——Mock 测编排、真库测事务、端到端测集成,三层分工。

## 总结点

1. Mock 掉 Repository 无法证明事务
2. 事务行为必须真库验证
3. Mock 测编排,真库测事务
