<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.12.4.5)

</details>

## 参考回答

1. Java 始终值传递；对象参数复制的是引用值，不是对象本身。
2. 通过复制的引用可修改同一对象；给形参重新赋值不会改变调用方变量。
3. 要隔离对象内容变化，应按共享边界复制数据，不能只靠 final 修饰引用。

## 参考分析

1. 调用方引用和形参初始指向同一个对象，所以对象内部变更双方都可见。
2. 形参重新指向新对象只改变本次调用中的局部变量，调用方引用仍指向旧对象。
3. 浅拷贝只复制一层结构，嵌套可变对象是否隔离需要另行设计。

## 案例

1. 场景（教学示例）：方法先修改列表，再给形参换一个新列表。

2. Java 17 演示：预期调用方列表是 [A,B]，不包含新列表中的 C。

```java
class PassingCase {
    static void edit(java.util.List<String> items) {
        items.add("B");
        items = new java.util.ArrayList<>();
        items.add("C");
    }
    public static void main(String[] args) {
        var items = new java.util.ArrayList<>(java.util.List.of("A"));
        edit(items);
        System.out.println(items); // [A, B]
    }
}
```

3. 验证：删除 add B 后调用方仍为 [A]；保留形参重新赋值不会把 C 带回调用方。

## 总结点

1. 引用值被复制，对象仍共享。
2. 改对象可见，重绑形参无效。
