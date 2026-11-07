<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/integration/scheduling.html#scheduling-annotation-support-async)

</details>

## 参考回答

1. 返回 Future 或 CompletableFuture 时，调用方必须观察异常完成；忽略返回值就可能漏掉失败。
2. void 异步方法的异常无法经返回值交给调用方，应配置 AsyncUncaughtExceptionHandler 并记录任务身份。
3. 配置执行器、拒绝策略和观测；任务提交成功不代表业务执行成功，内存异步任务也不提供重启恢复。

## 案例

1. 场景（教学示例）：两个经代理调用的 @Async 方法均抛 IllegalStateException，一个返回 CompletableFuture，另一个返回 void。

2. 处理：前者用 whenComplete 或 get/join 观察失败；后者在异常处理器中记录异常、方法和脱敏参数，执行器拒绝另行处理。

3. 预期：两条失败路径都产生可关联的失败记录；同步调用点不能用 try/catch 捕获已经返回后的任务异常。关键通知如需恢复，另加持久任务协议。

## 总结点

1. 有返回值就观察异常结果。
2. void 异步异常交给处理器。
