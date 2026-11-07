<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/management/MemoryMXBean.html.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：两个相同 Xmx 的微服务，一个 RSS 1.2G 一个 3.4G。把进程内存拆成堆、元空间、CodeCache、GC 辅助结构、线程栈、直接内存六块，逐块解释差异来源与观测命令。

1. Xmx 只管 Java 堆的提交上限；RSS 还包括元空间、CodeCache、GC 辅助结构、线程栈、直接内存与堆外分配，任何一块都能拉开差距。
2. 堆的"提交"不等于"常驻"：committed 但未触碰的页可被系统回收，而 GC 扫过的页大概率常驻；G1 的卡表与记忆集随堆与 region 数量增长。
3. 观测要分层：`-XX:NativeMemoryTracking=summary` 加 jcmd VM.native_memory 按类目看本地内存，jcmd GC.heap_info 看堆与 region，RSS 用操作系统工具核对。

## 参考分析

### 机制：Java 进程内存是一张分项清单

类比租同一块地的两座仓库：账面面积（Xmx）相同，但一家货码得满（堆实际触碰页多）、另一家还租了仓库周边的小间（元空间/CodeCache/直接内存），再加上货架管理台账（GC 辅助结构）厚薄不同，实付租金（RSS）自然不同。差值通常不在堆内，而在堆外四小件。

### 反例：三个常见的"隐形大户"

一是大量线程：每线程 Xss 常驻（1000 线程 × 1MB 就是 1G）；二是直接内存：Netty/压缩/加密缓冲常驻且不在堆转储里（见第 33 题）；三是透明大页或 CodeCache 膨胀。三者都不受 Xmx 约束，容器里最先顶穿 cgroup 上限的也往往是它们。

### 取舍：预算拆分而不是只调 Xmx

容器内存预算应显式拆分：堆 + 元空间 + CodeCache + 线程栈合计 + 直接内存 + 余量 ≤ limit。项目实践里 MaxRAMPercentage 取 55–65 并配 ExitOnOutOfMemoryError；NMT 跑一周基线后再定各项上限（详见第 48 题）。

## 案例

### 对照操作：NMT 六类目的读法

教学验证：两服务同开 NMT summary，`jcmd PID VM.native_memory summary` 输出按 Java Heap/Class/Meta/Thread/Code/Internal 分类对比。预期：差异集中在 Thread（线程数）或 Internal（直接内存）类目，而不是 Java Heap。该读法可迁移到任何 RSS 疑难，一次学会反复用。

### 追问：committed 和 RSS 为什么对不上

committed 是 JVM 向操作系统"预约"的地址空间，RSS 是实际驻留的物理页。堆可以只提交不触碰（never touched pages 不占物理内存），GC 扫描过的页倾向于常驻。因此"committed 大、RSS 小"是常态；容器内存告警要盯 RSS 与 cgroup，而不是 Xmx。

## 总结点

1. Xmx 管堆，RSS 管全账
2. 线程、直接内存、CodeCache 三大户
3. NMT 分项对账，别拿 Xmx 猜
