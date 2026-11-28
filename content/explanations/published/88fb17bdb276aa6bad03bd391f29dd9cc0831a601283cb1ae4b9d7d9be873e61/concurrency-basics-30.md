<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ThreadLocal.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：请求入口把 traceId 放进 MDC（底层 ThreadLocal），业务方法用 CompletableFuture.supplyAsync 在池线程执行查询，日志不再带 traceId。推演丢失路径与装饰器恢复方案，对照手动传参与 TTL。

1. MDC 基于 ThreadLocal，值只存在于"写下它的那个线程"；supplyAsync 把任务交给池线程执行，ThreadLocal 不会跟着任务走，日志上下文就此丢失。
2. 恢复的标准做法是提交时捕获 MDC 上下文快照，任务 run 前设置、结束 finally 清除；统一封装在自定义 Executor 或任务装饰器里，不让业务代码各自为战。
3. 边界要分清：线程池复用导致的是"串号"（上一任务残留），异步切换导致的是"丢失"（新线程没有值）；两者的修复方向相反，混谈会改错代码。

## 参考分析

### 第二步扩展① 机制：上下文住在线程里，任务不带行李

- MDC 类比酒店房卡：绑定房间（线程），不绑定客人行程（任务）。
- 工作线程换人入住不换房卡，池线程执行新任务时读到的还是上一个任务的痕迹。
- 而全新池线程的房卡是空白——traceId 无处可读。
- 第 11 题的串号与本题的丢失是同一根因（ThreadLocal 跟线程走）的两种表象，修复动作一个靠"清场"、一个靠"随身携带"。

### 第二步扩展② 故障推演：链路追踪断在哪一跳

- 入口日志有 traceId，异步段日志全无。
- 调用链系统按 traceId 聚合时异步分支变成孤岛，排障时只能靠时间戳与接口名猜。
- 更糟的是定时任务里再提交异步，多层叠加后连"丢失"都变得不一致——部分线程恰好复用自带上下文的请求线程，日志时有时无。
- 统一装饰器让行为确定化，是可观测性的前提。

### 第二步扩展③ 取舍：装饰器、显式参数与 TTL

- 装饰器（包装 Runnable/Callable，提交入口统一捕获）改动小、语义直白，适合存量项目。
- 显式把 traceId 作为参数传入最干净，适合新模块与领域层。
- TTL 适合大量使用线程池且不愿逐点改造的场景，但要理解其字节码/包装机制与清理责任。
- 任何方案都要保证 finally 恢复，否则丢失问题会变成串号问题。

## 案例

### 第三步发散·验证与推演 对照操作：装饰器前后的日志对比

- 教学验证：入口 set MDC traceId，异步任务打印日志。
- 无装饰预期日志无 traceId。
- 用装饰器捕获 MDC.getCopyOfContextMap、run 前 set、finally 清理后，同一任务日志带完整 traceId。
- 再连续执行两个不同 traceId 的任务，验证 finally 清理防止串号。
- 代码可复跑，日志格式按 logback MDC 配置。

### 第三步发散·追问① 追问：为什么装饰所有提交入口比装饰个别任务可靠

- 漏装饰的提交点就是新的断链点，而且出现在最不起眼的工具类里。
- 把装饰收敛到"唯一创建线程池的工厂"（所有池从工厂领取，工厂自动包装），业务代码无从绕过。
- 评审规则相应简化：任何手写 new ThreadPoolExecutor 或 Executors.newXxx 都要求改走工厂。

## 总结点

1. 上下文住线程，任务不带行李
2. 提交拍快照，运行再恢复，finally 清场
3. 装饰收口在池工厂，漏一处断一链
