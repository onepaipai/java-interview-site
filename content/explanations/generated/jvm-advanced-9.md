<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 少量较长暂停可显著影响尾延迟，并引起请求排队和超时放大。
2. 应关联暂停时间线与请求分布，而非只看总占比。

## 参考分析

1. Humongous 对象占连续区域且可能增加压力。
2. 增大堆或改参数不能替代降低无界分配和并发峰值。

## 案例

1. 场景（教学示例）：批量 JSON 导出导致 G1 晋升与暂停上升。
2. 处理：对齐暂停事件、分配率、巨型对象和业务并发；限制批次与在途量后再评估 Region 参数。

3. 验证：同等流量下 P99 和回收余量改善；不能把相关性直接当 GC 根因。

## 总结点

1. 暂停目标不是承诺。
2. 分配存活决定压力。
