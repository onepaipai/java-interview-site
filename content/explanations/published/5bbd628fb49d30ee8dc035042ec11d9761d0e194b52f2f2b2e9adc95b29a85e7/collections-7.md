<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/TreeMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银风控沙盘:需要"查某时间点之前的最新汇率"(范围查询+有序遍历)——HashMap 无序做不到,TreeMap 的 floorEntry/headMap 天然匹配。用 TreeMap 的能力集(有序/范围/导航)对照 HashMap 说明适用场景。

1. TreeMap 的独有能力:键有序(红黑树)——范围查询(headMap/tailMap/subMap)、导航(floorEntry/ceilingEntry/higherEntry/lowerEntry)、首尾(firstEntry/lastEntry)——HashMap 全部做不到。
2. 代价:O(log n) 查询(O(1) 之差)、键必须可比较(Comparable 或 Comparator)、内存略高(树节点)——有序是花成本买的能力。
3. 典型场景:时间线数据(某时点的最新配置/汇率,第 22 题汇率上下文)、范围检索(某区间订单)、排序遍历(按键序输出,第 41 题确定性顺序);并发+有序=ConcurrentSkipListMap(第 36 题)。

## 参考分析

### 机制:导航方法的业务映射

floorEntry(key)=≤key 的最大键:时间线查询"某时刻有效的汇率/费率"(第 21 题规则版本的时间边界)——Map<生效时间, 规则>,floorEntry(查询时刻) 即答案。tailMap(key)=≥key 的子视图(视图=原 Map 的投影,随原 Map 变化)——范围扫描(某时间之后的所有事件)。这些能力 HashMap 要"全量遍历+过滤"(第 5 题遍历成本)——TreeMap 把 O(n) 遍历变成 O(log n) 导航。

### 反例:HashMap 上自建排序的三种浪费

浪费一,取后排序:每次查询把 HashMap 全量转 List 排序取最近——O(n log n)/查询(TreeMap O(log n));浪费二,双结构手工同步:HashMap+TreeMap 各存一份(自己维护一致性,第 2 题投影分叉的手工版)——TreeMap 单结构;浪费三,键不可比较硬用:键无自然序时自定义 Comparator 的语义错误(比较规则与业务序不符)——选 TreeMap 的前提是键有确定的业务序。

### 取舍:TreeMap vs ConcurrentSkipListMap vs LinkedHashMap

TreeMap:单线程/有序导航/范围查询。ConcurrentSkipListMap:并发+有序(跳表,无锁读)——并发场景的 TreeMap 替代(第 36 题分布式)。LinkedHashMap:插入/访问序(非键序)+LRU(第 6 题)——顺序的语义不同(时间序 vs 键序)。选择问句:需要键的什么序?按业务序(TreeMap)/按访问序(LinkedHashMap)/无序最优性能(HashMap)。

## 案例

### 验证:导航能力的断言组

验证:时间线用例(汇率 Map<时间,价>,floorEntry(某时刻) 返回最近生效价——第 22 题场景);范围用例(subMap 断言边界含头含尾语义);并发有序用例(ConcurrentSkipListMap 的导航在并发下的行为)——三组固化 TreeMap 的能力边界。

### 追问链:TreeMap 三刀

一刀:"键的可比较性?"——自然序(Comparable)或构造传 Comparator;比较器的一致性(equals 一致,第 34 题比较器契约)——不一致=元素"消失"(TreeSet/Map 按 compare 判等,第 8 题)。二刀:"视图的开销?"——subMap/headMap 是视图( backed by 原树)——视图上的写直接影响原 Map(语义强大但要小心);视图的迭代成本=子树大小。三刀:"TreeMap 的并发?"——非线程安全;并发有序需求:ConcurrentSkipListMap(跳表)或外部锁(锁粒度=全树,写串行)——数据量与并发度决定。

## 总结点

1. 范围导航是 TreeMap 的独门
2. floorEntry 解时间线查询
3. 键可比是前提,比较器要一致
