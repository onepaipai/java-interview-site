<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Redis 官方文档 · 1](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)
- [Redis 官方文档 · 2](https://redis.io/docs/latest/develop/reference/eviction/)
- [Kafka 4.1 设计 · 3](https://kafka.apache.org/41/design/design/)

</details>

## 参考回答

1. 生产确认、Broker 持久化、副本与消费提交分层验证。
2. 业务提交后再确认，重复用唯一动作号和本地事务去重。
3. 顺序限定到业务键或分区；重试、死信、积压与重放都要有治理。

## 参考分析

1. 提交业务后确认前退出会重复。
2. 先确认再提交可能丢业务。
3. Kafka 生产幂等不覆盖任意外部数据库副作用。

## 案例

1. 场景（教学示例）：消费扣款事件后在提交位点前进程退出。
2. 处理：业务去重记录与扣款同事务提交，重启重复投递时返回已处理结果；批量按已成功范围确认。

3. 验证：重放不重复扣款，未提交项目可再次处理；确认点和业务点有证据。

## 总结点

1. 先业务后确认。
2. 端到端靠业务幂等。
