<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 通过更多并发工作降低部分暂停影响，但需要 CPU、内存余量与合适负载。
2. 具体代际模式及实现能力应按目标 JDK 验证。

## 参考分析

1. 低暂停通常要付出并发 CPU 或内存成本。
2. CMS 已在较新 JDK 移除，历史参数不能直接搬到 Java 17。

## 案例

1. 场景（教学示例）：服务计划从 Java 17 升级并试用低暂停 GC。
2. 处理：固定流量和容器资源，分别测 G1 与目标版本 ZGC 的吞吐、P99、RSS 和失败率。

3. 验证：只有满足业务收益且资源可承受才切换；保留旧运行时和参数回退。

## 总结点

1. GC 选型看三项指标。
2. 升级参数重新验证。
