<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/integration/scheduling.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/event.html)
- [Spring Framework 6.2 参考 · 3](https://docs.spring.io/spring-security/reference/6.5/features/integrations/concurrency.html)

</details>

## 参考回答

1. 默认事件通常在发布线程同步广播，事务事件可绑定提交阶段；内存事件不自带持久交付。
2. @Async 通常依赖启用的代理与受控执行器，外部调用才进入增强；void 异常交处理器，有返回值则观察异常完成。

## 参考分析

1. 配置核心线程、上限、队列和拒绝策略时需服从真实负载，不能让无界队列掩盖过载。
2. 身份、追踪与事务有不同传播规则，任务提交成功不代表完成，退出进程也可能丢失内存工作。

## 案例

1. 教学场景：订单事件同步监听拖慢接口，改异步后失败无日志，重启又丢任务。

2. 先明确同步或提交阶段，再使用有界执行器与异常观测；关键通知改持久任务，记录身份及去重键。

3. 验证同步等待与异步完成、拒绝和异常各有证据；跨线程不误用原事务，重启可恢复要求单独验收。

## 总结点

1. 默认事件不自动异步。
2. 执行器、异常和可靠性分开。
