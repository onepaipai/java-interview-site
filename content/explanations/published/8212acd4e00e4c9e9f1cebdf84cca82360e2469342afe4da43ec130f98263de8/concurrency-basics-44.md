<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/Semaphore.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：导出接口用 Semaphore(5) 限制并发，任务中途抛异常。对照四种释放方式：finally release、tryAcquire 超时、自动关闭的封装、以及锁场景的 unlock 位置，推演泄漏许可如何演变成永久不可用。

1. 释放必须绑定在"获取成功之后必达"的路径上：finally 是最低保障，显式锁则要求 lock 与 unlock 在同一方法内一前一后，禁止跨方法传递锁责任。
2. 异常不是泄漏的唯一来源：提前 return、条件分支里忘记释放、装饰链中某个包装没透传，都会让"看起来会执行"的释放落空。
3. 许可/锁泄漏的症状是容量单调衰减：可用许可从 5 缓慢降到 0 后接口永久拒绝，重启前无法恢复——监控可用许可数是最后的防线。

## 参考分析

### 第二步扩展① 机制：获取与释放是一对"事务边界"

- acquire 成功等于借出一份额度，release 归还。
- 任何路径只借不还，总额度单调减少。
- 类比共享雨伞：借伞登记与还伞登记必须同一张单据管到底（finally），交给别人代还（跨方法传递）就靠对方自觉。
- 显式锁更严格：unlock 必须由持锁线程调用且通常在获取它的同一方法里配对，跨方法还锁几乎必然在某个异常路径漏掉。

### 第二步扩展② 故障推演：一天之内许可归零

- 导出任务在解析阶段偶发抛出（脏数据），catch 在外层记录但 release 写在 catch 之后的主路径上。
- 每天失败 3 次，许可可用数从 5 逐步下降。
- 两天后接口全部返回"系统繁忙"，重启才恢复。
- 期间的"系统繁忙"日志被当作正常限流忽略——缺少"可用许可数"指标是放大器。

### 第二步扩展③ 取舍：封装优于纪律

- 纪律（记得 finally）依赖人的状态，封装把正确性固化：自定义 AcquireRelease 工具（acquire 后返回 AutoCloseable，try-with-resources 归还）或 AOP 切面统一处理。
- 锁的封装同理：包装 runWithLock(Supplier) 而不是让每个调用点手写 lock/unlock。
- 第三方工具类（如 Guava 的 striped 锁封装）同样把配对写进结构。

## 案例

### 第三步发散·验证与推演 对照操作：泄漏的量化与修复

- 教学验证：5 许可信号量，任务 10% 概率抛异常且异常路径不 release。
- 预期可用许可数随执行单调下降，约 50 次后 tryAcquire 恒 false。
- 改为 finally release 后许可数恒定，失败任务正常释放。
- 再把 release 放进 AutoCloseable 封装验证 try-with-resources 写法。
- 全部代码可复跑，指标曲线清晰。

### 第三步发散·追问① 追问：reentrantLock 忘记 unlock 会怎样

- 锁被永久持有：其他线程全部排队，直到持锁线程结束（线程池线程不死，等于永远）。
- 转储可见所有竞争者 WAITING 在同一锁上，持锁线程栈指向业务方法——这是最容易定位也最常见的锁事故。
- finally 解锁不是风格问题，是锁的生存语义。

## 总结点

1. 借还要同一张单，finally 是底线
2. 锁不跨方法，封装固化配对
3. 监控可用许可，衰减即是报警
