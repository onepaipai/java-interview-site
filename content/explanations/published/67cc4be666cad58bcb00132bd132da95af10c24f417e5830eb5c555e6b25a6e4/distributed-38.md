<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 以稳定归属规则把用户或业务数据路由到单元，跨单元路径显式化并限制。
2. 需要迁移、容灾和全局查询的受控机制。

## 参考分析

1. 多数派须配合任期、日志与成员规则。
2. 两节点心跳不能消除脑裂。
3. 时间戳可能受时钟偏差影响而丢正确更新。

## 案例

1. 场景（教学示例）：跨机房断链，两边同时尝试修改同一账户。
2. 处理：关键写入只允许合法主或归属单元接受，旧主栅栏；允许旧读的查询明确标注时效。

3. 验证：不会双主同时扣款；可用性损失和恢复步骤在演练中可测量。

## 总结点

1. 分区下先守业务承诺。
2. 多活先定写归属。
