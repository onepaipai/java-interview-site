<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 应用服务协调用例、事务与外部依赖，领域服务表达不自然归属单实体的业务规则。
2. 避免把所有逻辑都塞入万能 Service。

## 参考分析

1. 拆服务会引入网络、运维和一致性成本。
2. 贫血或充血不是目标，边界要能说明谁负责数据和规则。

## 案例

1. 场景（教学示例）：订单与库存拆分后原本地事务被打断。
2. 处理：先画数据所有权和失败路径，稳定模块内接口；确需独立扩缩再选事件或可补偿流程。

3. 验证：能单独测试和演进，同时不丢原有业务约束；不为技术层数量拆服务。

## 总结点

1. 边界围绕不变式。
2. 独立部署要付成本。
