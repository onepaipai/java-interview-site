<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 明确单元或主写归属，跨区访问与复制延迟可观测，切换协议有仲裁。
2. 双活不等于两边可无约束修改同一业务事实。

## 参考分析

1. 多区域部署不自动形成业务高可用。
2. 故障切换可能丢未复制数据。
3. 重试与对冲会增加故障时流量。

## 案例

1. 场景（教学示例）：机房断链，旧主恢复且压测流量仍在运行。
2. 处理：栅栏阻止旧主写，核对复制位点和业务流水，隔离压测标识；恢复分阶段放流。

3. 验证：余额流水关系成立，重试有预算；演练不触发真实支付和通知。

## 总结点

1. 跨区先定写归属。
2. 容灾以业务核对验收。
