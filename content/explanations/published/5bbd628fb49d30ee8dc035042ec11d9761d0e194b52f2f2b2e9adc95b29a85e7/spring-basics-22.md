<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银架构沙盘:单机粘性会话选 Session(服务端管理,撤销即时);多实例跨域选 JWT(无状态,撤销难)。按系统边界与撤销需求选择。

1. Session:服务端存储,撤销即时(删服务端记录),可管理(可列在线用户)——代价是存储与粘性/共享。JWT:客户端存储,无状态,跨域友好——代价是撤销难,令牌在客户端,服务端无法收回。
2. 选择口径:内网系统、撤销需求强,选 Session;微服务、跨域,选 JWT+黑名单撤销;混合形态——核心用 Session,API 层用 JWT,按边界与撤销需求定。
3. JWT 的续期:access 短有效期+refresh 长有效期,撤销 refresh 即撤销续期能力;access 过期后需重新认证或用 refresh 换新。

## 参考分析

### 机制:Session 与 JWT 的撤销模型

Session 的撤销=删除服务端记录(Redis/内存),下一请求即 401——毫秒级生效。JWT 的撤销=客户端令牌作废,服务端无法直接收回,只能靠黑名单(jti 入 Redis,剩余有效期做 TTL)或版本号(user.tokenVersion 比对)。撤销时效对比:Session 删记录即时;JWT 取决于黑名单查询(实时)或版本号比对(每请求)。

### 反例:JWT 撤销缺失的事故

沙盘:JWT 无黑名单——被盗令牌在有效期内持续可用,直到自然过期,被盗窗口=整个令牌有效期。修复:黑名单(jti 入 Redis,TTL=令牌剩余有效期)或版本号(user.tokenVersion+1,JWT 携带旧版本,校验失败)。两方案取舍:黑名单精确到令牌但要存储;版本号粗粒度(改密全失效)但简单。

### 取舍:多实例下的 Session 共享

Session 共享:Redis 存所有实例的 Session——需要 Redis,但撤销即时。粘性会话:负载均衡按 Session 路由到固定实例——无需共享,但实例故障丢会话。JWT:无共享需求,但撤销难。按运维能力与撤销需求选:能维护 Redis 选 Session 共享,强跨域无状态选 JWT。

## 案例

### 验证:Session JWT 的断言组

验证:Session 撤销断言——删 Session 后下一请求 401;JWT 撤销断言——jti 入黑名单后请求 401;多实例断言——Session 共享 Redis 可用,或 JWT 无需共享。三组固化选型;断言失败即会话管理缺陷。

### 追问链:会话三刀

一刀:JWT 过期设计——access 短+refresh 长,撤销 refresh 即撤销续期能力。二刀:Session 序列化——Spring Session Redis 的序列化兼容要注意版本升级(旧 Session 反序列化失败)。三刀:CSRF 与 JWT 的关系——JWT 放 Authorization 头(非 Cookie)天然免 CSRF;JWT 放 Cookie 与 Session 一样需要 CSRF 防护(见第 23 题)。

## 总结点

1. Session 撤销即时,JWT 撤销难
2. JWT 配黑名单,Session 配 Redis
3. 按边界与撤销需求选择
