<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 按风险分级提供默认安全路径、自动回归和可观测灰度，低风险改动保持效率。
2. 以实际事故和错误预算指导投入。

## 参考分析

1. 不能平均节点 P99 得到总体 P99，需合并可聚合分布。
2. 平均延迟掩盖尾部，多窗口消耗率用于识别不同速度的故障。

## 案例

1. 场景（教学示例）：平均延迟正常，但部分用户交易持续失败。
2. 处理：按用户请求计算成功率和延迟分布，设置快速及缓慢错误预算告警，区分关键路径。

3. 验证：告警能指向用户影响与处理动作；发布冻结或恢复有事先标准。

## 总结点

1. 用户体验定义指标。
2. 分位数不能直接平均。
