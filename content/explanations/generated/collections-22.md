<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/CopyOnWriteArrayList.html)

</details>

## 参考回答

1. CopyOnWriteArrayList 的迭代器保存创建时数组快照，不观察后续 add、remove 或 set。
2. 快照隔离结构变化，旧迭代器不因此抛 ConcurrentModificationException；其 remove 不受支持。
3. 元素对象仍共享引用，字段变化不是快照隔离的一部分；长寿命迭代器还会延长旧数组的存活。

## 案例

1. 场景（教学示例）：取得迭代器后替换第一个元素，对比旧迭代器与新读取。

2. 核心代码。

```java
var list = new java.util.concurrent.CopyOnWriteArrayList<>(List.of("A"));
var old = list.iterator();
list.set(0,"B");
System.out.println(old.next());
System.out.println(list.get(0));
try { old.remove(); }
catch (UnsupportedOperationException expected) { System.out.println("remove unsupported"); }
```

3. 预期：A、B、remove unsupported；换成可变元素时还要验证字段共享，不能将数组快照当作对象深复制。

## 总结点

1. 迭代快照停在创建时。
2. 快照迭代器不支持删除。
