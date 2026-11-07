<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 追踪通常采样并有有限保留，适合性能诊断，不保证记录每笔业务事实。
2. 核心审计应独立持久并可核对。

## 参考分析

1. 单机峰值不能按节点数线性外推。
2. 采样追踪不能证明每笔资金动作。
3. 复杂方案必须有明确约束驱动。

## 案例

1. 场景（教学示例）：新增副本后吞吐不变且尾延迟变差。
2. 处理：关联数据库竞争、热点键和跨节点协调，控制变量扩容；注入单依赖故障验证隔离与恢复。

3. 验证：给出收益递减原因及下一步瓶颈；保留最小满足需求的结构。

## 总结点

1. 追踪不替代审计。
2. 扩容收益必须实测。
