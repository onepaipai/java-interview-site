<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/datetime.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/date-and-time-functions.html)

</details>

## 参考回答

1. 数据库可统一持久化入口时间，应用便于表达业务发生时点与测试；先区分发生、接收、提交等语义。
2. 约定来源、UTC 或明确时区及精度；时间戳不保证多节点全序，排序可加稳定序号或 ID。

## 参考分析

1. 应用时钟可能漂移，数据库函数也有语句相关语义，不能默认等于提交瞬间。
2. TIMESTAMP 与 DATETIME 的范围和时区转换不同，展示需遵守接口协议。

## 案例

1. 教学场景：节点混用秒与毫秒，审计错序，延迟事件又被接收时间覆盖。

2. 区分发生和接收字段，统一转换，注入 Clock 测试应用生成路径。

3. 验证跨时区、精度截断与并列排序，补发保留原事实时间。

## 总结点

1. 先定义时间业务语义。
2. 来源、时区与精度一致。
