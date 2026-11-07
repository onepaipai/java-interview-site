<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/event.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/transaction/event/TransactionalEventListener.html)

</details>

## 参考回答

1. BEFORE_COMMIT 用于提交前处理；AFTER_COMMIT 默认在成功提交后处理。
2. AFTER_ROLLBACK 只处理回滚；AFTER_COMPLETION 处理提交或回滚后的收尾。
3. 没有事务时默认不执行；显式开启 fallbackExecution 才允许无事务执行。
4. 提交后需要落库的新写入，应通过独立事务边界提交；可靠投递还需 Outbox 等机制。

## 参考分析

1. 阶段选择取决于需要看到的事务结果，而不是事件发布代码的位置。
2. 提交后的监听不参与原事务的再次提交，不能把它当作可靠消息队列。
3. 回滚阶段可做失败清理；需要持久化失败审计时另开事务，并处理审计失败。

## 案例

1. 场景（教学示例）：订单事务内发布 OrderCreated，成功后通知，失败后清理临时资源。

2. 处理：通知监听选 AFTER_COMMIT，失败清理选 AFTER_ROLLBACK；公共收尾才选 AFTER_COMPLETION。

3. 验证：提交时只触发成功通知，主动回滚时只触发失败清理；BEFORE_COMMIT 在提交动作前运行。

4. 边界验证：从无事务入口发布事件，默认监听不执行；单独验证开启 fallbackExecution 后的行为。

## 总结点

1. 先看提交结果，再选阶段。
2. 默认提交后，无事务不触发。
3. 可靠投递另做保障。
