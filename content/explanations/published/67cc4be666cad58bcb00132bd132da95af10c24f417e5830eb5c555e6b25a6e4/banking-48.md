<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [OWASP 交易授权 · 1](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)
- [Stripe 事件处理 · 2](https://docs.stripe.com/webhooks)

</details>

## 参考回答

1. 以业务单号或受控查询键关联所有阶段，返回清晰状态和可重试指引。
2. 必须校验调用者归属，避免通过枚举单号泄露他人交易。

## 参考分析

1. 交易号只是定位键，不是访问凭证。
2. 查询结果需区分受理、处理中、已记账和到账等约定阶段。

## 案例

1. 场景（教学示例）：用户猜中其他客户交易号，重复查询处理状态。

2. 处理：服务端校验归属及动作权限，返回明确阶段与下一步指引，受控记录关联请求号。

3. 验证：不能枚举他人交易；合法客户可追踪未决状态，但查询不触发重复交易。

## 总结点

1. 交易号不承担授权。
2. 状态名称表达确认阶段。
