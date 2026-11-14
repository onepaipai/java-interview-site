<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银登录沙盘:Cookie 自动携带是浏览器行为,恶意网站的表单提交会带上用户的 Cookie——CSRF 冒用身份提交。JWT 放 Authorization 头不自动携带,天然免 CSRF。

1. CSRF 机制:用户已登录站点 A(Cookie 有效),访问恶意站点 B;B 的表单自动提交到 A,浏览器携带 A 的 Cookie,A 误以为是用户操作。防御:CSRF Token+SameSite Cookie+自定义 Header。
2. SameSite 级别:Strict 最严(跨站导航也不带);Lax 导航 GET 带、POST 不带(默认推荐);None 总是带(需 Secure)——安全与可用性的折中。
3. JWT 放 Authorization 头需 JS 显式设置,跨站无法自动设置——天然免 CSRF;JWT 放 Cookie 同样需要 CSRF 防护。

## 参考分析

### 机制:CSRF 的攻击面与防御层

攻击面:Cookie 自动携带是浏览器行为,不可禁用——攻击者只需构造跨站表单即可冒用身份。防御层:SameSite Cookie(浏览器层限制跨站携带)、CSRF Token(应用层,服务端校验令牌)、自定义 Header(要求请求带非浏览器自动生成的头)。三层独立,叠加使用——浏览器层挡住大多数,应用层兜底。

### 反例:无 CSRF 防御的转账攻击

沙盘:用户已登录网银(Cookie 有效),访问恶意站点;站点自动提交转账表单到网银,浏览器携带 Cookie,网银误认为是用户操作——转账执行。防御:CSRF Token(表单隐藏字段,服务端比对)+SameSite Lax(跨站 POST 不带 Cookie)——双层防御,浏览器层与应用层各挡一段。

### 取舍:CSRF 防御的可用性

CSRF Token 的成本:每个表单加隐藏字段+服务端校验,开发成本可控。SameSite 的代价:跨站导航的 Cookie 限制,第三方嵌入 iframe 受影响——按业务需求选级别。纯 API(JWT 放头)不需要 CSRF——按认证方式决定策略,不是一刀切全配。

## 案例

### 验证:CSRF 防御的断言组

验证:Token 断言——无 Token 的 POST 被拒;SameSite 断言——跨站请求不带 Cookie;JWT 头断言——Authorization 头请求免 CSRF 校验。三组固化 CSRF 防御;断言失败即安全配置缺陷。

### 追问链:CSRF 三刀

一刀:SameSite 级别——Strict 最严(跨站导航也不带)、Lax(导航 GET 带、POST 不带,默认推荐)、None(总是带,需 Secure)。二刀:CSRF Token 的存储——服务端 Session 存储,或 Cookie Double Submit(Cookie 与表单各带一份比对)。三刀:纯 API 无 Cookie 用 Token 不需要 CSRF;Cookie 认证的 API 需要,按认证方式决定。

## 总结点

1. Cookie 自动携带=CSRF 攻击面
2. SameSite+Token 双层防御
3. JWT 放头免 CSRF
