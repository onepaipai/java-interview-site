<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/insert-optimization.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/packet-too-large.html)

</details>

## 参考回答

1. 批量减少往返，但大语句和事务增加包、内存、日志、锁与失败成本；驱动实际批处理行为也要确认。
2. 按字节、行数与业务预算分批，明确每批提交、部分成功和重复恢复语义。

## 参考分析

1. 多值 INSERT、JDBC batch 和多个单行事务不相同，数组长度不代表真实 SQL 形态。
2. 固定一万行未必适合大字段或热点表，需实测吞吐和尾延迟。

## 案例

1. 教学场景：十万条长文本单批导入超过包限制，失败重跑又产生重复。

2. 按行和字节双重限额分批，使用稳定导入键和检查点，观察驱动发送。

3. 验证中途失败可恢复，普通请求仍有资源，合法数据不静默丢失。

## 总结点

1. 批量受资源和失败成本约束。
2. 分批提交定义恢复协议。
