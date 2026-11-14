<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银并行沙盘:等待 N 个子任务完成(CountDownLatch)、N 个线程互相等( CyclicBarrier)、限制并发数(Semaphore)——三个并发工具的语义差异与选型。

1. CountDownLatch:一次性倒计数(countDown→0 后所有 await 放行)——"等 N 个任务完成再继续"(主任务等待子任务);不可重置(用完即弃);AQS 共享模式(state=count,countDown 递减,await 等到 0)。
2. CyclicBarrier:可循环的屏障(N 个线程互相等,全部到齐后一起继续)——"N 个线程互相等到达同一屏障点";可重置(循环使用)+回调动作(屏障打开时执行);broken(一个线程超时/中断→全部 broken)。
3. Semaphore:信号量(permits 计数,acquire 消耗/release 释放)——"限制并发数"(N 个许可,acquire 获取 release 归还);公平/非公平模式(排队 vs 插队);一次性 vs 可重用:CountDownLatch 一次性,CyclicBarrier/Semaphore 可重用。

## 参考分析

### 机制:三工具的语义差异

CountDownLatch=倒计时门闩(等 N 件事完成);CyclicBarrier=集合点(N 个线程互相等);Semaphore=限流阀(N 个许可控制并发)——核心区别=谁是"等待的发起者":Latch=主任务等子任务;Barrier=线程互相等;Semaphore=限制进入数。

### 反例:并发工具的两种事故

事故一:CountDownLatch 计数不匹配——countDown 次数<count→await 永远阻塞;修复=计数与任务数精确匹配(或 tryAwait 带超时)。事故二:Semaphore 泄漏——acquire 后异常路径未 release(许可泄漏→可用许可减少);修复=finally{release} 或 tryAcquire+finally 模式。

### 取舍:CompletableFuture vs CountDownLatch

CompletableFuture:异步编排(thenCompose/thenCombine 链式)+异常处理(exceptionally)+回调非阻塞;CountDownLatch:简单等待(计数到零)+阻塞式——简单等待场景 Latch 够用;复杂编排(依赖链/异常传播)用 CompletableFuture(并发进阶 29 题结构化并发)。

## 案例

### 验证:并发工具的走查核对

验证:CountDownLatch 断言(N 个 countDown→await 放行);CyclicBarrier 断言(N 线程到齐→屏障打开→可重用);Semaphore 断言(N permits→acquire 获取/release 释放→超限阻塞);公平断言(Semaphore 公平模式 FIFO)。验证:三工具的行为断言可程序化(并发测试)。

### 追问链:工具三刀

一刀:"Semaphore 的 acquire 与 tryAcquire?"——acquire 阻塞直到有许可;tryAcquire 立即返回(成功/失败)——限流场景用 tryAcquire(快速拒绝,不排队,第 126 题限流)。二刀:"CyclicBarrier 的回调?"——barrierAction 在屏障打开时执行(由最后到达的线程执行)——汇总/统计/日志的钩子;回调异常→barrier broken(所有等待者异常)。三刀:"Phaser?"——CyclicBarrier 的增强版(动态注册/多阶段)——比 CyclicBarrier 灵活但复杂度高;多数场景 CyclicBarrier 够用。

## 总结点

1. Latch=等 N 件完成(一次性)
2. Barrier=N 线程互相等(可循环)
3. Semaphore=限并发(可重用)
