<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 对象不可达与页归还操作系统不是同一事件，堆和本地分配器可能保留空间复用。
2. 应看存活集与长期趋势，而非只盯即时 RSS。

## 参考分析

1. 对象释放不意味着操作系统 RSS 立刻下降。
2. OOMKilled 可能没有 JVM 异常日志。
3. 不同区域有不同回收机制。

## 案例

1. 场景（教学示例）：容器内堆稳定但 RSS 增长到限额。
2. 处理：采集 NMT 基线差分、直接缓冲指标、线程数和系统映射，检查内核终止记录。

3. 验证：能指出主要区域；只在证据支持时调整 Xmx，保留系统余量。

## 总结点

1. 堆外也占限额。
2. RSS 不等于存活堆。
