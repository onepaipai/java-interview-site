<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Redis 官方文档 · 1](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)
- [Redis 官方文档 · 2](https://redis.io/docs/latest/develop/reference/eviction/)
- [Kafka 4.1 设计 · 3](https://kafka.apache.org/41/design/design/)

</details>

## 参考回答

1. 先看积压年龄、生产消费速率、热点与失败消息，不能只盲目扩容。
2. Kafka 侧重分区日志及消费位点，RocketMQ 的具体能力按版本与业务评估。
3. 结合顺序、延迟、事务消息、运维和恢复成本选型，恢复限制下游压力。

## 参考分析

1. 扩消费者不一定提高吞吐。
2. 毒消息和再平衡会放大停顿。
3. 积压条数和最老事件年龄应同时看。

## 案例

1. 场景（教学示例）：一个热点账户占满分区且某条消息反复失败。
2. 处理：先隔离毒消息并保留可追溯死信，按业务顺序约束规划分区；处理时拒绝旧版本倒灌。

3. 验证：非故障键能推进；热点不破坏同键顺序，积压清理不压垮数据库。

## 总结点

1. 有序先定范围。
2. 扩容先找串行点。
