<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [TigerBeetle 账务建模 · 1](https://docs.tigerbeetle.com/coding/financial-accounting/)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)

</details>

## 参考回答

1. 先说明资金不变式、权威数据源与故障模型，再展开幂等、事务、状态机和对账。
2. 用超时、重复和故障切换案例验证结论。

## 参考分析

1. 一致性方案必须说明权威事实、资金不变式与故障窗口。
2. 单列事务或幂等词汇不能解释跨系统未知结果如何收敛。

## 案例

1. 场景（教学示例）：面试官追问扣款后响应丢失、重复回调及灾备切换。

2. 处理：分别给出原单查询、防重条件、合法迁移、可靠事件和对账路径，并说明 RPO 与人工处置。

3. 验证：每个故障都有可观测证据与恢复动作；不以“最终一致”掩盖永久未决。

## 总结点

1. 先说不变式与故障假设。
2. 每个未知都有恢复路径。
