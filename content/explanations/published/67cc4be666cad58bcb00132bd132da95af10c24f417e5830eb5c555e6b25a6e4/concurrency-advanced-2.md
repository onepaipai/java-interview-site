<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/locks/AbstractQueuedSynchronizer.html.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：同一团队维护 ReentrantLock 与 Semaphore 的定制语义，需要说明两者在 AQS 上的实现差异。对照 tryAcquire 与 tryAcquireShared 的返回约定、唤醒传播与典型实现。

1. 独占模式一次只允许一个持有者：tryAcquire 返回 boolean，成功后 setExclusiveOwnerThread，释放时唤醒队列头部的后继。
2. 共享模式允许多个同时通过：tryAcquireShared 返回 int（负数失败、零成功无余量、正数还有余量），成功后 setHeadAndPropagate——余量为正或头节点状态允许时，继续唤醒下一个等待者，形成链式放行。
3. 两种模式决定典型实现：ReentrantLock/互斥语义走独占；Semaphore/CountDownLatch/读写锁的读侧走共享；同一 AQS 队列可同时容纳两类等待节点（如读写锁）。

## 参考分析

### 机制：返回值约定就是"放行宽度"

独占的 boolean 只回答"我进去了没有"；共享的 int 回答"我进去了，后面还能进几个"。类比检票口：独占是单人间房卡（刷一张开一扇门），共享是团队票（验票员数人数，还有名额就顺手喊下一组）。AQS 的 setHeadAndPropagate 正是"顺手喊下一组"的实现——这是 CountDownLatch 一次 countDown 能放行全部 awaiter 的机制根源。

### 边界：共享唤醒的传播条件与停止点

传播不是无限广播：setHeadAndPropagate 检查"剩余许可 > 0 或旧头节点标记需传播"才继续 doReleaseShared。若共享获取恰好用掉最后一个许可（返回零），链式唤醒停止，等下一个 release 再触发。推演边界：Semaphore 许可为 1 时行为接近独占，但仍保留共享语义的传播路径，不能与互斥锁互换。

### 取舍：为什么用一个框架承载两种模式

队列管理、挂起唤醒、取消、超时逻辑两模式完全同构，只有"获取判定"与"放行宽度"不同。把差异收在 tryAcquire/tryAcquireShared 两个钩子里，子类只写状态协议。代价：共享传播逻辑复杂（doReleaseShared 的循环重试），读懂源码的门槛集中在这一段。

## 案例

### 对照操作：同一 AQS 写两种同步器

教学验证：继承 AQS 分别实现简单互斥锁与二元门闩。预期：互斥锁版本 tryAcquire 用 compareAndSetState(0,1)；门闩版本 tryAcquireShared 在 state==1 时返回 1、否则 -1，countDown 后多个 awaiter 一次全部放行。两个 30 行实现可复跑，对照唤醒日志观察传播差异。

### 追问：读写锁如何让两种模式共存

ReentrantReadWriteLock 的 state 高位记写、低位记读：写获取走独占路径（读为零才成功），读获取走共享路径；队列里写节点阻断共享传播，避免读持续插饿写。它证明了 AQS 的价值——两种同步语义共享同一条等待队列与唤醒机制，而不是各写一套。

## 总结点

1. 独占一张门，共享链式放
2. 返回值约定即放行宽度
3. 共享归零即停，等下个 release
