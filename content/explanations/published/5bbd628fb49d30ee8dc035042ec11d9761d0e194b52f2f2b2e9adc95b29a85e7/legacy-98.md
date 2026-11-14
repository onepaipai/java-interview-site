<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/optimization.html)

</details>

## 参考回答

1. 先用慢日志、调用分布与业务 SLO 确认目标查询。
2. 看访问路径、估算与实际行数、回表、排序和等待。
3. 可控环境用 EXPLAIN ANALYZE 实测，修改后验证不同数据分布及写成本。

## 参考分析

1. 热点值和过时统计会影响计划。
2. 覆盖索引变宽会增加写放大。
3. LIMIT 不保证前面扫描少。

## 案例

1. 场景（教学示例）：普通用户很快，超级大户同一查询很慢。
2. 处理：分数据分布查看实际计划与扫描行数，调整索引或查询路径，检查 Buffer Pool 和 I/O。

```sql
EXPLAIN ANALYZE
SELECT id FROM orders
WHERE user_id = 7 ORDER BY created_at DESC LIMIT 20;
-- 会实际执行查询，仅在可控环境分析。
```

3. 验证：两类用户均满足预算；记录回归范围，不用强制索引掩盖统计根因。

## 总结点

1. 计划看数据分布。
2. LIMIT 不等于少扫描。
