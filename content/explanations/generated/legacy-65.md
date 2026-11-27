<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/locks/AbstractQueuedSynchronizer.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银锁沙盘:AQS(队列同步器)=state(原子状态)+CLH 变体队列(等待线程)+模板方法(tryAcquire/tryRelease)——ReentrantLock 与 synchronized 的底层差异(AQS vs ObjectMonitor)。

1. AQS 核心:volatile int state(CAS 修改)+CLH 变体双向队列(等待线程)+模板方法(子类实现 tryAcquire/tryRelease);独占模式(ReentrantLock)与共享模式(Semaphore/CountDownLatch,tryAcquireShared 返回 int,并发进阶 2 题)
2. ReentrantLock:可重入(state 计数)+公平/非公平(是否检查队列)+tryLock(限时)+lockInterruptibly(可中断)+Condition(多条件);synchronized:JVM 内置(ObjectMonitor)+自动释放+不可中断+无公平(并发基础 23 题)。
3. CLH 队列的节点状态:waitStatus 四态(CANCELLED/SIGNAL/CONDITION/PROPAGATE)——独占流程:获取失败→shouldParkAfterFailedAcquire(前驱置 SIGNAL)→park;释放→unpark 后继(并发进阶 2 题详解)。

## 参考分析

### 第二步扩展① 机制:AQS 为什么是"模板方法模式"

- AQS 定义了"队列管理+挂起唤醒+取消+超时"的骨架(不变),子类只需实现 tryAcquire/tryRelease(获取/释放的状态协议)——ReentrantLock 的 tryAcquire=state 0→1+CAS。
- Semaphore 的 tryAcquireShared=state>0 则减 1——一个框架承载两种模式(并发进阶 2 题的"模板方法"分析)。

### 第二步扩展② 反例:锁选择的两种事故

- 事故一:synchronized 无法 tryLock——锁竞争激烈时线程永久阻塞(无法限时获取)。
- 修复=ReentrantLock.tryLock(timeout)。
- 事故二:ReentrantLock 忘记 unlock——finally 中未 unlock→锁永久占用(其他线程永久等待)。
- 修复=finally{lock.unlock()}(synchronized 自动释放的优势)。

### 第二步扩展③ 取舍:ReentrantLock vs synchronized 的选型

- 需要高级功能(tryLock/可中断/公平/Condition)→ReentrantLock。
- 简单互斥(synchronized 简洁+不易漏解锁)→synchronized。
- synchronized 的性能(JDK 6 后偏向锁/轻量级锁优化,并发基础 23 题)——大多数场景 synchronized 足够,ReentrantLock 的价值在高级功能。

## 案例

### 第三步发散·验证与推演 验证:AQS 的走查核对

- 验证:可重入断言(同线程多次 lock→holdCount 递增)。
- 公平/非公平断言(公平锁先到先得,非公平锁插队)。
- Condition 断言(await/signal 的队列对应,第 26 题并发基础)。
- AQS 队列断言(jstack 观察 WAITING 线程的 park 调用栈)。
- 验证:锁行为断言可程序化(AQS 的功能覆盖测试)。

### 第三步发散·追问扩展 追问链:AQS 三刀

- **Q1：AQS 的 PROPAGATE 状态?**
  - 答：共享模式的"迟到的传播信号"(防止唤醒在链中间丢失,并发进阶 2 题)——共享源码最难读的一段,但理解它=理解共享模式的精髓。
- **Q2：Condition 与 Object.wait?**
  - 答：Condition 支持"多条件队列"(notFull/notEmpty 各一个队列,精准唤醒);Object.wait 只有一条队列(notify 随机挑人,第 26 题并发基础)。
- **Q3：AQS 的可重入实现?**
  - 答：state 计数(同线程 acquire→state+1)+owner 线程记录(ExclusiveOwnerThread)——release 时 state-1 到 0 才真正释放。

## 总结点

1. AQS=state+CLH 队列+模板方法
2. ReentrantLock 高级功能,synchronized 简洁
3. CLH 队列 waitStatus 四态
