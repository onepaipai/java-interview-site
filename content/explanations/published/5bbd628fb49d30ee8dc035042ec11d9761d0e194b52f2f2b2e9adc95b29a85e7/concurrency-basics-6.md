<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Object.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：容量为 1 的阻塞缓冲区，生产者与消费者用 synchronized 加 wait/notifyAll 交换任务。推演虚假唤醒、notify 后条件被他人改走两类场景，验证 while 判断为何不可换成 if。

1. wait 返回时条件未必成立：虚假唤醒本身允许发生，且 notifyAll 唤醒的所有竞争者中只有部分能重新持锁。
2. 持锁到重新执行之间，条件可能被其他线程改变，if 只判断一次，条件已假却继续执行。
3. 规范写法是在循环里 while (!condition) wait()，把"被唤醒"与"条件成立"两件事分开验证。

## 参考分析

### 机制：唤醒只是"去看看"，不是"轮到你了"

Object.wait 的契约是释放锁并挂起，被唤醒后重新排队抢锁，抢到才从 wait 返回。虚假唤醒（spurious wakeup）允许无 notify 也醒来，类比为排队叫号系统偶尔误响：被叫到号不代表票还有，必须再看一眼屏幕。条件谓词（如 notFull）与等待队列是两套状态，notifyAll 只改变后者。

### 反例：if 版本的两种事故

事故一：if 判断队列已满后进入 wait，虚假唤醒直接执行 put，越界覆盖。事故二：两个消费者都在等"队列非空"，生产者 notify 后只该有一个消费，但消费者甲抢到锁取走任务并 notify；乙随后获锁，从 if 内的 wait 返回后不再判断，直接取空队列抛异常。两例的根因相同：把"醒过"误当"条件成立"。

### 取舍：while 加 notifyAll 是保守正确解

while 循环让每个醒来者重新自证条件，配合 notifyAll 保证没有任何谓词被漏掉，代价是惊群与反复抢锁。性能敏感且谓词单一时可用 ReentrantLock 配多个 Condition 精准唤醒，或直接用 ArrayBlockingQueue 等现成实现。自己手写等待队列前，先确认现有并发容器确实不满足。

## 案例

### 对照操作：if 版本在多消费者下失败

教学验证：容量 1 的手写队列，2 个消费者线程各循环消费 50 次，生产者逐个放入并使用 notify（而非 notifyAll）。预期 if 版本出现越界异常或计数丢失，while 版本稳定完成且总量正确。该复现依赖时序，非 notifyAll 版本需多次运行才暴露，结论以规范推演为主、实验为辅。

### 追问：Condition.await 为什么同样要循环

await 与 wait 是同一套契约：释放锁、挂起、醒来重抢锁，虚假唤醒同样存在，Lock 的 Javadoc 明确要求循环等待。多个 Condition（notFull 与 notEmpty）解决的是"通知给谁"更精准，"醒来先验条件"这条纪律不变。

## 总结点

1. 醒来先验条件，while 不 if
2. 唤醒是提示不是凭证
3. 票可能已售罄，再看一眼屏幕
