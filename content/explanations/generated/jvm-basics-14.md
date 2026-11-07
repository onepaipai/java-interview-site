<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 GC 指南 · 2](https://docs.oracle.com/en/java/javase/17/gctuning/collectors.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：运维报告里"G1 发生 Full GC"与"Parallel 发生 Full GC"含义完全不同。梳理各回收器的回收命名与触发语义，避免用 CMS 时代的术语误读 G1 日志。

1. 术语没有跨回收器的标准：Parallel 时代 Minor/Major/Full 有较清晰的分代含义，G1 里对应的是 young GC、并发标记周期与 mixed GC。
2. G1 的 Full GC 是失败兜底（并发标记或 mixed 跟不上分配速率），单线程（Java 17 前的并行 Full GC 有限）且暂停最长——日志里出现 Full GC 是告警不是常态。
3. ZGC/Shenandoah 没有分代回收概念，日志只有并发周期与短暂停；用"Minor/Full"框架去读它们的日志会完全对不上。

## 参考分析

### 机制：同一句话在不同回收器里的所指

说"Full GC"要像说"满勤"一样先问制度：Parallel 的 Full 是全堆整段 STW；G1 的 Full 是整个并发周期的失败降级；CMS（已移除）的 Full 指并发失败后的 Serial Old。类比同是"结账"，小卖部是柜台排队（STW），超市是自助（并发）+ 客满时才开人工通道（失败兜底）。

### 反例：把 G1 mixed GC 当 Full GC

mixed GC（并发标记后的增量回收，顺带回收部分老年代 region）是 G1 的正常工作状态；看到日志里 "GC pause (mixed)" 就报警，会把健康系统当故障。正确读法：盯 Full GC 关键字、并发标记失败（to-space exhausted）、以及暂停时长是否突破目标。

### 取舍：日志与指标按回收器定制

G1 盯：暂停目标达成率、mixed 触发时机（IHOP）、humongous 分配；Parallel 盯：Full GC 频率与晋升平均大小；ZGC/Shenandoah 盯：分配速率与并发周期耗时、allocation stall。监控面板按回收器分模板，而不是一套"GC 次数"指标通吃。

## 案例

### 对照操作：三种回收器的日志并排读

教学验证：同一负载分别用 Parallel、G1、ZGC 跑，`-Xlog:gc*` 各取一段。预期：Parallel 日志出现 [Full GC]，G1 出现 young/mixed 与并发标记阶段，ZGC 只有周期与 pause 短行。并排贴三段日志讲解术语差异，比任何定义都直观，实验可复跑。

### 追问：为什么 G1 的 Full GC 特别伤

它是并发体系失败后的收尾：此时堆碎片化或晋升过快，需要整堆 STW 压缩。Java 17 的 G1 Full GC 虽已并行化（JDK 10 起），暂停仍远超 200ms 目标。看到 Full GC 的正确动作是查上游（IHOP 过早、大对象、晋升过快），而不是调大堆了事。

## 总结点

1. Full 是兜底，不是工作模式
2. G1 读 young/mixed，别套 CMS 术语
3. 日志分回收器，面板分模板
