<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [github.com · 1](https://github.com/openjdk/jdk17u/blob/master/src/java.base/share/classes/java/util/ArrayList.java)

</details>

## 参考回答

1. ArrayList 用数组，随机访问 O(1)，中间插删通常 O(n)；LinkedList 按下标定位 O(n)，已定位节点的迭代器插删可 O(1)。
2. OpenJDK 17 ArrayList 常规扩容约 1.5 倍，但要满足最小所需容量；扩容会复制元素引用而非深复制元素。
3. 顺序遍历链表用迭代器；按数据量、分配与局部性比较，已知规模可合理预留容量。

## 案例

1. 场景（教学示例）：比较同一列表的下标访问、顺序遍历与迭代器已定位插入，不混淆定位成本。

2. 核心代码。

```java
var array = new ArrayList<>(List.of(1,3));
var linked = new LinkedList<>(List.of(1,3));
array.add(1,2);
var it = linked.listIterator(1); it.add(2);
System.out.println(array.equals(linked));
```

3. 预期：true；本例只验证语义。性能基准中把定位与插入分别计量，不能用先遍历到位置的链表操作宣称总成本 O(1)。

## 总结点

1. 链表定位成本不能省略。
2. 扩容会复制引用数组。
