<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/programmatic.html)

</details>

## 参考回答

1. TransactionTemplate 将需要原子提交的操作显式放入回调，返回后由事务管理器结束边界，适合局部事务编排。
2. 传播、隔离和超时需要显式配置；模板不自动把跨数据库或远程调用合成一个事务。
3. 运行时异常穿出回调会触发回滚；捕获后继续返回时，应明确是否调用 status.setRollbackOnly，避免把失败当正常提交。

## 案例

1. 场景（教学示例）：订单写入失败必须回滚，但失败审计要求另行保存；不依赖同类注解自调用。

2. 处理：订单模板回调只执行本地写入，异常穿出；外部捕获后，用同管理器且显式 REQUIRES_NEW 的审计模板保存失败事实，再传播原异常。

3. 预期：独立查库时订单不存在、审计存在；审计失败单独告警。若在原事务尚未结束时开启独立事务，还需预算额外连接，不能隐藏连接池耗尽风险。

## 总结点

1. 模板回调就是显式事务边界。
2. 传播与失败结果必须说明。
