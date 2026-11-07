<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/web/webflux/new-framework.html)
- [projectreactor.io · 2](https://projectreactor.io/docs/core/release/reference/reactiveProgramming.html)

</details>

## 参考回答

1. 背压用需求信号协调支持该协议的发布者与订阅者，但外部 API、阻塞任务和独立线程池不一定遵守同一需求边界。
2. 还需约束并发、预取、队列、连接、重试和超时；流里操作符存在不等于端到端容量已经受控。

## 参考分析

1. flatMap 并发、缓冲和某些预取会提前创建在途工作；下游取消也不必然中止所有外部副作用。
2. 重试可能增加负载，应有总预算和退避，限速与并发限制也不能混成一个保证。

## 案例

1. 教学场景：流最终逐项消费，但中间并发调用大量远程 API，触发连接耗尽。

2. 逐边界记录在途数和队列，显式限制调用并发及超时，注入慢响应和错误重试。

3. 验证下游最大在途受限，取消和失败不会形成无界堆积；不用订阅端消费慢就推断上游没有过量请求。

## 总结点

1. 需求信号只覆盖支持的边界。
2. 并发、排队与重试另设预算。
