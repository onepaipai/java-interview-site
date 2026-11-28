<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/service-level-objectives/)
- [事件溯源设计说明 · 2](https://martinfowler.com/articles/patterns-of-distributed-systems/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银消息沙盘:消费速度<生产速度→消息积压(MQ 堆积百万条)——处理=扩容消费者+跳过/降级+源头限流;Kafka vs RocketMQ 的差异=存储模型/事务/延迟消息/生态。

1. 积压的根因:消费速度不足(消费者故障/处理慢/并发不足)或生产暴增(上游突发)——定位=消费 lag(积压量=生产 offset-消费 offset)增长速率+消费者健康(线程/异常/慢日志)。
2. 处理:一,扩容消费者(增加实例——Kafka consumer group 自动 rebalance,注意 partition 数≥consumer 数);二,批量消费(一次拉取多条批量处理——提高单次吞吐);三,跳过(非关键消息丢弃或降级——batch 消费标记+后续补偿);四,新 topic 分流(积压的旧消息转到新 topic 用更多消费者处理)。
3. Kafka vs RocketMQ:Kafka(高吞吐日志流/分区+消费组/无延迟消息(需扩展)/生态丰富——大数据领域标配)/RocketMQ(事务消息/延迟消息/消息轨迹/Java 生态——电商金融场景)——选型=吞吐要求+功能需求(事务/延迟)+运维能力(第 109 题 MQ 可靠性)。

## 参考分析

### 第二步扩展① 机制:积压的"水位管理"

- 积压=队列水位上升(生产>消费的差值累积)——水位管理=控制生产(源头限流)+增加消费(扩容)+溢出处理(跳过/分流)——类比水库:上游来水(生产)>下游放水(消费)→水位上升→开闸泄洪(扩容)+上游限流+溢洪道(跳过)。

### 第二步扩展② 反例:积压处理的两种事故

- 事故一:盲目扩容消费者——partition 数=4 但 consumer=8→4 个 consumer 空闲(Kafka 消费者数≤partition 数)。
- 修复=先增 partition 再增 consumer(或减少 consumer)。
- 事故二:跳过消息无记录——跳过的消息没有存档(数据丢失无法追溯)。
- 修复=跳过的消息存到"跳过 topic"或文件(后续补偿)。

### 第二步扩展③ 取舍:积压预防 vs 积压处理

- 预防:生产限流(上游限流,第 134 题)+消费监控(lag 告警)+弹性扩容(自动扩 consumer,第 34 题动态批处理)。
- 处理:积压发生后的应急(扩容/跳过/分流)——预防优于处理(积压的处置成本>预防成本)。
- 监控 lag 告警(阈值=SLA 窗口×消费速率)是预防的核心。

## 案例

### 第三步发散·验证与推演 验证:积压处理的走查核对

- 验证:积压复现(生产速率>消费速率→lag 增长)。
- 扩容验证(增加 consumer→lag 下降)。
- 跳过验证(非关键消息跳过→lag 清理+存档)。
- partition 扩容验证(Kafka partition 4→8+consumer 4→8→吞吐翻倍)。
- 验证:lag 曲线的断言可程序化(监控 lag 随时间的变化)。

### 第三步发散·追问扩展 追问链:MQ 三刀

- **Q1：Kafka 的 rebalance?**
  - 答：consumer 加入/退出→partition 重新分配(rebalance)→rebalance 期间消费暂停(STW)——频繁 rebalance=消费不稳定(心跳超时/处理超时导致)→参数调优(session.timeout/max.poll.interval)。
- **Q2：RocketMQ 的延迟消息?**
  - 答：内置延迟级别(1s/5s/10s...2h)或任意延迟(5.0+ 定时消息)——延迟队列的实现(Redis ZSet/时间轮/RocketMQ 延迟消息,第 67 题延迟队列场景)。
- **Q3：MQ 的选型?**
  - 答：Kafka(高吞吐日志流+大数据生态)/RocketMQ(事务消息+延迟消息+金融场景)/RabbitMQ(路由灵活+低吞吐)/Pulsar(存算分离+多租户)——按"吞吐+功能+运维+生态"四维选型(第 147 题容量评估)。

## 总结点

1. 积压=生产>消费的差值累积
2. 扩容/跳过/分流,三选组合
3. Kafka 吞吐,RocketMQ 功能
