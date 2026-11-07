<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/ArrayList.html)

</details>

## 参考回答

1. subList 是共享底层存储的视图，小视图可能保持整个父列表和元素数组可达，不能按可见元素数估算保留内存。
2. 父表通过视图以外路径进行结构修改后，视图语义未定义；ArrayList 常通过修改计数抛出 ConcurrentModificationException。
3. 独立生命周期应复制区间；副本只复制元素引用，元素自身可变状态仍需单独约定。

## 案例

1. 场景（教学示例）：取得前两项的视图与副本，然后对父列表追加元素。

2. 核心代码。

```java
var parent = new ArrayList<>(List.of("A","B","C"));
var view = parent.subList(0,2);
var copy = new ArrayList<>(view);
parent.add("D");
try { System.out.println(view.size()); }
catch (ConcurrentModificationException expected) { System.out.println("view invalidated"); }
System.out.println(copy);
```

3. ArrayList 预期：view invalidated、[A, B]；内存保留需另查 GC Roots，不能凭父变量设为 null 就断言已回收。

## 总结点

1. 子视图共享父存储。
2. 独立生命周期要复制。
