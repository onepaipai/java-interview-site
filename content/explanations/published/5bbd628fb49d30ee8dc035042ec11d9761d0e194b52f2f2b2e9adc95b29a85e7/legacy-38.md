<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-servlet.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银接口沙盘:一笔 POST /orders 进来——DispatcherServlet 前端控制器统一调度(映射→适配→业务→异常→序列化);前后端分离下 ViewResolver 退化为消息转换。

1. 九步主线:请求→DispatcherServlet(前端控制器)→HandlerMapping(找 Handler+拦截器链)→HandlerAdapter(适配调用)→Controller(参数解析/校验)→返回对象→异常翻译(@ControllerAdvice)→消息转换(JSON)→视图渲染→响应。
2. 前后端分离形态:ViewResolver 基本不用——@ResponseBody 走 HttpMessageConverter(Jackson)序列化;参数解析=HandlerMethodArgumentResolver(@RequestBody/@PathVariable);校验=@Valid(失败→全局异常处理)。
3. 扩展点:拦截器(preHandle/postHandle/afterCompletion——登录校验/日志/ThreadLocal 清理,第 25 题);全局异常处理=@RestControllerAdvice+@ExceptionHandler(统一错误响应,第 12 题状态码纪律)。

## 参考分析

### 机制:为什么前端控制器模式

所有请求走统一入口——横切逻辑(编码/安全/日志/异常)集中一处,Handler 层只写业务;适配器解耦 Handler 的形态(注解方法/旧式 Controller/函数式)——框架演进加新形态不改主线。类比总台:客人不直接找部门,总台派单+汇总+结账。

### 反例:流程的两种事故

事故一:拦截器 afterCompletion 不清 ThreadLocal——线程复用上下文串号(第 25 题);修复=afterCompletion 必清(finally 语义)。事故二:异常没进全局处理——500 白页/堆栈泄漏;修复=@RestControllerAdvice 兜底 Throwable+按异常类型分级(第 12 题状态码)。

### 边界:与 Spring Boot 的关系

Boot 自动配置 DispatcherServlet(默认拦截所有 /)+Jackson+错误页(/error)——WebMvcConfigurer 定制(拦截器/转换器/跨域);理解流程=排错时的地图(404=映射没命中/415=转换器不认/500=异常链没接住)。

## 案例

### 验证:流程的实测走查

验证:主线断言(打日志在拦截器/Controller/Advice——顺序为 preHandle→业务→异常翻译→afterCompletion);异常断言(业务异常→@ExceptionHandler→统一 JSON 错误体,状态码正确);序列化断言(@RestController 返回 JSON,Content-Type=application/json);404/415 断言(错误路径/错误 Content-Type 的响应码)——四组固化主线,Spring 模块 MVC 测试可复跑。

### 追问链:MVC 三刀

一刀:拦截器 vs Filter=Handler 层(感知路由/方法)vs Servlet 层(更早,编码/压缩);认证用 Filter(安全链),业务横切用拦截器。二刀:参数校验链=@Valid 级联对象+分组校验(创建/更新不同规则)。三刀:异步=DeferredResult/Callable(释放容器线程,第 80 题池化同源)。

## 总结点

1. DispatcherServlet 统一调度九步
2. 分离架构=JSON 消息转换替代视图
3. 全局异常+拦截器是两大扩展点
