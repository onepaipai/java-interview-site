<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-security/reference/6.5/servlet/authentication/session-management.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/resource-server/jwt.html)

</details>

## 参考回答

1. Session 将登录状态保存在服务端，便于撤销与修改权限；JWT 可携带可校验声明，便于跨边界验证，但撤销和声明过期需要另外设计。
2. 选择取决于客户端、信任边界、撤销时效和运维成本；JWT 通常签名并非加密，不能放入不应被持有者看到的秘密。

## 参考分析

1. 多实例会话可使用共享存储；JWT 验证要限制算法、校验签名、发行方、受众和时效，不能只解码载荷。
2. 两者都涉及凭证泄露风险；Cookie 自动携带需评估 CSRF，脚本存储的令牌也要评估 XSS 暴露。

## 案例

1. 教学场景：同源后台要求管理员禁用用户后立即失效，另一个移动 API 允许短时访问令牌。

2. 后台评估集中会话撤销；移动 API 明确访问时效、刷新轮换和撤销机制，记录每条边界的校验责任。

3. 验证禁用后的旧凭证在约定时间内失效；篡改、过期和错误受众的令牌都被拒绝，不预设 JWT 一定更省资源。

## 总结点

1. 按撤销与信任边界选择。
2. 自包含声明仍需完整验证。
