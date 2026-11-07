<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/CompletableFuture.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：订单服务按"查订单、再查该订单物流、再算运费"串链。查物流一步返回 CompletableFuture，比较 thenApply 与 thenCompose 得到的类型与语义差异，推演嵌套 Future 带来的等待错位。

1. thenApply 用同步函数转换结果值，函数返回什么阶段就装什么，适合"拿到值再算一步"。
2. thenCompose 用于转换结果"还是异步"的场景：函数返回 CompletableFuture，框架把两层压成一层，避免出现 Future 套 Future。
3. 误用 thenCompose 处理同步转换或 thenApply 处理异步函数，都会得到错误类型或多余的嵌套，后者会让调用方拿到"还没真正完成"的阶段。

## 参考分析

### 机制：map 与 flatMap 的异步版

thenApply 类比把收到的快递当场拆开加工（同步一步）；thenCompose 类比收到的箱子本身又是一张取件单（异步任务），必须交给驿站继续调度。Optional.map 与 flatMap 的关系完全同构：转换函数"返回值"还是"返回同样形状的容器"决定了用哪个。类型层面一目了然：thenApply 得 CompletableFuture<U>，thenCompose 在函数返回 CompletableFuture<U> 时同样得到 CompletableFuture<U>，而不是两层嵌套。

### 反例：嵌套 Future 的等待错位

用 thenApply(orders -> logisticsService.query(orders))，得到的阶段在"查到订单"时即完成，内部包裹的物流 Future 还在跑；调用方以为整体完成去读结果，实际要再 get 一次内层。更隐蔽的是错误传播断档：内层 Future 的异常不会被外层链的 exceptionally 捕获，因为它根本不在同一完成链上。结果：异常终点失守、超时预算错位。

### 取舍：转换、编排与并行组合各归其位

同步加工用 thenApply；下一跳异步用 thenCompose；多路并行再汇合用 allOf 加 thenApply 组合；需要"任一完成"用 anyOf。链上还可组合 thenApplyAsync 指定执行线程，但要明确切换线程的动机（避免在 IO 线程做重计算），默认继承上一阶段的完成线程，语义先于性能。

## 案例

### 对照操作：两种转换的类型与完成时机

教学验证：构造两跳任务（各 200 毫秒），A 链 thenApply 返回内层 Future，记录外层完成时间约 200 毫秒且需二次 get；B 链 thenCompose 压平，单次 get 约 400 毫秒拿到最终值。再在第二跳注入异常：预期 A 链外层 exceptionally 捕不到，B 链可捕获。代码可复跑，时序与语义都与类文档一致。

### 追问：thenCompose 的函数里还能再拆线程吗

可以但要克制：compose 的函数运行在上一阶段的完成线程上，若在其中再 supplyAsync 切线程，要清楚目的（隔离慢操作）与代价（上下文传递、MDC 丢失）。原则是链的形状表达业务依赖关系，线程切换只由资源隔离需求决定，不要为了"看起来更异步"而切。

## 总结点

1. 同步加工 apply，下一跳异步 compose
2. Future 套 Future 是等待错位
3. 一条链一个完成态，异常才能传到底
