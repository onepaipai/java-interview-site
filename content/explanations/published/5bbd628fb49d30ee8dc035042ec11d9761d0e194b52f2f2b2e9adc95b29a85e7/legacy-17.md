<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/LinkedHashMap.html)

</details>

## 参考回答

1. TreeMap 按自然顺序或比较器维护红黑树，常见查找增删 O(log n)，比较为零即视为同键。
2. LinkedHashMap 用哈希定位加双向链表，默认插入序，开启访问序后 get 等访问会调整顺序，可配合淘汰钩子实现基础 LRU。
3. 两者默认均不提供并发安全；有序结构的键应稳定，LinkedHashMap 访问序下的 get 也需计入修改协调。

## 案例

1. 场景（教学示例）：以相同插入顺序 B、A 建两种映射，观察按键序与插入序。

2. 核心代码。

```java
var sorted = new TreeMap<String,Integer>();
var inserted = new LinkedHashMap<String,Integer>();
for (var key:List.of("B","A")) { sorted.put(key,1); inserted.put(key,1); }
System.out.println(sorted.keySet());
System.out.println(inserted.keySet());
```

3. 预期：[A, B]、[B, A]；再开启访问序验证命中后位置调整。稳定输出顺序与并发安全是两个独立要求。

## 总结点

1. TreeMap 按键排序。
2. LinkedHashMap 维护链表顺序。
