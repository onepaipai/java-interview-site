<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/context-introduction.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/integration/scheduling.html)
- [Spring Framework 6.2 参考 · 3](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/event.html)

</details>

## 参考回答

1. 不是。Spring 默认事件广播通常在发布线程同步调用监听器，监听耗时或异常可能影响发布者。
2. 异步需要显式配置执行器或 @Async 等机制；线程、异常传播和事务上下文都会改变，事务监听阶段也需单独分析。

## 参考分析

1. 普通监听器不因为名字含 Event 就成为消息队列；内存事件没有持久化、跨进程恢复和天然重试保证。
2. 改成异步后需配置有界资源、拒绝策略及异常观察；发布线程的事务不会自动传播到新线程。

## 案例

1. 教学场景：发布缓存刷新事件后接口突然变慢，监听器中有一个受控阻塞操作。

2. 记录发布和监听线程，在同步默认路径验证调用等待；异步对照使用闩锁等待完成，避免用 sleep 猜执行时间。

3. 验证同步和异步的等待差异、异常去向及上下文；关键通知不因异步化就声称可靠交付。

## 总结点

1. 默认广播通常同步。
2. 异步需重新设计异常与资源。
