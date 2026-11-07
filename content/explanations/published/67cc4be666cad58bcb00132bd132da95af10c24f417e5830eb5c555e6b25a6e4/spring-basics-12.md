<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/rolling-back.html)

</details>

## 参考回答

1. 通常默认对 RuntimeException 和 Error 回滚；受检异常若代表业务失败，需配置 rollbackFor 或明确回滚状态。
2. 异常被方法捕获后正常返回，拦截器看不到该异常；不能假定所有捕获都自动回滚。
3. 加入外层共享事务后，内层可能已标记 rollback-only；外层吞异常也可能在提交时收到 UnexpectedRollbackException。

## 案例

1. 场景（教学示例）：事务方法插入订单后抛 IOException，调用方在事务外捕获异常。

2. 处理：先用默认注解验证，再添加 rollbackFor=IOException.class；测试本身不包外层事务，异常后用独立连接查询。

3. 预期：在无其他回滚原因的前提下，默认受检异常路径可提交，显式规则路径回滚。另测吞异常及已标记 rollback-only 的区别。

## 总结点

1. 回滚规则看异常和事务状态。
2. 查库验证不要被测试事务掩盖。
