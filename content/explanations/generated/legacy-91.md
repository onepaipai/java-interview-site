<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/service-level-objectives/)
- [事件溯源设计说明 · 2](https://martinfowler.com/articles/patterns-of-distributed-systems/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银事件沙盘:支付成功→发布事件→库存/通知/积分各自监听——Spring 事件(ApplicationEvent+@EventListener)+@Async 异步监听(AFTER_COMMIT 事务事件,第 91 题 spring-advanced 的完整版)。

1. Spring 事件:publishEvent(event)→@EventListener 接收——同步(默认同线程)与异步(@Async+@EventListener);事务事件:@TransactionalEventListener(AFTER_COMMIT——事务提交后才执行)。
2. @Async 原理:代理拦截→提交线程池→新线程执行,调用方立即返回(Future/void);需 @EnableAsync;默认池=SimpleAsyncTaskExecutor(每次新建线程,无上限)→必须自定义 ThreadPoolTaskExecutor(第 24 题同源)。
3. AFTER_COMMIT 的坑:事务提交后执行——事务内修改的数据此时可见(对外可见);AFTER_COMMIT 中不能再操作同一事务(事务已结束——需新事务 REQUIRES_NEW 或 @Async);afterCommit 不触发(如果事务回滚了——Transactional 测试的盲区,第 42 题 spring-basics)。

## 参考分析

### 第二步扩展① 机制:同步事件与异步事件的选择

- 同步事件(默认):同线程执行(事务上下文共享,异常可传播到发布者)——适合"紧耦合的后续处理"(同事务)。
- 异步事件(@Async):新线程执行(事务上下文丢失,异常不传播)——适合"解耦的后续处理"(通知/审计,不需要同事务)。
- AFTER_COMMIT:事务成功后执行——适合"事务成功后的副作用"(发通知/更新缓存)。

### 第二步扩展② 反例:事件机制的两种事故

- 事故一:同步事件阻塞主流程——事件监听器执行 3 秒→调用方等 3 秒(事件本意是解耦但实际阻塞)。
- 修复=@Async 异步监听(解耦)。
- 事故二:AFTER_COMMIT 中访问事务内数据——事务已提交,数据对外可见,但 AFTER_COMMIT 中修改的数据不在原事务内(需要新事务)。
- 修复=AFTER_COMMIT 中只读不写或用 @Async(REQUIRES_NEW)。

### 第二步扩展③ 取舍:事件 vs 直接调用的选择

- 事件:解耦(发布者不感知观察者)+可扩展(新增观察者不改发布者)+单向(发布者不知道结果)。
- 直接调用:可控(返回值/异常)+事务一致(同事务)——核心业务用直接调用(需要结果),后续处理用事件(解耦)——"是否需要结果"决定用事件还是调用。

## 案例

### 第三步发散·验证与推演 验证:事件机制的走查核对

- 验证:同步事件断言(发布→监听器同线程执行)。
- 异步事件断言(@Async 监听器在新线程执行)。
- AFTER_COMMIT 断言(事务提交后才触发——事务内不触发)。
- Transactional 测试盲区断言(AFTER_COMMIT 在自动回滚测试中不触发——第 42 题盲区)。
- 验证:事件时序断言可程序化(日志顺序+线程名)。

### 第三步发散·追问扩展 追问链:事件三刀

- **Q1：事件的有序执行?**
  - 答：@EventListener 的 order 属性(数值小先执行)或 SmartApplicationListener(支持泛型+排序)——多观察者的执行顺序可控制。
- **Q2：事件的异步线程池?**
  - 答：@Async 的线程池=AsyncConfigurer.getAsyncExecutor(全局配置)或 @Async("beanName")(指定池)——不同事件用不同池(隔离,第 11 题)。
- **Q3：事件的事务传播?**
  - 答：@TransactionalEventListener(phase=AFTER_COMMIT, propagation=REQUIRES_NEW)——AFTER_COMMIT 中默认 REQUIRES_NEW(新事务,否则无事务上下文)。

## 总结点

1. 同步=同线程,异步=新线程
2. AFTER_COMMIT=事务成功后执行
3. @Async 必须自定义线程池
