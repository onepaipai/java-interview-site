<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-config/interceptors.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-security/reference/6.5/servlet/authorization/authorize-http-requests.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Servlet / Spring MVC 6.2 教学设计：应用同时提供控制器接口和静态资源，需要记录请求号、执行安全控制，并对特定处理方法记录业务耗时。

1. Filter 属于 Servlet 链，可在请求进入 DispatcherServlet 之前处理请求和响应，也可覆盖非 MVC 资源；具体范围取决于 URL、Servlet 和 dispatcher type 的注册。
2. HandlerInterceptor 属于 MVC 处理器链，适合利用已选处理器信息做轻量上下文或观测。它不能自然覆盖所有入口，也不能像请求包装器那样统一替换请求体。
3. 安全控制优先放在 Spring Security 等明确的过滤器链并在服务内守住资源授权。拦截器路径匹配与控制器映射可能有差异，不宜作为唯一安全边界。

## 参考分析

### 覆盖范围：注册决定实际经过哪些链

Filter 在 Servlet 容器层注册，可以包住 DispatcherServlet、其他 Servlet 及部分静态资源，但不是写一个类就覆盖所有请求。URL 匹配、执行顺序和 REQUEST、ASYNC、ERROR 等分派类型都会改变触发次数。OncePerRequestFilter 也需要结合异步和错误分派配置理解，不能把名字解释成任意情形下永远只执行一次。类比围墙与楼层门禁：Filter 是围墙（覆盖所有进出），HandlerInterceptor 是楼层门禁（只管进 MVC 房间）——授权要考虑两层是否都覆盖。

### 处理器上下文：知道方法不代表能接住所有失败

MVC 已选到处理器后，HandlerInterceptor 可以读取 HandlerMethod 等信息，按方法注解记录耗时或增加上下文；preHandle 可以中止当前链。控制器异常、入口拒绝、序列化失败与异步分派会影响后续回调，清理逻辑要按生命周期实现。不要在拦截器中重复读取不可重放的请求流而破坏参数绑定。

### 安全边界：观测挂点与授权职责分别设计

Spring 文档明确提示拦截器可能与注解控制器的路径匹配不一致，更适合使用 Spring Security 或 Servlet Filter 链做安全入口。资源归属与对象级权限还应在掌握业务数据的服务中验证。只给一个 MVC 拦截器加登录判断，无法证明另一个 Servlet、错误分派或新增入口也受到保护。

## 案例

### 同步顺序实验：两层包装与处理器调用

教学配置两个过滤器 F1、F2 和两个拦截器 I1、I2，显式固定顺序，对一个成功的同步控制器记录探针。预期进入顺序为 F1、F2、I1.pre、I2.pre、Controller；成功情况下 post 与 completion 按拦截器逆序执行，再退出 F2、F1。不要把该成功顺序直接当成所有异常和异步路径的固定模板。

### 覆盖验证：静态资源、拒绝与异步分别测

补测静态文件、未认证控制器、主动返回 false 的拦截器和异步接口，记录各探针是否到达以及上下文是否清理。预期非 MVC 路径不会凭空获得控制器拦截器保护；入口安全拒绝时业务方法不执行；异步完成后不遗留线程上下文。此案例给出隔离测试设计，并未宣称已完成全应用入口安全审计。

## 总结点

1. 围墙管进出，楼层门禁管房间
2. Filter 覆盖范围由注册决定
3. 拦截器围绕 MVC 处理器
4. 授权需覆盖入口和资源
