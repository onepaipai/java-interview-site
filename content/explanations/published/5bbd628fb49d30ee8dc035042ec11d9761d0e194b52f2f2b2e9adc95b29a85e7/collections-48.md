<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/BlockingQueue.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银消费沙盘:if (!queue.isEmpty()) { task = queue.take(); }——isEmpty 与 take 之间消费者竞态(另一线程 take 走了最后元素)——take 抛中断/阻塞——"检查与取出的分离"在并发下不可推断(分布式 16 题 CHM containsKey+put 的队列版)。

1. 竞态窗口:isEmpty=true(线程 A)→线程 B take(队列空,B 阻塞或取走)→A take(空/阻塞)——两步之间的状态变化;正确姿势:take 的阻塞语义直接用(不先查空)或 poll(timeout) 带超时的原子探测。
2. peek 与 take 的语义差:peek(看,可能 null)+take(取,阻塞)——peek+take 组合同样竞态(peek 到元素,take 时被别人取走→阻塞)——非阻塞需求用 poll(0)(原子探测,空即 null)。
3. 队满的对称问题:put 与 remainingCapacity 的分离同样竞态(第 23 题背压)——队列的"检查类"(isEmpty/peek/remainingCapacity)在并发下都是"瞬时快照",不可作为后续动作的前提。

## 参考分析

### 机制:瞬时快照与动作原子性

快照语义:isEmpty/peek/remainingCapacity 返回"调用瞬间"的状态——下一毫秒状态可变(多消费者/生产者)——快照不能作为"后续动作的前提"。原子替代:take(阻塞到有元素——语义化)、poll(timeout)(限时原子探测——null=超时空)、put(阻塞到有空间)——动作类 API 自带原子性,检查类 API 只用于监控/日志。

### 反例:检查分离的三种事故

事故一,空指针:isEmpty 通过后 take——队列空(他线程取走)——take 阻塞(调用方以为立即返回)——线程卡死感知。事故二,重复处理:isEmpty 的多消费者检查——两消费者都认为有任务→都 take→一个拿到一个阻塞——调度混乱。事故三,优先级反转:peek 看到高优先级任务→处理逻辑等待→被低优先级抢先(peek 与 poll 之间)——检查与执行的分离破坏优先级语义。三条的正解:动作 API 直接用(take/poll/put 的阻塞与超时语义)。

### 取舍:阻塞与非阻塞的消费形态

阻塞消费(take):专用消费者线程(阻塞等任务,语义最简)——线程被占(第 18 题线程预算)。非阻塞轮询(poll(timeout)):复用线程(多队列轮询/与其他任务混合)——轮询间隔的延迟代价。混合:阻塞为主+超时退出(可中断的优雅停机)——消费者循环的标准形态(take 或 poll(timeout) + 中断检查)。

## 案例

### 验证:竞态的断言组

验证:竞态复现断言(两消费者 isEmpty+take 竞态——空指针/阻塞复现);原子替代断言(poll(timeout) 形态的零竞态);快照语义断言(remainingCapacity 的瞬时性——连续两次调用值不同的演示)——三组固化"检查与取出不可分开推断";消费者的阻塞循环模板进团队指南。

### 追问链:队列消费三刀

一刀:"优雅停机?"——poll(timeout) 循环+中断标志(超时退出循环检查中断)——take 的硬阻塞难停机(中断+ InterruptedException 处理)——停机友好的消费循环是工程标配。二刀:"消费的批量?"——drainTo(list, max)(一次性批量取出——减少锁竞争,第 42 题批量删除同源)——批处理的队列消费用 drainTo。三刀:"队列的观测?"——深度监控(第 23 题水位)与消费速率——检查类 API 用于监控(合法),不用于业务决策(反模式)——观测与决策分离。

## 总结点

1. isEmpty 是快照,不是前提
2. take/poll 的原子语义直接用
3. drainTo 批量,轮询配超时
