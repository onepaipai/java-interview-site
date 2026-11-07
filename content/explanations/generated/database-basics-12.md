<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/explain.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-information-schema-transactions.html)

</details>

## 参考回答

1. 先区分执行扫描、锁等待、应用往返和结果传输；索引只减少部分访问成本，不能解决所有慢请求。
2. 对照实际行数与返回行数，检查过滤、回表、排序和计划估算偏差；不能把 EXPLAIN 的估算 rows 当实测。
3. 先确定占主导的耗时再改查询或索引，用相同参数分布验证总延迟、写入成本及回归范围。

## 案例

1. 场景（教学示例）：列表只返回 20 条，但慢日志显示检查了大量历史订单；另一个请求实际耗在行锁等待。

2. 处理：为扫描样本核对 WHERE、索引前缀和实际计划，为等待样本找阻塞事务与持锁原因；分别在可控环境复现。

3. 预期：索引调整应减少前一类无效访问；后一类须缩短或解除阻塞事务。只看返回 20 条或盲目加索引不能解释两种耗时。

## 总结点

1. 返回少不代表扫描少。
2. 先定位耗时再选择优化手段。
