<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [developer.mozilla.org · 1](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [RFC 6265 · Cookie · 2](https://www.rfc-editor.org/rfc/rfc6265.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银前端沙盘:api.bank.com 的接口被 www.bank.com 页面调用报跨域错误(CORS),但 www.bank.com 上挂的恶意脚本仍能带着用户 Cookie 攻击 pay.bank.com(同站)——"源"管资源访问,"站"管凭据携带,两个边界独立。

1. 同源=协议+域名+端口全相同(https://www.bank.com 与 https://api.bank.com 不同源);跨域是"源"维度的差异,浏览器用同源策略拦截脚本对跨源响应的读取,CORS 头是服务端的显式放行。
2. 同站/跨站(same-site)=注册域(eTLD+1)相同(bank.com 下所有子域同站);跨站是 Cookie/SameSite 维度——SameSite=Lax 挡的是"跨站请求自动带 Cookie",同站的子域间调用不受影响(见 Q36)。
3. 风险区分:跨域风险=脚本读跨源数据(数据泄漏方向);跨站风险=攻击者页面借用户凭据发起请求(CSRF 方向)——前者靠 CORS 白名单,后者靠 SameSite+CSRF Token,工具不同不可互替。

## 参考分析

### 第二步扩展① 机制:两个边界的执行点

- 同源策略在浏览器执行:跨源 fetch 默认拒绝"读取响应"(请求可能已发出,比如 POST 表单)。
- CORS 通过响应头(Access-Control-Allow-Origin 等)放行。
- 同站判定在浏览器 Cookie 层:发请求时按目标 URL 与当前页面顶站的注册域关系决定是否携带 Cookie。

### 第二步扩展② 反例:边界混淆的三种事故

- 事故一:以为"同站=同源"——pay.bank.com 与 www.bank.com 同站但不同源,脚本读响应照样被同源策略拦截,开发以为配置了 SameSite 就不用 CORS。
- 事故二:Allow-Origin: * 加 Allow-Credentials——规范禁止的组合,凭据跨域读取等于向全网开放用户数据。
- 事故三:子域互信滥用——attacker.bank.com 若存在(子域接管),同站 Cookie 自动携带,CSRF 防线被绕过。
- 子域分配是安全资产。

### 第二步扩展③ 取舍:CORS 白名单 vs 代理同源化

- CORS 白名单:服务端显式放行,预检(OPTIONS)成本与配置维护。
- 前端代理(网关把 /api 路由到后端):浏览器视角全同源,免 CORS,但网关路由变复杂。
- 小前端团队用代理同源化,多消费方 API(开放平台)必须 CORS 白名单+凭据模式谨慎。

## 案例

### 第三步发散·验证与推演 验证:边界语义的推演核对

- 推演核对:本机 N7 实验证实"响应头驱动浏览器行为"的机制——CORS 头同理(Access-Control-Allow-Origin 是服务端声明)。
- SameSite 携带规则与 CSRF 威胁模型按 RFC 6265bis 推演并明示(浏览器行为未在本机自动化复测)。
- 验证:源边界(CORS)与站边界(SameSite)的工具不可互替结论成立。

### 第三步发散·发散要点 追问链:边界三刀

- **追问①**：预检请求(OPTIONS)的成本——带自定义头/JSON 的跨域请求先发预检,延迟翻倍;预检结果可缓存(Access-Control-Max-Age),高频接口要配
- **追问②**：子域接管与同站边界——废弃子域 CNAME 未清,第三方接管后可设同站 Cookie(与主站同站);子域资产纳入安全盘点
- **追问③**：与 Q36/Q37 的衔接——SameSite 只挡跨站自动携带,HttpOnly 只挡脚本读,层层是互补不是互替

## 总结点

1. 源管读取站管凭据
2. 同站不等于同源
3. CORS 与 SameSite 不可互替
