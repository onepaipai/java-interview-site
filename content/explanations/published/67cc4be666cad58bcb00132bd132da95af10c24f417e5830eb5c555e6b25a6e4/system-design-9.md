<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 模板、接收者、偏好与渠道分层，任务有稳定键和状态，按优先级限速。
2. 供应商超时先查询或按协议重试，避免重复打扰。

## 参考分析

1. 消息保留期和去重期要覆盖重放。
2. 多渠道通知不一定同时成功，不能以整体异常重发已成功渠道。

## 案例

1. 场景（教学示例）：邮件已发、短信失败，消费者随后重启。
2. 处理：按渠道动作保存状态，outbox 保证事件可重投，恢复只补未决项并核对原请求号。

3. 验证：邮件不重复发送，短信可恢复；延迟与失败各自可追踪。

## 总结点

1. 投递允许重复。
2. 副作用必须防重。
