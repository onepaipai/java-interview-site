<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 它通常使用共享 ForkJoinPool，阻塞调用会占用公共工作线程。
2. 在线服务优先显式管理执行器，并用实际负载验证收益。

## 参考分析

1. 拆分、合并和调度都有成本。
2. 多个请求共享 ForkJoinPool 会相互争用，单次更快不等于在线吞吐更高。

## 案例

1. 场景（教学示例）：商品接口并行调用三个慢外部服务。
2. 处理：改用有界独立执行器和整体截止时间，对比并发下 P99 与排队量。

3. 验证：慢服务不占满公共池；超过预算及时返回可解释的部分结果。

## 总结点

1. 并行有调度成本。
2. 阻塞任务做隔离。
