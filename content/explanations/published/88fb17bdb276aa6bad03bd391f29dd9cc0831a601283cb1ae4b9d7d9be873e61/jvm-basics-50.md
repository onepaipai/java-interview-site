<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/migrate/develop-migrating-jdk-17.html)
- [Java 17 GC 指南 · 2](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：服务从 11 升到 17 后 P99 上升 15%，团队怀疑"JDK 变慢了"。按"默认值变更 → 回收器行为变化 → 废弃项移除"三层排查，用对照实验定位差异来源。

1. 第一层默认值：大版本会改默认参数——G1 的 region 尺寸/并发线程数计算、Metaspace 与堆的交互、JIT 相关默认值；逐项 diff 两个版本的 effective flags（-XX:+PrintFlagsFinal -version）。
2. 第二层行为变化：GC 与 JIT 的算法在版本间演进（G1 记忆集重构、分层编译策略调整）；同一负载、同一显式参数下对比 -Xlog:gc* 与 JFR 数据，确认差异来自行为而非配置。
3. 第三层废弃与移除：被移除的标志会静默失效或拒启（如 CMS 在 14 移除、RMI 主体机制变化）、被移除的 API 改变负载形态；启动日志的 warning 与 release notes 是这一层的清单。

## 参考分析

### 第二步扩展① 机制：升级改变的是"隐式契约"

- 代码只锁定语言语义，JVM 的性能契约（默认参数、算法、启发式）随版本重写。
- 类比换了一个教练团队：同样的运动员（代码），训练计划全变了——成绩变化要先看"计划差异"，再谈"运动员退步"。
- 三层排查就是把计划差异一条条列出来。

### 第二步扩展② 故障推演：默认值差异的定位过程

- 11 与 17 各跑一轮 PrintFlagsFinal，diff 发现 G1HeapRegionSize 自动选择不同（堆大小从 32G 降到 8G 时 region 从 32M 降到 4M，同一负载下 humongous 记录显著增多——region 变小，80MB 数组跨更多 region）——显式固定 G1HeapRegionSize 后 P99 回到基线。
- 注意：region 差异来自堆大小不同而非 JDK 版本，G1 的 region 公式 max(1MB, min(32MB, heap/2048)) 在各版本一致。
- 此处作为 diff 方法的演示。
- 三层排查的每一层都可能单独命中，按成本从低到高走。

### 第二步扩展③ 取舍：升级的验证流程

- 升级前建基线（同负载全指标）、升级后先跑影子流量对照、差异按三层归因、必要参数用显式值钉住并注明"对齐旧版行为"的理由。
- 反过来也要说清：有些差异是升级收益（如 G1 改进），盲目对齐旧版会丢掉它——目标是理解差异，不是消除差异。

## 案例

### 第三步发散·验证与推演 对照操作：PrintFlagsFinal 的三层 diff

- 教学验证：两个 JDK 各执行 `-XX:+PrintFlagsFinal -XX:+UseG1GC -version` 输出排序后 diff，标记"不同且与 GC/JIT 相关"的行。
- 再对同一负载跑 -Xlog:gc* 对照暂停分布。
- 预期：至少一处默认值差异可解释部分指标变化。
- 演练可离线复跑，形成升级 SOP。

### 第三步发散·追问① 追问：为什么说"JDK 变慢了"通常是错误归因

- 性能差异几乎总能拆成默认值、行为、废弃移除三层中的一项或多项，每项都有对照手段。
- "整体变慢"的说法放弃归因，等于放弃修复。
- 把归因做实的候选人在面试里展示的是迁移工程的完整能力，而不只是参数知识。

## 总结点

1. 默认值、行为、废弃三层排
2. diff flags 找差异
3. 理解差异，而非消除差异
