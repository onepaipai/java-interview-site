<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Google SRE · 2](https://sre.google/sre-book/addressing-cascading-failures/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银积分沙盘:TransactionalEventListener AFTER_COMMIT 发积分——监听器执行失败异常被吞积分没加数据已提交但副作用丢失——AFTER_COMMIT 的可靠性缺口。

1. AFTER_COMMIT 的可靠性缺口监听器失败事件丢失默认无重试——主事务已提交回不去——副作用积分丢失资金权益类副作用不可靠。
2. 可靠性方案监听器内写补偿表幂等键加状态加异步执行加重试死信或 outbox——AFTER_COMMIT 只做触发可靠性由补偿机制保证。
3. 与进程内事件的边界 AFTER_COMMIT 适合进程内可补偿的副作用——跨服务的副作用走 MQ outbox——AFTER_COMMIT 不替代 MQ。

## 参考分析

### 机制:AFTER_COMMIT 的可靠性缺口

缺口:监听器失败→事件丢失(默认无重试)——主事务已提交回不去——副作用丢失。可靠性方案:监听器写补偿表(幂等键)→异步执行→重试→死信(第 10 题 spring-advanced 三件套)。跨服务走 MQ(outbox,分布式 14 题)。

### 反例:积分丢失的事故

沙盘:支付成功 AFTER_COMMIT 发积分——监听器调积分服务超时→异常被吞→积分没加。排查:日志有 warn 但无人关注。修复:补偿表(幂等键=交易号)+异步重试+死信告警——副作用的可靠性由补偿闭环保证。

### 取舍:AFTER_COMMIT vs MQ 的选择

AFTER_COMMIT:进程内可补偿的副作用(同 JVM 的服务调用)——简单但有可靠性缺口。MQ:跨服务的副作用(可靠性要求高)——outbox+MQ 保证不丢不重。判定:资金/权益类走 MQ;通知/日志类可走 AFTER_COMMIT 加补偿。

## 案例

### 验证:可靠性缺口的断言组

验证:丢失断言(AFTER_COMMIT 监听器抛异常副作用丢失复现);补偿断言(监听器写补偿表异步执行闭环重试后成功);对比断言(outbox 形态的零丢失)——三组固化 AFTER_COMMIT 的可靠性边界。

### 追问链:事务事件三刀

一刀:AFTER_COMMIT 的事务监听器内的新操作无事务上下文需要独立事务(REQUIRES_NEW 或显式模板)。二刀:监听器失败的重试 Spring 不自动重试 AFTER_COMMIT 的失败监听器重试需要自行实现。三刀:事件与副作用的一致性主事务提交加副作用失败等于不一致——一致性的保证靠补偿而非事件机制本身。

## 总结点

1. AFTER_COMMIT 失败无重试
2. 副作用丢失需补偿机制
3. 跨服务用 MQ 进程内用补偿表
