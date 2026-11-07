<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [RFC 6265 · Cookie · 1](https://www.rfc-editor.org/rfc/rfc6265.html)
- [WHATWG Fetch 标准 · 2](https://fetch.spec.whatwg.org/)

</details>

## 参考回答

1. 它限制脚本直接读取 Cookie，但恶意脚本仍可能以当前身份发请求和读取页面数据。
2. 必须同时控制脚本注入与敏感操作权限。

## 参考分析

1. HttpOnly 限制脚本读取 Cookie，但浏览器仍可带 Cookie 发送请求。
2. XSS 能操纵页面和读取可访问数据，必须从注入入口治理。

## 案例

1. 场景（教学示例）：页面把不可信富文本直接插入 DOM。

2. 处理：输出编码或使用受控净化，限制脚本执行并保持资源授权；演练已登录页面遭脚本控制的影响。

3. 验证：令牌虽不可直接读取，危险请求仍需按授权防护；注入用例不能执行任意脚本。

## 总结点

1. HttpOnly 只挡读 Cookie。
2. XSS 仍能借身份发请求。
