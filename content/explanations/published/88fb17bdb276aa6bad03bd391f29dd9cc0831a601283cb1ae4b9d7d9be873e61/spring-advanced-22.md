<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银网关沙盘:外部请求伪造 X-Forwarded-For: 127.0.0.1 绕过内网白名单;应用信任了这个头。说明转发头的信任边界与 Spring 的处理配置。

1. X-Forwarded-For/X-Forwarded-Proto 等头可被客户端任意伪造:安全逻辑(限流键、白名单、重定向)信任它们前必须先建立"可信代理链"。
2. Spring 侧机制:ForwardedHeaderFilter 与 server.forward-headers-strategy;更严格的是显式配置可信代理网段,只接受来自可信代理附加的头(右手边第一个不可信地址才是客户端真实 IP)。
3. 原则:应用只信任自己部署边界内(负载均衡/K8s ingress)注入的头;跨边界接收的头一律按不可信输入处理。

## 参考分析

### 第二步扩展① 机制:XFF 的追加语义与伪造面

- X-Forwarded-For 是逗号分隔链:每经过一个代理追加上一跳地址。
- 客户端可以自带一个伪造值,真实路径=client伪造值, 真实client, proxy1...——取最左边(很多老代码的做法)正好取到伪造值。
- 正确解析:从右往左跳过可信代理列表,第一个不可信地址即真实客户端。
- Spring 的 ForwardedHeaderFilter 处理 X-Forwarded-* 以还原 scheme/host/port(用于链接生成),但对"客户端 IP 判定"需要应用层的可信链解析,两者不要混为一谈。

### 第二步扩展② 推演:伪造头的攻击画像(附真实上下文行为锚点)

- 画像:内网白名单判定 request.getHeader(X-Forwarded-For).startsWith(10.)——攻击者自带该头即绕过。
- 修复:解析器按可信代理网段(RFC 7239 或自实现)取真实 IP。
- 或网关统一剥除入站 XFF 后重写。
- 本机锚点:认证与上下文行为可实测(Q19:alice:anonymous——上下文来源决定身份),IP 判定同属"来源可信"命题。
- 验证:攻击画像为推演,修复解析器可用单测覆盖(给定伪造链+可信网段→期望真实 IP)。

### 第二步扩展③ 取舍:边界治理的落点

- 网关层统一:入口 LB/网关剥除可疑头并注入规范的 X-Real-IP/X-Request-Id——应用只信网关注入的头(网关地址硬编码可信)。
- 应用层防御:即使网关失职,解析器按可信网段兜底。
- 两个可信层重叠不算冗余。
- K8s 环境:ingress-nginx 的 use-forwarded-headers 与 externalTrafficPolicy 影响真实 IP 获取,配置漂移要纳入巡检。
- 测试:伪造头用例(带假 XFF/Host/Proto)进安全回归集。

## 案例

### 第三步发散·验证与推演 验证:安全回归集注入伪造头(X-Forwarded-For/Hos

- 验证:安全回归集注入伪造头(X-Forwarded-For/Host/Proto),断言白名单判定不受影响、真实 IP 解析正确(给定伪造链+可信网段的期望输出)。
- 解析器用单测矩阵覆盖。

### 第三步发散·追问扩展 追问链:转发头三刀

- **Q1：Host 头伪造有什么风险?**
  - 答：重定向/链接生成使用 Host 时被注入钓鱼域名、缓存投毒:server.forward-headers-strategy 配合网关白名单 Host。
- **Q2：X-Request-Id 能信吗?**
  - 答：链路追踪用它串联(第 40 题),但必须由可信边界生成(入站伪造的 ID 会污染追踪);网关剥旧注入新。
- **Q3：怎么审计头信任?**
  - 答：枚举安全逻辑用到的每个头,标注"谁注入、在哪层验证",没有注入者的头一律不用于安全判定。

## 总结点

1. 转发头可伪造,信任有边界
2. 网关注入,应用兜底
3. 伪造头用例进安全回归
