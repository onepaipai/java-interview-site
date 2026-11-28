<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/locks/Condition.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：有界缓冲区用 ReentrantLock 配 notFull 与 notEmpty 两个 Condition。对照单一 Object.notify 的丢信号路径，推演 signal 错队、signal 前状态回退、未持锁调用三类事故，给出配对纪律。

1. Condition 的 signal 只唤醒自己队列里的线程：生产者 signal notEmpty、消费者 signal notFull，通知与谓词一一对应，从机制上消除"叫错人"。
2. signal 发出后条件可能被第三方改回（另一个消费者抢先消费），所以 await 必须在 while 循环里重新验证——这条纪律与 Object.wait 相同，不因换了工具而消失。
3. signal/await 必须持有对应锁：未持锁调用抛 IllegalMonitorStateException；持锁也保证了"改状态"与"发通知"对其他线程原子可见。

## 参考分析

### 第二步扩展① 机制：分队列通知等于按部门叫人

- Object 的等待队列只有一条，notify 是广播里随机挑人。
- Condition 是多条队列，signal 精准呼叫某个部门。
- 类比医院叫号按科室分开：抽血号不会叫到放射科。
- 但叫到号不等于轮到就诊——排到你时前面可能插入了急诊（条件被改变），所以"被叫到先看屏幕确认"（while 重验）依然是铁律。

### 第二步扩展② 反例：三类丢唤醒事故

- 事故一：把 signalNotFull 写在生产者侧却 signal 了 notFull 队列自己人，消费者永远无信号——队列对应关系写反。
- 事故二：signal 后、解锁前，另一个消费者获取锁消费了元素，被 signal 的消费者醒来时队列又空了，若用 if 就直接取空抛异常。
- 事故三：任务在未持锁分支调 signal 抛异常，通知根本没发出。
- 三类都指向同一条纪律：谓词、队列、锁三位一体对应。

### 第二步扩展③ 取舍：多 Condition 的维护成本

- 两个 Condition 是手写阻塞队列的标准形态。
- 谓词超过三个时，signal 配对关系容易写错，评审成本陡增，此时优先换 ArrayBlockingQueue/LinkedBlockingDeque。
- 需要"超时等待""批量唤醒"时 Condition.awaitNanos、signalAll 都有对应语义。
- Condition 不替代正确性设计，它只是把 Object 的单队列模型拆细。

## 案例

### 第三步发散·验证与推演 对照操作：单队列 notify 与双 Condition 的对比

- 教学验证：容量 1 的手写队列各实现两版。
- 单 notify 版在高并发下预期出现消费者全部 WAITING 而队列非空的卡死（信号给了生产者）。
- 双 Condition 版同一负载长期稳定，notFull 队列只含生产者。
- 压测脚本可复跑，复现依赖时序，结论依据通知语义推演。

### 第三步发散·追问① 追问：signal 与 signalAll 怎么选

- 条件谓词"每次状态变化至多让一个等待者满足"（如放入一个元素只解锁一个消费者）用 signal，精准且少切换。
- 一次变化可能满足多个等待者（如批量放入、关闭操作）用 signalAll。
- 拿不准时 signalAll 优先——与 Object.wait 的 notifyAll 同理：先保证不错过，再优化唤醒开销。

## 总结点

1. 一个谓词一条队列，signal 要对号
2. 醒来 while 重验，换了工具不变
3. 持锁才能 signal，配对关系写进注释
