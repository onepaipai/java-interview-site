<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 租约与健康信号需考虑网络抖动和节点下线，客户端也有缓存。
2. 摘流、连接排空与失败重试要形成完整流程。

## 参考分析

1. 旧实例清理过快会误杀，过慢会继续路由失败节点。
2. 配置中心不可用的启动策略取决于安全默认值和业务风险。

## 案例

1. 场景（教学示例）：配置中心失联且一个副本准备重启。
2. 处理：已有实例沿用合法快照并告警；新实例验证必需配置，无法满足安全条件则拒绝就绪。

3. 验证：无半份规则和静默默认放行；恢复后按版本平滑更新。

## 总结点

1. 配置整体带版本。
2. 安全默认先明确。
