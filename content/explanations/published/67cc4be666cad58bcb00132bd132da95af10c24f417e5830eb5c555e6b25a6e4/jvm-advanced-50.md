<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 报告明确业务问题、负载及目标：记录 JDK、容器限制、收集器、参数和相同流量口径的基线。
2. 每次变更关联假设和证据，同时比较延迟分位、吞吐、错误率、分配及内存；收益不能只看平均 GC 暂停。
3. 列出成本、失败样本、适用边界和回退步骤；他人应能按脚本、版本及原始记录复现实验。

## 案例

1. 场景（教学示例）：一次同时改堆大小和十个 GC 参数，P99 变好但流量也下降了。

2. 处理：恢复基线，在固定资源与同一回放集上分组变更；记录预热、重复轮次、长尾和失败率，再按门槛灰度。

3. 预期：能分辨参数收益、资源增加和流量差异；无法归因的改动不写成优化结论，回退后也应能恢复原基线。

## 总结点

1. 调优结论必须可归因。
2. 同口径比较收益和成本。
