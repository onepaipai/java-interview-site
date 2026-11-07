<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [WHATWG Fetch 标准 · 1](https://fetch.spec.whatwg.org/)
- [RFC 6265 · Cookie · 2](https://www.rfc-editor.org/rfc/rfc6265.html)

</details>

## 参考回答

1. 源通常由协议、主机和端口决定，站点概念还涉及可注册域与策略。
2. 安全设计需按浏览器实际边界判断 Cookie 和请求行为。

## 案例

1. 场景（教学示例）：app.example.com 调用 api.example.com。

2. 处理：分别判定同源与站点关系，按实际凭证模式配置允许源；服务端仍校验用户及资源权限。

3. 验证：不把“同站”误当“同源”；CORS 通过不意味着业务已获授权。

## 总结点

1. 同源比较三要素。
2. 同站不等于同源。
