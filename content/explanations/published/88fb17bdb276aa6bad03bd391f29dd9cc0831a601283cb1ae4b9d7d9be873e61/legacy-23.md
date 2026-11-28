<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银批量出账沙盘:峰值每秒 500 个导出任务——7 参数决定池的行为,提交流程(核心→队列→最大→拒绝)决定任务去向;参数错=队列堆积或拒绝风暴。

1. 7 参数:corePoolSize(常驻)/maximumPoolSize(上限)/keepAliveTime+unit(非核心空闲存活)/workQueue(任务队列)/threadFactory(线程命名/守护标志)/handler(拒绝策略)——core 满→先入队,队列满→再建非核心线程到 max,max 满+队列满→拒绝。
2. 提交流程(execute):当前线程数<core→新建核心线程执行(即使有空闲线程);≥core→入队;队列满且线程数<max→新建非核心线程;线程数=max 且队列满→触发拒绝策略——顺序是先队列后扩容(与直觉相反,队列无界则 max 永远不生效)。
3. 拒绝策略:AbortPolicy(抛异常,默认——调用方感知可降级)/CallerRunsPolicy(提交线程自己执行——天然限流,但阻塞调用方)/DiscardPolicy(静默丢弃——危险)/DiscardOldestPolicy(丢最老——可能丢关键任务);生产常用自定义(记录+落库+告警)。

## 参考分析

### 第二步扩展① 机制:先入队再扩容的设计含义

- 队列是缓冲(削峰)但无界队列=内存泄漏(任务堆积 OOM,第 24 题 Executors 陷阱)——生产用有界队列(如 1000):满了才扩到 max,max 也满才拒绝——拒绝是过载信号(必须可见:监控+告警),不是静默损失。

### 第二步扩展② 反例:线程池的两种事故

- 事故一:core=10/max=10+无界队列——流量峰值任务全部堆积(内存涨/延迟涨)但线程数恒 10(从不扩容)。
- 修复=有界队列。
- 事故二:CallerRunsPolicy 在 web 线程池——Tomcat 工作线程被拉去跑慢任务→HTTP 并发骤降。
- 修复=快慢任务分池+拒绝策略按池定(交互池拒绝要快,批处理池可 CallerRuns)。

### 第二步扩展③ 取舍:参数怎么定

- IO 密集(线程多,2×核或按等待/计算比)vs CPU 密集(核数+1)。
- core=max 或接近(避免扩缩抖动)或分层(核心常驻+峰值弹性)。
- 依据=压测画像(目标吞吐/延迟)而非公式——公式只是起点(第 80 题并发模块同源)。

## 案例

### 第三步发散·验证与推演 验证:提交流程的实测走查

- 验证:流程断言(core=2/max=4/队列=2:提交 8 任务→2 核心+2 队列+2 扩容+2 拒绝——与 execute 顺序完全对应)。
- 拒绝断言(Abort 抛异常/CallerRuns 主线程执行/Discard 静默——四种策略行为对照)。
- keepAlive 断言(非核心线程空闲超时回收)。
- 命名断言(threadFactory 命名可观测)——并发模块线程池实验可复用。
- 预期:任务去向与参数推演一致。

### 第三步发散·发散要点 追问链:线程池三刀

- **追问①·预热线程**：prestartAllCoreThreads(冷启动场景);allowCoreThreadTimeOut(核心也回收,低峰省资源)
- **追问②·动态调参**：setCorePoolSize/setMaximumPoolSize 运行时可调(美团动态线程池思路)+配置中心联动
- **追问③·监控**：getActiveCount/getQueue().size()/拒绝计数——线程池必须可观测(过载早发现)

## 总结点

1. 7 参数,core→队列→max→拒绝
2. 先入队再扩容,无界队列=max 失效
3. 拒绝策略按池定,必须可观测
