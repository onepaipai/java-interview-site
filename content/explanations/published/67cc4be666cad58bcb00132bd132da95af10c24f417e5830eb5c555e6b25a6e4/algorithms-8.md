<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 入栈保存新元素，出栈为空时批量倒入，每个元素最多移动有限次。
2. 单次操作可能线性，但一组操作的平均成本为常数。

## 参考分析

1. 每个元素只需从输入栈转移到输出栈一次。
2. 一组操作摊还 O(1)，一次触发整体转移的 pop 最坏仍为 O(n)。

## 案例

1. 场景（教学示例）：push 1、push 2、pop、push 3、pop、pop。

2. 处理：仅当输出栈为空才把输入栈全部倒入，避免每次来回搬运。

3. 验证：弹出顺序 1、2、3；总移动次数线性，不能把摊还说成单次最坏常数。

## 总结点

1. 出栈空时才倒入。
2. 摊还不等于每次最坏。
