<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 2xx 表示成功，3xx 重定向，4xx 请求或权限问题，5xx 服务端问题。
2. GET 应为安全读取，POST 通常提交处理；幂等性由协议语义与业务实现共同落实。
3. 用 401、403、409、429 等准确表达边界，业务码补充原因和重试策略。

## 参考分析

1. 超时可能发生在提交后。
2. 状态码和业务码共同表达处理中、拒绝和失败。
3. 客户端应尊重限流与重试提示。

## 案例

1. 场景（教学示例）：提交支付超时后浏览器自动重发。
2. 处理：绑定请求号及参数摘要，查询或返回已保存结果；拒绝无预算重试。

```sql
CREATE UNIQUE INDEX uk_request ON business_result(request_id);
-- 同键重试先核对参数，再返回已提交结果。
```

3. 验证：同一意图只产生一笔交易；同键不同内容被拒绝，未知状态单独呈现。

## 总结点

1. 重试先保幂等。
2. 超时不等于失败。
