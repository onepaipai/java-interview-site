<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 预先定义延迟、错误率、CPU 和内存等阈值，确保能回退镜像及参数。
2. 保留可比较基线，避免异常后才临时寻找判断标准。

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
