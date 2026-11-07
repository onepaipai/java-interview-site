<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 测试请求可能产生不可逆业务副作用，简单标记未必覆盖所有链路。
2. 使用隔离账户、数据和下游，并审计全链路隔离。

## 参考分析

1. 漂亮瞬时峰值不代表可持续容量。
2. 真实资金和通知须隔离副作用。
3. 定时任务错峰和批次预算防整点洪峰。

## 案例

1. 场景（教学示例）：计划承受流量翻倍并验证支付依赖降级。
2. 处理：使用隔离账户与标识流量，逐级加压并注入延迟，观测队列年龄、成功率与恢复时间。

3. 验证：容量结论带余量与瓶颈；降级路径实际被触发且没有污染真实交易。

## 总结点

1. 容量测持续负载。
2. 演练先隔离副作用。
