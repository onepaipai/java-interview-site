<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/collectors.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 GC 沙盘:G1 将堆切为等大 Region(1-32MB)——Young GC(新生代复制)+Mixed GC(新生代+部分老年代 region)+停顿预测(MaxGCPauseMillis 驱动 CSet 圈选)——jvm-advanced 2/3 题的完整版。

1. Region 化:堆切成等大分区(角色 Eden/Survivor/Old/Humongous 动态分配)——回收单位从"整代"变为"region 集合"(CSet),暂停时间由 region 数量调节(可预测性的来源)。
2. Young GC:Eden 满→存活对象复制到 Survivor/Old region→Eden 清空;Mixed GC:并发标记完成后,选择"垃圾比例高的老年代 region"加入 CSet 一起回收——G1 独有(Parallel/CMS 没有选择性回收老年代)。
3. 停顿预测:G1 记录每个 region 的回收耗时预测值→按 MaxGCPauseMillis 目标圈定 CSet(预计暂停≤目标);预测是统计中位数(非逐次承诺,第 3 题 jvm-advanced:80ms Full 完全无视 5ms 目标)。

## 参考分析

### 第二步扩展① 机制:G1 与 CMS 的核心区别

- CMS:标记-清除(碎片)+连续老年代(不可预测 Full)+并发标记/清除。
- G1:标记-复制(新生代)+标记-整理(老年代 region,无碎片)+region 化(可预测 CSet)+失败降级 Full(第 6 题 evacuation failure)——G1 的核心创新=region 化使"选择性回收"成为可能。

### 第二步扩展② 反例:G1 的两种事故

- 事故一:MaxGCPauseMillis 设过小(5ms)→每次只回收少量 region→GC 频率飙升→吞吐下降(第 3 题 jvm-advanced)。
- 修复=从当前 P99 出发设温和目标。
- 事故二:to-space exhausted→Full GC(第 6 题:855 次 exhausted→Full)。
- 修复=G1ReservePercent 提升+Humongous 治理。

### 第二步扩展③ 取舍:G1 vs CMS vs Parallel

- G1:大堆(>4GB)+暂停目标可调+无碎片(推荐默认,第 14 题 JVM)。
- CMS:老堆(4-8GB)已移除(JDK 14)。
- Parallel:吞吐优先(批处理,暂停不敏感)——按"堆大小+暂停要求+吞吐要求"选,不是"最新=最好"。

## 案例

### 第三步发散·验证与推演 验证:G1 的走查核对

- 验证:本机 hum.log(Humongous regions 29→15→54→0)+pause.log(young 中位 3ms,Full 80ms)+evac.log(855 次 To-space exhausted→Full)——三份 GC 日志覆盖 G1 的核心场景。
- jvm-advanced 2/3/6 题的实测数据可复用。
- 验证:GC 日志的断言(region 大小/暂停分布/Humongous 计数)可程序化。

### 第三步发散·追问扩展 追问链:G1 三刀

- **Q1：G1 的 SATB 是什么?**
  - 答：Snapshot-At-The-Beginning:并发标记开始时拍快照(标记存活对象)——并发期间新分配的对象默认存活;写屏障记录引用变更(SATB vs CMS 的增量更新)。
- **Q2：IHOP 是什么?**
  - 答：Initiating Heap Occupancy Percent:触发并发标记的堆占用阈值(默认 45%)——IHOP 过高→Mixed GC 来不及→to-space exhausted;过低→并发标记过于频繁。
- **Q3：G1 的字符串去重?**
  - 答：XX:+UseStringDeduplication:GC 期间合并内容相同的 String 底层数组(第 36 题 JVM 实测:Deduplicated 98.4%)——G1 特有(ZGC 17 不支持)。

## 总结点

1. Region 化=选择性回收+可预测
2. Young GC+Mixed GC+Full 兜底
3. MaxGCPauseMillis=统计引导非承诺
