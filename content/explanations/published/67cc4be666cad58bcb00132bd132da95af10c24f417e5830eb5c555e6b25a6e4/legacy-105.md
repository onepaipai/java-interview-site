<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Redis 官方文档 · 1](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)
- [Redis 官方文档 · 2](https://redis.io/docs/latest/develop/reference/eviction/)
- [Kafka 4.1 设计 · 3](https://kafka.apache.org/41/design/design/)

</details>

## 参考回答

1. 穿透是反复查询不存在项，用校验、短期负缓存和过滤减压。
2. 击穿是热点失效并发回源，用单键重建和受控旧值。
3. 雪崩是集中失效或整体故障，用抖动、隔离、限流和预案。

## 参考分析

1. TTL 抖动减少同步过期但不提高数据库上限。
2. 热键观测用采样与服务指标，避免高成本全量扫描。

## 案例

1. 场景（教学示例）：热门商品在整点失效，大量查询涌向数据库。
2. 处理：设随机过期和单键重建，限制回源并发；合法场景可返回带版本的短期旧值。

3. 验证：数据库在途量不越界，热点重建失败不无限等待；不存在项短期缓存需防误伤。

## 总结点

1. 穿透击穿分开治。
2. 回源并发必须限。
