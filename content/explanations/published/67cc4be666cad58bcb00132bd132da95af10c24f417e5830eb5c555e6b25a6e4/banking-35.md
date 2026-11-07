<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [TigerBeetle 账务建模 · 1](https://docs.tigerbeetle.com/coding/financial-accounting/)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)

</details>

## 参考回答

1. 冲正是受规则约束的账务动作，不是任意删除原流水。
2. 必须确认原动作确已发生且尚未被重复更正，保留完整历史。

## 参考分析

1. 冲正是关联原交易的独立更正动作，是否允许取决于真实状态和业务契约。
2. 直接改余额会破坏流水关系并难以防重。

## 案例

1. 场景（教学示例）：一笔交易需要按核对结果撤销相应账务影响。

2. 处理：校验原单及可更正范围，生成关联更正号和反向流水，原子保存并保留审批证据。

3. 验证：重复冲正只生效一次；原交易与更正金额可对照，不删除原成功记录。

## 总结点

1. 更正必须关联原交易。
2. 反向动作也要幂等。
