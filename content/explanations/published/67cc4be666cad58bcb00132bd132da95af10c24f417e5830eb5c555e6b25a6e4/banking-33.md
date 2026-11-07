<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [OWASP 交易授权 · 1](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)
- [TigerBeetle 账务建模 · 2](https://docs.tigerbeetle.com/coding/financial-accounting/)

</details>

## 参考回答

1. 补单可能改变资金或账务事实，必须限制可操作范围并记录依据与结果。
2. 用业务命令驱动校验，禁止直接改库绕过状态机。

## 参考分析

1. 补单改变资金事实，不能只因拥有运营页面权限就执行。
2. 申请、审批与执行按职责分离，执行再次校验当前状态。

## 案例

1. 场景（教学示例）：运营发现缺账并提交补单申请。

2. 处理：绑定原交易与证据，按制度审批；执行动作号防重，提交前重查是否已被回调修复。

3. 验证：未经授权不能补单；审批后原单若已修复则不再重复入账，留下处置记录。

## 总结点

1. 审批不是永久执行授权。
2. 执行前还要查当前状态。
