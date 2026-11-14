<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 堆预算来自存活集、分配峰值与回收余量，不能只套固定倍数。
2. Xms 与 Xmx 是否相同按部署和启动目标决定，容器须留堆外预算。
3. 启用合适 GC 日志和受控诊断，保留原参数与回退门槛。

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
