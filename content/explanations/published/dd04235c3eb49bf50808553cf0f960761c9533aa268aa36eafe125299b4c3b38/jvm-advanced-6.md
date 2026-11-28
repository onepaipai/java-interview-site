<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-g1-tuning.html)
- [github.com · 2](https://github.com/openjdk/jdk17u/blob/master/src/hotspot/share/gc/g1/g1CollectedHeap.cpp)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银支付核心沙盘:32MB 小堆压测中 GC 日志狂刷 To-space exhausted,随后出现 Full GC,P999 直接击穿。给出从日志识别到根因分类的完整调查路径,含本机复现证据。

1. 日志识别看两行:To-space exhausted(疏散时存活对象放不进预留空间)与随后的 Pause Full (G1 Compaction Pause),本机实测 32MB 堆刷出 855 次。
2. 根因归三类:存活集估算不足(ReservePercent/堆余量)、大对象挤占(Humongous)、晋升速率过快(分配突发),三个方向按日志证据排除。
3. 应急与根治分开:应急可加大 G1ReservePercent、限制大对象;根治要压平分配曲线或扩堆,别把应急参数留在生产长期运行。

## 参考分析

### 第二步扩展① 机制:to-space 为什么会耗尽

- G1 疏散时把存活对象复制到预留空间(G1ReservePercent 默认堆的 10% 对应 to-space 候选)。
- 当存活集超预估、或 Humongous 分配在疏散中途要连续 region、或晋升速率把 young 预算吃光,疏散目标区放不下,GC 中途放弃回收(leave the region)并标记 To-space exhausted,本次 GC 变相失败,随后常跟 Full GC 全堆压缩。
- 实测日志:
```
GC(8) To-space exhausted
GC(10) Pause Full (G1 Compaction Pause)
```
- 855 次 exhausted 期间 P999 由存活集大小与分配速率共同决定。

### 第二步扩展② 边界:三个易混淆的相邻概念

- 第一,to-space exhausted 与 "Evacuation Failure" 是同一事件的日志两种呈现,别当成两个问题。
- 第二,它与 OOM 不同:OOM 是分配彻底失败,exhausted 是这次 GC 疏散失败但进程继续,代价是效率与暂停。
- 第三,它与 mixed 不来不同:mixed 是"不划算不做",exhausted 是"想做没地方放"——前者查垃圾占比,后者查空间预算。

### 第二步扩展③ 取舍:参数应急的适用边界

- 加大 -XX:G1ReservePercent(如 10 到 20)直接扩大预留,是止血最快的一招。
- 配合 -XX:G1HeapWastePercent 不动,避免连带。
- 但要清楚它吃的是可用堆:预留 20% 意味着有效堆缩水,应用吞吐可能下降。
- Humongous 频发时先按第 4 题的拆分思路治理,再谈堆余量。
- 分配突发(定时任务批量灌数据)要错峰,这是代码问题不是 GC 参数问题。
- 分层修复时间线:应急(ReservePercent 提升,分钟级)→短期(扩堆或限流压分配速率,天级)→中期(Humongous 治理与分配削峰,代码改造)→长期(容量规划按分配速率定堆)——每层的验收信号一致:To-space exhausted 计数归零且 Pause Full 消失。

## 案例

### 第三步发散·验证与推演 实证:32MB 堆上的完整复现

- 命令:-Xms32m -Xmx32m -XX:G1ReservePercent=5 -Xlog:gc*:file=evac.log EvacExp(Java 17.0.17。
- 26MB 存活集加 512 路批量分配,跑 4 秒)。
- 统计:
```
To-space exhausted 出现 855 次
随后 Pause Full (G1 Compaction Pause)
```
- 验证:把 G1ReservePercent 提到 20 或削减存活集重跑,exhausted 次数显著下降,方向与机制解释一致。

### 第三步发散·追问扩展 追问链:evacuation failure 三刀

- **Q1：为什么预留 10% 还不够?**
  - 答：10% 是历史统计的兜底,存活突增与 Humongous 中途插入都会突破预估;预留是成本与安全的折中,不是保证。
- **Q2：exhausted 之后为什么是 Full?**
  - 答：疏散失败的 region 里对象还活着,丢不得;G1 退回全堆压缩(Serial 语境是 Mark-Sweep-Compact,G1 是并行压缩)重排存活体,耗时由存活总量决定。
- **Q3：生产上怎么快速定位是哪类根因?**
  - 答：先看 exhausted 前的 Humongous regions 是否高企(大对象),再看 Old regions 增速与分配速率曲线(晋升突发),最后核对堆余量与 ReservePercent(预算不足);三步各对应一条日志证据链。

## 总结点

1. to-space 放不下,当次就放弃
2. 预留是折中,不是保证
3. 先查大对象,再查分配峰,最后查堆余量
