<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Arrays.html)

</details>

## 参考回答

1. Arrays.asList 返回数组支持的定长 List，set 会修改原数组；add 和 remove 不受支持，允许 null。
2. List.of 返回不可修改且拒绝 null 的 List；不可修改只限制结构和元素引用替换，不使元素对象深度不可变。
3. 基本类型数组是一个元素：Arrays.asList(new int[]{1,2}) 的 size 是 1，需要基本类型流等方式逐项装箱。

## 案例

1. 场景（教学示例）：比较数组视图写穿、List.of 修改限制及基本类型数组的泛型推断。

2. 核心代码。

```java
String[] array = {"A","B"};
var view = Arrays.asList(array);
view.set(0,"X");
System.out.println(array[0]);
try { List.of("A").set(0,"X"); }
catch (UnsupportedOperationException expected) { System.out.println("immutable"); }
System.out.println(Arrays.asList(new int[]{1,2}).size());
```

3. 预期：X、immutable、1；另测 List.of 接收 null 抛 NullPointerException，不能用“定长”和“不可修改”互相替代。

## 总结点

1. 定长列表仍可 set。
2. 基本类型数组可能只算一项。
