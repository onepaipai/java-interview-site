<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-g1-tuning.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银行情撮合沙盘:双路服务器上同一服务延迟方差比单路环境大,怀疑跨 NUMA 访问。解释 NUMA 拓扑对 JVM 内存与线程的映射影响、UseNUMA 的适用与误用,以及排障的观测点。

1. NUMA 的代价是跨节点内存访问(带宽低、延迟高):JVM 堆在哪个节点分配、GC 线程与业务线程在哪个节点跑,决定局部性质量。
2. G1 的 -XX:+UseNUMA 让年轻代分配按节点交错,配合线程亲和能让"分配线程与 Eden 同节点";但它不解决线程调度漂移与老年代访问。
3. 纳入排障的条件:多路服务器、大堆、延迟敏感、且已排除分配尖刺/GC 异常等主因——NUMA 是二阶因素,别在头号问题未解决时先动它。

## 参考分析

### 第二步扩展① 机制:堆、线程与节点的映射

- Linux 下 JVM 默认按系统策略(first-touch)分配堆页:谁先触碰页面,页就落在谁的节点。
- 跨节点访问的常见形态:GC 线程(固定在节点 A)整理属于节点 B 的页、业务线程被调度器在节点间迁移后访问远端页。
- UseNUMA(仅 G1/ParallelGC 支持)把 young 区按节点分片,分配线程在各自节点取 TLAB,提高本地性。
- 观测点:numactl --hardware 看拓扑、perf 的 NUMA 事件、GC 日志不直接体现(需系统层工具)。

### 第二步扩展② 反例:把二阶因素当主因

- 撮合服务延迟方差大,团队先调 UseNUMA——排查一周发现主因是定时任务与撮合争抢 CPU(限流与错峰问题,第 20 题画像)。
- 判别顺序:先排除分配尖刺(GC 日志)、限流(throttled 统计)、缓存冷启动(时间线对齐)。
- NUMA 效应在上述都干净后仍方差大、且拓扑跨节点访问证据(perf)成立时才立案。
- 二阶因素的修复收益通常 5-15%,主因收益常以倍数计,顺序错了浪费时间。

### 第二步扩展③ 取舍:UseNUMA 与绑核的配合

- UseNUMA 适合:大堆多路、young 分配密集、节点数 2-4。
- 误用场景:容器内 NUMA 感知失真(节点视图与宿主不一致)、小堆(收益盖不住复杂度)、依赖 first-touch 的自定义绑定。
- 配合手段:numactl 绑定 JVM 进程到单节点(牺牲总带宽换确定性,适合延迟敏感)、或依赖调度器 cgroup cpuset。
- 每种组合要压测对照,容器与宿主的 NUMA 视图差异要在报告里写明。

## 案例

### 第三步发散·验证与推演 推演:NUMA 排障的观测路径(本机为单路,不可测)

- 观测路径:1) numactl --hardware 与 lscpu 确认拓扑(典型双路输出:available: 2 nodes (0-1),各 node 的 cpus 与 meminfo 分列——拓扑未分列即单节点,无需继续)。
- 2) perf stat -e node-loads,node-stores 看跨节点比例。
- 3) GC 日志与业务方差对齐,排除一阶因素。
- 4) UseNUMA 开关 A/B 或绑核对照,方差与 P99 变化量化。
- 可查证的事实锚点:UseNUMA 仅 G1 与 ParallelGC 支持(HotSpot 文档口径),ZGC/Shenandoah/SerialGC 无此选项——开关在所跑回收器上不存在即直接排除。
- 本机(单路 Windows)无 NUMA 拓扑,全部为推演,标注待补。
- 生产执行时保留拓扑与压测数据作为证据。
- 验证:开关 A/B 后方差收敛即确认归因,未收敛则回到一阶因素。

### 第三步发散·追问扩展 追问链:NUMA 三刀

- **Q1：为什么大堆才敏感?**
  - 答：堆越大,跨节点访问的绝对次数越多,first-touch 后的页分布一旦失衡,惩罚按 GB 级累积;小堆的跨节点成本被业务延迟淹没。
- **Q2：透明大页和 NUMA 什么关系?**
  - 答：大页减少 TLB miss,但 2MB 页的分配与 NUMA 交错策略交互复杂,大页预触碰(第 45 题)也会改变页分布;两个参数要一起对照,别单独下结论。
- **Q3：容器里怎么保证视图正确?**
  - 答：宿主绑定(cpuset/membind)传给容器,容器内 numactl 复核;K8s 的 topology manager 与 JVM 的 NUMA 感知要对齐配置,否则 UseNUMA 开了也白开。

## 总结点

1. 跨节点访问,带宽换延迟
2. 先清一阶因素,再立案 NUMA
3. 拓扑要复核,参数组合测
