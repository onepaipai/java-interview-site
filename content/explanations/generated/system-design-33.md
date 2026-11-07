<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 按交易风险预设超时、降级和拒绝策略，特征查询与模型调用有独立预算。
2. 不可把风控超时默认为放行，决策依据需追踪。

## 参考分析

1. 慢依赖不能无限占用交易链路。
2. 总额一致可掩盖错单。
3. 补偿与迟到回调必须共用状态约束。

## 案例

1. 场景（教学示例）：渠道响应丢失，风控查询慢，补偿任务准备冲正。
2. 处理：先确认原交易状态，限时查询；差异进入有版本的处置单，经授权执行关联冲正。

3. 验证：不重复退款或反向修改已成功交易；未决项有人负责并有时限。

## 总结点

1. 先查原单再补偿。
2. 差错处理要闭环。
