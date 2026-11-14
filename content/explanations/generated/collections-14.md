<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/ArrayList.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银清洗沙盘:遍历列表删除不合格元素——循环内 list.remove 抛 CME(或更糟:不抛但漏删——remove 倒数第二个元素,第 2 题实测"未抛出");正确姿势三选:iterator.remove、removeIf、倒序下标循环。

1. CME 的机制:迭代器持有 expectedModCount,结构性修改使 modCount 变化→next() 校验失败抛 CME——尽力而为(不保证抛,第 2 题实测:remove 倒数第二个元素后循环自然结束,不抛也不漏)。
2. 三姿势:iterator.remove(迭代器自己的删除,同步 expectedModCount)、removeIf(内部位图标记+单次压缩,O(n) 一次搬移,第 9 题)、倒序下标(索引可控,不依赖迭代器)——错误姿势:正序下标循环 remove(索引移位漏删)+增强 for 内 list.remove(CME 或漏删)。
3. 本机实验:增强 for 中 remove(2)(列表 [1,2,3])→未抛 CME 且删除成功——"没抛"≠"安全"(换个位置就抛/漏删)——fail-fast 是尽力而为不是保证。

## 参考分析

### 机制:modCount 与三种姿势的原理

CME 机制:list.remove 改 modCount→iterator.next 的 checkForComodification 对比 expectedModCount→不等抛。iterator.remove:调用 ListItr.remove(同步 expectedModCount=modCount)——合法。removeIf:ArrayList 重写(位图标记保留位+一次搬移+一次 modCount 更新)——O(n) 总成本。倒序下标:从后往前删除(删除不影响前方索引)——正序漏删(删 i 后 i+1 变 i)。

### 反例:删除姿势的三种事故

事故一,正序漏删:[1,1,2] 删所有 1——i=0 删后列表 [1,2],i 跳到 1(第二个 1 被跳过)。事故二,增强 for 抛 CME:remove 倒数第二以外的元素——偶发(取决于位置,本机实验:倒数第二个不抛)——"测试时没抛"的假安全感。事故三,removeIf 的谓词副作用:谓词里修改外部状态(顺序相关的副作用)——removeIf 的执行顺序不保证(并行流更甚)——谓词必须纯。三条的正解按场景:迭代器(边遍历边多逻辑)、removeIf(纯过滤)、倒序(简单下标逻辑)。

### 取舍:三姿势的选择

iterator.remove:遍历中需要"多逻辑+删除"(其他处理与删除共存)。removeIf:纯过滤(谓词独立)——最简洁高效(优先)。倒序下标:数组式思维/非 List(自维护结构的删除)。HashMap 的对照:迭代中删键用 entrySet().iterator().remove(CHM 的迭代器支持 remove,弱一致语义;第 2 题)——不同容器姿势不同,原理同源(结构性修改的协调)。

## 案例

### 验证:删除姿势的断言组

验证:本机实验断言(增强 for remove 倒数第二不抛 CME——"尽力而为"的证据;其他位置抛);漏删断言(正序循环删重复元素,断言漏删);三姿势对照(同过滤需求:iterator/removeIf/倒序——结果一致且 removeIf 最快)——四组把删除语义完整固化。

### 追问链:删除三刀

一刀:"removeIf 为什么快?"——单次搬移(位图决定保留位,一次 System.arraycopy 压缩)vs 循环 remove 的多次搬移——O(n) vs O(n²)(第 42 题批量 removeAll 同族)。二刀:"并发容器的删除?"——CHM 迭代中 remove 不抛 CME(弱一致迭代器,自身 remove 支持)——容器语义决定姿势(第 2 题)。三刀:"删除与索引结构?"——删除后索引结构的失效(排序索引/缓存索引同步,第 47 题归属)——删除不只是列表的事,关联结构要联动。

## 总结点

1. CME 尽力而为,没抛不等于安全
2. removeIf 最快,iterator 最活
3. 正序下标循环必漏删
