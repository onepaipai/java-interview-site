<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/BitSet.html)

</details>

## 参考回答

1. BitSet 适合非负整数且编号范围可控的标记、交并差；内存主要取决于最高位位置，不是已置位个数。
2. cardinality 是置位数，length 是最高置位加一，size 是当前存储容量；稀疏超大编号应先映射或选压缩结构。
3. BitSet 默认不具备并发原子更新；扩容、读写和复合位运算需要外部同步或合适的并发位图。

## 案例

1. 场景（教学示例）：只标记 3、5 两个编号，再观察集合基数与所需位范围。

2. 核心代码。

```java
var bits = new BitSet();
bits.set(3); bits.set(5);
System.out.println(bits.cardinality()+" / "+bits.length());
bits.set(1000);
System.out.println(bits.cardinality()+" / "+bits.length());
```

3. 预期：2 / 6、3 / 1001；多一个很大编号会扩大存储范围。负编号非法，不应直接把外部任意长 ID 作为位下标。

## 总结点

1. 位图空间看编号范围。
2. 置位个数不是分配容量。
