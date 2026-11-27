<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/locks/StampedLock.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：把 StampedLock 替换进一个回调密集的模块后出现同线程自死锁。从"锁不记录持有者"这一设计出发，解释不可重入、升级风险与适用边界，给出选择清单。

1. StampedLock 不记录持有者：同一线程再次获取写锁会永久阻塞（自己在等自己释放），ReentrantLock 的重入语义在这里不存在。
2. 读锁升级到写锁的标准写法（tryConvertToWriteLock）也可能失败返回 0——升级不是权利而是尝试，失败要先释放读锁再取写锁，中间存在窗口。
3. 因此它适合"短、平、直"的临界区：方法内取锁、用完即放、无嵌套调用；回调、递归、模板方法里会隐式二次加锁的流程都不适合。

## 参考分析

### 第二步扩展① 机制：省掉持有者记录，换来更轻的锁

- 可重入需要记录持有线程与重入计数（每次加解锁都要簿记），StampedLock 为追求读路径极简省掉了这套簿记。
- 类比不记名的纸质门票：进出全靠票根（stamp），同一人重复刷卡没有"身份识别"机制，第二次刷直接拒——拒了自己就是死锁。

### 第二步扩展② 故障推演：回调链里的自死锁

- 服务方法持写锁后调用监听器回调，回调里调用同一服务的另一个查询方法（内部也取写锁）：同线程第二次获取永久阻塞，调用方全部卡死。
- jstack 特征：线程 RUNNABLE 停在 acquire 写（或 WAITING），没有任何锁竞争对象——因为"对手"是自己。
- 排查时把 StampedLock 出现在递归路径上列为红旗。

### 第二步扩展③ 取舍：与 ReentrantReadWriteLock 的选择清单

- 选 StampedLock：临界区短且封闭、读远多于写、能保证无嵌套、可接受失败重试（乐观读）。
- 选 ReentrantReadWriteLock：需要重入、需要与 Condition 配合、临界区含可能二次加锁的回调、可读性优先。
- 清单的核心问题一句话：这段代码里会不会"锁着又锁"。

## 案例

### 第三步发散·验证与推演 对照操作：自死锁最小复现

- 教学验证：方法 A 获写锁后调用方法 B（也取写锁）。
- 预期：调用 A 的线程永久卡在 B 的获取处，jstack 显示单线程停在 StampedLock.acquire 无其他竞争者。
- 对照 ReentrantReadWriteLock 同结构代码正常重入。
- 实验可复跑，是"不可重入"的最短证明。

### 第三步发散·追问① 追问：能否包一层计数器做成可重入

- 可以（ThreadLocal 记录重入深度），但每个加解锁点都要判断与递减，漏一处就泄漏。
- 且 ThreadLocal 在线程池里的清理问题（并发基础第 11 题）一并引入。
- 改造完成后它的轻量优势所剩无几——需要重入就该直接用 ReentrantReadWriteLock，别造一个更贵的轮子。

## 总结点

1. 不记名票据，重刷即自锁
2. 升级是尝试，不是权利
3. 短平直才用，回调密集绕行
