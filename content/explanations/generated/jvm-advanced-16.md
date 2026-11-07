<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 NMT 指南 · 1](https://docs.oracle.com/en/java/javase/17/vm/native-memory-tracking.html)

</details>

## 参考回答

1. 跟踪覆盖范围依 JVM 能力与分配来源而定，第三方本地库和系统行为可能不完整体现。
2. 需结合进程映射与操作系统工具分析。

## 参考分析

1. NMT 追踪特定 HotSpot 本地分配，不等于进程全部内存。
2. 本地库、映射、驻留与分配器行为会影响 RSS，reserved、committed、resident 也不是同一口径。

## 案例

1. 场景（教学示例）：堆与 NMT committed 稳定，但进程 RSS 持续增长。

2. 处理：启动时配置合适 NMT 级别，取基线差分，并与系统映射、容器限制及本地库分配一起分析。

3. 验证：报告能指出覆盖范围和未解释部分；不把 NMT 总和与 RSS 差值直接认定为泄漏。

## 总结点

1. NMT 不是全部 RSS。
2. 先对齐内存统计口径。
