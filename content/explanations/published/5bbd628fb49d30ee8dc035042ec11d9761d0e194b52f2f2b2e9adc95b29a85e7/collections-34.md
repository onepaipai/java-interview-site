<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Comparator.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银列表沙盘:交易列表按"金额排序"——比较器只比金额(金额相等时顺序随机:TimSort 稳定保插入序但比较器不一致时违反契约)——一致性与稳定性的两个层次:比较器自洽(compare(a,b) 与 compare(b,a) 对称/传递)+跨字段扩展。

1. 稳定性(Sort 稳定):TimSort 保相等元素的相对序(稳定排序)——相等定义=compare==0:比较器只比金额时,金额相等的交易保持原序(稳定)——但"原序"依赖输入顺序(分页后不稳定,第 44 题)。
2. 一致性(比较器契约):对称(compare(a,b)=−compare(b,a))与传递(传递闭包)——违反(如浮点比较的 NaN、复合比较的遗漏字段)→IllegalArgumentException(Collection.sort 检测)或静默错序。
3. 正确姿势:全字段比较链(主字段→次字段→唯一键兜底[流水号]——总序保证)+Comparator.comparing(...).thenComparing(...) 链式——多字段排序的确定性(第 44 题分页稳定排序的架构面)。

## 参考分析

### 机制:稳定性与一致性的协作

稳定性:TimSort(对象)/dual-pivot quicksort(基本类型,不稳定)——对象的 Collections.sort 稳定:相等元素保相对序——稳定的前提=比较器"相等"的定义正确。一致性:compare 必须自洽(对称+传递+可比)——不一致的经典:比较器用可变字段(排序前后字段被改,第 46 题)、浮点差值取整(0.1-0.1=0 但比较错)。链式比较:comparing(金额).thenComparing(时间).thenComparing(流水号)——最后落到唯一键(总序,分页稳定的前提)。

### 反例:不一致比较器的事故

事故一,传递性破坏:比较器"A 在前如果金额大,否则按时间"——A 金额大时间早、B 金额大时间晚的交叉——TimSort 检测到不一致抛 IllegalArgumentException("Comparison method violates its general contract")——生产异常(排序触发)。事故二,可变字段:比较器引用对象的 name 字段,排序中(并发)name 被改——不确定性(第 46 题专论)。事故三,NaN:金额 NaN 时所有比较 false——排序结果随机。三条的正解:字段链+唯一键兜底+不可变快照(排序前拷贝或防御)。

### 取舍:比较器的复用与组合

复用:常用排序(金额/时间)定义常量 Comparator(BY_AMOUNT/BY_TIME)——组合 BY_AMOUNT.thenComparing(BY_TIME)——散落的 lambda 重复(第 8 题:同一排序逻辑两处不一致)。组合的方向:比较字段的可变性(排序时拷贝防御,第 46 题)与比较器的注册(枚举排序策略,第 32 题注册表)。

## 案例

### 验证:排序契约的断言组

验证:一致性断言(比较器的自洽测试:随机对象对,断言对称+传递——属性测试风格);稳定性断言(相等元素的原序保持——TimSort 稳定实证);确定性断言(同输入两次排序输出完全一致——第 41 题顺序确定性)——三组固化排序契约;TimSort 异常的复现用例(不一致比较器的 IllegalArgumentException)进评审素材。

### 追问链:排序三刀

一刀:"TimSort 的违规检测?"——TimSort 在合并时检测不一致(抛 IllegalArgumentException)——不是每次必抛(取决于数据形态)——不一致比较器的"偶发爆炸"更难排查(数据依赖)。二刀:"null 在排序里?"——nullsFirst/nullsLast(显式声明 null 位置)——默认 null 抛 NPE——null 语义显式化(第 18 题)。三刀:"大列表的排序成本?"——O(n log n)+TimSort 的临时数组(n/2 引用)——大列表排序的内存与时间(流式 TopK 替代,第 35 题)。

## 总结点

1. 稳定保原序,一致保正确
2. 比较链落到唯一键
3. 可变字段排序先防御
