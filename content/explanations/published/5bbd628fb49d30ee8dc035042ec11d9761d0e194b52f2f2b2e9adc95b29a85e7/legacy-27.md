<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 典型流程是类检查、分配、零值初始化、对象头设置与构造初始化。
2. HotSpot 可使用 TLAB 等方式分配，JIT 可能消除不逃逸对象分配。
3. 布局通常含对象头、实例字段和对齐；具体大小依赖 JDK 及指针配置。

## 参考分析

1. 逃逸分析不保证每次都做标量替换。
2. 对象头和对齐随运行时实现变化，不能把固定字节数当规范。

## 案例

1. 场景（教学示例）：大量短命 DTO 导致分配率升高。
2. 处理：用分配剖析定位调用点，比较对象数量与实际堆分配；记录 JDK 和压缩指针参数。

3. 验证：优化后分配可下降但语义不变；不得用估算布局代替目标环境测量。

## 总结点

1. 分配看运行结果。
2. 内存按区域预算。
