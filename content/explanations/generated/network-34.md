<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [RFC 9110 · HTTP 语义 · 1](https://www.rfc-editor.org/rfc/rfc9110.html)
- [developer.mozilla.org · 2](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银接入沙盘:网关终结 TLS 后应用收到纯 HTTP,应用生成的回调地址、Cookie Secure 标记、重定向 URL 全部变成 http://——回调被浏览器拦截、Cookie 被拒收,功能静默异常;协议信息必须显式传递。

1. 信息丢失点:TLS 在网关终结,应用看到的是 HTTP/1.1 明文——"用户实际走的 HTTPS"这个事实只在网关手里;应用要靠转发头(X-Forwarded-Proto/X-Forwarded-Port)或标准 Forwarded 头恢复。
2. 受影响的四类逻辑:绝对 URL 生成(回调/支付跳转必须 https)、Cookie 属性(Secure/__Host- 前缀要求 https,缺失被浏览器拒收)、HSTS 与重定向(应用若自己发 http→https 跳转则死循环风险)、CSP 与混合内容判定(页面资源引用 http 会被拦截)。
3. 落地三步:网关强制注入协议头(重写不可伪造)、框架声明信任代理(Spring Boot server.forward-headers-strategy 等)、应用侧断言(生产环境收到的 proto 非 https 即告警/拒绝)。

## 参考分析

### 第二步扩展① 机制:终结点与信任边界

- 终结点(网关)是唯一知道原始协议的地方——它注入的头就是"事实的传递"。
- 但头可被伪造(见 Q33),所以应用只信任"来自可信网关的头"(按来源段校验)。
- 框架的 trust-proxy 配置决定是否采信,不配=忽略(绝对 URL 生成错误),乱配=可被伪造。

### 第二步扩展② 反例:协议丢失的三种事故

- 事故一:OAuth 回调生成 http://——回调 URI 与注册不符,授权失败且报错信息难懂。
- 事故二:Cookie 无 Secure——登录 Cookie 在 http 语义下下发,浏览器策略收紧后拒收,用户"登不上"。
- __Host- 前缀强制 Secure+无域,更严。
- 事故三:应用发 301 http→https——网关已终结,应用见 http 即跳,但重定向到网关还是 http 进来→死循环(网关层必须先重写 proto 头)。

### 第二步扩展③ 取舍:终结位置的选择

- 网关统一终结:证书集中管理、应用零 TLS 负担,代价=协议信息传递与内部明文。
- 应用各自终结(mTLS/端到端):信息不丢,代价=证书下发与轮换复杂。
- 常见组合:外部网关终结(用户体验流量)+内部 mTLS(服务间,见 Q20)——两层终结两层协议语义,各自传递。

## 案例

### 第三步发散·验证与推演 验证:协议传递的推演核对

- 推演核对:本机 N7/N8 实验证实"响应语义由头驱动"(Cache-Control/Content-Range 决定行为)——X-Forwarded-Proto 同理是应用行为的事实输入。
- 伪造路径与 Q33 同源(请求头不可信,按可信段校验)。
- 验证:四类受影响逻辑(回调/Cookie/重定向/CSP)的失效链条闭合,落地三步(注入/声明/断言)可执行。

### 第三步发散·发散要点 追问链:协议三刀

- **追问①**：HSTS 的配合——网关层发 Strict-Transport-Security,浏览器记住强制 https,应用层错误协议被浏览器直接拦截,反而掩盖应用 bug;分层要清楚
- **追问②**：内部跳转的协议一致——服务间回调(支付异步通知)用配置的显式 URL(环境变量)而非请求拼接,彻底绕开协议推断
- **追问③**：与 Q13 重定向码的衔接——协议修正的跳转用 307(保方法),301 会被永久缓存(迁移回滚噩梦)

### 第三步发散·追问② 追问:X-Forwarded-Port 的丢失场景

- 端口丢失的典型场景:非标端口部署(https://m.bank.cn:8443)或容器端口映射(对外 443 对内 8080)——网关只传 X-Forwarded-Proto 不传 Port,应用拼绝对 URL 时默认 443,回调地址与注册不符。
- 标准 Forwarded 头(RFC 7239,for/by/proto/host 一体)比散装 X-Forwarded-* 完整,host:port 一起带——落地三步的"注入"应含端口,框架的 forward-headers 处理也要核对端口字段。

## 总结点

1. 终结点注入可信传递
2. Secure 回调重定向三处受影响
3. 生产断言非 https 即告警
