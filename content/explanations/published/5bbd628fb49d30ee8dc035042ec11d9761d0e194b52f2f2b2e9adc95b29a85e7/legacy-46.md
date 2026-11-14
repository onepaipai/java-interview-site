<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/delete.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/truncate-table.html)
- [MySQL 8.4 参考 · 3](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html)

</details>

## 参考回答

1. DELETE 删除匹配行，保留表结构，InnoDB 事务内可按条件回滚；DROP 删除对象结构和数据，TRUNCATE 清空表但保留其定义。
2. MySQL DROP、TRUNCATE 通常是有隐式提交语义的 DDL，不能当作可随用户事务任意回滚的批量 DELETE。

## 参考分析

1. TRUNCATE 与 DELETE 在触发器、计数器、外键限制和日志处理上不同，不能说 TRUNCATE 完全不记日志。
2. 原子 DDL 保护崩溃一致性，不等于用户执行 ROLLBACK 可以恢复已经清空的数据。

## 案例

1. 教学场景：隔离临时测试库需要选择清理方式，误把 TRUNCATE 放事务后期望回滚。

2. 只对专用一次性对象核对三类操作、结构、触发器与事务结果，先记录版本和约束。

3. 预期区别按真实 MySQL 语义报告，不运行任何针对业务库的清表演示，也不以 H2 DDL 行为代替。

## 总结点

1. 行删除与对象操作分清。
2. 隐式提交不能靠回滚兜底。
