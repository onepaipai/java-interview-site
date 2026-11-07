<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 重载由编译期参数类型选择签名。
2. 重写在签名确定后按运行时接收者分派。
3. 用 Override 检查误写；静态方法隐藏与实例重写分清。

## 参考分析

1. 父类引用不会改变对象类型。
2. 参数看起来相同但签名不同，可能只是新增重载。

## 案例

1. 场景（教学示例）：Animal 引用持有 Dog 对象。
2. 处理：分别调用重载的 inspect(Animal) 和重写的 speak()，记录所选实现。

3. 验证：重载选 Animal 版本，speak 执行 Dog 实现；加 Override 防签名误写。

## 总结点

1. 重载看声明。
2. 重写看对象。
