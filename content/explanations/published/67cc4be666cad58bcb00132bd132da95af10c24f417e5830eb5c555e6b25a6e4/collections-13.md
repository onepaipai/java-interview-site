<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Collections.html)

</details>

## 参考回答

1. unmodifiableList 只禁止通过包装视图执行修改，不复制父列表；其他持有者修改父表会穿透到视图。
2. 需要稳定结构快照可用 List.copyOf 或先复制再包装；前者拒绝 null，复制时也需要协调并发修改。
3. 两者都属于浅层边界；元素的可变字段仍可能由其他引用修改，不能直接当作完整不可变对象。

## 案例

1. 场景（教学示例）：同一父列表分别生成只读视图和结构快照，再向父表追加。

2. 核心代码。

```java
var source = new ArrayList<>(List.of("A"));
var view = Collections.unmodifiableList(source);
var snapshot = List.copyOf(source);
source.add("B");
System.out.println(view);
System.out.println(snapshot);
```

3. 预期：[A, B]、[A]；另用可变元素验证浅复制，不把结构稳定误认为元素字段冻结。

## 总结点

1. 只读视图会观察父表变化。
2. 稳定快照仍要考虑元素可变。
