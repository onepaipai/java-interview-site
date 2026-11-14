<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/Collectors.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银报表沙盘:千万交易按账户分组求和——Collectors.groupingBy(全量 Map 驻留)+summingDouble(double 精度,第 20 题)——中间对象(分组 List 装全部交易)与装箱(Double)双重压力。用流式归并与原始类型优化说明大数据量的分组统计。

1. 中间对象的两个源头:groupingBy 的 List 装载(每分组一个 List 装全部元素——千万交易全驻内存)、装箱(Stream<Double>/Map<String, Double> 的 Double 对象)——对比原始类型:Map<String, long[]>或自定义 accumulator。
2. 优化阶梯:原始类型收集器(summingLong/groupingBy+mapping 精简)、自定义 accumulator(遍历+Map<String, long[]> 直加——无中间 List)、流式外部聚合(超内存:分片聚合+合并,第 31 题)、预聚合存储(DB group by/物化——内存统计的替代)。
3. 判定问句:分组键的基数与每组大小(1 千组×1 万条=内存可容纳;100 万组×10 条=分组 Map 巨大)——基数决定方案(banking 48 题分布式基数同构)。

## 参考分析

### 机制:中间对象的来源与替代

groupingBy 的结构:Map<K, List<T>>——每个分组先装 List(全量元素)再下游汇总——中间 List=全量元素驻留(哪怕只要 sum)。替代:toMap+merge(不装 List,直接归并——重复键 merge 函数)、自定义 collector(accumulator 直加 long[])、简单循环(遍历+Map.compute——最朴素最快)。装箱:Long/Double 的对象分配——原始类型流(mapToLong)+long[] 容器——装箱消除。

### 反例:中间对象的两种事故

事故一,驻留 OOM:千万交易的 groupingBy(分组 List 装全量)——内存峰值超堆(报表 OOM)。事故二,装箱 GC:Double 求和的百万次装箱(每 sum 一次 Double 分配)——GC 压力+精度(第 20 题 double 禁入资金——用 long 分或 BigDecimal——装箱与精度双问题)。修复:循环+long[]/自定义 collector——中间对象归零。

### 取舍:Stream 可读性与性能的平衡

Stream 的可读性(groupingBy 声明式)vs 性能(循环直加)——中小数据量(万级)Stream 足够;大数据量(百万+)循环或 DB 聚合。DB 聚合的最优:group by 在数据库(数据在哪聚合在哪——传输最小)——内存聚合是"数据已在本机"的场景。分阶段:先 DB group by 粗聚合(账户级)→内存细算——两级聚合的分工。

## 案例

### 验证:中间对象的断言组

验证:内存对照断言(groupingBy 装全量 vs 循环直加的堆占用对照——GC 统计);性能断言(千万条分组的耗时对照);正确性断言(两种方案的分组求和一致——精度用 long 分/BigDecimal 对照)——三组固化分组统计的优化;基数与方案的映射表进团队指南。

### 追问链:分组统计三刀

一刀:"流的装箱细节?"——mapToLong/mapToInt(原始流)vs map(装箱流)——boxed 流的分配;summingDouble→summingLong(先定标度,第 20 题)。二刀:"并发分组?"——parallel stream 的 groupingBy(合并开销+线程安全 collector)——并发分组的收益看数据量(第 40 题distributed 分治同构);分片聚合+合并更可控。三刀:"增量统计?"——统计随数据增长(实时报表)——增量更新(Map 直加,不重算全量,第 2 题banking 余额投影同思想)——全量统计 vs 增量维护是报表的架构决策。

## 总结点

1. groupingBy 装全量,大数据量是坑
2. 原始类型消装箱,long[] 直加
3. 数据在哪,聚合在哪
