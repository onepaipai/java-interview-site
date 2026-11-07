<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 实现和限制会随版本演进，不能把某版本的监视器行为推广到所有版本。
2. 应查看目标运行时文档与 JFR 事件验证。

## 参考分析

1. JDK 21 与后续版本对 synchronized 固定问题的处理不同。
2. 只数线程数量不能说明吞吐瓶颈。

## 案例

1. 场景（教学示例）：虚拟线程迁移后在特定锁内阻塞。
2. 处理：在目标 JDK 采集固定相关事件与栈，减少长临界区并约束下游连接并发。

3. 验证：压测确认载体线程不被长期占用；升级评估记录具体运行时版本。

## 总结点

1. 虚拟线程看版本。
2. 固定问题靠事件定位。
