<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Redis 官方文档 · 1](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)
- [Redis 官方文档 · 2](https://redis.io/docs/latest/develop/reference/eviction/)
- [Kafka 4.1 设计 · 3](https://kafka.apache.org/41/design/design/)

</details>

## 参考回答

1. String、Hash、List、Set、ZSet 分别适合值、字段、序列、去重和排名。
2. 内存访问、高效结构与事件处理减少常见开销。
3. 复杂命令、大键、网络和持久化仍可拖慢服务，快不等于无容量边界。

## 参考分析

1. 内存访问和高效数据结构是性能来源之一。
2. 命令执行、网络、持久化与大键仍可能成为瓶颈，不能概括为永远单线程所以快。

## 案例

1. 场景（教学示例）：按积分更新榜单且同分按确定规则展示。
2. 处理：使用 ZSet，约定同分顺序和更新时效；评估大键规模并限制批量操作。

3. 验证：排名规则可复现，更新延迟有指标；不能由此推断资金数据可仅放 Redis。

## 总结点

1. 结构按操作选择。
2. 快也有容量边界。
