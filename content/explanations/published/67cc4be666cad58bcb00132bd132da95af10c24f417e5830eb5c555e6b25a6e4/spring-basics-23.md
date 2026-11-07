<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-security/reference/6.5/servlet/exploits/csrf.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-security/reference/6.5/servlet/integrations/cors.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Spring Security 6.5 浏览器教学场景：同源应用用 HttpOnly 会话 Cookie 登录，账户支持修改邮箱。攻击者无法读取 Cookie，但可能诱导用户从另一个站点发出请求。

1. 浏览器可能自动附带目标站点的 Cookie，攻击者不必先读到凭证，也可能借用户身份触发写操作。HttpOnly 限制脚本读取 Cookie，不会阻止浏览器自动发送它。
2. 写操作应采用明确的 CSRF 防护，例如服务端校验与会话绑定的令牌或框架支持的方案，并配合合适的 SameSite、来源校验和正确 HTTP 方法语义。
3. CORS 主要约束浏览器脚本跨源读取，不代替 CSRF 或授权。是否存在 CSRF 风险应按凭证如何携带判断，不能只因为接口返回 JSON 或使用 JWT 就关闭防护。

## 参考分析

### 攻击条件：自动凭证与可伪造的写请求

当会话 Cookie 满足域、路径及 SameSite 等条件，浏览器会按规则自动发送；跨站表单等请求也不一定需要攻击者读到响应。服务端若只确认 Cookie 有效，就可能把伪造请求当成用户意愿。SameSite 的站点概念与 origin 不同，子域信任关系、部署方式和兼容要求都影响效果，不宜把单个属性当成完整证明。类比门禁卡自动开门：卡（Cookie）会替持有人自动刷卡，伪造请求正是借这张卡——CSRF 令牌相当于再加一道只有本人能答上的口令。

### 令牌机制：让请求包含攻击站点不能代填的证明

同步令牌通常由服务端绑定会话或安全上下文，前端在写请求的专用头等位置回传，服务端检查缺失或不匹配并拒绝。Spring Security 的 SPA 配置还要处理令牌加载、掩码和登录登出后的刷新规则。不能只把令牌放进一个浏览器自动携带的普通 Cookie，就认为服务端已经验证了用户意愿。

### 多重边界：令牌不负责证明用户能改哪个账户

CSRF 防护阻止某类跨站伪造请求，但持有合法令牌的用户仍可能尝试修改他人资源，因此对象授权必须独立存在。GET 等安全方法也不应产生可利用的写副作用。若凭证由脚本显式放入 Authorization 而浏览器不自动附带，攻击条件可能不同；一旦改成 Cookie 携带 JWT，仍需重新评估 CSRF。

## 案例

### 隔离测试：登录 Cookie 有效但缺令牌

在专用测试账户中登录，保留会话 Cookie，向修改邮箱接口分别发送缺令牌、错误令牌和正确令牌的请求。预期前两种被安全链拒绝且数据库邮箱不变，合法同源请求成功；匿名请求也不能绕过认证。测试还要验证失败是 CSRF 拒绝而非请求格式错误，避免测错路径后误以为防护有效。

### 追问：换成 JWT Cookie 能否直接关闭保护

保留相同自动 Cookie 携带方式，只改变 Cookie 内的凭证格式，再重复伪造写请求矩阵；风险前提并未因令牌自包含而消失。若采用显式 Authorization 头，应重新核对客户端、跨源策略和其他自动凭证入口。这里描述威胁与验收设计，没有替用户应用擅自关闭或调整安全配置。

## 总结点

1. 门禁卡自动刷卡，口令只有本人能答
2. 自动携带凭证产生伪造风险
3. HttpOnly 不阻止自动发送
4. CSRF、CORS、授权分别负责
