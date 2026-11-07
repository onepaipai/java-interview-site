<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Timer.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ScheduledExecutorService.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：监控模块有 5 个周期任务，其中之一可能抛运行时异常且个别任务耗时长。对照 Timer 单线程串行与 ScheduledExecutorService 多线程隔离在异常传播、相互阻塞与时间漂移上的表现。

1. Timer 单线程串行执行全部任务：一个任务耗时或异常都会拖垮其他任务；任务抛出未捕获异常时 Timer 线程终止，后续所有任务静默停摆。
2. ScheduledExecutorService 每个任务独立捕获异常（未提交后续则该任务停止，但其他任务不受影响），可配多线程池、可控的重排策略与相对时间基准。
3. 新代码一律选 ScheduledExecutorService（或框架级调度器如 Spring 的 TaskScheduler）；Timer 只在维护历史代码时认识它。

## 参考分析

### 机制：一个看门人与一组值班员

Timer 是唯一看门人按清单逐项叫号：某项聊太久（耗时），后面全部推迟；某项当场晕倒（异常），清单作废。ScheduledExecutorService 是一组值班员各管各的班次，一人病倒不影响他人，人数还可按负载增加。Javadoc 对 Timer 的"线程终止后所有任务取消"有明确说明，这也是官方推荐 Executor 的原因。

### 反例：一个异常杀掉全部巡检

五个巡检任务共用 Timer，第 3 个因数据格式变化抛 NPE，Timer 线程带着异常退出，剩余任务不再执行且无任何日志提示——监控"安静地"停了。直到用户投诉才发现巡检中断。同场景换 ScheduledThreadPoolExecutor：异常任务停止调度，其余四个照常，且可用 afterExecute 或包装 Runnable 统一记录失败。

### 取舍：Executor 时代的调度选项

简单周期任务用 ScheduledExecutorService；需要 cron 语义、持久化、集群不重复执行时用框架调度（Spring TaskScheduler 加分布式锁、Quartz、xxl-job 等），Timer 不在任何推荐之列。周期任务都要补两件事：异常包装（保证调度延续）与执行耗时监控（见第 42 题），工具差异解决不了任务自身的问题。

## 案例

### 对照操作：异常与长任务的双重对照

教学验证：5 个周期任务、第 3 个抛异常、第 5 个耗时 3 秒。Timer 版预期：异常后全部任务停摆（记录各任务执行计数不再增长）、异常前长任务拖慢其余任务；Executor 版预期：其余任务持续运行，失败任务有异常记录可接告警。再验证 scheduleAtFixedRate 在异常后不再续排的语义，写好包装后恢复。代码可复跑。

### 追问：ScheduledFuture 的取消与周期任务自停

cancel(false) 让任务不再被调度（已运行的不打断）；任务内部也可抛特定标记异常终止自身，但标准做法是持有 future 或用 volatile 标志在任务入口检查。周期任务的"自愈"逻辑（失败后重置参数）要写在任务内部，而不是依赖调度器重试语义。

## 总结点

1. Timer 一个看门人，倒下全停
2. Executor 各管各班，异常不传染
3. 新代码无 Timer，周期任务要包装异常
