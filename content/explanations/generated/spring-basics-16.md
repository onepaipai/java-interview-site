<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银请求沙盘:HTTP 请求→DispatcherServlet→HandlerMapping(找 handler)→HandlerAdapter(调 handler)→View/ResponseBody——请求的管道与拦截点(Filter 链→DispatcherServlet→Controller)。

1. 管道:Filter 链(安全/编码)→DispatcherServlet→HandlerMapping 定位 handler→Interceptor.preHandle→HandlerAdapter 参数解析并调用 Controller→返回值处理→postHandle→渲染/消息转换→afterCompletion——每环可插入横切逻辑。
2. 拦截点:Filter(Servlet 层,在 DispatcherServlet 之前——不感知 Spring MVC);HandlerInterceptor(MVC 层,感知 handler 信息);AOP(Controller 的代理——方法级);@ControllerAdvice(异常处理)——四个拦截层级各有时机。
3. 参数解析:HandlerMethodArgumentResolver(@RequestBody/@RequestParam/@PathVariable 的解析器链)——参数绑定的扩展点(自定义 Resolver)。

## 参考分析

### 第二步扩展① 机制:MVC 请求管道

- Filter 链→DispatcherServlet→HandlerMapping→Interceptor.pre→HandlerAdapter→Controller→post→渲染→afterCompletion——管道的每一层有拦截点。

### 第二步扩展② 反例:管道误判的排查

- 请求 404(HandlerMapping 未匹配)/405(方法不匹配)/415(ContentType 不匹配)——每种错误的管道位置不同。
- 排查法:先看 DispatcherServlet 日志定位匹配失败点,再逐环对照——管道顺序即排查顺序。

### 第二步扩展③ 取舍:拦截层级的选择

- Filter(Servlet 层)/Interceptor(MVC 层)/AOP(方法层)——按需要拦截的粒度选层。
- 选择依据:横切所有请求用 Filter,只切 MVC 处理流程用 Interceptor,只切个别方法用 AOP。

## 案例

### 第三步发散·验证与推演 验证:MVC 管道的断言组

- 验证:管道顺序断言(Filter→Interceptor.pre→Controller→Interceptor.post→View→afterCompletion——日志顺序)。
- 异常传播断言(Controller 异常→ControllerAdvice→Interceptor.afterCompletion)。
- 参数解析断言(@RequestBody/@RequestParam 的绑定正确)——三组固化 MVC 管道。

### 第三步发散·追问扩展 追问链:MVC 三刀

- **Q1：DispatcherServlet 的映射?**
  - 答：urlPatterns(默认 /)——所有请求经 DispatcherServlet(除了静态资源映射[ResourceHandler]);多 DispatcherServlet(不同 url 前缀)罕见。
- **Q2：HandlerMapping 的优先级?**
  - 答：RequestMappingHandlerMapping(注解优先)>BeanNameUrlHandlerMapping>默认——多个 handler 匹配同一 URL→优先级决定(先注册先匹配)。
- **Q3：返回值处理?**
  - 答：ResponseBody(return 直接序列化[JSON])→View(模板渲染)→ResponseEntity(完整控制[状态+头+体])——返回类型决定处理方式(第 20 题)。

## 总结点

1. Filter→Dispatcher→Interceptor→Controller
2. 四个拦截层级各有时机
3. 返回类型决定处理方式
