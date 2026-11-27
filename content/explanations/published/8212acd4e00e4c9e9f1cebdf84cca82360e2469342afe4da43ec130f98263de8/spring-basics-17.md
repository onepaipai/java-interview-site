<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银网关沙盘:认证过滤器(Filter,在 Dispatcher 之前)vs 权限拦截器(HandlerInterceptor,感知 handler)——Filter 管 Servlet 层通用(编码/安全/日志),Interceptor 管 MVC 层特定(handler 感知/路径判断)。

1. Filter 在 Servlet 规范层,容器级生效,不感知 MVC handler——适合编码/认证/CSRF/压缩等全局横切;Interceptor 在 Spring MVC 层,感知 handler 与路径映射——适合 handler 级权限、耗时统计等 MVC 语境逻辑。
2. 时序:Filter→DispatcherServlet→Interceptor.pre→Handler→Interceptor.post→View→Interceptor.afterCompletion→Filter 链返回——Filter 在最外层,Interceptor 在 Dispatcher 内部。
3. 选择:需要 handler 信息(路径/方法)→Interceptor;不需要(纯 Servlet 层)→Filter——Filter 的优先级高于 Interceptor(先执行)。

## 参考分析

### 第二步扩展① 机制:Filter 与 Interceptor 的时序

- Filter 在 DispatcherServlet 之前(Servlet 层)。
- Interceptor 在 DispatcherServlet 内部(MVC 层)——Filter 先执行。

### 第二步扩展② 反例:层级误选的后果

- 需要 handler 信息的逻辑放 Filter(拿不到 HandlerMethod)。
- 纯 Servlet 层逻辑放 Interceptor(多一跳)——层级错选=功能缺失或性能损耗。

### 第二步扩展③ 取舍:Filter 的读 body 禁忌

- Filter 读 body 后 Controller 读不到(流只能读一次)——需要读 body 用 ContentCachingRequestWrapper。

## 案例

### 第三步发散·验证与推演 验证:时序与边界的断言组

- 验证:时序断言(Filter.pre→Interceptor.pre→Controller→Interceptor.post→Filter.post——日志顺序)。
- handler 感知断言(Interceptor 拿到 HandlerMethod[方法信息]。
- Filter 拿不到)。
- 异常传播断言(Interceptor.pre 异常→ControllerAdvice。
- Filter 异常→容器 error page)——三组固化 Filter/Interceptor 边界。

### 第三步发散·追问扩展 追问链:Filter 三刀

- **Q1：Filter 的顺序?**
  - 答：@Order/FilterRegistrationBean.setOrder(数值越小越先)——安全 Filter 在业务 Filter 之前(认证先行);Spring Security 的 FilterChainProxy 是一个特殊的 Filter(内部再分链,第 17 题 spring-advanced)。
- **Q2：Interceptor 的执行范围?**
  - 答：addPathPatterns/excludePathPatterns(路径匹配)——Interceptor 的注册可精确到路径(第 17 题 spring-advanced 多链)。
- **Q3：Filter 读完 body?**
  - 答：Filter 读 body 后 Controller 读不到(流只能读一次,第 26 题 spring-advanced)——ContentCachingRequestWrapper 解决——Filter 设计的读取纪律。

## 总结点

1. Filter 在外管 Servlet 层,Interceptor 在内管 MVC 层
2. Filter 不感知 handler,Interceptor 感知
3. Filter 先执行,读 body 要包装
