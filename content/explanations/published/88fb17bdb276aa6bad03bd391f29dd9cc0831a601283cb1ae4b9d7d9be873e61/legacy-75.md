<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/collectors.html)
- [原始研究论文 · 2](https://arxiv.org/abs/1603.09320)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 GC 沙盘:Serial/Parallel/CMS(移除)/G1/ZGC/Shenandoah——选型=按堆大小+暂停要求+吞吐要求,不是"最新的最好"(第 14 题 JVM 与 75 题 JVM 的选型完整版)。

1. 回收器光谱:Serial(单线程,小堆,客户端)→Parallel(多线程,吞吐优先,批处理)→G1(region 化,大堆,暂停可调,JDK 9+ 默认)→ZGC/Shenandoah(并发整理,亚毫秒暂停,超大堆)——光谱的轴=暂停时间(从百 ms 到亚 ms),代价=吞吐与内存。
2. ZGC 的特点:染色指针(64 位指针元数据位)+读屏障(自愈)+并发整理(STW 仅根集扫描,实测 0.005-0.017ms)+TB 级堆支持;代价=读屏障 CPU 开销+堆余量要求(Allocation Stall 59ms 当堆满,第 7 题 jvm-advanced 实测)。
3. 选型决策:堆<4GB+吞吐优先→Parallel;堆 4-32GB+暂停<100ms→G1(默认);堆>16GB+暂停<10ms→ZGC(JDK 17 单代/JDK 21 分代,第 7 题 jvm-advanced 17/21 的版本边界);批处理→Parallel(暂停无所谓)。

## 参考分析

### 第二步扩展① 机制:ZGC 的染色指针与并发整理

- ZGC 用 64 位指针的高位存元数据(Marked0/Marked1/Remapped/Finalizable)——读屏障检查指针颜色,过期则在读时修正(自愈)。
- 并发整理不暂停应用(代价=读屏障内联+堆余量,第 7 题 jvm-advanced 实测:暂停亚毫秒但堆满时 Allocation Stall 59ms)。

### 第二步扩展② 反例:GC 选型的两种事故

- 事故一:ZGC 用在小堆(256MB)——ZGC 的堆余量要求+读屏障开销在小堆上得不偿失(G1 更合适)。
- 修复=按堆大小+暂停要求选型。
- 事故二:JDK 17 上期望分代 ZGC——JDK 17 的 ZGC 不分代(每次周期扫全堆)。
- 分代 ZGC 是 JDK 21 的 JEP 439——版本边界要先核对(第 7 题 jvm-advanced)。

### 第二步扩展③ 取舍:GC 选型的矩阵

- 堆大小(小/中/大/超大)×暂停要求(不敏感/<100ms/<10ms)×吞吐要求(高/中/低)——三维矩阵选回收器:Parallel(吞吐优,暂停差)/G1(平衡)/ZGC(暂停优,吞吐略损)——选型后用自己的负载实测(第 147 题压测),不按理论选。

## 案例

### 第三步发散·验证与推演 验证:GC 选型的走查核对

- 验证:本机对照实验(G1 vs ZGC 同负载:g1.log young 中位 2.948ms vs zgc.log Pause 0.005-0.017ms。
- ZGC Allocation Stall 59.822ms)——jvm-advanced 7/8 题的实测数据。
- 选型决策=暂停分布+吞吐+内存三维对照(不是单指标)。
- 验证:GC 对照的断言可程序化(GC 日志分析)。

### 第三步发散·追问扩展 追问链:GC 选型三刀

- **Q1：G1 到 ZGC 的迁移?**
  - 答：参数变更(UseZGC)+行为差异(读屏障/不分代)+回归测试(同负载对照);第 8 题 jvm-advanced 的对照实验模板可复用。
- **Q2：Shenandoah 与 ZGC?**
  - 答：两者都是并发整理(亚毫秒暂停);Shenandoah 用转发指针(Brooks pointer),ZGC 用染色指针;Shenandoah 由 Red Hat 维护,ZGC 由 Oracle——生态与支持的 JDK 版本不同。
- **Q3：GC 日志怎么读?**
  - 答：Xlog:gc*(G1)/-Xlog:gc(ZGC)→分析工具(GCEasy/GCViewer)——关键指标:暂停分布(P99/P999)/吞吐(GC 时间占比)/频率(每分钟次数)/特殊事件(Full/Exhausted/Stall)。

## 总结点

1. Serial→Parallel→G1→ZGC:暂停递减
2. ZGC 染色指针+读屏障自愈
3. 选型后用自己负载实测验证
