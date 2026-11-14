<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

1. 公平锁减少插队但可能损失吞吐，不保证业务完成顺序。
2. 读写锁适合读写比和临界区成本匹配的负载，短读未必有收益。
3. StampedLock 乐观读须 validate，且不可重入，回调嵌套要谨慎。

## 参考分析

1. 乐观读可能读到不一致字段。
2. StampedLock 不可重入且不适合嵌套调用。
3. 热点单键仍会串行。

## 案例

1. 场景（教学示例）：两个账户分属不同锁段并发生双向转账。
2. 处理：按段编号统一加锁，热点单独限流；读坐标先读字段再 validate。

3. 验证：转账不死锁且守恒；校验失败走一致读，不能返回半份快照。

## 总结点

1. 跨段顺序固定。
2. 乐观读必须验。
