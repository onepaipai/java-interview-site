<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 可把重排放在入栈或出栈阶段，使另一类操作简单。
2. 明确总成本与辅助空间，并覆盖空栈行为而非只给正常示例。

## 参考分析

1. 两个队列模拟栈要选择在哪一步付出重排成本。
2. 若 push 重排为 O(n)，pop 与 peek 可 O(1)，空间 O(n)。

## 案例

1. 场景（教学示例）：依次 push 1、push 2、pop、pop。

2. 处理：push 时新值先入辅助队列，再把原队列搬到其后，最后交换两个队列。

3. 验证：弹出 2、1；空栈明确报错，连续操作不遗留辅助队列脏数据。

## 总结点

1. 重排成本放一侧。
2. 先定义空栈行为。
