<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/tutorial/java/generics/wildcardGuidelines.html)

</details>

## 参考回答

1. 源只供读取时用 ? extends T，目标只接收 T 时用 ? super T，让调用方保留合适的子类型和父类型。
2. 需要在同一容器中读取并写回同一元素类型时，通常声明明确的 T；通配符不能证明任意两种捕获类型相同。
3. extends 不能安全添加任意 T，super 读取时只能静态视作 Object；不要用原始类型绕过编译器。

## 案例

1. 场景（教学示例）：把 List<Integer> 复制到 List<Number>，同时让接口适用于其他兼容类型。

2. 核心 API：两个参数通过同一个 T 建立关系，源生产、目标消费。

```java
static <T> void copy(java.util.List<? extends T> source,
                     java.util.List<? super T> target) {
    for (T value : source) target.add(value);
}
// 方法体中：
var from = java.util.List.of(1, 2);
var to = new java.util.ArrayList<Number>();
copy(from, to); // 预期 to 为 [1, 2]
```

3. 边界验证：将 List<String> 复制到 List<Number> 应编译失败；List<? extends Number> 不允许直接 add(1)，不能因运行时恰好装整数就放宽类型。

## 总结点

1. 读 extends，写 super。
2. 同一类型关系交给类型参数。
