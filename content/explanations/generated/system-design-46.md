<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 任务有持久状态、租约和幂等结果，恢复后按优先级限速领取。
2. 过期任务处理与在线新任务隔离，保护下游容量。

## 参考分析

1. 到期只代表具备执行资格。
2. 租约超时不停止旧持有者。
3. 严格全局额度会付出协调成本。

## 案例

1. 场景（教学示例）：百万定时任务在停机一小时后同时到期。
2. 处理：分桶扫描、有界领取、按租户公平调度；副作用用原动作号，旧执行者提交检查版本。

3. 验证：任务可续跑且不重复生效；恢复流量不压垮数据库，积压年龄可监控。

## 总结点

1. 到期不等于已执行。
2. 恢复同样要限流。
