<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/CountDownLatch.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/CyclicBarrier.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：并行压测工具用 50 个线程同时起跑（Barrier），跑完后主线程汇总结果（Latch）。对照两种工具的复用性、异常传播与角色数量，说明为什么同一场景不能互换。

1. CountDownLatch 是一次性倒计数门闩：一个或多个线程等"事件集合完成"，计数到零后不能重置，适合"等待完成"。
2. CyclicBarrier 是可重用集合点：固定数量的线程互相等对方到齐再一起走，适合"分阶段同步"，可传 barrierAction 在放行时执行。
3. 两者角色不同：Latch 是"等多件事"，等待者与被计数的事件通常不同线程；Barrier 是"等人到齐"，参与者彼此对称。

## 参考分析

### 机制：门闩只管开一次，集合点按轮次循环

Latch 类比赛跑发令：倒计时牌归零那一刻全场起跑，这张牌不能再用。Barrier 类比徒步小队每个岔路口集合点名：到齐后商量一句（barrierAction）再出发，下一路口重复。实现上 Latch 由 countDown 递减、await 等零；Barrier 由各方 await 相互等待，触发动作后自动进入下一轮（generation 机制），更适合循环体里的阶段同步。

### 边界：Latch 不可重置与 Barrier 的破碎

Latch 到零即失效，第二轮压测要新建对象；需要周期性翻转的门闩应该用 Semaphore 或 Phaser。Barrier 若有参与者超时或中断会 broken，本轮全体 await 抛 BrokenBarrierException，必须 reset 或重建——这既是保护（避免死等）也是负担（调用方要处理破碎）。参与者数量必须与构造值精确匹配，动态加减人换 Phaser。

### 取舍：从工具到更高层抽象

分阶段并行计算可用 CompletableFuture.allOf 汇聚，框架级并行用 parallelStream 或结构化并发（Java 21+），它们内部同样是这些原语。手写 Latch/Barrier 的合理场景是库代码与教学；业务代码里"互相等待"的需求一旦复杂，先想 Phaser 或任务编排层，而不是往 Barrier 上堆逻辑。

## 案例

### 对照操作：压测工具的两段式同步

教学验证：50 个工作线程在 Barrier.await 后记录起始时间戳执行任务，主线程在 Latch.await 后统计全部结束时间。预期各线程起始时间差在毫秒级（真正同时起跑），主线程能精确统计总时长；把 Barrier 换成各自 sleep 对齐则起跑差明显放大。第二轮运行时重建两个对象，验证 Latch 不可复用。

### 追问：barrierAction 与 latch 计数到零后执行有什么不同

Barrier 的动作由"最后到达的那个线程"执行，执行完才放行全体，天然成为阶段切换点；Latch 只能由等待方在 await 返回后自己做事，触发时机在所有 countDown 之后。需要"到齐后先做一件事再继续"，Barrier 的语义直接；需要"全部完成后主线程收尾"，Latch 更简单。

## 总结点

1. Latch 等完成，Barrier 等到齐
2. 门闩一次开，集合点按轮转
3. 人要对齐数，破了要重整
