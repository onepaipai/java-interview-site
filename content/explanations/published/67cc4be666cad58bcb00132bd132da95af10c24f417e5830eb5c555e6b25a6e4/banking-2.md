<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [TigerBeetle 账务建模 · 2](https://docs.tigerbeetle.com/coding/financial-accounting/)

</details>

## 参考回答

1. 在可控事务边界内保持余额变动与流水记录一致，流水拥有稳定业务标识。
2. 需要审计和重建能力，不能只保存最终余额。

## 参考分析

1. 余额是当前状态，流水是变化依据，两者分开提交会形成审计缺口。
2. 同库事务守住本地一致，跨系统还需状态与对账。

## 案例

1. 场景（教学示例）：余额 100，扣款 30 后写流水前发生异常。

2. 处理：条件更新余额并写带稳定交易号的流水，同事务提交；注入第二步失败。

3. 验证：失败时余额仍为 100 且无成功流水；成功时余额 70、流水只有一次。

## 总结点

1. 余额流水同提交。
2. 金额变化必须可追溯。
