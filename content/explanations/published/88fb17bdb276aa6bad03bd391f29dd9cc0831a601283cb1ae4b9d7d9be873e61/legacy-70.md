<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/CompletableFuture.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银并行调用沙盘:并行调三个下游(订单/库存/物流)→汇总结果——CompletableFuture 的编排(supplyAsync→thenCombine→allOf)+异常处理(exceptionally/handle)+超时(orTimeout)。

1. 编排模式:thenApply(转换)/thenCompose(扁平化,避免嵌套 Future)/thenCombine(合并两个结果)/allOf(等待全部)/anyOf(任意完成)——编排的"依赖图":A→B→C 串行,A→B+C 并行合并;allOf 后 get 各 Future(等待全部完成)。
2. 异常处理:exceptionally(异常时降级返回默认值)、handle(无论成功失败都处理——类似 finally)、whenComplete(观察但不改变结果)——异常传播:一个环节异常→后续环节跳过(直到 exceptionally/handle 拦截);未处理的异常在 join 时抛 CompletionException。
3. 超时控制:orTimeout(timeout, unit)(JDK 9+——超时后 exceptionally 异常)或 completeOnTimeout(default, timeout)(超时返回默认值)——每个环节设超时(第 12 题超时预算)+整体 deadline(第 12 题)。

## 参考分析

### 第二步扩展① 机制:CompletableFuture 的"回调地狱"与编排

- CompletableFuture 用回调(thenApply/thenCompose)替代回调地狱(嵌套匿名类)——链式调用类似 Stream(声明式)。
- 编排的核心=依赖关系建模(哪些可并行/哪些有依赖/哪里合并)——类比电路:串联(thenCompose)与并联(thenCombine+allOf)。

### 第二步扩展② 反例:CompletableFuture 的两种事故

- 事故一:默认线程池 ForkJoinPool.commonPool 被占用——IO 操作用 commonPool(线程少,阻塞 IO 占满)→其他并行流也卡(第 24 题并发进阶)。
- 修复=自定义线程池(supplyAsync(supplier, executor))。
- 事故二:异常被吞——链中某环节异常未处理→后续环节不执行→结果为 null(无报错)。
- 修复=链尾 handle 或 exceptionally(确保异常显式处理)。

### 第二步扩展③ 取舍:CompletableFuture vs 结构化并发(JDK 21)

- CompletableFuture:灵活(自由编排)+复杂(手动管理取消/超时/异常)。
- 结构化并发(StructuredTaskScope,JDK 21 预览):作用域管理(子任务生命周期对齐)+取消传播(自动)+错误聚合(统一收集)——结构化并发是"框架级约束",CompletableFuture 是"自由编排"(并发进阶 29 题)。

## 案例

### 第三步发散·验证与推演 验证:CompletableFuture 的走查核对

- 验证:编排断言(并行三下游→allOf 等待→合并结果)。
- 异常处理断言(exceptionally 降级返回默认值——链不断)。
- 超时断言(orTimeout 超时触发降级)。
- 线程池断言(自定义 executor 而非 commonPool)。
- 验证:编排+异常+超时的断言可程序化(mock 下游延迟/失败)。
- SD1 延迟任务实验可复用。

### 第三步发散·追问扩展 追问链:CF 三刀

- **Q1：thenApply vs thenCompose?**
  - 答：thenApply 返回值直接包装(返回 T→CompletableFuture<T>);thenCompose 返回 CompletableFuture(扁平化,避免嵌套)——flatMap vs map 的函数式类比。
- **Q2：取消 CompletableFuture?**
  - 答：cancel 不中断正在执行的任务(只标记为 cancelled)——真正取消需要 interrupt(第 16 题断连取消)+任务内响应中断。
- **Q3：CompletableFuture 与虚拟线程?**
  - 答：虚拟线程(JDK 21)让"同步阻塞写法"获得"异步性能"——CompletableFuture 的异步复杂度(回调链)在虚拟线程下可用同步写法替代(第 69 题虚拟线程)。

## 总结点

1. 编排:thenApply/Compose/Combine/allOf
2. 异常:exceptionally/handle 显式处理
3. 超时:orTimeout 每环节设预算
