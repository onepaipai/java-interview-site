<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/optimization.html)

</details>

## 参考回答

1. 复制链路由源端日志、传输及副本应用组成，监控进度与业务可见性。
2. 大事务、热点和副本资源不足都可能增加延迟。
3. 关键提交后读取走权威节点或等待对应进度，不能只固定 sleep。

## 参考分析

1. 半同步确认不等于副本已重放。
2. 旧失效事件不能覆盖新数据。
3. 关键读取需跟随已提交的进度。

## 案例

1. 场景（教学示例）：支付成功后主库故障并切换，副本查询不到交易。
2. 处理：冻结不确定结果的重发，核对已确认日志与新主进度，再恢复交易并执行对账。

3. 验证：不会因暂时缺失创建第二笔支付；明确实际 RPO 和无法证明的窗口。

## 总结点

1. 复制确认不等于可读。
2. 未知交易先核对。
