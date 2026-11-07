<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Redis 官方文档 · 1](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)
- [Redis 官方文档 · 2](https://redis.io/docs/latest/develop/reference/eviction/)
- [Kafka 4.1 设计 · 3](https://kafka.apache.org/41/design/design/)

</details>

## 参考回答

1. RDB 提供快照，AOF 记录写操作；恢复点与开销按配置和故障类型评估。
2. 过期由 TTL 决定，淘汰由内存压力及策略决定。
3. 恢复演练核对数据与耗时，关键业务事实保留权威来源。

## 参考分析

1. 缓存可淘汰不代表业务事实可丢。
2. 备份恢复要实测，持久性仍受刷盘与故障类型影响。

## 案例

1. 场景（教学示例）：Redis 满内存导致写入失败且集群跨键脚本报错。
2. 处理：区分可丢缓存与不可丢状态，设容量告警；需要同槽的相关键明确使用哈希标签。

3. 验证：策略符合数据重要性；恢复后核对关键状态，不能只确认进程启动。

## 总结点

1. TTL 与淘汰分开。
2. 关键事实别只存缓存。
