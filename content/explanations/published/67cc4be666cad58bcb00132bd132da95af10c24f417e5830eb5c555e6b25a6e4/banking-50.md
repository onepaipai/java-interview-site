<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/postmortem-culture/)
- [TigerBeetle 账务建模 · 2](https://docs.tigerbeetle.com/coding/financial-accounting/)

</details>

## 参考回答

1. 区分直接触发、技术根因和流程缺口，给出资金核对与用户影响范围。
2. 措施需要负责人、验证方式和演练证据，而非只写加强监控。

## 案例

1. 场景（教学示例）：发布后回调处理失败，数百笔订单本地未知。

2. 处理：止损并统一时间线，核对渠道与账务，安全补齐；把并发回调和重启恢复加入回归，明确负责人期限。

3. 验证：未决项逐笔闭环；修复能在相同故障条件下避免复发，而非只增加一条告警。

## 总结点

1. 恢复包含资金核对。
2. 改进必须能被验证。
