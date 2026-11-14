<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/String.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 ID 沙盘:HashSet<String> 存 1 亿个 20 字符 ID——每个 String(对象头+char[]/byte[]+引用)≈80-100 字节,总计 10GB——内存膨胀的治理:结构压缩( intern/long 编码/紧凑结构)与存储替代(位图/DB)。

1. 膨胀的构成:每个 String≈40-80 字节(对象头+byte[]头+内容+数组对齐)+HashSet 的 Entry(引用+hash+next)≈32 字节+引用——合计每元素 80-120 字节;1 亿条=8-12GB。
2. 压缩三招:long 编码(ID 可转数值:long 8 字节 vs String 80——10 倍压缩,HashSet<Long> 或 long[] 排序二分)、字符串驻留(重复前缀 intern——JDK 的 String 去重[G1 自动]或手动 Map 共享)、紧凑结构(long[] 排序+二分查找——无对象头,纯数据)。
3. 存储替代:超内存→DB 唯一约束/Redis(Roaring 位图——第 29 题密集 ID 的 12.5MB 形态)——内存放不下的交给专业存储。

## 参考分析

### 机制:String 的内存构成与压缩

String 构成(JDK 17,紧凑字符串):对象头 12+byte[]引用 4+hash/hashCode 缓存+byte[](16 数组头+内容 UTF-16→Latin1 压半)——20 字符 Latin1 String≈56 字节+Entry 32+引用 4≈90 字节。long 编码:ID 结构化(前缀+序列)→long 编码(8 字节)——10 倍压缩的前提=ID 可无损转数值(哈希有碰撞,不行)。long[]+二分:排序后 O(log n) 查找——内存=纯数据(8 字节/条),无对象开销。

### 反例:膨胀的两种后果

后果一,GC 压力:10GB 的 HashSet(百万 Entry)——Full GC 扫描与标记的时间暴涨(堆大对象多)。后果二,序列化传输:该 Set 的网络传输/持久化(10GB)——一切 IO 都贵。两条的正解:编码压缩(减体积)+存储下放(减驻留)——先问"这些 ID 必须在内存里吗"(第 31 题分布式去重的三维)。

### 取舍:压缩与可读性的平衡

long 编码的前提:ID 结构稳定(编码规则变更=迁移);可读性损失(调试看 long 不直观)——toString 工具补偿。字符串驻留(intern):同前缀的 ID 共享——G1 的自动字符串去重(-XX:+UseStringDeduplication,第 28 题JVM)对 HashSet 场景的收益(前缀重复率高时显著)。保留 String 的场景:ID 无结构+低重复率——压缩空间有限,直接上存储方案。

## 案例

### 验证:压缩收益的断言组

验证:内存实测断言(1 千万 ID:HashSet<String> vs HashSet<Long> vs long[] 的实际堆占用对照——10 倍级差异);查找性能断言(long[] 二分 vs HashSet 的查询耗时);编码正确性断言(编码-解码往返无损)——三组让压缩决策有数据。

### 追问链:膨胀三刀

一刀:"String 的紧凑字符串?"——JDK 9+ Latin1(ASCII 内容减半)——JDK 17 的 String 已比 8 优化;但 90 字节/条的结构性开销仍在(对象头)——压缩的天花板是结构替代。二刀:"Set 的初始容量?"——第 1 题(容量规划):1 亿条 hash 的扩容 rehash(16→…→2.7 亿桶)——预分配+扩容抖动的双重治理。三刀:"分片策略?"——超内存的分片(按 ID 哈希分 N 个小 Set,逐片处理)——分片是内存与分布式的过渡形态(第 31 题)。

## 总结点

1. String 一条 90 字节,结构膨胀的根源
2. long 编码 10 倍压缩
3. 内存放不下交给存储
