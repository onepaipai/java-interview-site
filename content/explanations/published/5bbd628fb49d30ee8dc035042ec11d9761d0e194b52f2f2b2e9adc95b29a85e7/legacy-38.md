<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-servlet.html)

</details>

## 参考回答

1. DispatcherServlet 分派请求，HandlerMapping 选择处理器链，HandlerAdapter 适配并调用；此前先经过过滤器。
2. 注解控制器经参数解析、绑定校验和消息转换处理输入；返回值可写 JSON 或进入视图解析，异常由相应解析链处理。

## 参考分析

1. 拦截器围绕已选处理器执行，参数错误可在控制器方法前失败；安全 Filter 拒绝时甚至不进入 MVC。
2. JSON 响应通常不走 ViewResolver；异步、错误分派与响应写出失败需要独立分析。

## 案例

1. 教学场景：GET /orders/1 成功，POST /orders 的 JSON 损坏，另一个请求未登录。

2. 分别记录过滤器、拦截器和控制器探针，并核对映射、参数处理与异常响应。

3. 验证成功请求有完整业务调用，损坏 JSON 不执行创建服务，入口拒绝不进入控制器；不能只检查最终页面有文字。

## 总结点

1. 映射选择处理器链。
2. 适配负责调用与输入输出。
