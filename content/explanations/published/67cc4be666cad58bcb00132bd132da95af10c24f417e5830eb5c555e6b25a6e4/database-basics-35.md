<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/working-with-null.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/create-index.html)

</details>

## 参考回答

1. 普通比较遇到 NULL 得到 UNKNOWN；WHERE 只保留 TRUE，判断空值应使用 IS NULL 或 IS NOT NULL。
2. MySQL 的空值安全相等运算符 <=> 能比较 NULL；不要把 NULL 当成空串或零。
3. MySQL 8.4 唯一索引允许多个 NULL；若业务要求字段必填且唯一，应同时定义 NOT NULL 和 UNIQUE。

## 案例

1. 场景（教学示例）：邮箱列有唯一索引，但允许缺失；两行邮箱均为 NULL。

2. 目标 MySQL 8.4 SQL：分别验证普通比较、空值判断和空值安全比较。

```sql
CREATE TABLE demo_null (id BIGINT PRIMARY KEY, email VARCHAR(80) UNIQUE);
INSERT INTO demo_null VALUES (1, NULL), (2, NULL);
SELECT COUNT(*) FROM demo_null WHERE email = NULL;   -- 预期 0
SELECT COUNT(*) FROM demo_null WHERE email IS NULL;  -- 预期 2
SELECT NULL <=> NULL;                               -- 预期 1
```

3. 边界验证：相同非空邮箱第二次插入应被唯一约束拒绝；若改为必填，先处理已有 NULL 再增加 NOT NULL，不能用空串统一替换后直接加唯一约束。

## 总结点

1. NULL 比较先辨三值逻辑。
2. 必填唯一需要两项约束。
