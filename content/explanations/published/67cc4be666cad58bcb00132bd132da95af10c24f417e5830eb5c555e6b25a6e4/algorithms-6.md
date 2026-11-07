<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 可维护元素数量或预留槽位，也可使用序号区分轮次。
2. 覆盖头尾回绕与容量边界，并说明是否支持并发。

## 参考分析

1. head 等于 tail 本身不能区分满空。
2. 维护 size 可让全部槽位可用，单线程实现不能自动称为并发队列。

## 案例

1. 场景（教学示例）：容量 2，放 A、B，取 A，再放 C。

2. 处理：入出队分别更新下标与 size，使用取模回绕；满时拒绝，空时按契约返回。

3. 验证：剩余顺序 B、C，容量恰好可用两项；回绕不会覆盖未读元素。

## 总结点

1. 满空显式记录。
2. 回绕保持先进先出。
