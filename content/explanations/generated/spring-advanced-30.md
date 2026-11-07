<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/event.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/integration/scheduling.html)

</details>

## 参考回答

1. 内存事件只在进程内传播，缺少天然的持久交付、跨进程确认和崩溃恢复；异步线程池也不会改变这个边界。
2. 关键流程需要把意图持久化，再配合投递确认、重试和消费者幂等；消息队列本身也要核对真实持久化配置。

## 参考分析

1. 数据库提交后进程退出可能丢内存事件；发送成功后确认丢失又可能重复，因此恢复设计不能只讨论丢失。
2. 非关键本地缓存刷新可用内存事件，但要明确容忍的失败与重建方式。

## 案例

1. 教学场景：订单已落库，内存通知还在队列中，进程被终止后再无补发依据。

2. 同事务保存通知任务，重启后领取投递，使用稳定事件键去重并保留失败状态。

3. 验证提交后重启可恢复、发送后确认失败可重试且不重复业务副作用；不把一次成功监听当消息可靠性验收。

## 总结点

1. 线程池不是持久队列。
2. 恢复协议同时处理丢失与重复。
