<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.27.2)

</details>

## 参考回答

1. Lambda 捕获的外部局部变量必须是 final 或有效 final，即初始化后不再重新赋值。
2. 捕获引用时固定的是引用值；所指对象的内容仍可改变，不能据此保证线程安全。

## 参考分析

1. 局部变量可能早于 Lambda 的后续执行结束，语言禁止捕获不断变化的局部变量。
2. 有效 final 允许省略 final 关键字；之后出现重新赋值仍会导致编译错误。
3. 字段不受这条局部变量限制，但字段和可变对象的并发访问需要另外同步。

## 案例

1. 场景（教学示例）：创建打印任务后，又给被捕获的局部变量赋值。

2. 错误片段：n 不再有效 final，预期编译失败，而不是执行时读取新值。

```java
int n = 1;
Runnable task = () -> System.out.println(n);
n++; // 编译错误：捕获的局部变量不再有效 final
```

3. 对照：引用不重赋，对象内容可变；以下方法体片段预期打印 AB。

```java
var text = new StringBuilder("A");
Runnable task = () -> System.out.println(text);
text.append("B");
task.run(); // AB；不代表多线程访问安全
```

## 总结点

1. 捕获局部变量，不能再重赋。
2. 引用不重赋，对象仍可变。
