<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 每层保存当前最小值，或使用辅助栈记录最小变化。
2. 重复最小值和弹出恢复必须正确，不能只记住单个历史最小数。

## 参考分析

1. 保存每层最小值或同步辅助栈可 O(1) 取最小。
2. 重复最小值必须计数或逐层保留，否则一次弹出就丢失仍在栈中的最小值。

## 案例

1. 场景（教学示例）：依次 push 2、1、1，再连续弹两次。

2. 处理：每层保存当前最小值，或对重复值同步压入辅助栈；检查空栈契约。

3. 验证：第一次弹出后 min 仍为 1，第二次后恢复 2；所有单步时间 O(1)。

## 总结点

1. 最小值跟随层次。
2. 重复最小也要保存。
