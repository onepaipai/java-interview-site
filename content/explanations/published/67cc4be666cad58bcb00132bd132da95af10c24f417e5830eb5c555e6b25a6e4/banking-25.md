<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [OWASP 交易授权 · 1](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)
- [Google SRE · 2](https://sre.google/sre-book/handling-overload/)

</details>

## 参考回答

1. 不同交易风险与业务影响不同，应提前定义拒绝、降级规则或人工确认。
2. 策略需可审计且经过业务认可，不能由超时异常随意决定。

## 参考分析

1. 不可用时如何处理由风险与替代控制决定。
2. 统一放行破坏控制，统一无限等待则耗尽交易资源。

## 案例

1. 场景（教学示例）：风控依赖超时，低风险查询和大额转账同时到达。

2. 处理：查询可使用允许的只读降级；大额动作按规则拒绝或转人工，设置限时与隔离。

3. 验证：风控故障不占满核心线程；不会把“无法判断”自动解释为低风险。

## 总结点

1. 故障策略按风险分级。
2. 未知风险不等于安全。
