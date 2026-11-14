<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银异步沙盘:@Async 方法抛异常调用方拿不到异常异步调用已返回——默认被 AsyncUncaughtExceptionHandler 吞掉日志——异步异常的可观察性设计。

1. @Async 的异常路径 void 方法异常被 AsyncUncaughtExceptionHandler 捕获默认日志 warn;Future 返回异常封装在 Future 调用 get 时感知调用方可捕获。
2. 自定义 handler AsyncConfigurer 的 getAsyncUncaughtExceptionHandler 自定义异常处理告警重试死信。
3. @Async 的执行器分环境:纯 Framework 默认 SimpleAsyncTaskExecutor(每次新建线程,无上限);Boot 默认提供 ApplicationTaskExecutor(ThreadPoolTaskExecutor 有界)——默认未必匹配业务,应显式自定义 core/queue/rejection。

## 参考分析

### 机制:异步异常的两条路径

void 路径异常被 AsyncUncaughtExceptionHandler 捕获默认日志 warn 吞掉。Future 路径异常封装在 Future 调用方 get 时感知。两条路径的异常处理方式不同 void 需要自定义 handler 否则异常丢失 Future 由调用方负责。

### 反例:异步异常丢失的事故

沙盘 Async void 方法抛异常默认 handler 日志 warn 无人关注业务副作用丢失该发的通知没发。修复自定义 AsyncUncaughtExceptionHandler 告警加补偿加关键异步方法返回 Future 调用方可感知异常。

### 取舍:线程池的配置

默认 SimpleAsyncTaskExecutor 每次新建线程无限——突发任务线程爆炸。自定义 ThreadPoolTaskExecutor 有界队列加核心线程加最大线程线程数可控。配置 corePoolSize maxPoolSize queueCapacity rejectedExecutionHandler 四参数决定线程池行为。

## 案例

### 验证:异步异常的断言组

验证:void 断言(void Async 抛异常 handler 被调用自定义 handler 的日志);Future 断言(Future get 时异常传播调用方可捕获);线程池断言(自定义池的有界队列无界默认的复现)——三组固化异步异常的可观察性与线程池纪律。

### 追问链:@Async 三刀

一刀:@Async 的代理自调用失效同类调 @Async 方法不异步直调。二刀:@Async 与事务异步方法在新线程事务不传播异步方法的独立事务。三刀:@EnableAsync 的配置 AsyncConfigurer 自定义执行器加异常 handler 异步的全局配置点。

## 总结点

1. void 异常进 handler,Future 异常可获取
2. 默认线程池无界,必须自定义
3. 自定义 handler 做告警补偿
