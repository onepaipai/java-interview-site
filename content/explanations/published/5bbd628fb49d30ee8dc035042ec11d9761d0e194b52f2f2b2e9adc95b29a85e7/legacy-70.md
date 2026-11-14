<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

1. thenApply 转值，thenCompose 展开后续异步结果，独立任务按依赖组合。
2. 异常显式处理并汇总；allOf 不自动取消所有兄弟任务。
3. 使用明确执行器、整体截止时间和取消协议，避免公共池阻塞。

## 参考分析

1. allOf 不会自动完成完整的兄弟取消。
2. 取消 Future 不等于停止远程工作，过早释放许可会低估真实在途量。

## 案例

1. 场景（教学示例）：三路查询两路成功、一路超时。
2. 处理：汇总独立结果并标注缺失；取消向下传播，等资源真正停止或隔离后再释放占用。

3. 验证：总耗时受预算约束；停机先停接单再排空，外部写入按幂等键核对。

## 总结点

1. 超时要向下取消。
2. 资源结束才释放。
