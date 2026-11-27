<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [事件溯源设计说明 · 1](https://martinfowler.com/articles/patterns-of-distributed-systems/)
- [Google SRE · 2](https://sre.google/sre-book/service-level-objectives/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银微服务沙盘:用户请求经网关→订单→库存→支付→通知 5 个服务,某环节慢了——没有链路追踪,只能逐个服务查日志;有了链路追踪,一次调用链的完整时间线一目了然。

1. 核心三概念:Trace(全链路唯一 trace_id)+Span(一段操作,span_id+parent 构成树)+Context 传播(trace_id 经 HTTP header/MQ 属性跨服务传递,W3C traceparent 格式,第 D14 题实测贯穿)。
2. 落地三步:埋点(OTel agent 无侵入或手动加 span)、采集(Span 发送到 Collector——Jaeger/Zipkin/SkyWalking)、存储查询(按 trace_id/时间/服务筛选)。
3. OpenTelemetry(OTel)=统一标准(合并了 OpenTracing/OpenCensus):API+SDK+Collector 三件套——厂商中立(数据可发到任意后端),是目前的事实标准;采样(全量采样成本高,头部采样/尾部采样按错误/延迟过滤)。

## 参考分析

### 第二步扩展① 机制:trace_id 为什么能串起全链路

- trace_id 在请求入口生成,通过 HTTP header(W3C traceparent: 32hex trace_id-16hex span_id)传递到每个下游服务——每个服务把 trace_id 写入日志+上报 Span→按 trace_id 聚合=完整链路。
- 类比快递单号:从发货到签收,每环节扫码记录,按单号聚合=全程可追。

### 第二步扩展② 反例:链路追踪的两种事故

- 事故一:trace_id 不贯穿——MQ 消费时丢失 trace 上下文(消息头没传)→链路断在 MQ。
- 修复=消息属性携带 traceparent(生产者注入,消费者提取,第 D14 题实测)。
- 事故二:采样漏掉了错误请求——头部采样(入口随机)可能丢掉慢/错请求。
- 修复=尾部采样(按延迟/错误标记后决定是否保留——但需要缓存 span 到请求结束)。

### 第二步扩展③ 取舍:全量采样 vs 抽样采样

- 全量:调试完美但存储/网络成本高(每请求×每 span)。
- 头部抽样(入口决定):成本可控但可能丢关键链路。
- 尾部抽样(完成后按特征保留):保留慢/错链路,成本中等但需要缓冲。
- 按"错误请求全保+正常请求抽样"是常见折中——排障时"出错的一定能找到"。

## 案例

### 第三步发散·验证与推演 验证:链路追踪的走查核对

- 验证:本机 D14 实验(W3C traceparent 三层传播,trace-id 贯穿)——埋点断言(每服务的 span 有正确 parent 关系)、传播断言(MQ 场景 trace_id 不丢)、查询断言(按 trace_id 聚合完整链路+按延迟排序找瓶颈)。
- 验证:链路完整性断言(trace 树无断节)可程序化。
- OTel 采集与 Jaeger UI 查询是标准链路。

### 第三步发散·追问扩展 追问链:追踪三刀

- **Q1：追踪与日志的关系?**
  - 答：日志带 trace_id(每条日志含 trace_id/span_id)→按 trace_id 关联日志与链路(第 21 题统一 ID);日志看详情,链路看结构——互补不替代。
- **Q2：Span 的粒度?**
  - 答：自动埋点(HTTP 调用/DB 查询/MQ)+手动埋点(关键业务节点:扣款/审批)——粒度过细=span 爆炸(存储/成本);粒度过粗=定位不到。
- **Q3：链路追踪的告警?**
  - 答：链路级告警(某服务的 P99 延迟/错误率,基于 span 数据聚合,第 42 题健康检查)——追踪不只是排障工具,也是监控数据源。

## 总结点

1. trace_id 贯穿,MQ 也要传
2. OTel 统一标准,厂商中立
3. 错误请求全保+正常抽样
