<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 API 沙盘:配置了 CORS 允许跨域就以为安全了——CORS 是浏览器的限制,服务端直接调用不受 CORS 约束;CORS 不是权限校验,权限校验靠认证+授权。

1. CORS 的本质:浏览器同源策略的实现——跨域请求被浏览器拦截,除非服务端用 CORS 头允许;服务端不拒绝,浏览器才拒绝。
2. CORS 不是权限:非浏览器客户端(curl、服务端调用)不受 CORS 约束;CORS 配置允许不等于接口公开——接口权限靠认证+授权。
3. 正确配置:CORS 管跨域(前端域名白名单)+权限校验管访问(认证+授权)——两者独立,各管一段。

## 参考分析

### 机制:CORS 与权限的分离

CORS 是浏览器同源策略的实现:跨域请求被浏览器拦截,除非服务端返回 CORS 头允许;约束对象是浏览器。权限是服务端的认证+授权逻辑,与 CORS 无关;约束对象是一切请求。本质差异:CORS 是浏览器行为(客户端限制),权限是服务端行为(服务端逻辑)——非浏览器客户端不受 CORS 约束,但必须过权限校验。

### 反例:CORS 即安全的误判

沙盘:API 配置了 CORS 允许特定域名,以为接口安全;curl 直接调用——无 CORS 限制,照样到达接口;如果接口无认证授权,数据直接泄露。修复:CORS 只管跨域(前端域名白名单),接口权限靠认证+授权——两者独立配置,互不替代。

### 取舍:credentials 与通配互斥

allowCredentials=true 与 allowedOrigins 通配(*)互斥——安全约束不允许"所有来源+带凭证",必须指定具体域名。Spring 的替代:allowedOriginPatterns 模式匹配,比通配灵活且安全——既支持模式又显式声明。

## 案例

### 验证:CORS 与权限的分离断言组

验证:CORS 断言——跨域请求的 CORS 头检查(浏览器行为);权限断言——无认证的请求 401,不管 CORS 配置;独立断言——关闭 CORS 配置后认证仍拦截。三组固化 CORS 与权限的分离。

### 追问链:CORS 三刀

一刀:preflight 请求——复杂请求先发 OPTIONS 预检,预检结果可缓存(Access-Control-Max-Age)。二刀:CORS 配置位置——全局 WebMvcConfigurer 或方法级 @CrossOrigin。三刀:credentials 与通配互斥——不允许"所有来源+带凭证"的组合,必须显式列域名。

## 总结点

1. CORS 管浏览器,权限管服务端
2. 非浏览器不受 CORS 约束
3. credentials 与通配互斥
