<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 关键审计事实持久化并具备完整性校验，访问和保留策略受控。
2. 敏感字段最小化，查询与导出也应记录审计。

## 参考分析

1. 高基数标签会撑大时序存储。
2. 日志洪峰反噬业务。
3. 采样追踪不能代替完整资金审计。

## 案例

1. 场景（教学示例）：一次失败请求涉及网关、订单与渠道。
2. 处理：请求号串联轨迹，交易号串联事实；平台有租户隔离、保留策略、写入背压与独立健康探测。

3. 验证：能定位失败阶段与业务结果；敏感正文不默认存储，平台故障不拖垮交易。

## 总结点

1. 追踪找路径。
2. 审计记事实。
