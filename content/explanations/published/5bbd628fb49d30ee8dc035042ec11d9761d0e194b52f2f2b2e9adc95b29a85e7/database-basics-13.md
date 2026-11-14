<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html)

</details>

## 参考回答

1. COUNT 星号统计行，COUNT 列忽略该列的 null。
2. 统计优化前先确认业务是否允许空值，不能为了性能随意改写语义。

## 参考分析

1. COUNT(*) 统计结果行，COUNT(col) 只统计该表达式非 NULL 的行。
2. 零值与空串通常仍是值，外连接空扩展行尤其容易让两者差一。

## 案例

1. 场景（教学示例）：三行 amount 分别为 10、NULL、0。

2. 处理：执行 COUNT(*)、COUNT(amount)，再用左连接统计某客户订单时比较 COUNT(*) 与 COUNT(order.id)。

3. 验证：前两者为 3 与 2；无订单客户的连接行数不能冒充一笔订单，优化不得改统计语义。

## 总结点

1. 星号数行列名忽略空。
2. 连接统计先看计数对象。
