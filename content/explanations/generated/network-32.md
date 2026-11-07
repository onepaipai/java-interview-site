<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [WHATWG HTML 标准 · 1](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [RFC 6455 · WebSocket · 2](https://www.rfc-editor.org/rfc/rfc6455.html)

</details>

## 参考回答

1. SSE 适合服务端向浏览器单向推送文本事件，协议和断线续传较直接。
2. 双向交互、二进制或特殊流控需求可能更适合其他方案。

## 参考分析

1. SSE 适合服务端单向文本事件流，浏览器可携带事件 ID 重连。
2. WebSocket 更适合持续双向交互，二者都需连接资源预算。

## 案例

1. 场景（教学示例）：AI 回答逐段输出，中途网络断开。

2. 处理：用 SSE 明确事件边界和结束状态；只有支持事件日志时才按 Last-Event-ID 补发，否则明确重开一轮。

3. 验证：页面不会把两次生成混为一段；代理不意外缓存流，断开能取消后台工作。

## 总结点

1. 单向推送可用 SSE。
2. 重连不自动恢复业务状态。
