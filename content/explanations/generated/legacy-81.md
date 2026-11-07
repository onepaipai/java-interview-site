<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 先对齐进程 CPU、流量与容器节流，确定是否真实耗算力。
2. 定位热线程，结合线程栈和 JFR 或采样剖析。
3. 区分业务循环、GC、正则和锁竞争；取多次证据后做最小修复。

## 参考分析

1. CPU 采样看不到大量休眠等待。
2. 单次栈存在采样偏差。
3. GC 正常也可能因池排队或节流造成卡顿。

## 案例

1. 场景（教学示例）：请求耗时升高且进程 CPU 未满。
2. 处理：比较 CPU 与墙钟剖析，关联 throttling、排队年龄与 safepoint 日志。

3. 验证：能够区分算力不足、锁等待和外部阻塞；采集限制时间与开销。

## 总结点

1. 慢不一定耗 CPU。
2. 等待需要墙钟剖析。
