<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/atomic-ddl.html)
- [MySQL 8.4 参考 · 3](https://dev.mysql.com/doc/refman/8.4/en/backup-and-recovery.html)

</details>

## 参考回答

1. 删列或不可逆数据转换会丢失信息，反向 DDL 无法自动找回；部分语句还会隐式提交。
2. 优先兼容阶段与向前修复，准备经过演练的备份，回退要协调结构、数据和应用版本。

## 参考分析

1. 原子 DDL 的崩溃一致性不等于允许用户随时用 ROLLBACK 撤销 DDL。
2. 回滚脚本也有锁、时长和失败风险，需要验证真实数据和中间状态。

## 案例

1. 教学场景：汇总后删除明细列，反向脚本只能建回空列。

2. 标出不可逆步骤，推迟收缩，验证备份恢复、向前修复与新数据保留。

3. 预期重建列不被误当恢复原值，回退期间各版本仍有明确读写规则。

## 总结点

1. 结构反向不等于数据恢复。
2. 兼容与向前修复优先设计。
