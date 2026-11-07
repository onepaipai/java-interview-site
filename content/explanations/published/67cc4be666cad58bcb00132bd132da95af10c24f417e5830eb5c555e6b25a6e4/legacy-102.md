<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/optimization.html)

</details>

## 参考回答

1. 确认具体 DDL 的算法和锁能力，在线也可能等待元数据锁。
2. 变更前排长事务和存量脏数据，评估 I/O、空间与复制压力。
3. 灰度、限速并设置中止阈值，按兼容扩展与收缩设计回退。

## 参考分析

1. 添加非空或唯一约束前须清理存量异常。
2. 算法与锁能力取决于具体 MySQL 版本和 DDL 形式。

## 案例

1. 场景（教学示例）：大表新增唯一业务号，存量存在重复和空值。
2. 处理：先检测并修复异常，兼容发布后分批回填，验证完成再加约束，设置变更中止阈值。

3. 验证：写入无长时间阻塞，约束建立成功；失败可停在兼容状态继续恢复。

## 总结点

1. 在线不等于无锁。
2. 约束之前清存量。
