<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)

</details>

## 参考回答

1. 查询所需列可由所选索引取得时，可减少因缺少列而访问聚簇记录的需要；InnoDB 二级索引通常包含主键。
2. 覆盖针对具体查询与索引，不意味着任意索引查询都不回表，也不宜把所有列都塞进索引。

## 参考分析

1. 改变 SELECT 列表可能让原覆盖关系消失，过滤、排序与可见性处理也应按实际计划分析。
2. 宽索引增加空间、缓存和写维护成本，收益应由高频访问与混合负载证明。

## 案例

1. 教学场景：列表只取租户订单 ID 和状态，原 SQL 却额外读取大备注字段。

2. 收窄返回列并比较候选索引，记录计划、读行与 IO，再测试写入开销。

3. 预期能解释哪些数据从索引取得，删除多余列不改变客户端契约；不凭单个 Extra 字样宣称零 IO。

## 总结点

1. 覆盖是查询与索引的关系。
2. 减少取行需求也有维护成本。
