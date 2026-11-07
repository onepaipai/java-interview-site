<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/integration/scheduling.html)

</details>

## 参考回答

1. @Scheduled 在每个创建了相应 Bean 的应用实例中独立注册，不会自动协调集群；两个节点通常会分别执行同一任务。
2. 按业务要求采用持久领取、集群调度或租约，并让副作用幂等；仅在单机加 synchronized 不能跨进程互斥。

## 参考分析

1. 租约过期与节点长暂停可能使两个执行者重叠，锁本身不能代替防重复和必要的 fencing。
2. 同一实例重复注册任务 Bean、异步执行或多个触发器也可能造成重叠，需先记录任务标识、实例与执行次数。

## 案例

1. 教学场景：两台应用每分钟扫描待发送提醒，同一客户收到两条提醒。

2. 用稳定任务键持久领取并记录发送状态；模拟两个领取者并发、执行者中途退出和发送成功后确认失败。

3. 验证未领取者不执行，任务可恢复，重试同一业务键不重复产生副作用；不把一次无重叠日志当作可靠性证明。

## 总结点

1. 调度注册默认属于每个实例。
2. 领取、恢复与幂等共同设计。
