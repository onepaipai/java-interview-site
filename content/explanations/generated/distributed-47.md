<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 比较各节点负载、单键分布、锁等待与复制流量，观察增加节点后的变化。
2. 不能只看总 CPU 便归因于机器不足。

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
