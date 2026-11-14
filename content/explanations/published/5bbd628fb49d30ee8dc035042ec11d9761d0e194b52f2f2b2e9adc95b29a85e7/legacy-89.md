<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 Web 沙盘:Filter(Servlet 规范,所有请求)vs HandlerInterceptor(Spring MVC,仅 Controller)——执行顺序=Filter 前置→Servlet→Interceptor 前置→Controller→Interceptor 后置→Filter 后置(洋葱模型)。

1. Filter(Servlet 层):所有请求(包括静态资源)——不依赖 Spring MVC(纯 Servlet 规范);由容器(Tomcat)管理;HandlerInterceptor(MVC 层):只拦截 Controller(不拦截静态资源);依赖 Spring 上下文(可注入 bean)。
2. 执行顺序(洋葱):Filter.before→[Servlet→Interceptor.before→Controller→Interceptor.after(视图渲染前)]→Interceptor.afterCompletion(渲染完成后)→Filter.after——Filter 包裹整个请求,Interceptor 包裹 Controller 处理。
3. 选择:横切所有请求(编码/CORS/安全)→Filter;仅拦截 MVC(登录/权限/日志)→Interceptor;Filter 拿不到 Handler 信息,Interceptor 异常进 ControllerAdvice(第 18 题),Filter 异常不进(需独立处理)。

## 参考分析

### 机制:洋葱模型的两层包裹

Filter 与 Interceptor 是"两层洋葱":Filter(外层,包裹整个请求含静态资源)→DispatcherServlet→Interceptor(内层,包裹 Controller)→Controller——请求从外到内穿,响应从内到外穿;Filter 的 doFilter(request,response,chain) 中 chain.doFilter() 前后是"前置与后置"的分界。

### 反例:Filter/Interceptor 的两种事故

事故一:Filter 中抛异常不处理——Filter 异常不进 ControllerAdvice(错误格式不一致,第 18 题 spring-basics);修复=Filter 异常自行处理(catch+统一格式输出)。事故二:Interceptor 做 Filter 的事(如编码)——编码应在 Filter(更早,所有请求含静态资源);修复=按"拦截范围"选层(第 18 题选择依据)。

### 取舍:Filter 与 Interceptor 的选择

需要 Handler 信息(哪个 Controller/方法)→Interceptor(preHandle 拿到 HandlerMethod);需要操作原始请求/响应(包装 request)→Filter;需要 Spring 上下文(注入 bean)→Interceptor(Filter 中注入 bean 需要 DelegatingFilterProxy);纯 Servlet 规范(不依赖 Spring)→Filter。

## 案例

### 验证:执行顺序的走查核对

验证:顺序断言(Filter.before→Interceptor.preHandle→Controller→Interceptor.postHandle→Filter.after,日志顺序);异常路由断言(Filter 异常不进 Advice/Controller 异常进 Advice);静态资源断言(Filter 拦截静态资源/Interceptor 不拦截)。验证:顺序断言可程序化(日志顺序+mock 请求);洋葱模型的时间线可视化。

### 追问链:Filter 三刀

一刀:"Filter 的顺序?"——@Order 注解或 FilterRegistrationBean.setOrder(数值小先执行)——安全 Filter(Security)通常最先(第 17 题 spring-basics 的 Filter 链)。二刀:"Filter 的异步?"——Servlet 3.0 异步(startAsync)→Filter 的 after 在 async 完成后执行(不是 doFilter 返回后)——异步请求的 Filter 生命周期变化。三刀:"OncePerRequestFilter?"——保证每次请求只执行一次(转发/include 不重复执行)——需要"严格一次"语义的 Filter 继承 OncePerRequestFilter。

## 总结点

1. Filter=Servlet 层全部请求
2. Interceptor=MVC 层仅 Controller
3. 洋葱模型:Filter 包 Interceptor 包 Controller
