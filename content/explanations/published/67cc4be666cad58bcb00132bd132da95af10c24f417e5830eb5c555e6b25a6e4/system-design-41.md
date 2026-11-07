<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 工具注册有明确能力、权限和参数协议，动作持久化并使用幂等键，高风险步骤有具体确认。
2. 模型计划不直接成为执行授权。

## 参考分析

1. 平均得分不能覆盖高风险失败。
2. 重复调用可能重复扣费或修改。
3. 日志保存范围需明确且最小化。

## 案例

1. 场景（教学示例）：企业助手调用报销工具超时后切换供应商重试。
2. 处理：按稳定动作号核对原执行结果，执行层再次授权；独立评测集比较质量、拒答、费用与时延。

3. 验证：无重复报销与越权，供应商切换可回退；事故能用脱敏样本复现。

## 总结点

1. 模型只提议动作。
2. 执行层守权限预算。
