<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [github.com · 1](https://github.com/openjdk/jdk17u/blob/master/src/java.base/share/classes/java/util/AbstractSet.java)

</details>

## 参考回答

1. AbstractSet.removeAll 会参考两边大小选择遍历方向；若遍历 Set 并调用另一边 List.contains，可能退化为 O(nm)。
2. 可在比较语义一致时把待删项建成 HashSet，使 contains 期望常数时间；建表成本和额外内存也应计入。
3. TreeSet 比较器可能与 equals 不一致，直接换成 HashSet 会改变删除语义；优化前必须验证相等与去重契约。

## 案例

1. 场景（教学示例）：3 条订单对照一万项待删除编号，先转精确查找集合后按条件移除。

2. 核心代码。

```java
var orders = new ArrayList<>(List.of(1,2,3));
var blocked = new HashSet<>(List.of(2,4,6));
orders.removeIf(blocked::contains);
System.out.println(orders);
```

3. 预期：[1, 3]；以 List 与 Set 两种待删输入计数 contains 和比较次数，覆盖大小关系与比较语义；不能仅用这个小例子宣称性能提升。

## 总结点

1. 批量删除要看查找成本。
2. 先保比较语义再换结构。
