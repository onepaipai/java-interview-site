<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Prometheus 直方图与分位数 · 1](https://prometheus.io/docs/practices/histograms/)
- [Prometheus 直方图与分位数 · 2](https://prometheus.io/docs/prometheus/latest/querying/functions/)

</details>

## 参考回答

1. P99 不可线性合并，平均或按流量加权节点 P99 都不能得到总体 P99。
2. 经典直方图先对每条桶序列 rate，再按相同 le 聚合，最后算 histogram_quantile。
3. 统一窗口、单位和样本范围，并说明桶内插值误差；Summary 的客户端分位数通常不能跨节点合并。

## 参考分析

1. 两个节点的第 99 百分位只保留两个位置值，丢失节点内部的全部分布；即使知道各自请求数，也不能还原总体排序。
2. 经典桶计数是累积值；跨实例相同 le 可以相加，不能先对每台机器求分位数后再平均。
3. 计数器可能因重启归零，因此通常先对每条序列 rate 再 sum，让重置在各序列内被识别。
4. histogram_quantile 在经典桶内按规则插值；估计 P99 并不保证等于原始样本计算值，粗桶会掩盖阈值附近差异。
5. 仅观测成功请求会忽略超时用户；若成功与超时分开记录，应明确延迟 SLI 范围，并另算失败率。

## 案例

1. 场景（教学示例）：A 有 100 次请求均为 1ms，B 有 10000 次均为 100ms；合并后按原始样本求 P99。

2. 处理：聚合同一接口口径的经典直方图，窗口取 5 分钟；若要分路由评估，在 sum 中保留 route 标签。

```promql
histogram_quantile(
  0.99,
  sum by (le) (
    rate(http_request_duration_seconds_bucket{job="api"}[5m])
  )
)
```

3. 结果：原始样本总体 P99=100ms，节点 P99 简单平均却为 50.5ms；按请求量加权也不是总体分位数。

4. 误差验证：若只有 1ms、100ms 两个有限桶上界，经典直方图估计约 99ms；这来自桶内插值，不能假装是原始样本精确值。

## 总结点

1. 先合分布，再算分位数。
2. 节点 P99 加权也不能平均。
3. 桶内插值仍有误差。
