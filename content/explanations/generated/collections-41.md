<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/Collectors.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银导出沙盘:list.stream().map(x -> x.getId()).collect(toSet()) 转 Set 再遍历——同一输入两次运行的输出顺序不同(Set 无序)、跨 JVM 也不保证(哈希实现可变)——确定性顺序=有序容器+显式比较链(第 34 题)。

1. 顺序丢失的两个环节:中间容器(toSet/toMap 的 HashMap 无序)与键的哈希序(HashMap 的遍历序=桶序,依赖容量与哈希——第 5 题)——确定性要求每一环都有序。
2. 确定性方案:LinkedHashSet(保持插入序)、TreeSet/TreeMap(键序)+比较链(第 34 题)、流的有序源(排序后再 collect toList)——"对 Set 排序"是逻辑错误(Set 无序,sort 无意义)。
3. 跨版本的确定性:同一 JDK 内确定(桶序随容量定),跨 JDK 版本不保证(实现可变)——导出/序列化的顺序契约必须显式排序(依赖哈希序=依赖实现细节)。

## 参考分析

### 机制:顺序在哪个环节丢失

丢失环节:toSet()(HashSet 无序)→toMap()(HashMap)→collect 后的遍历——每一环都可能乱。确定性的构造:toCollection(LinkedHashSet::new)(保流序)、toMap+TreeMap::new(键序)、流前 sorted(比较链)+toList(全序)——容器选择决定顺序语义。跨版本:HashMap 的迭代序依赖容量与哈希函数(JDK 可变)——"碰巧有序"的代码在升级后乱序(第 49 题回归集应含顺序断言)。

### 反例:顺序依赖的两种事故

事故一,导出顺序随机:报表导出用 toSet→遍历——同一请求两次导出顺序不同(客户对账困难,第 44 题分页稳定排序同族)。事故二,升级后乱序:依赖 HashMap 迭代序的代码(碰巧稳定数年)——JDK 升级后顺序变化——下游 diff 逻辑崩。两条的正解:确定性顺序=显式排序(比较链),哈希序永不依赖。

### 取舍:确定性的成本

成本:LinkedHashSet(每元素双链指针)/TreeSet(log n 插入)/排序(n log n)——确定性有代价。需要确定性的场景:导出/快照/测试断言/分页(第 44 题)——随机内部处理不需要(性能优先)。判定问句:这个顺序会被用户看到或被下游比较吗?——是则确定性必须;否则内部自由。

## 案例

### 验证:确定性的断言组

验证:同输入两次运行断言(输出序列完全一致);跨容器断言(toSet 乱/toCollection(LinkedHashSet) 有序——对照实证);升级确定性标注(依赖哈希序的代码在评审即拦截——顺序契约的显式化)——三组固化确定性;导出接口的顺序断言进回归(第 44 题)。

### 追问链:确定性三刀

一刀:"流的顺序性?"——有序源(列表)的流保序;无序源(Set)流无序;sorted() 中途引入序——流的顺序语义跟随源与算子;unordered() 显式放弃(性能优化)。二刀:"并行流的顺序?"——并行流 forEach 不保序,forEachOrdered 保序(牺牲并行度)——并行与确定性的取舍显式化。三刀:"与分页的配合?"——确定性顺序是分页稳定的前提(第 44 题:同筛选同排序同结果)——顺序契约与分页契约一体。

## 总结点

1. 每一环都要有序,才叫确定
2. toCollection 选容器,sorted 定顺序
3. 哈希序永不依赖
