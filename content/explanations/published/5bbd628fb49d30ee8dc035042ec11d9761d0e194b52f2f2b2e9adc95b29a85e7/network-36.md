<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [RFC 6265 · Cookie · 1](https://www.rfc-editor.org/rfc/rfc6265.html)
- [developer.mozilla.org · 2](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银支付沙盘:上线 SameSite=Lax 后 CSRF 风险显著下降,但安全评审仍要求保留 CSRF Token——SameSite 挡的是"浏览器自动携带",挡不住同站子域发起的攻击、旧浏览器降级、以及顶站导航触发的 Lax 放行。

1. SameSite 覆盖面:Strict=任何跨站请求不带;Lax=跨站的顶级导航 GET 仍带(链接跳转可用,POST 表单不带);None=全带(必须 Secure)——按此矩阵,跨站 POST(经典 CSRF)被 Lax 挡住,但顶级导航 GET 与同站子域不在覆盖内。
2. 缺口清单:同站子域攻击(attacker.bank.com 同站,Lax 放行)、旧浏览器无 SameSite 支持(降级为全带)、Lax 放行的顶级 GET 产生的状态变更(设计上 GET 不应有副作用,但历史系统有)、Cookie 注入型(子域可写主域 Cookie)。
3. 纵深组合:SameSite(Lax 默认)+CSRF Token(表单内嵌,服务端校验,不依赖 Cookie 携带行为)+关键操作二次确认(支付验密/短信)+Origin/Referer 校验(兜底)——SameSite 是第一层不是唯一层。

## 参考分析

### 机制:Token 与 SameSite 的互补性

SameSite 管的是"浏览器是否自动带凭据"(传输层),Token 管的是"请求是否携带攻击者拿不到的秘密"(内容层)——同站子域能拿到 Cookie 却拿不到页面内嵌 Token(XSS 除外,见 Q37);两层失效条件不重叠,叠加才是纵深。

### 反例:只靠 SameSite 的三种事故

事故一:子域 XSS 或子域接管——同站请求 Lax 全放行,CSRF 从子域发起,Token 缺失即失守。事故二:GET 副作用遗留——老接口用 GET 完成转账(Lax 顶级导航放行),攻击链接直达;治理 GET 副作用是前提。事故三:SameSite=None+Secure 但信任 Referer——Referer 可被策略剥离(Referrer-Policy),兜底逻辑不可靠。

### 取舍:Token 方案的成本

同步 Token(表单隐藏域):无状态前端简单,SPA/多标签页要处理刷新;双提交 Cookie(Token 写入 Cookie+表单,服务端比对):免服务端会话,但要防子域写 Cookie 攻击(配合 __Host- 前缀);SameSite=Strict 最强但破坏跨站跳转体验(第三方登录回调)。按交互形态选,组合必须保留。

## 案例

### 验证:缺口矩阵的推演核对

推演核对:Lax 放行矩阵(顶级导航 GET 带凭据)与 RFC 6265bis 语义一致;同站子域绕过路径与 Q35 的"同站不等于同源"结论衔接;Token 互补性按"失效条件不重叠"推演并明示(浏览器行为未自动化复测);验证:SameSite 非唯一防线的结论在缺口矩阵上成立,纵深组合必要。

### 追问链:CSRF 三刀

一刀:Token 与幂等键的关系——CSRF Token 防伪造请求,幂等键防重试重复(Q11),两者语义正交,勿混用。二刀:JSON API 的 CSRF 面——Content-Type: application/json 触发 CORS 预检,传统表单发不出 JSON(自定义头),天然多一层;但仍配 Token(SVG/form 某些路径可绕)。三刀:与 Q37 的衔接——XSS 存在时 Token 也被读走,前端注入防护是 CSRF 防线的上游。

## 总结点

1. SameSite 是第一层
2. 子域与 Lax 放行是缺口
3. Token 与 SameSite 互补
