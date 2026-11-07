<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/DelayQueue.html)

</details>

## 参考回答

1. DelayQueue 是进程内无界队列，按 Delayed 到期后允许取出；进程退出会丢失纯内存任务，生产者不会因容量形成背压。
2. 可靠延迟任务先持久保存业务身份、到期时间和状态，内存队列仅作近期调度；重启或漏投后按持久事实补扫。
3. 取出不等于业务完成；抢占、重试和重复调度需有幂等与并发状态迁移，时钟与同到期任务顺序也要明确。

## 案例

1. 场景（教学示例）：订单 O1 在 10:00 到期，调度进程 09:59 退出，10:01 重启。

2. 预期：只用 DelayQueue 会丢任务；持久调度扫描 O1 后以 PENDING→EXPIRED 条件更新处理，重复扫描不重复释放库存，积压可被观测。

## 总结点

1. 可靠到期事实先持久化。
2. 取出与处理完成是两件事。
