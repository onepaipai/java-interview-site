<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

1. CountDownLatch 一次性等待计数归零。
2. CyclicBarrier 让固定参与者按阶段会合，破障与超时需处理。
3. Semaphore 限制并发占用，不直接保证 QPS，许可在 finally 释放。

## 参考分析

1. 并发限制不是固定 QPS。
2. 异常未计数或漏释放会让后续请求永久等待。

## 案例

1. 场景（教学示例）：最多三个任务访问下游，主线程等待全部完成。
2. 处理：先限时获取许可，任务结束释放并 countDown；失败结果单独记录。

3. 验证：并发不超过三，成功失败均能结束等待；速率限制另加令牌桶。

## 总结点

1. 并发不是速率。
2. 释放覆盖失败路。
