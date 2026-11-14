<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/optimization.html)

</details>

## 参考回答

1. 深 offset 会跳过大量前序记录，索引命中也可能昂贵。
2. 顺序翻页用时间加唯一 ID 的游标，必要时延迟关联减少回表。
3. 先定义跳页、并发变化和稳定排序语义，再选技术方案。

## 参考分析

1. 只用时间做游标会丢掉同一时刻的记录。
2. 并发变化下还须约定快照或接受内容漂移。

## 案例

1. 场景（教学示例）：事件列表按时间升序持续翻页。
2. 处理：用 (created_at,id) 游标与同序索引，参数化传递上一页末项。

```sql
SELECT id, created_at FROM events
WHERE created_at > :time
   OR (created_at = :time AND id > :id)
ORDER BY created_at, id LIMIT 20;
```

3. 验证：相同时间的数据不漏读；删除和新增行为符合产品约定。

## 总结点

1. 游标带唯一键。
2. 稳定排序再翻页。
