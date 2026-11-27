<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/CompletableFuture.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：报表服务把"取数、聚合、渲染"串成 CompletableFuture 链，中间取数抛出异常。推演无异常终点的链路静默失败、exceptionally 与 handle 的取舍、以及 whenComplete 不改变结果的特点。

1. CompletableFuture 的异常沿链传递：上游异常会让下游依赖以 CompletionException 形式完成，链上没有任何 exceptionally/handle 且无人 join 时，异常就此沉没。
2. whenComplete 只旁观不接管：记录日志可以，想"吞掉异常换成默认值"必须用 handle 或 exceptionally。
3. 纪律与线程池异常一致：每条异步链要有显式异常终点；统一入口可在根上挂 whenComplete 做监控，业务分支再按需降级。

## 参考分析

### 第二步扩展① 机制：异常是特殊的完成状态

- CompletableFuture 有三种完成态：正常值、异常、取消。
- 异常完成后，后续的 thenApply 等转换阶段被跳过，异常向下游流转。
- 类比传送带上贴了"次品"标签的盒子，后面的加工台看到标签直接放行，直到有人处理标签（exceptionally）或质检台收货（join/get 抛出）。
- 没人处理、也没人收货，盒子就停在传送带尽头——程序看起来一切正常。

### 第二步扩展② 反例：三个静默失败的写法

- 写法一：supplyAsync 抛异常，只有 thenApply 接着，无 join——异常沉没。
- 写法二：whenComplete 记日志后返回原 future，调用方以为"记录过就没事"，实际结果态仍是异常，后续依赖依旧失败，且日志与业务结果脱节。
- 写法三：在 thenApply 里 try/catch 吞掉返回 null，下游拿到 null 再抛 NPE，原始异常线索丢失。
- 每个反例的共同点是"缺少一个明确的异常终点"。

### 第二步扩展③ 取舍：exceptionally、handle 与统一出口

- exceptionally 只处理异常，正常值原样通过。
- handle 两态都进，适合统一包装响应体。
- 恢复策略要谨慎：把所有异常都转成默认值会掩盖系统故障，只对明确可降级的类型（超时、可重试）降级，其余快速失败并告警。
- 工程惯例：链的根上挂 whenComplete 做指标与日志，业务语义层用 exceptionally 提供降级，最终暴露给调用方前完成转换。

## 案例

### 第三步发散·验证与推演 对照操作：链路异常的三种终点对比

- 教学验证：同一取数异常分别构造三条链——无终点（预期完全静默）、whenComplete 日志加 exceptionally 返回空报表（预期日志有痕、接口 200 返回空数据）、handle 包装错误响应（预期接口返回业务错误码）。
- 再验证 join 抛出的类型是 CompletionException、cause 才是原始异常。
- 代码可复跑，行为与类文档语义一致。

### 第三步发散·追问① 追问：异步线程里的异常会中断线程池吗

- 不会。
- CompletableFuture 把任务包成 AsyncSupply，异常被捕获写入完成态，工作线程安然无恙——这与 execute 的"未捕获异常路径"完全不同。
- 好处是池不被异常污染，风险是再也没有"线程未捕获异常处理器"这道兜底网，漏写终点时不会留下任何系统级痕迹，因此监控必须主动埋在链上。

## 总结点

1. 异常贴标签，终点要显式
2. whenComplete 只旁观，接管用 handle
3. join 抛的是包装，cause 才是真相
