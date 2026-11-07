<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 当读模型与写入约束显著不同，可分别优化，但增加同步、延迟和运维复杂度。
2. 不必为了模式把所有普通 CRUD 拆成两套系统。

## 参考分析

1. 重复代码可能属于不同变化轴，不必强行合并。
2. CQRS 带来读投影延迟。
3. 事件溯源要求完整可重放事实，不是普通日志。

## 案例

1. 场景（教学示例）：订单支持多支付策略且状态被各处直接修改。
2. 处理：集中状态转移和规则版本，发布“支付已确认”事实；读模型允许延迟时显式说明。

3. 验证：非法状态被拒绝；投影可重建，重放不再次执行外部付款。

## 总结点

1. 模式服务变化点。
2. 事件表达既成事实。
