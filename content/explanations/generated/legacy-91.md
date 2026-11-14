<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

1. 普通 Spring 事件通常同步执行，监听异常影响取决于发布与处理方式。
2. Async 经过代理使用执行器，线程池、异常和上下文都要显式管理。
3. 事务提交后监听不等于持久可靠投递，关键动作使用 outbox 或持久任务。

## 参考分析

1. 异步异常需收集。
2. 进程在提交后、处理前退出会丢内存事件，关键动作使用 outbox 或可靠任务。

## 案例

1. 场景（教学示例）：订单提交后发送通知，通知服务暂时不可用。
2. 处理：事务中写通知任务，后台有界重试；普通缓存刷新可用提交后事件。

![教学场景：订单提交后发送通知，通知服务暂时不可用](/explanations/outbox-delivery.svg)

3. 验证：订单可提交，通知可补发且去重；重启后任务仍可恢复。

## 总结点

1. 异步异常要接住。
2. 可靠事件先持久化。
