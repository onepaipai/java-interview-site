<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ExecutorService.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/Future.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：同一个会抛运行时异常的任务分别用 execute 与 submit 提交到固定线程池，观察控制台输出、Future.get 的行为与监控里的异常上报差异。

1. execute 的任务异常直接交给线程的 UncaughtExceptionHandler，默认打印堆栈；submit 的异常被捕获并存进 Future，不调用任何处理器。
2. submit 不调 Future.get（或 get 不抛）就永远看不到异常：任务静默失败，日志一片干净，问题却真实存在。
3. 修复路径按层次选：关键异步任务必须检查 Future；或统一用 execute 风格包装；或给池设置 afterExecute 钩子统一上报。

## 参考分析

### 机制：异常的去向由提交方式决定

execute 走 Thread 的错误处理出口，异常沿着"线程未捕获异常"路径被记录，类比车间事故当场敲警报。submit 把任务包成 FutureTask：run 内部 catch 一切 Throwable 并存为 outcome，get 时再包成 ExecutionException 抛出——警报被存进了档案柜，没人调阅就无声无息。这不是缺陷而是语义：Future 的契约就是"结果与异常都通过 get 交付"。

### 故障推演：定时报表为什么连续三个月没产出

定时任务用 submit 提交，某天上游数据结构变化抛 NPE，Future 无人 get，每轮调度静默失败。日志只有打印异常的 execute 任务在响，submit 的失败毫无痕迹；直到月终对账才发现报表缺失。修复组合：get 检查 + afterExecute 里读取 FutureTask 的异常 + 告警接入，三选一都好于"以为没异常"。

### 取舍：submit 的价值在于要结果

需要返回值、需要 join、需要超时控制时 submit 是正确工具，前提是"一定消费 Future"。CompletableFuture 的异常语义同样遵循"有依赖者才传播"：不加 exceptionally/handle 就无人感知。统一团队约定比争论优劣更重要：要么强制 Future 必须消费，要么禁用裸 submit、统一异步封装。

## 案例

### 对照操作：同一异常的三种去向

教学验证：任务抛 ArithmeticException，分别 execute、submit 后不 get、submit 后 get。预期：execute 打印堆栈（默认 handler）；submit 静默，池与日志无异常记录；get 抛 ExecutionException 且 cause 为原异常。再把线程工厂设置 UncaughtExceptionHandler，确认 execute 路径能接入统一上报。代码可复跑，行为稳定。

### 追问：异常发生在 thenApply 链中间去哪了

CompletableFuture 链中异常向下游传递，链上任何环节没有 exceptionally/handle 且无人 join，异常就此沉没；join 时抛 CompletionException 包裹原异常。与 submit 相同的纪律：每条异步链要么有显式异常终点，要么在根上统一 whenComplete 记录。

## 总结点

1. execute 敲警报，submit 存档案
2. Future 不消费，异常就沉没
3. 每条异步链都要有异常终点
