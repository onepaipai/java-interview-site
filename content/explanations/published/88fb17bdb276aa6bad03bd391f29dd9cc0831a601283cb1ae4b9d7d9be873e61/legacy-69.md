<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银线程池沙盘:corePoolSize(核心线程)/maximumPoolSize(最大)/keepAliveTime(空闲回收)/workQueue(队列)/handler(拒绝策略)——五参数+队列选型+动态调参(第 16/17/18 题并发基础的完整版)。

1. 五参数:corePoolSize(常驻,CPU 密集=核数,IO 密集更高)/maximumPoolSize(上限)/keepAliveTime(空闲回收)/workQueue(有界防堆积,无界掩盖过载,第 17 题)/handler(拒绝策略:Abort 快速失败/CallerRuns 背压/Discard 静默/自定义)。
2. 队列选型:有界队列(LinkedListBlockingQueue——过载显形,推荐)/无界队列(永不拒绝但掩盖过载+内存涨,第 17 题)/SynchronousQueue(零容量,直接移交——newCachedThreadPool,第 17 题追问)/优先级队列(PriorityBlockingQueue——按优先级执行)。
3. 动态调参:setCorePoolSize/setMaximumPoolSize(运行时改——"参数改规则不改存量",第 16 题)——监控驱动(队列长度/活跃线程/拒绝数,第 42 题健康检查)+按下游容量比例调整(第 9 题排队年龄)。

## 参考分析

### 第二步扩展① 机制:execute 的提交决策链

- 四步:线程数<corePoolSize→新建核心线程。
- corePoolSize 满→尝试入队(offer)。
- 队列满且线程数<maximumPoolSize→新建非核心线程。
- 线程数达 max→拒绝——无界队列的 offer 恒成功永远停在第二步(第 17 题并发基础,饱和策略被队列绕过)。

### 第二步扩展② 反例:线程池的三种事故

- 事故一:无界队列——队列 10 万条+内存涨+过载不显形。
- 修复=有界+拒绝策略。
- 事故二:CallerRunsPolicy 在 Web 线程——提交线程(Tomcat 线程)自己执行任务→HTTP 请求挂起(第 18 题并发基础)。
- 修复=Abort+上游快速失败或自定义策略。
- 事故三:线程池未 shutdown——应用关闭时线程泄漏(JVM 不退出)。
- 修复=优雅关闭(shutdown+awaitTermination)。

### 第二步扩展③ 取舍:线程池的隔离(舱壁)

- 核心/非核心业务分池(独立线程池——一个慢下游不拖其他,D3 实测:共享池 967ms vs 独立 1ms)——隔离的粒度=按下游依赖分池(每个慢依赖一个池)。
- 全局池=全局故障域(第 11 题网关隔离同构)。

## 案例

### 第三步发散·验证与推演 验证:线程池的走查核对

- 验证:参数断言(corePoolSize/maxPoolSize/queueCapacity 按压测校准)。
- 拒绝策略断言(Abort 抛异常/CallerRuns 由提交线程执行/自定义记录+降级)。
- 动态调参断言(setCorePoolSize 生效——新任务按新参数)。
- 监控断言(活跃线程/队列长度/拒绝数/排队年龄)。
- 验证:第 9 题排队年龄+第 16 题动态调参+第 17 题队列选型的实测可复用。

### 第三步发散·追问扩展 追问链:线程池三刀

- **Q1：ThreadLocal 在线程池的泄漏?**
  - 答：线程复用→ThreadLocal 不清理→旧任务的值泄漏给新任务(第 72 题 ThreadLocal 专项);修复=finally{threadLocal.remove()}。
- **Q2：线程池的优先级?**
  - 答：PriorityBlockingQueue(按优先级执行)+自定义 ThreadFactory(命名线程,便于排查)——优先级反转的护栏(第 34 题批处理)。
- **Q3：虚拟线程(JDK 21)?**
  - 答：虚拟线程把"执行槽位"与"下游容量"解耦(第 16 题并发进阶)——传统线程池的调参在很多场景直接失去意义(版本边界)。

## 总结点

1. 五参数+有界队列+拒绝策略
2. CallerRuns 在 Web 线程有风险
3. 动态调参=改规则不改存量
