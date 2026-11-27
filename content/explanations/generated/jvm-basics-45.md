<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：一次报表任务生成 80MB 的数组后，GC 行为整体变了样。以 G1 的 humongous region 为主线，解释大对象的分配路径、回收代价与规避手段。

1. G1 中超过 region 一半的对象是 humongous：直接在老年代分配连续 region，不经年轻代、不参与常规晋升流程。
2. 分配代价：需要连续空闲 region，碎片化时可能触发并发周期甚至 Full GC（找不到连续空间）；多个大对象并存会显著压缩老年代可分配空间。
3. 回收代价：humongous 回收依赖并发标记识别其死活（分配时若已知短命可用 young GC 回收部分），长期占据的 region 加剧碎片；数组按"region 一半"的边界划档，80MB 与 81MB 可能差出一个 region 规格。

## 参考分析

### 第二步扩展① 机制：大对象是"整层租户"

- region 是仓库的标准隔间，普通小件按格堆放。
- 大件货直接整层租下（可能跨多层），进出都要整层协调。
- 类比解释三个后果：要得起整层才进得来（连续空间）、清一层才腾得出地方（回收协调）、隔间规格决定了"多大算大件"。

### 第二步扩展② 反例：一条大 SQL 的连锁反应

- 报表一次查询加载 80MB 结果集为数组：分配需连续 region → 触发并发周期 → 碎片化后 Full GC。
- 同一时刻多个报表并发则老年代被 humongous 切碎。
- 修复方向按顺序：流式处理/分页限制单次加载、数组分块、增大 region 或堆（G1 region 尺寸 1–32MB 自动选择，可用 G1HeapRegionSize 显式设定）。

### 第二步扩展③ 取舍：大对象直入老年代是妥协不是缺陷

- 年轻代复制算法要求存活少，大对象复制搬运成本极高，直接放老年代是理性选择。
- 代价是绕过了分代的保护。
- 工程原则：让大对象"少而短命"——控制单次加载规模（流式），用完即弃。
- 缓存的序列化大块改按需重建。

## 案例

### 第三步发散·验证与推演 对照操作：大对象的 GC 行为对照

- 教学验证：同一服务分别跑"循环分配 2MB 数组"与"循环分配 2KB 数组"。
- 预期：前者 -Xlog:gc* 出现 humongous allocation 记录与更频繁的并发周期，后者只有常规 young GC。
- 再用 -XX:G1HeapRegionSize=32m 对照，humongous 阈值上移、记录减少。
- 实验可复跑。

### 第三步发散·追问① 追问：为什么大对象在 Parallel 时代不算突出问题

- Parallel 用连续老年代 + 空闲列表，大对象只要总量放得下即可，没有"连续 region"的规格约束。
- 但它的碎片化问题转移到了分配端。
- 每个回收器对大对象的处理都是自身算法结构的投影——理解这点，跨回收器讨论才不会张冠李戴。

## 总结点

1. 半格以上算大件，整层租用
2. 大对象直进老年代，绕过晋升
3. 流式分块，少而短命
