<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/array/ArrayBlockingQueue.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银异步任务沙盘:批量出账任务入队,消费线程处理——队列关闭时的三个问题:还在等任务的消费者怎么醒、队列里剩的任务怎么处置、关闭后再提交怎么办。

1. 关闭语义两阶段:shutdown(温和)——不再接受新提交(put 抛 IllegalStateException 或返回 false),已入队任务继续被消费完,消费线程取空并看到「已关闭+空队列」后退出;shutdownNow(立即)——中断消费者,返回未处理任务清单由调用方决定回滚或转移。
2. 实现要点:closed 标志+条件队列配合——消费者 take 循环:队列空且未关闭→await;队列空且已关闭→退出(返回 null 或抛特定异常);生产者 put:已关闭→拒绝;唤醒遗漏是最大坑——close 时必须 signalAll(等待者可能有多个,notify 一个可能唤醒错方,第 20 题 wait/notify 同源)。
3. 与 BlockingQueue 的对应:ArrayBlockingQueue 没有关闭语义(靠「毒丸对象」或中断模拟);生产级用 Disruptor/Kafka 的优雅关闭模式——停止投递→排空→超时强制;线程池的 shutdown/shutdownNow 就是这套语义的池化版(第 23 题提交流程同源)。

## 参考分析

### 第二步扩展① 机制:关闭为什么必须是协议而非标志位

- .closed=true 只对「下一次检查」生效——正在 await 的消费者不会自己醒。
- 关闭动作必须:①置标志②signalAll 全部等待者③生产者侧立即拒绝。
- 三步缺一就是「关了但有人永远等」或「关闭后还能塞任务」。
- 毒丸方案(塞一个特殊对象,消费者见到即退)是协议的变体——但它要求「毒丸前任务全部入队完成」,多生产者时毒丸数量要等于消费者数。

### 第二步扩展② 反例:关闭处理的四种事故

- 事故一:close 只置标志不唤醒——消费者永久 WAITING,进程退不干净。
- 事故二:notify 而非 notifyAll——唤醒的是另一个消费者,空队列+关闭态的消费者还睡着。
- 事故三:关闭后 put 不拒绝——任务进了「已关闭」队列永远没人消费(静默丢失)。
- 事故四:排空前中断——shutdownNow 直接 interrupt,任务做一半,资金类操作产生悬置状态(第 143 题 banking 悬置同源)。

### 第二步扩展③ 取舍:温和关闭与立即关闭的适用

- 出账/转账类:温和关闭(排空+超时兜底——超过 deadline 强制中断并落盘现场)。
- 日志上报类:立即关闭(丢得起)。
- 判断依据=任务可重放性:可重放(Kafka 消费)中断随意,不可重放(资金)必须先排空+现场保全。
- 超时兜底必须有——「排空完再退」在毒任务上等于永不退出。

## 案例

### 第三步发散·验证与推演 验证:关闭语义断言组(本机可复跑)

- 验证:排空断言(10 任务入队后 shutdown——消费者处理完 10 个才退出,一个不丢)。
- 拒绝断言(shutdown 后 put 抛异常/false)。
- 唤醒断言(3 个消费者都在 await,close 后 1 秒内全部退出——signalAll 生效)。
- 中断断言(shutdownNow 返回未处理清单且消费者被中断退出)。
- 毒任务对照(塞一个 sleep 10s 任务,温和关闭 3s 超时强制退出)。
- 预期:五组断言构成完整关闭契约。

### 第三步发散·发散要点 追问链:关闭三刀

- **追问①**：毒丸 vs 标志位——毒丸无侵入但多生产者要发 N 个;标志位要 signalAll;BlockingQueue 用户只能选毒丸或中断
- **追问②**：优雅停机与进程信号——SIGTERM→JVM shutdown hook→close+join(deadline)→exit,启动脚本给足 SIGKILL 宽限(第 76 题 JVM 同源)
- **追问③·与线程池的关系——池的 shutdown**：温和/shutdownNow=立即+返回队列剩余,自己手写队列时对齐这套语义,调用方迁移零成本

## 总结点

1. 关闭=置标志+唤醒+拒绝,三步协议
2. signalAll 防 notify 丢唤醒
3. 资金任务先排空,超时兜底必须有
