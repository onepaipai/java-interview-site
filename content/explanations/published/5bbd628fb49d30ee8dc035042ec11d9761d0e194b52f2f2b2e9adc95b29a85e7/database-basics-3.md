<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/index-condition-pushdown-optimization.html)

</details>

## 参考回答

1. 最左前缀描述联合索引的有序定位能力，不代表后续列完全失去过滤、覆盖或排序用途。
2. 在 (tenant_id, created_at, status) 上按租户等值、时间范围查询，status 通常不能继续缩窄同一范围，但可能下推过滤。
3. Using index condition 是下推，减少回表；Using index 常表示覆盖访问，两者不能混为一谈。
4. 缺少前导列时仍可能选全索引扫描或受条件限制的跳跃扫描；是否划算要看实际扫描量与耗时。
5. 是否免排序还取决于列序、方向和条件；用了联合索引不等于扫描少、没有回表或没有 filesort。

## 案例

1. 场景（教学示例）：已有 (tenant_id, created_at, status) 索引，按租户、时间段和状态查询非索引列 payload。

2. 处理：在同一测试数据上核对扫描范围与下推，再将投影改为索引列比较覆盖访问。

```sql
-- MySQL 8.4；表需已有 idx_tenant_time_status
EXPLAIN SELECT payload FROM orders
WHERE tenant_id = 42
  AND created_at >= '2026-10-01'
  AND created_at <  '2026-11-01'
  AND status = 'PAID';

EXPLAIN SELECT tenant_id, created_at, status FROM orders
WHERE tenant_id = 42
  AND created_at >= '2026-10-01'
  AND created_at <  '2026-11-01'
  AND status = 'PAID';
```

3. 结果判断：若首条计划显示 Using index condition，status 参与了下推；第二条可能成为覆盖访问，具体由实际计划确认。

4. 反例验证：把 status 改成占比很低的值；即使回表少，时间范围内扫描仍可能很多，不能据此认定现有列序最优。

## 总结点

1. 定位、过滤、覆盖分开看。
2. 范围后列仍可参与下推。
3. 用了索引不等于扫描少。
