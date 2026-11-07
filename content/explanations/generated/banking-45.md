<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [TigerBeetle 账务建模 · 1](https://docs.tigerbeetle.com/coding/financial-accounting/)
- [OWASP 日志安全 · 2](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

</details>

## 参考回答

1. 稳定业务标识不变，冷热查询路由与关联关系明确，归档校验完整性。
2. 恢复与导出需要可追溯来源，不能只搬走旧表。

## 参考分析

1. 归档改变存储位置，不应截断原交易与更正、退款的关系。
2. 查询和审计都有保留与授权需求，不能只留聚合总额。

## 案例

1. 场景（教学示例）：两年前交易已归档，客户申请查询关联退款。

2. 处理：稳定交易号路由冷热数据，保留引用及摘要，按原权限查询并演练恢复。

3. 验证：能连起原单、退款和审批；归档前后明细与金额可核对，访问仍受限。

## 总结点

1. 归档不切断关联。
2. 历史访问仍要授权。
