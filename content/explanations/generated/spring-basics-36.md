<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银事件沙盘:EventListener 默认同步发布线程内执行发布者被监听器阻塞;加 Async 才异步——异步需要显式声明。

1. 默认同步 EventListener 默认在发布线程执行同步发布者等监听器完成监听器慢等于发布者被阻塞。异步加 Async 加 EventListener 监听器在独立线程执行发布者不等。
2. 事务事件 TransactionalEventListener AFTER_COMMIT 等默认也在发布线程执行事务提交后同线程;加 Async 才异步事务事件。
3. 同步的风险监听器异常影响发布者 AFTER_COMMIT 阶段异常被吞 BEFORE_COMMIT 异常事务回滚——同步监听器的异常语义不同于异步。

## 参考分析

### 第二步扩展① 机制:同步与异步的执行模型

- 默认同步:EventListener 在发布线程执行(发布者等监听器完成——监听器慢等于发布者被阻塞)。
- 异步:加 @Async 后监听器在独立线程执行(发布者不等)。
- 事务事件:TransactionalEventListener 按 phase 触发(AFTER_COMMIT 等)——阶段语义决定执行时机。

### 第二步扩展② 反例:同步监听器的阻塞

- 沙盘:事件发布者调用慢监听器(5 秒)——发布者线程被阻塞 5 秒——接口 P99 上升。
- 修复:监听器加 @Async(独立线程执行)+配置事件专用线程池(隔离,第 37 题 distributed 聚合隔离)。
- 验证:线程名断言(发布线程 vs 监听线程不同)。

### 第二步扩展③ 取舍:同步与异步的监听器

- 同步(不加 @Async):强一致动作(BEFORE_COMMIT 的校验/修正——事务内完成)。
- 异步(加 @Async):独立副作用(通知/审计/积分)——按"失败时是否需要回滚主事务"选。

## 案例

### 第三步发散·验证与推演 验证:同步默认的断言组

- 验证:同步断言(EventListener 在发布线程执行线程名断言)。
- 异步对照断言(Async EventListener 在独立线程执行线程名不同)。
- 事务阶段断言(AFTER_COMMIT 在提交后触发事务内发布不触发)——三组固化事件监听器的执行模型。

### 第三步发散·发散要点 追问链:事件监听三刀

- **追问①**：事件的线程池 Async 事件用 EnableAsync 的执行器事件专用线程池隔离
- **追问②**：事件的顺序同一线程内按发布序异步后无序多线程——异步事件的顺序不可保证
- **追问③**：事件的条件 TransactionalEventListener condition SpEL 条件过滤事件的条件订阅

## 总结点

1. EventListener 默认同步
2. Async 加 EventListener 才异步
3. AFTER_COMMIT 也在发布线程
