<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/Executors.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银故障沙盘:FixedThreadPool 撑过平日、大促 OOM——Executors 四个工厂方法的隐患(无界队列/无界线程);手动 ThreadPoolExecutor 显式声明边界。

1. 四个坑:newFixedThreadPool/newSingleThreadExecutor——无界队列(LinkedBlockingQueue 默认 Integer.MAX_VALUE)→堆积 OOM;newCachedThreadPool——线程数无上限→线程爆炸 OOM;newScheduledThreadPool 延时任务也无界。
2. 根因:Executors 隐藏了队列与线程上限的决策——OOM 的两类(任务对象堆积=堆 OOM;线程数爆炸=每线程 1MB 栈+元数据);手动 ThreadPoolExecutor 强制声明 7 参数(边界显式化,评审可见)——阿里巴巴 Java 开发手册强制规约。
3. 正确姿势:new ThreadPoolExecutor(核心,最大,存活,单位,有界队列,命名 threadFactory,拒绝策略+监控)——按业务画像选参数(第 23 题);需要延时任务手动构造 ScheduledThreadPoolExecutor 并配 backlog 监控。

## 参考分析

### 第二步扩展① 机制:无界队列为什么必然堆积

- 无界队列=消费速率低于生产速率时任务无限堆积(内存线性涨)。
- 默认拒绝策略永不触发(队列永不“满”)——过载被静默吸收而非暴露。
- 限流的本质=必须有界(队列/线程/令牌),无界=放弃自我保护(第 51 题 TCP 滑动窗口同源思想)。

### 第二步扩展② 反例:Executors 的两种事故

- 事故一:newFixedThreadPool(10) 做报表导出——大促 50 万导出任务全部入无界队列→堆 OOM(转储全是 LinkedBlockingQueue.Node)。
- 修复=有界队列+拒绝落库+告警。
- 事故二:newCachedThreadPool 做回调——瞬时回调洪峰建 8000 线程(8GB 栈预留)→unable to create native thread。
- 修复=上限线程+有界队列。

### 第二步扩展③ 边界:规约的适用范围

- 规约针对生产业务线程池。
- 原型/脚本/测试用 Executors 可接受(生命周期短)。
- 池必须命名(threadFactory)+登记(全局池注册表)——排查 dump 时能认出哪个池(未命名池=pool-N-thread-M 无法归因)。

## 案例

### 第三步发散·验证与推演 验证:OOM 陷阱的实测走查

- 验证:堆积断言(FixedThreadPool+慢任务→队列 size 线性涨,JMap 看堆中 Node 占比)。
- 线程爆炸断言(CachedThreadPool+瞬时提交→线程数冲顶,getPoolSize 监控)。
- 对照断言(手动池有界队列→拒绝策略触发可见)——三组固化规约理由,并发模块线程池实验可复跑。
- 预期:Executors 两类 OOM 形态均可构造复现。

### 第三步发散·发散要点 追问链:池规约三刀

- **追问①·Spring @Async 默认池**：SimpleAsyncTaskExecutor(每次新建线程,更危险)——必须自定义池(第 89 题异步同源)
- **追问②·队列容量**：按(峰值速率-消费速率)×缓冲时长+压测校准
- **追问③·池隔离**：快慢任务/核心非核心分池(互不拖垮——舱壁模式,第 138 题 reliability 同源)

## 总结点

1. Fixed=无界队列 OOM,Cached=无界线程 OOM
2. 手动 7 参数,边界显式化
3. 有界队列让过载可见
