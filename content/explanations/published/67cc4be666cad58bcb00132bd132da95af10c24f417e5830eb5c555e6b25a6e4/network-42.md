<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [RFC 6455 · WebSocket · 1](https://www.rfc-editor.org/rfc/rfc6455.html)
- [Google SRE · 2](https://sre.google/sre-book/handling-overload/)

</details>

## 参考回答

1. 先停止分配新连接或请求，再通知协议层并等待在途工作，超过期限后受控关闭。
2. 需要协调代理、客户端重连与业务幂等。

## 参考分析

1. 长连接可能绕过短请求撤流节奏，需要主动告知或限时排空。
2. 停机不能无限等所有连接自然消失。

## 案例

1. 场景（教学示例）：滚动发布时有 WebSocket 会话和长下载。

2. 处理：先停止接受新连接并撤就绪，再通知迁移或关闭，在预算内处理在途状态。

3. 验证：发布可按时完成；重连和重试有去重协议，不静默丢已确认业务结果。

## 总结点

1. 先撤流再排空。
2. 长连接设停机预算。
