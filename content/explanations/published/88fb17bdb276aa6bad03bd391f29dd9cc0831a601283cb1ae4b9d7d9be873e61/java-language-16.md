<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Google SRE · 1](https://sre.google/sre-book/addressing-cascading-failures/)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ForkJoinPool.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银接口沙盘:接口里 parallelStream 处理列表——ForkJoinPool.commonPool 被占用(全 JVM 共享)——其他用 commonPool 的操作(ForkJoin 任务/部分并行流)被饿死;且 commonPool 并行度=核数-1,IO 阻塞型任务占住线程让并行度归零。

1. commonPool 共享:ForkJoinPool.commonPool 是 JVM 全局共享(所有 parallelStream 默认用它+CompletableFuture 的默认执行器+其他 ForkJoin 任务)——在线接口的 parallelStream 占用 commonPool→其他并行操作饿死。
2. IO 阻塞的灾难:parallelStream 的 lambda 里做远程调用(阻塞 200ms)——commonPool 的线程(核数-1 个)全被阻塞占住——整个 JVM 的并行操作停滞(吞吐归零的窗口)。
3. 正确姿势:在线接口禁 parallelStream(数据量小时串行更快,第 9 题);大计算用独立 ForkJoinPool(parallelStream 用自定义池提交[submit 后 join]);IO 型并行用独立线程池(CompletableFuture.supplyAsync(executor),第 16 题distributed 异步事务)。

## 参考分析

### 第二步扩展① 机制:commonPool 的共享与饥饿

- 共享池:commonPool 的并行度=Runtime.availableProcessors()-1(至少 1)——全局唯一(所有默认并行任务共享)——一个任务的阻塞线程=全局并行度减少。
- 饥饿链:接口 A 的 parallelStream(IO 阻塞)占满 commonPool→接口 B 的 parallelStream 排队→B 的 P99 爆——跨接口的干扰(第 37 题distributed 聚合拖垮交易的同构)。
- CPU 型任务:commonPool 合适(CPU 密集+无阻塞——核数-1 刚好)。

### 第二步扩展② 反例:parallelStream 的三种事故

- 事故一,IO 阻塞占池:接口内 parallelStream 调远程(200ms×线程数)——commonPool 全阻塞——JVM 其他并行任务饿死(全局故障)。
- 事故二,小数据并行:10 元素的列表 parallelStream——任务拆分与线程调度开销>收益(并行比串行慢,第 9 题distributed 数组链表的伪优化同构)。
- 事故三,嵌套并行:parallelStream 内再 parallelStream——嵌套 ForkJoin 的拆分爆炸。
- 三条的正解:在线接口串行优先。
- CPU 密集大数据独立池。
- IO 并行用专用池+CompletableFuture。

### 第二步扩展③ 取舍:并行的选型阶梯

- 阶梯:串行(默认,数据小/在线接口)→独立池的 parallelStream(CPU 密集大数据:submit 到自定义 ForkJoinPool)→CompletableFuture+专用池(IO 并行)→批处理框架(超大数据)。
- 判据:数据量(万级以下串行)+任务类型(CPU vs IO)+在线 or 离线(在线串行优先,离线可并行)——三个维度定并行策略。

## 案例

### 第三步发散·验证与推演 验证:commonPool 干扰的断言组

- 验证:饥饿复现断言(接口 A 的 IO parallelStream 占池,断言接口 B 的并行任务延迟暴涨——全局干扰实证)。
- 独立池断言(自定义 ForkJoinPool 后 A 不再干扰 B)。
- 串行对照断言(小数据串行 vs 并行的耗时——并行开销可见)——三组固化并行选型纪律。

### 第三步发散·追问扩展 追问链:并行三刀

- **Q1：如何判断该并行?**
  - 答：数据量×单元素成本>并行开销(拆分+调度+合并)——预估不足就串行(并行是优化不是默认,第 50 题distributed 伪优化同源)。
- **Q2：自定义池的参数?**
  - 答：ForkJoinPool(并行度/工厂/异常处理)——池大小=CPU 核数(CPU 型);IO 型用普通线程池(不是 ForkJoin)——池类型匹配任务类型。
- **Q3：并行的副作用?**
  - 答：parallel 流的 lambda 无状态(第 15 题)+共享资源的竞态(第 20 题)——并行的正确性前提比串行严苛(纪律先于性能)。

## 总结点

1. commonPool 全局共享,阻塞即全局灾难
2. 在线接口串行优先
3. IO 并行用专用池,不用 commonPool
