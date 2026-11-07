<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [TigerBeetle 账务建模 · 1](https://docs.tigerbeetle.com/coding/financial-accounting/)
- [Google SRE · 2](https://sre.google/sre-book/postmortem-culture/)

</details>

## 参考回答

1. 先依据双方明细定义差异类型，保留原始证据和匹配版本。
2. 自动修复需有限范围，资金更正应通过可审计业务动作完成。

## 参考分析

1. 长短款必须先声明比较方向和双方账务口径。
2. 差错发现与资金更正分离，不能直接修改原账消除报表差异。

## 案例

1. 场景（教学示例）：渠道有成功单，本地仅有未知状态。

2. 处理：保存双方原始明细、匹配版本与差错类型，核对后走受控补记或更正动作。

3. 验证：差异有证据和处理责任人；重复处置不重复改账，状态差异不会被金额相等掩盖。

## 总结点

1. 差错先定口径。
2. 更正通过受控业务动作。
