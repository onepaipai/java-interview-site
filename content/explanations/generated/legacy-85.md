<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

1. REQUIRED 加入或新建，REQUIRES_NEW 挂起外层并开独立事务。
2. NESTED 依赖保存点支持；SUPPORTS、NOT_SUPPORTED 决定是否参与。
3. MANDATORY 要求已有事务，NEVER 拒绝已有事务；连接预算也要考虑嵌套。

## 参考分析

1. 内部将共享事务标为回滚后，外层捕获异常也可能在提交时报 UnexpectedRollbackException。
2. 提交后写库需新事务边界。

## 案例

1. 场景（教学示例）：订单失败后仍要独立保存失败审计。
2. 处理：审计服务使用明确的独立事务并估算额外连接需求；核心订单异常继续正确传播。

3. 验证：订单回滚而审计保留；若审计失败有告警，不把独立提交误当跨库原子性。

## 总结点

1. 传播决定提交边界。
2. 跨库不自动同事务。
