<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-security/reference/6.5/servlet/authentication/session-management.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-security/reference/6.5/servlet/authentication/rememberme.html)

</details>

## 参考回答

1. 先明确产品策略：撤销全部旧会话，或只保留经过重新认证的当前会话；不能只更新密码哈希就假设所有已登录凭证失效。
2. Session 可在共享会话存储中撤销，或在每次请求验证用户安全版本；JWT 需要撤销列表、版本校验或接受短过期窗口等明确机制。

## 参考分析

1. 安全版本必须真正参与每次授权上下文恢复，且考虑缓存失效与多实例一致性；写了版本字段但不检查没有作用。
2. 改密成功后的刷新令牌、remember-me 等长期凭证也应纳入策略，审计撤销结果而不记录令牌原文。

## 案例

1. 教学场景：用户在浏览器 A 改密，浏览器 B 与移动端还持有旧凭证。

2. 按策略原子更新密码和安全版本，再清理会话及刷新凭证；分别用各端旧凭证请求和刷新。

3. 验证旧凭证在约定窗口内失效，新登录可用；模拟另一实例缓存未更新，确认不会无限延续旧权限。

## 总结点

1. 改密码不自动撤销登录态。
2. 所有长期凭证纳入撤销策略。
