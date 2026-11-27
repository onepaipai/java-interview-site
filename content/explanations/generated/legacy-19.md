<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Thread.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银异步任务沙盘:导出报表任务异步执行——四种创建方式(Thread/Runnable/Callable/线程池)的演进与 start/run 的一字之差(开新线程 vs 当前线程普通方法调用)。

1. 四种方式:继承 Thread(run 无返回值,不能抛受检异常);实现 Runnable(任务与线程解耦,推荐);Callable+FutureTask(有返回值+可抛异常,Future.get 阻塞取结果);线程池 ThreadPoolExecutor 提交(生产标准,复用线程,第 23 题)——本质都是构造 Thread 对象执行任务。
2. start 与 run:start() 开启新线程并由 JVM 调新线程的 run(一次调用,重复 start 抛 IllegalThreadStateException);直接调 run()=当前线程普通方法调用(没有并发,异步变同步)——一字之差=并发语义全失。
3. 生产实践:业务线程一律走线程池(不用裸 new Thread——无复用无上限);Runnable/Callable 作为任务对象提交——任务的返回值/异常处理策略明确(Future.get 要设超时)。

## 参考分析

### 第二步扩展① 机制:start 做了什么

- start()→JVM 调用 OS 创建内核线程(分配栈)→新线程调度执行 run()。
- run() 只是对象方法调用——线程体内跑的是 run 的字节码,谁调 run 谁执行。
- start 后线程进入 RUNNABLE(第 18 题状态机)。
- isAlive() 判断是否已 start 未终止。

### 第二步扩展② 反例:创建方式的两种事故

- 事故一:高并发下 new Thread——每次建线程(1MB 栈+内核开销),流量峰值线程爆炸 OOM。
- 修复=线程池(第 24 题 Executors 陷阱)。
- 事故二:future.get() 无超时——任务挂死调用方永久阻塞。
- 修复=get(timeout,unit)+超时策略(降级/取消)。

### 第二步扩展③ 取舍:Runnable vs Callable

- Runnable:无返回值,异常只能内部消化(线程池场景被吞,UncaughtExceptionHandler 兜底)。
- Callable:返回值+受检异常可抛(FutureTask 捕获后 get 时重抛)——需要结果/异常感知用 Callable。
- CompletableFuture 更现代(组合/回调,不用阻塞 get)。

## 案例

### 第三步发散·验证与推演 验证:start/run 的实测走查

- 验证:线程名断言(new Thread(task, 'worker') start 后打印 currentThread().getName()=worker。
- 直接调 run() 打印的是 main——一字之差立现)。
- 重复 start 断言(抛 IllegalThreadStateException)。
- Callable 断言(Future.get 拿到返回值+异常重抛)。
- 线程池提交断言(池线程名 pool-N-thread-M)——四组固化创建语义,本机可复跑。

### 第三步发散·发散要点 追问链:创建三刀

- **追问①·Thread 与 Runnable 的解耦**：任务对象化(可复用/可排队/可取消)——线程池只认任务不认线程
- **追问②·Future.get 的阻塞陷阱**：无超时永久挂;CompletableFuture.orTimeout(JDK9+)
- **追问③·虚拟线程(JDK21)**：Thread.ofVirtual,百万级轻量线程——阻塞挂起零内核切换,IO 密集场景替代池化

## 总结点

1. 四种创建,生产走线程池
2. start 开新线程,run 当前线程调用
3. Callable 带返回值,Future.get 要超时
