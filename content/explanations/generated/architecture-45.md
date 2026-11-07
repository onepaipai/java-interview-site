<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 区分不可逆清除、隐藏有效入口和保留历史关联，恢复前校验冲突与目标归属。
2. 界面文案、API 和数据库约束应一致。

## 参考分析

1. 只删主表会留下搜索副本。
2. 大导出应分批并保持权限与稳定游标。
3. 过期设计文档会误导后续实施。

## 案例

1. 场景（教学示例）：题目软删后仍能在全局搜索和 AI 引用中出现。
2. 处理：提交后同步来源变更，索引按版本更新，缓存失效；恢复核对模块状态，架构文档纳入变更检查。

3. 验证：删除后不可被新检索命中；恢复不产生孤儿，导出不越权不撑爆内存。

## 总结点

1. 数据变化驱动副本。
2. 文档跟着行为更新。
