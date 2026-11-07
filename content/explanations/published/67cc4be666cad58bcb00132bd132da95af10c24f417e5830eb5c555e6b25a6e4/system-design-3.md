<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 先确定展示余额与交易校验余额的不同要求，展示可按规则缓存，扣款依赖权威状态。
2. 隔离资源并提供明确的更新时间与异常行为。

## 参考分析

1. 超时不等于失败。
2. 回调、查询和补偿可能并发。
3. 全链路幂等与对账共同解决未决结果。

## 案例

1. 场景（教学示例）：扣款确认成功后订单服务退出，用户再次提交。
2. 处理：稳定请求号贯穿账务和渠道，持久事件推动订单，迟到回调按版本处理，核对未决交易。

3. 验证：没有重复扣款，状态最终可解释；明确 SLO、RPO、容量和人工处置路径。

## 总结点

1. 资金守恒是核心。
2. 未决结果靠查询对账。
