<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 复制传输与重放存在延迟，提交确认不代表副本已可读。
2. 关键读走主或等待对应提交进度，普通历史读可明确接受旧值。
3. 监控延迟原因和最老进度，不用固定 sleep 当一致性保证。

## 参考分析

1. 两边都可写会形成分叉。
2. 回滚还要处理新系统期间新增数据。
3. 固定延迟等待不能证明副本追平。

## 案例

1. 场景（教学示例）：新旧库双写，其中一边短暂失败。
2. 处理：权威写与变更日志同事务，异步补齐并核对；按进度切读，冻结切换点并保留回退路径。

3. 验证：切换前数据可证明一致；回退不丢灰度期间合法写入。

## 总结点

1. 双写必须能核对。
2. 回退也要带回新数据。
