<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 限流根据容量约束进入，熔断根据失败或慢调用保护故障依赖。
2. 恢复探测、统计窗口与误判风险需要分别配置。

## 参考分析

1. 令牌桶允许受控突发，漏桶强调平滑输出。
2. 多层排队可浪费预算。
3. 降级不能改变资金与授权语义。

## 案例

1. 场景（教学示例）：查询服务变慢导致交易服务线程耗尽。
2. 处理：独立池和并发许可，拒绝过期排队请求；半开少量探测，重试加预算与抖动。

3. 验证：交易核心资源保留，恢复无同步洪峰；客户端收到明确可重试信息。

## 总结点

1. 速率并发分别管。
2. 重试不能突破总预算。
