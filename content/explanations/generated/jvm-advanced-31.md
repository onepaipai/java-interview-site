<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 旧参数可能失效、改变含义或覆盖新版自适应策略，导致难以归因。
2. 保留有证据的必要参数并记录版本和验证结果。

## 参考分析

1. NUMA、透明大页等影响依赖硬件与操作系统，不能统一开关。
2. 诊断本身也可能制造暂停与 I/O。

## 案例

1. 场景（教学示例）：一次调优同时改了十几个参数，收益无法归因。
2. 处理：回到基线分组实验，规定 P99、吞吐、RSS 和错误率门槛，灰度后才扩面。

3. 验证：报告可复现且能回退；没有业务收益的参数不长期保留。

## 总结点

1. 调优先定基线。
2. 收益必须可归因。
