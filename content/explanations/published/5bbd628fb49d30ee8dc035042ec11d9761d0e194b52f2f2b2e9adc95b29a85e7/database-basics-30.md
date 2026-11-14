<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.sql/java/sql/Statement.html#setQueryTimeout(int))
- [github.com · 2](https://github.com/brettwooldridge/HikariCP#configuration-knobs-baby)

</details>

## 参考回答

1. 连接池获取、建立网络连接、语句执行、锁等待和网络读取是不同阶段，任一无界等待都可能耗尽调用资源。
2. 按整体请求预算分别配置并验证传播，超时不保证服务器立即停止，也不保证事务一定未提交。

## 参考分析

1. 池等待超时不等于 JDBC queryTimeout，驱动 socket 超时也不是严格的业务执行截止时间。
2. 超时后要按驱动与事务状态结束或丢弃连接，对写结果未知使用稳定业务键核对。

## 案例

1. 教学场景：接口总超时 3 秒，连接池却等待 30 秒，线程在调用方离开后继续积压。

2. 分配连接和查询预算，注入连接耗尽、慢 SQL 和锁等待，观察异常及释放。

3. 验证请求失败受控、资源最终归还，提交未知有核对路径，不靠一个超时参数覆盖全部阶段。

## 总结点

1. 获取、执行、锁与网络分阶段。
2. 超时后仍需核对状态和释放。
