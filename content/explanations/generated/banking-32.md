<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [TigerBeetle 账务建模 · 1](https://docs.tigerbeetle.com/coding/financial-accounting/)
- [OWASP 日志安全 · 2](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

</details>

## 参考回答

1. 记录操作主体、业务标识、关键状态变化和关联请求，保护日志完整性与访问。
2. 审计不能只依赖可能丢失的普通应用日志。

## 参考分析

1. 业务请求轨迹可能采样，关键资金审计需要完整事实。
2. 审计至少关联操作者、授权、原单、动作、结果及更正链。

## 案例

1. 场景（教学示例）：人工补记一笔延迟到账交易。

2. 处理：先核实原单，保存审批和证据摘要，执行独立幂等动作，并控制审计修改权限。

3. 验证：能重建谁在何依据下改了什么；敏感正文最小化，重复操作不会再改账。

## 总结点

1. 追踪不能代替审计。
2. 更正链必须可重建。
