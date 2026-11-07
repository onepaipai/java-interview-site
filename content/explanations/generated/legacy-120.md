<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 2PC 强协调但有阻塞和资源成本；TCC 预留、确认与取消均需幂等。
2. Saga 使用显式补偿，适合可恢复长流程，补偿不等于时间倒流。
3. outbox 同库提交事实和事件，重试、去重与对账保证最终收敛。

## 参考分析

1. 补偿不是时间倒流，外部不可逆动作需特别处理。
2. 空回滚、悬挂和重复调用必须纳入协议。
3. 最终一致需要可靠重试与核对。

## 案例

1. 场景（教学示例）：预占库存成功后支付超时。
2. 处理：保存 Saga 状态，先查支付是否成功再决定释放；补偿有次数、告警和人工处置。

3. 验证：不会同时释放库存并确认订单；失败流程最终落入可解释终态或未决队列。

## 总结点

1. 方案按资源语义选。
2. 补偿失败也要闭环。
