<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Object.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Thread.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：一个线程持锁后分别调用 wait(1000) 与 sleep(1000)，另一个线程尝试进入同一同步块。对照两种情况下锁的持有、线程状态（WAITING 与 TIMED_WAITING）与唤醒条件。

1. wait 释放已持有的监视器锁，让其他线程有机会进入临界区；sleep 不释放任何锁，抱着锁睡觉会阻塞所有人。
2. wait 必须在持有该对象监视器时调用，否则抛 IllegalMonitorStateException；sleep 是 Thread 静态方法，与锁无关。
3. wait 靠 notify/notifyAll 或中断唤醒，时间参数只是上限；sleep 到点自动醒，两者都会响应中断。

## 参考分析

### 第二步扩展① 机制：等待的资格与让出的资源

- wait 定义在 Object 上，因为它操作的是"这把锁的等待队列"：线程必须先持锁才有资格进入队列，进入即释放锁。
- 类比去银行办理：你把窗口让出来（释放锁）坐到等候区（WAITING），叫号（notify）后重新排队抢窗口。
- 抢到后必须重新验证业务条件。
- sleep 则是坐在窗口上打盹，什么都没让出，队伍只能干等。

### 第二步扩展② 边界：状态与唤醒路径不同

- 无参 wait 使线程进入 WAITING，只能被 notify、notifyAll 或 interrupt 唤醒。
- wait(timeout) 与 sleep(ms) 是 TIMED_WAITING。
- sleep 的唤醒条件只有超时和中断两种，因此"等待某个业务条件"用它实现就要靠轮询加 sleep，既浪费又不可靠——这正是 wait/notify 存在的理由。
- 另外 sleep(currentThread) 的静态属性容易误写成在别的线程上"睡"，实际睡的是当前线程。

### 第二步扩展③ 取舍：需要让出锁的等待才用 wait

- 等待条件成立用 wait/notify 或更高层的 Condition、BlockingQueue。
- 单纯延时（重试退避、定时）用 sleep 或调度器。
- 常见错误是用 sleep 轮询等待另一个线程的结果：延迟下限不可控，还可能因为持锁轮询造成死锁。
- 高并发路径上锁内 sleep 更是禁区，等价于把临界区时长放大到睡眠时长。

## 案例

### 第三步发散·验证与推演 对照操作：同一把锁下的两种表现

- 教学验证：线程 A 进入 synchronized 块后分别调用 wait(1000) 与 sleep(1000)，线程 B 记录尝试进入同一锁的时间。
- 预期 wait 版本 B 几乎立即进入（锁已释放），sleep 版本 B 等满 1000 毫秒（锁未释放）。
- 再用 jstack 抓线程转储，对照 WAITING 与 TIMED_WAITING 状态。
- 结果稳定可复现。

### 第三步发散·追问① 追问：Object.wait(0) 与 sleep(0) 各是什么

- wait(0) 表示无限期等待，等价于无参 wait。
- sleep(0) 则是一次让出时间片的提示，操作系统可能立即重新调度，不构成可靠的同步手段。
- 两者数字相同语义完全不同，面试里常用来检验是否真理解了"等待队列"与"调度器"的区别。

## 总结点

1. wait 让锁睡走廊，sleep 抱锁睡窗口
2. 持锁才能 wait，醒来先抢锁
3. 等条件用 wait，纯延时用 sleep
