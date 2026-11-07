<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/event.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)

</details>

## 参考回答

1. 回调时可能仍绑定已完成事务的资源，后续写入不能假设获得新事务。
2. 应显式开启合适的新事务或交给独立工作单元。

## 参考分析

1. 提交后仍可能绑定旧事务资源，但不会自动再次提交新的业务写入。
2. 需要落库的后续动作经独立代理开新事务，关键可靠动作还要防提交后进程退出。

## 案例

1. 场景（教学示例）：订单提交后的监听需要保存审计行。

2. 处理：审计交给独立 Bean 的 REQUIRES_NEW 方法，回滚与提交路径分别验证；可靠任务改用持久 outbox。

3. 验证：订单已提交，审计通过独立事务持久化；审计失败被记录，不宣称内存回调具备可靠投递。

## 总结点

1. 提交后不自动有新事务。
2. 独立写入明确新边界。
