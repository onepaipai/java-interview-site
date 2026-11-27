<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [OWASP 提示注入风险 · 1](https://genai.owasp.org/)
- [Google SRE · 2](https://sre.google/sre-book/service-level-objectives/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银会话沙盘:Cookie(客户端存储,自动携带)vs Session(服务端存储,依赖 Cookie 传 SessionID)——分布式部署下 Session 共享三方案(复制/Sticky/集中存储)。

1. Cookie:客户端存储(浏览器管理,4KB 限制,自动携带同域请求)——安全性低(可篡改/窃取);Session:服务端存储(依赖 Cookie 传 SessionID)——安全性高(数据在服务端)——分布式部署问题:Session 在一个节点→请求路由到其他节点→Session 丢失。
2. 分布式 Session 三方案:Session 复制(节点间同步,小集群)/Sticky 会话(LB 按用户路由,节点故障丢会话)/集中存储(Redis Session,所有节点读写同一 Redis——最常用,Spring Session)。
3. Cookie 安全属性:HttpOnly(JS 不可读,防 XSS 窃取)+Secure(仅 HTTPS 传输)+SameSite(Strict/Lax/None——CSRF 防御,第 23 题)——三属性=Cookie 安全的基础配置。

## 参考分析

### 第二步扩展① 机制:Session 的本质=服务端状态存储

- Cookie 是门票(SessionID),Session 是保险箱(数据在服务端)。
- Cookie 被偷=SessionID 泄露(会话劫持)——Cookie 安全属性(HttpOnly/Secure/SameSite)是基础防线(第 23 题 CSRF)。

### 第二步扩展② 反例:Session 管理的两种事故

- 事故一:分布式部署用本地 Session——LB 轮询到其他节点→Session 找不到→用户被踢出。
- 修复=Spring Session Redis(集中存储)。
- 事故二:Cookie 未设 HttpOnly——JS 可读 SessionID(XSS 窃取会话)。
- 修复=HttpOnly+Secure+SameSite。

### 第二步扩展③ 取舍:JWT vs Session 的选择

- JWT:无状态(不查存储)+跨域友好+撤销难(黑名单,第 22 题)。
- Session:有状态(查存储)+撤销即时+分布式需集中存储——选择=撤销需求+部署架构+运维能力(第 22 题选择框架)。

## 案例

### 第三步发散·验证与推演 验证:Cookie/Session 的走查核对

- 验证:Cookie 属性断言(HttpOnly/Secure/SameSite)。
- Session 共享断言(多实例 Redis Session 可用)。
- 互踢断言(新登录踢旧)。
- Cookie 安全断言(XSS 场景 HttpOnly 防 JS 读)——四组固化会话管理(第 129 题认证体系)。

### 第三步发散·发散要点 追问链:会话三刀

- **追问①·Cookie SameSite**：Strict/Lax/None(CSRF 浏览器层防御,第 23 题)
- **追问②·Session 超时**：服务端 web.xml/配置+Cookie Max-Age(独立配置,第 129 题)
- **追问③·分布式 Session 一致性**：Redis 集中存储(强一致)vs Session 复制(最终一致,第 24 题)

## 总结点

1. Cookie=门票,Session=保险箱
2. 分布式 Session=集中存储最常用
3. JWT vs Session 按撤销需求选
