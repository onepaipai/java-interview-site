<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [RFC 9110 · HTTP 语义 · 1](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 6265 · Cookie · 2](https://www.rfc-editor.org/rfc/rfc6265.html)

</details>

## 参考回答

1. 后端若只看到内部 HTTP，可能生成错误重定向或设置不符合预期的 Cookie。
2. 可信代理需规范转发头，应用限制其来源。

## 参考分析

1. 代理到应用可能是 HTTP，但外部浏览器实际使用 HTTPS。
2. 错误识别协议会影响安全 Cookie、跳转与绝对 URL。

## 案例

1. 场景（教学示例）：登录成功后应用生成 http 链接或缺少 Secure Cookie。

2. 处理：在受控代理传递原协议并配置可信转发，验证重定向地址、Cookie 与源站隔离。

3. 验证：浏览器只在 HTTPS 发送安全会话；攻击者伪造头不能改变信任边界。

## 总结点

1. 终结 TLS 后还要传原协议。
2. 信任范围限于受控代理。
