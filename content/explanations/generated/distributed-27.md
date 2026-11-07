<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 入口限流与缓存预筛减少压力，核心存储用原子条件约束防超卖，订单使用幂等键。
2. 预扣与释放也需状态机和对账。

## 参考分析

1. 扩节点不能拆开同一串行约束。
2. 对冲仅适合允许重复且资源足够的操作，写请求不能无条件复制。

## 案例

1. 场景（教学示例）：抢购请求集中一个 SKU，普通水平扩容无效。
2. 处理：入口限流，有界排队，库存条件扣减与订单幂等；异步接受返回排队状态而非假成功。

3. 验证：库存不负且队列有上限；报告热点吞吐、排队与取消成本。

## 总结点

1. 热点不随节点均分。
2. 异步接受不等于成功。
