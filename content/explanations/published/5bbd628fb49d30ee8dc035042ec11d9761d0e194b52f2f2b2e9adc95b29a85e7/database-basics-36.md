<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/charset-collation-effect.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/charset-unicode-sets.html)

</details>

## 参考回答

1. 字符集决定字符表示，排序规则决定比较和排序，可能影响大小写、重音和尾空格语义，进而改变唯一性。
2. 明确账号与业务编码规范，迁移前检查目标规则下的冲突，不能只看显示文字不同。

## 参考分析

1. 不区分大小写或重音的规则可能把不同输入视为相等，具体行为按目标 collation 核对。
2. 二进制比较也不自动完成业务清洗和 Unicode 规范化，应与应用契约一致。

## 案例

1. 教学场景：更换排序规则后旧账号被视为相同，建立唯一索引失败。

2. 在隔离目标库测试大小写、重音、组合字符及尾空格，列出冲突数据处置方案。

3. 验证登录、查询和唯一约束一致，不让迁移静默合并身份。

## 总结点

1. 比较规则决定数据库等值。
2. 迁移前检查目标规则冲突。
