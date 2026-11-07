<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 冷缓存、连接建立与 JIT 预热会使新实例处理能力不足，流量分配过快可放大尾延迟。
2. 使用就绪和渐进接流验证容量。

## 参考分析

1. 多态变化会破坏既有假设并触发去优化。
2. 字符串去重减少重复内容存储，不等于缓存能减少业务计算。

## 案例

1. 场景（教学示例）：新增一种策略实现后新副本延迟升高。
2. 处理：用 JFR 关联编译、类加载与分配事件，比较真实策略分布，逐步预热且限制流量。

3. 验证：确认变化源自编译或分配后再优化；禁止以固定内联阈值推导业务收益。

## 总结点

1. 优化依赖真实分布。
2. 预热也需容量预算。
