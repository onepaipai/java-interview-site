<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 堆存放大多数对象；线程栈存栈帧、局部变量和操作数。
2. 程序计数器跟踪线程执行位置；本地方法有对应栈支持。
3. 方法区是规范概念，HotSpot 元空间存类元数据；堆外也计入进程内存。

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
