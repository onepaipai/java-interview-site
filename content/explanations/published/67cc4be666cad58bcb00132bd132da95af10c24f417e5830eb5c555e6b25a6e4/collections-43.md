<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/List.html)

</details>

## 参考回答

1. 先在 API 契约说明返回实时视图、结构快照还是深不可变数据；直接返回内部可变集合会泄漏修改权限。
2. List.copyOf 可形成不可修改的结构快照并拒绝 null；但复制源时需协调并发写入，不能默认它是原子一致快照。
3. 集合快照仍共享元素引用；跨信任边界时，按需要复制元素或使用不可变 DTO，不能仅包一层 unmodifiableList。

## 案例

1. 场景（教学示例）：内部保存可变标签列表，对外复制外层列表后，原标签对象仍被修改。

2. 核心代码。

```java
var inner = new ArrayList<>(List.of("A"));
var internal = new ArrayList<List<String>>(); internal.add(inner);
var shallow = List.copyOf(internal);
var deep = internal.stream().map(List::copyOf).toList();
inner.add("B");
System.out.println(shallow.get(0));
System.out.println(deep.get(0));
```

3. 预期：[A, B]、[A]；深浅边界必须按对象图定义，不能把本例的两层列表复制推广为任意对象的通用深复制。

## 总结点

1. 先声明视图还是快照。
2. 复制结构不等于复制元素。
