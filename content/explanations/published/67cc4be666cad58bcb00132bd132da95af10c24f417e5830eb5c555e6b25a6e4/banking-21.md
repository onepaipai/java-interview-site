<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 BigDecimal API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/math/BigDecimal.html)
- [TigerBeetle 账务建模 · 2](https://docs.tigerbeetle.com/coding/financial-accounting/)

</details>

## 参考回答

1. 交易保存命中的规则版本与计算要素，不能仅保存当前配置引用。
2. 规则发布、回滚和生效时间需有审计与重算验证。

## 参考分析

1. 历史交易需保存规则版本和计算上下文。
2. 用当前规则重算旧交易会改变原来合法结果。

## 案例

1. 场景（教学示例）：教学费率从 v1 的 1% 调为 v2 的 2%，两笔金额均为 100。

2. 处理：按生效时点选规则并将版本、原始金额及费用保存，查询历史读取原计算记录。

3. 验证：v1 交易费用仍为 1，v2 为 2；修改配置不重写旧账，纠错另走明确流程。

## 总结点

1. 费率规则带版本。
2. 历史结果不能随新规则漂移。
