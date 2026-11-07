<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/tx-propagation.html)

</details>

## 参考回答

1. REQUIRED 加入或创建事务；REQUIRES_NEW 建立独立事务并挂起外层；NESTED 在受支持资源上通常使用保存点，最终仍受外层提交约束。
2. SUPPORTS 可参与已有事务，MANDATORY 要求已有事务，NOT_SUPPORTED 非事务执行并挂起已有事务，NEVER 拒绝已有事务。

## 参考分析

1. 传播描述调用遇到已有事务时的关系，不保证一定新建；需说明管理器和资源支持。
2. 独立事务额外占连接且仍可能等外层锁；保存点不提供独立持久提交，自调用还可能绕过内层规则。

## 案例

1. 教学场景：可选附加项失败允许订单继续，独立审计却要求订单失败时仍保留。

2. 分别用保存点与独立事务表达目标，再对照 REQUIRED 的共同回滚，确认调用真正跨边界。

3. 验证最终行数与预期矩阵一致，目标数据库另测锁与连接预算，不靠传播名称猜结果。

## 总结点

1. 传播先看已有事务与资源。
2. 保存点和独立提交不同。
