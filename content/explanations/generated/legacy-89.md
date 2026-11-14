<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

1. Filter 属于 Servlet 链，早于 MVC 处理器，可覆盖非 MVC 请求。
2. Interceptor 围绕 Handler 执行，适合 MVC 上下文逻辑。
3. 顺序与路径匹配需显式配置；安全过滤器异常不能全靠控制器 Advice。

## 参考分析

1. 过滤器可能覆盖非 MVC 请求。
2. ResponseEntity 组织状态、头和体，不能替代业务错误语义。

## 案例

1. 场景（教学示例）：请求先认证再校验参数并调用订单服务。
2. 处理：在边界记录请求号与耗时；按过滤器、分发器、拦截器、控制器追踪处理路径。

3. 验证：异常状态和追踪号贯穿链路；外层失败不会被误算成业务成功。

## 总结点

1. 分层按职责。
2. 边界记录请求号。
