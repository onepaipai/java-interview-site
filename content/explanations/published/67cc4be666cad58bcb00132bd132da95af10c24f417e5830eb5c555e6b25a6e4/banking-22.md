<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 BigDecimal API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/math/BigDecimal.html)
- [TigerBeetle 账务建模 · 2](https://docs.tigerbeetle.com/coding/financial-accounting/)

</details>

## 参考回答

1. 保留汇率来源、报价时间、方向、有效期和舍入规则，并绑定业务交易。
2. 汇率缓存失效不能导致同一交易重试使用不同金额。

## 参考分析

1. 汇率包含方向、报价时间、来源和有效期。
2. 到账金额还受币种精度及费用规则影响，不能只保存一个换算结果。

## 案例

1. 场景（教学示例）：教学报价 1 USD=7.20 CNY，换入 100 USD。

2. 处理：保存币对方向、报价编号、时间及舍入方式，按约定分别计算本金和手续费。

3. 验证：未计手续费本金为 720.00 CNY；反向换算不误把 7.20 当倒数，历史可复现。

## 总结点

1. 汇率必须带方向与版本。
2. 本金费用分别留依据。
