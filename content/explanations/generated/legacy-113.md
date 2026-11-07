<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 反转链表先存后继；树层序用队列并固定每层长度。
2. 两数之和用哈希查历史位置，避免同元素重复使用。
3. 滑动窗口要求合适的单调条件；区间合并先排序，分别说明复杂度。

## 参考分析

1. 链表与 BFS 时间 O(n)。
2. 两数之和平均 O(n) 且要先查后存。
3. 区间合并 O(n log n)，窗口仅适用于相应单调条件。

## 案例

1. 场景（教学示例）：对空输入、重复值和边界位置测试五类基础算法。
2. 处理：为每类构造最小反例，与小规模暴力解对照；两数之和额外覆盖同一元素不能使用两次。

3. 验证：[3,3] 找 6 返回两个不同位置；链表无环、层序不混层，区间边界符合约定。

## 总结点

1. 先写不变量。
2. 小反例胜过大样本。
