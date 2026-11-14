<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/TreeSet.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银沙盘:TreeSet 用 compareTo 判等(不是 equals)——compareTo 返回 0 的两个对象被视为"同一个"(第二个被吞),即使 equals 不等。用实验说明比较器契约与"消失的元素"。

1. 机制:TreeSet/TreeMap 是比较器结构:元素去重与定位全靠 compare/compareTo(==0 视为同一键);HashSet/HashMap 用 equals+hashCode——两族容器判等的依据不同。
2. 事故形态:compareTo 只比较一个字段(id),equals 比较全部字段——同 id 不同内容的两个对象:HashMap 存两份,TreeSet 只存一份(第二个被吞)——"消失的元素"。
3. 修复与契约:比较器与 equals 一致(compare==0 ⟺ equals——一致性契约);不一致时必须显式声明(TreeSet with Comparator 的文档注释)并确保语义是有意的(如"按 id 唯一"的集合语义)。

## 参考分析

### 机制:两族容器的判等分野

HashMap 判等:hash 定桶+equals 定元素(两个都过才算同键)——不同对象可同桶共存(equals 不等)。TreeMap 判等:compare==0 即同一位置(红黑树无"同键多值"概念)——compare==0 直接替换/拒绝。后果:同一组对象在两族容器中的"去重结果"可以不同——这既是坑(意外吞元素)也是能力(按业务键去重,第 45 题:TreeSet 的 compare 语义做"按业务键唯一"——刻意使用时是特性)。

### 反例:compareTo 不一致的事故

沙盘:交易对象 compareTo 只按金额,equals 按全字段——TreeSet 存交易去重:两笔同金额不同单号的交易,第二笔被吞——对账短一笔(第 16 题勾兑的差异)。排查:HashSet 里 1000 个、TreeSet 里 998 个——集合间size 差异即 compareTo/equals 不一致的信号。修复:compareTo 纳入全部判等字段(与 equals 对齐)或明确"按金额唯一"是有意语义。

### 取舍:不一致比较器的合法用途

合法场景:按业务键唯一(同键后者覆盖/忽略)——"Set 按 id 去重,保留最新"(第 45 题:TreeMap 用 compare 按时间排序,同 id 取最新)——刻意的"compare==0 合并"语义。风险控制:不一致必须文档化(比较器注释+类注释)+测试断言(同 id 异内容的合并行为)——隐式不一致=事故,显式不一致=设计。

## 案例

### 验证:吞元素的实验断言

验证:本机实验形态(第 45 题将做完整版)——两对象同 compare 异 equals:HashMap 断言两份、TreeSet 断言一份(吞);修复后(compare 与 equals 一致)断言两容器结果一致——对照固化判等分野;集合间 size 差异的检测(排查工具思路)。

### 追问链:判等三刀

一刀:"hashCode 也要一致吗?"——TreeSet 不用 hashCode(树定位),但对象同时用于 HashMap 时要一致——同一类的三件套(compare/hashCode/equals)语义对齐是默认契约。二刀:"Comparator 传入的 TreeSet?"——传入 Comparator 的 TreeSet 用 comparator 判等(元素可不实现 Comparable)——判等依据=构造时的 comparator,与元素自身 compareTo 无关——两个"判等源"别混淆。三刀:"SortedSet 的 null?"——TreeSet 默认抛 NPE(compareTo(null) 失败);HashSet 允许 null——null 语义也是选型维度。

## 总结点

1. TreeSet 按 compare 判等,不是 equals
2. compare==0 即吞,同 id 异内容会消失
3. 不一致要么修要么显式声明
