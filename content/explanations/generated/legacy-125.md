<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 批次与明细状态分层记录，稳定业务号贯穿重跑。
2. 小事务分片、限速，保存可核对检查点。
3. 恢复先查未知副作用，再执行缺失步骤，已成功项不重复付款。

## 参考分析

1. 批次成功率不能替代明细状态。
2. 重跑不得再次触发已完成副作用。
3. 首页聚合不得占满核心交易资源。

## 案例

1. 场景（教学示例）：代发一万笔，第五千笔附近进程退出。
2. 处理：每笔使用稳定业务号提交，恢复只处理未决项并先查未知状态；读聚合独立限流。

3. 验证：成功项不重复付款，未完成项可续跑；ID 故障时拒绝或切换受控方案。

## 总结点

1. 批次明细分层记。
2. 重跑先核对已成功。
