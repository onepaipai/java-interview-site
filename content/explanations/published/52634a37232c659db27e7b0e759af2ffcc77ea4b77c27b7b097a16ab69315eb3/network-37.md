<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [RFC 6265 · Cookie · 1](https://www.rfc-editor.org/rfc/rfc6265.html)
- [developer.mozilla.org · 2](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银前端沙盘:会话 Cookie 设了 HttpOnly,脚本偷不到——但 XSS 仍能以用户身份发起任意请求(浏览器自动带 Cookie)、篡改页面、窃取 CSRF Token;HttpOnly 只封"读取"这一条路,不封"使用"。

1. HttpOnly 的确切作用:禁止 JavaScript 通过 document.cookie 读取该 Cookie——只此一项;请求仍会自动携带(浏览器行为),脚本用 fetch/xhr 发的请求带凭据,等于"以用户身份行动"。
2. XSS 仍能做的:代用户调用接口(读 Cookie 不需要——请求自动带)、读取页面内嵌 CSRF Token 与敏感数据(DOM)、注入持久化脚本(存储型)、触发资金操作(配合无 CSRF 校验的接口)——危害链条不依赖读 Cookie。
3. 分层防护:HttpOnly(偷走 Cookie 离线复用)+CSRF Token(伪造请求)+CSP(限制脚本来源与内联)+输入输出转义(消灭注入点)+最小权限会话(敏感操作二次认证)——HttpOnly 是其中一环。

## 参考分析

### 第二步扩展① 机制:Cookie 的读与用分离

- 浏览器 Cookie 有两条访问通道:JS 读取(document.cookie,HttpOnly 封锁)与请求携带(自动行为,任何 Cookie 机制都无法按"请求来源"区分——浏览器不知道脚本与用户点击的区别,这正是 XSS 危险的根源)。
- CSP 与 DOM 净化防的是"脚本进入",比封锁读更上游。

### 第二步扩展② 反例:HttpOnly 依赖症的三种事故

- 事故一:以为 HttpOnly=安全,放松输出转义——存储型 XSS 注入评论,脚本代用户转账(HttpOnly 无关)。
- 事故二:CSRF Token 放在可读位置(document 全局变量)——XSS 读 Token 再伪造请求,SameSite+Token 双防线被一个 XSS 打穿。
- 敏感 Token 不进 JS 可达区域,关键操作二次认证。
- 事故三:会话固定——登录后不轮换会话 ID,XSS 拿不到 Cookie 但可发起 set-cookie 覆盖(见 spring-basics Q26 会话固定)。

### 第二步扩展③ 取舍:CSP 的严格度

- 严格 CSP(nonce+禁止内联):脚本注入面最小,但改造前端成本高(模板重构)。
- 宽松 CSP(白名单域):易绕(开放重定向+白名单域脚本)。
- 渐进策略:Report-Only 观测→收紧。
- XSS 的根治在输入输出处理,CSP 是事故面收窄器不是根治器。

## 案例

### 第三步发散·验证与推演 验证:读写分离的推演核对

- 推演核对:HttpOnly 语义按 RFC 6265(JS 不可读)与浏览器请求自动携带行为推演。
- "代用户请求不需要读 Cookie"的路径与 Q35 的"请求自动带凭据"、Q36 的"Token 是内容层"衔接——XSS 读取 Token 后绕过 CSRF 的链条闭合。
- 验证:HttpOnly 只封读不封用的结论成立,防护必须分层。

### 第三步发散·发散要点 追问链:XSS 三刀

- **追问①**：DOM 型 XSS 与服务端转义——纯前端渲染的注入点(fragment/URL hash)服务端转义覆盖不到,需要前端 DOMPurify 类净化+框架默认转义
- **追问②**：子域与 Cookie 作用域——HttpOnly 不防"子域设 Cookie"(域隔离靠 Domain 属性最小化,__Host- 前缀),见 Q35 子域接管
- **追问③**：与 spring-basics Q25 的衔接——密码哈希防"库泄漏",HttpOnly 防"会话偷取",XSS 防的是"会话内冒用"——三层针对不同威胁

## 总结点

1. HttpOnly 只封读取
2. 代用户请求自动带凭据
3. CSP 加净化是上游
