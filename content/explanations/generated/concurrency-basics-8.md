<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Object.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：一个有界缓冲区上有生产者与消费者两方等待，各自条件谓词不同。推演单谓词与多谓词下 notify 可能造成的信号丢失，给出 notifyAll、多 Condition 与现成队列三种替代的适用条件。

1. notify 只唤醒等待队列中一个线程，若唤醒者检查条件后不成立继续睡，而本该响应的线程没被唤醒，通知就此丢失。
2. notifyAll 唤醒全部等待者，人人重新验条件，正确性不依赖"唤醒的恰好是合适的人"，代价是无谓的惊群。
3. 多谓词场景优先用 ReentrantLock 的多个 Condition 分队列通知；直接使用 ArrayBlockingQueue 等容器可以完全避开手写通知。

## 参考分析

### 第二步扩展① 机制：通知没有收件人，只有队列

- notify 从同一对象监视器的等待队列里挑一个线程，JVM 不保证挑选策略。
- notifyAll 把队列整体搬到锁的入口队列。
- 类比为楼道喊一嗓子：notify 相当于只叫一个人，叫错了人（条件不成立）他就回屋了，真正该行动的人还在屋里睡觉。
- 条件谓词与等待队列不是一一对应时，单一 notify 天然有丢信号风险。

### 第二步扩展② 故障推演：一生产两消费的"集体沉睡"

- 两个消费者等"非空"，一个生产者等"不满"。
- 生产者放入后调 notify，按队列顺序唤醒了另一个生产者。
- 该生产者看到队列已满继续睡。
- 此时消费者全部还在睡，队列非空却无人消费——信号丢失，吞吐归零。
- notifyAll 版本里生产者的这次唤醒会顺带唤醒消费者，系统继续推进。
- 这就是"单一谓词才考虑 notify"的原因。

### 第二步扩展③ 取舍：从惊群到精准唤醒的三个台阶

- 台阶一：notifyAll 加 while，最保守、最难错。
- 台阶二：ReentrantLock 拆多个 Condition，put 线程 signal notEmpty 队列、take 线程 signal notFull 队列，只叫醒相关方。
- 台阶三：BlockingQueue、Semaphore 等容器内部已经处理好通知语义。
- 手写 notify 的合理场景基本只剩教学和极小工具类，业务代码优先容器。

## 案例

### 第三步发散·验证与推演 对照操作：丢失唤醒的复现与修复

- 教学验证：容量 1 队列，2 生产者 2 消费者，全部用 notify。
- 预期运行若干轮后出现所有线程 WAITING、任务总数不达标的卡死。
- 把 notify 换成 notifyAll 或拆两个 Condition 后，同一脚本可完成。
- 复现依赖调度顺序，需多次运行。
- 修复后的版本应当长期稳定。

### 第三步发散·追问① 追问：notifyAll 会不会导致"惊群"拖垮性能

- 唤醒本身不执行业务，醒来者抢锁失败就回去睡，主要代价是上下文切换与缓存行竞争。
- 等待者成百上千时确实可观，此时应优先 Condition 分队列或信号量计数，而不是放弃 notifyAll 退回 notify。
- 正确性优先于唤醒开销，这是 wait/notify 体系里不可让步的顺序。

## 总结点

1. 谓词不止一个，就别只叫一个人
2. notifyAll 先保证不错过
3. 能拆 Condition 就别惊群
