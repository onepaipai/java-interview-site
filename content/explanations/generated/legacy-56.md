<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. merge 保留分支合并关系，rebase 将提交重放到新基线并改写身份。
2. 共享历史改写遵循团队约定，不能使他人提交无故丢失。
3. 冲突按两边业务意图解决，复查差异并运行相关行为回归。

## 参考分析

1. 重写共享提交会影响他人分支。
2. 冲突标记消失不代表行为正确，需要复查上下文与测试。

## 案例

1. 场景（教学示例）：两个分支分别修改同一鉴权条件。
2. 处理：比较各自需求，保留完整授权约束，集成后运行允许与拒绝用例；按团队约定选择整合方式。

3. 验证：两边合法功能保留，越权路径仍被拒绝；提交历史能追踪修复来源。

## 总结点

1. 整合先理解意图。
2. 冲突解决后测行为。
