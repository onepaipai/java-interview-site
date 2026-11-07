<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 优先检查业务不变式、并发、权限、失败恢复和兼容性，用具体触发与影响说明问题。
2. 格式规范交给自动工具减少争论。

## 参考分析

1. 测试金字塔不是固定数量比例。
2. 镜像实现的测试难发现同类错误。
3. 重构需要独立行为对照而非只看编译。

## 案例

1. 场景（教学示例）：拆分大型服务并替换内部依赖。
2. 处理：先建立输入输出与副作用契约，用历史事故和边界样本回放；关键事务走真实数据库。

3. 验证：新旧行为一致，代码职责更清楚；保留证据说明哪些集成风险仍需灰度。

## 总结点

1. 测试从风险出发。
2. 重构用行为证明。
