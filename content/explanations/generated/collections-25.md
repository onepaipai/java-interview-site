<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/SynchronousQueue.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银线程池沙盘:Executors.newCachedThreadPool 用 SynchronousQueue——容量 0(put 必须等 take),传递的语义=直接握手(生产者与消费者 handoff,不经缓冲)。

1. 握手机制:put 等待消费者来 take(阻塞直到配对);take 等待生产者——零缓冲=零排队=背压最硬(生产速率>消费速率时,生产者立即被卡)。
2. 与线程池的组合:cachedThreadPool(SynchronousQueue+无限线程)——每个新任务若无空闲线程=新建线程(队列不缓冲,任务不排队)——线程数无界的风险(第 24 题 LBQ 无界的孪生陷阱)。
3. 适用:任务必须立即处理(不排队)且有界线程池——直接交接的模式(handing off)用于"拒绝排队"的严格背压场景。

## 参考分析

### 机制:握手与配对

配对模型:内部 TransferQueue/TransferStack(公平模式队列/非公平栈)——put 的数据直接交给等待的 take(或挂起等待);无缓冲=队列深度恒 0(peek/isEmpty 恒 true/空)——"队列"只是握手的媒介。语义:put 的延迟=等待消费者的时间(无空闲消费者→put 挂起)——put 的耗时即"消费跟不上"的直接度量(背压的实时信号)。

### 反例:SynchronousQueue 的两种误用

误用一,期望缓冲:用它"存任务"——存不了(容量 0)——误解"Queue"的名字。误用二,cachedThreadPool 的线程爆炸:SynchronousQueue+无界线程——突发 1000 任务=1000 线程(每个任务一线程,线程创建/调度/内存全爆)——修复:有界线程池(ThreadPoolExecutor 显式构造,第 24 题 LBQ 有界)+拒绝策略(第 23 题 distributed)。

### 取舍:SynchronousQueue vs 有界队列

SynchronousQueue:零延迟传递(有消费者时)/强背压(无消费者立即卡)/不缓冲。有界队列:缓冲突发/延迟排队/内存可控。选择:任务的即时性要求(必须立即处理→SQ)+线程策略(有界→配合)——cachedThreadPool 的正确用法=短时突发异步任务(线程回收快),长任务用有界池。

## 案例

### 验证:握手语义的断言组

验证:握手断言(空队列 put 阻塞直到 take 到达——背压实证);零容量断言(isEmpty 恒 true/offer 需消费者);线程池对照(cachedThreadPool 突发的线程数暴涨 vs 有界池的排队)——三组固化握手语义;线程数监控(线程暴涨告警)配套。

### 追问链:SynchronousQueue 三刀

一刀:"公平模式?"——fair=true 用队列(先到先配对);false 用栈(后到先配对,LIFO——吞吐略高但可能饥饿)——公平与吞吐的折中(第 24 题锁公平同构)。二刀:"与 Exchanger?"——Exchanger 双方互换数据(双向);SynchronousQueue 单向传递——握手场景的两种形态。三刀:"跟直接调用比?"——直接调用方法(无需队列)vs SQ 传递(生产消费解耦的线程边界)——SQ 的价值在"跨线程的交接点"(线程池的任务提交),同线程内无意义。

## 总结点

1. 容量零,握手不缓冲
2. put 的等待=背压信号
3. 配 cachedThreadPool 要防线程爆炸
