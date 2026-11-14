<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Object.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银任务队列沙盘:生产者消费者模型——wait 释放锁等条件,notify 唤醒随机一个(可能唤醒错/丢失);虚假唤醒必须 while 循环判条件。

1. sleep vs wait:所属(Thread 静态方法 vs Object 实例方法);锁(wait 需持有 monitor 且调用后释放锁,sleep 不释放);用途(wait=条件等待+notify 唤醒,sleep=纯暂停);wait 必须在 synchronized 块内(否则 IllegalMonitorStateException)。
2. notify vs notifyAll:notify 随机唤醒一个等待线程(选哪个由 JVM 决定,可能唤醒的条件未满足→该线程重新 wait,而满足条件的线程没醒=通知丢失);notifyAll 唤醒全部(竞争锁后各自 while 检查条件,不满足继续 wait)——多条件共享一个锁时必须 notifyAll。
3. 虚假唤醒(wait 在无 notify 时也可能返回,OS 层面允许)→等待必须 while(!condition) wait,不能用 if——醒来后重新检查条件;这也是三重防线之一(条件判断/超时/中断)。

## 参考分析

### 机制:wait 为什么必须在 synchronized 内

wait/notify 语义绑定 monitor:wait=释放 monitor 并进入该对象的 WAITING 集,notify=从该对象等待集唤醒一个——不在 monitor 内调用=没有 monitor 可释放(Immediate IllegalMonitorStateException);释放锁是 wait 的关键副作用(否则其他线程永远拿不到锁改条件=死锁)。

### 反例:wait/notify 的两种事故

事故一:notify 丢通知——两个条件(队列空/满)共用一个锁,生产者 notify 唤醒了另一个生产者→消费者永远睡;修复=notifyAll 或按条件拆锁(Lock+Condition 多等待集)。事故二:if 判条件——虚假唤醒后直接执行(条件实际不成立)→队列越界/空取;修复=while 循环判条件(规约级写法)。

### 取舍:Object.wait vs Lock/Condition

Object.wait/notify:一个对象一个等待集,多条件只能 notifyAll(低效);ReentrantLock+多个 Condition:每个条件独立等待集,signal 精准唤醒(数组阻塞队列的实现);生产大多数场景直接用 BlockingQueue(封装好条件队列)。

## 案例

### 验证:等待唤醒的实测走查

验证:锁释放断言(wait 期间另一线程可获同一把锁,sleep 期间获不到——对照实验);IllegalMonitorStateException 断言(块外 wait);虚假唤醒断言(无 notify 的 wait 超时返回——while 重检);notify 丢失断言(两条件一锁,notify 唤醒错线程——notifyAll 修复对照);并发模块条件队列实验可复用。预期:while+notifyAll 组合在所有扰动下收敛。

### 追问链:等待三刀

一刀:sleep(0)/yield 的语义=让出时间片建议(调度提示,不释放锁)。二刀:Thread.interrupt 与 wait——wait 被中断抛 InterruptedException 并恢复中断标志;中断是协作式取消。三刀:Condition.awaitUntil/awaitNanos=限时等待(避免永久 WAITING——超时兜底)。

## 总结点

1. wait 释放锁,sleep 不释放
2. notify 可能丢通知,多条件用 notifyAll
3. 虚假唤醒→while 判条件
