<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 先明确目标和约束，要求证据与备选方案，聚焦关键不变式和失败路径。
2. 让实施者承担清晰决策与验证，保留不同意见记录。

## 参考分析

1. 功能清单多不等于适合。
2. 期限冲突需缩范围或隔离风险，而非隐去风险。
3. 改进指标避免只算代码量。

## 案例

1. 场景（教学示例）：团队想把单体一次重写成十个服务。
2. 处理：用当前瓶颈、发布独立性与故障成本评估，先选一个边界试点，设收益与停止门槛。

3. 验证：计划有可兑现里程碑；未达到收益可停止，交付与运维成本透明。

## 总结点

1. 决策写下取舍。
2. 治理按风险收益排序。
