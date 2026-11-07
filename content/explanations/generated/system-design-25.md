<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 先复制存量再追赶增量，按业务键与摘要持续校验，路由版本受控切换。
2. 明确双写窗口、回退后的新数据处理与旧库保留期。

## 参考分析

1. 行数相等不证明一致。
2. 双写故障可能分叉。
3. 回滚代码不能自动恢复结构和外部副作用。

## 案例

1. 场景（教学示例）：订单表迁移并逐步发布新版应用。
2. 处理：变更日志驱动补齐，按主键与金额校验，复制进度满足条件再切读，保留兼容旧路由。

3. 验证：每阶段可停可核对；切回后不丢新订单，DDL 锁等待有中止阈值。

## 总结点

1. 先兼容再切换。
2. 回退必须带回新数据。
