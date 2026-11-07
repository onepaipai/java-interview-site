<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 根据故障模型、互斥承诺、租约和资源端保护选择，不能只比较吞吐与易用性。
2. 高风险写入要有可验证的旧持有者拒绝机制。

## 参考分析

1. 租约到期不强制停止旧进程。
2. 共识锁也不能自动保护不检查令牌的外部资源。
3. ID 唯一不代表按真实时间严格排序。

## 案例

1. 场景（教学示例）：旧任务暂停后恢复，同时 ID 节点发生时钟回拨。
2. 处理：目标存储拒绝旧令牌；ID 服务按策略等待、拒绝或切换独立号段，禁止盲目重复发号。

3. 验证：没有旧写覆盖与重复 ID；故障策略可观测且有限等待。

## 总结点

1. 锁要配资源栅栏。
2. 发号必须管回拨。
