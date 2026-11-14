<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [事件溯源设计说明 · 1](https://martinfowler.com/articles/patterns-of-distributed-systems/)
- [Google SRE · 2](https://sre.google/sre-book/addressing-cascading-failures/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银任务沙盘:3 实例各跑 Scheduled 同一任务执行 3 次——Scheduled 是进程内的无协调——多实例的重复执行。

1. Scheduled 的机制每个 JVM 实例独立调度 cron 触发本实例执行——无跨实例协调不知道其他实例的存在——3 实例等于 3 次执行。
2. 防御分布式锁任务执行前抢锁 Redis ZK 锁获锁者执行其余跳过分片任务分片或调度中心 XXL-Job 中心调度实例执行。
3. ShedLock 的机制 SchedulerLock name 加 lockAtMostFor 执行前 INSERT 锁记录唯一约束获取锁的实例执行其余跳过锁超时自动释放执行超时的兜底。

## 参考分析

### 机制:进程内调度的无协调性

@Scheduled 每 JVM 实例独立调度(cron 触发本实例)——实例间无通信(不知道其他实例存在)——3 实例=3 次执行。防御:分布式锁(执行前抢锁,获锁者执行)+分片(每实例处理不同分片)+调度中心(中心分配)。

### 反例:3 实例的重复执行

实测形态:3 实例各跑 @Scheduled(cron)——同一分钟 3 次执行(计数验证)。修复:ShedLock(@SchedulerLock 注解——执行前抢锁,获锁者执行)或调度中心(XXL-Job——中心分配,实例只执行分配的分片)。

### 取舍:锁与幂等的配合

分布式锁:防止多实例同时执行(互斥)。幂等:即使重复执行也无害(产物唯一名+状态检查,分布式 42 题)。两层叠加:锁失效(网络分区)时幂等兜底——锁是优化,幂等是防线。

## 案例

### 验证:重复执行的断言组

验证:重复复现断言(3 实例各跑 Scheduled 执行 3 次计数);锁防重断言(加分布式锁后执行 1 次);幂等兜底断言(重复执行零副作用幂等键)——三组固化多实例的调度纪律。

### 追问链:调度三刀

一刀:调度中心 vs 分布式锁调度中心中心分配加失败转移 vs 分布式锁去中心抢锁执行——中心化与去中心的取舍。二刀:任务的幂等任务副作用幂等产物唯一名加状态检查锁失效时的兜底锁只是优化幂等是防线。三刀:任务的分片大批量任务分片每实例处理不同分片分片的负载均衡。

## 总结点

1. Scheduled 无跨实例协调
2. 分布式锁防重或调度中心
3. 幂等兜底锁只是优化
