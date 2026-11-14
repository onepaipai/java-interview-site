<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-12.html#jls-12.4.2)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/BlockingQueue.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银手写并发沙盘:两道经典编码题——DCL 单例(volatile 防半初始化)与生产者消费者(BlockingQueue 或 wait/notifyAll+while);写对的关键点与常见丢分处。

1. DCL 单例:双重检查+volatile——第一次判空(免加锁)/synchronized/第二次判空(防重复创建)/volatile(禁止半初始化暴露——new 三步:分配→初始化→赋值,无 volatile 可能先赋值后初始化,并发基础 23 题);Holder 或枚举是更稳替代(类加载天然安全)。
2. 生产者消费者:生产者队列满时等待,消费者队列空时等待——标准版=BlockingQueue(put/take 内部条件队列自动阻塞,无手写锁);手写版=同一把锁+两个条件(不满足 while 等待,操作后 signalAll)+数组循环缓冲;while 判条件(防虚假唤醒)+signalAll(防丢通知)是两个必考点(第 20 题详解)。
3. 常见丢分点:DCL 少 volatile(半初始化,偶现字段默认值)/第二次判空漏掉(重复创建);生产者消费者用 if 判条件(虚假唤醒后越界)/notify 只唤醒一个(两条件丢通知)/锁对象不一致(生产者消费者没锁同一对象=没有互斥)。

## 参考分析

### 机制:两道题考的是什么

DCL 考 JMM 与重排序(volatile 的必要性=可见性+有序性而非原子性,第 22 题);生产者消费者考条件队列(wait/notify 与锁的配对)或 BlockingQueue 的内部实现(ArrayBlockingQueue=两把锁两条件/LinkedBlockingQueue=两锁提高吞吐)——两题都是“用正确的原语组合出并发正确性”。

### 反例:手写的两种事故

事故一:DCL 无 volatile——压测下字段读到默认值(对象引用非 null 但字段未初始化);修复=volatile 或 Holder。事故二:生产者消费者 notify 丢失——两条件(空/满)共用锁时 notify 唤醒错方→永久等待;修复=notifyAll 或 Lock+两个 Condition 精准唤醒(ArrayBlockingQueue 实现)。

### 取舍:手写 vs 标准库

面试手写=展示并发理解;生产=BlockingQueue(Disruptor 高性能场景另说)/单例=Holder 或枚举(零手写风险)——手写版本的评审点=volatile/wait 语义/条件判断三处,缺一即错;标准库把正确性封装好,只在实现库时才手写。

## 案例

### 验证:两题的实测走查

验证:DCL 断言(并发 getInstance 返回同一实例/反射验证字段无默认值场景——复杂,常靠代码评审;Holder 版天然安全);生产者消费者断言(多生产者多消费者跑 10 万条目无丢失/无越界/结束干净;notifyAll 版与 BlockingQueue 版对照)——并发模块实验可复用。预期:BlockingQueue 版在所有压力下正确,手写版错误点可复现。

### 追问链:并发编码三刀

一刀:DCL 为什么两次判空=第一次免锁/第二次防竞态——顺序不可换。二刀:BlockingQueue 家族=Array(有界两锁)/Linked(可选有界)/Synchronous(零容量交接)/Priority(优先级)——容量与交接语义选型。三刀:中断配合=put/take 响应中断(优雅停机的钩子——关闭时中断+队尾消费完)。

## 总结点

1. DCL=两次判空+volatile
2. 生产者消费者=BlockingQueue 或 while+notifyAll
3. 手写考点:volatile/条件/锁配对
