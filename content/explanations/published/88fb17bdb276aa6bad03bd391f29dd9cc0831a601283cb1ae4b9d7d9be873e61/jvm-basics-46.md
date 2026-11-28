<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/System.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：某服务在定时任务里调用 System.gc() "保持内存干净"，结果高峰期出现整段暂停。解释显式 GC 在不同回收器下的真实行为、与堆外内存释放的纠葛，以及安全的使用场景。

1. System.gc() 触发一次全堆回收：Parallel 下是全线程 STW 的 Full GC；G1 下触发并发周期起点（仍含 STW 阶段），并把后续 mixed 提前——高频调用等于人为制造回收压力。
2. 与堆外的纠葛：DirectByteBuffer 依赖 Cleaner 在引用可达性变化时释放，历史上 System.gc() 是其兜底触发器之一；用 -XX:+DisableExplicitGC 粗暴禁用，在特定路径（RMI DGC、部分堆外库）会造成堆外内存不释放。
3. 安全姿势：默认禁用（DisableExplicitGC 或 G1 的 ExplicitGCInvokesConcurrent 把显式调用转为并发周期），确有堆外回收需求的代码走显式释放（释放引用 + 必要时受控的 System.gc，且限频限时机）。

## 参考分析

### 第二步扩展① 机制：显式 GC 打乱回收器的节奏假设

- 回收器的周期由分配速率与压力模型驱动，System.gc() 是"游客强行按铃"：无论当前处于并发标记哪个阶段都要响应，可能中断既定节奏。
- 类比物业按楼层的清扫计划作业，住户天天手动按铃叫电梯——电梯调度被打乱，所有人等得更久。

### 第二步扩展② 反例：定时清理任务的暂停尖刺

- 服务每小时 System.gc() 一次"以防万一"：G1 下每次触发并发周期 + 初始标记暂停，恰好落在高峰时段，P99 与任务时间对齐。
- 日志特征：GC 原因含 "System.gc()"。
- 修复：删掉调用、依赖自动周期。
- 若有堆外依赖，按 ExplicitGCInvokesConcurrent 转并发或改显式释放。

### 第二步扩展③ 取舍：什么时候显式 GC 是合理的

- 有限的合法场景：压测中控制变量（教学复现）、堆外内存兜底策略里限频触发（如每分钟最多一次且避开高峰）、诊断时对比 GC 前后可达性（第 42 题）。
- 原则：它应该是受控的运维动作，而不是业务代码里的常规语句。

## 案例

### 第三步发散·验证与推演 对照操作：显式调用的日志特征

- 教学验证：G1 服务每 5 秒 System.gc() 一次，观察 -Xlog:gc* 的原因字段与暂停分布。
- 再切 DisableExplicitGC 对照。
- 预期：前者回收次数与暂停随调用频率线性增长，原因标记 System.gc()。
- 后者完全不触发。
- 实验可复跑，把"按铃"的代价可视化。

### 第三步发散·追问① 追问：DisableExplicitGC 的堆外风险怎么量化

- 监控直接内存使用量（NMT 或 BufferPool 指标）与显式禁用开关联动：若堆外只升不降且分配点在 DirectByteBuffer，说明该服务需要保留显式回收通道。
- 两个开关（禁用/转并发）加上限频，构成显式 GC 治理的完整选项集。

## 总结点

1. 按铃打乱清扫计划
2. 堆外兜底别一刀切禁用
3. 要禁就禁，要转就转并发
