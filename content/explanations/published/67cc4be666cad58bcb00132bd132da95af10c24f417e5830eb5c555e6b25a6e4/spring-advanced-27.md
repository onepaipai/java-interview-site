<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-security/reference/6.5/servlet/architecture.html)

</details>

## 参考回答

1. 安全 Filter 可能在请求到达 DispatcherServlet 前拒绝，MVC 的控制器建议无法天然处理整个 Servlet 链。
2. 认证入口与访问拒绝处理器应按协议返回错误，具体认证过滤器也可能有自己的失败处理；不要把所有错误只交给 ControllerAdvice。

## 参考分析

1. ExceptionTranslationFilter 处理其下游相应认证授权异常，但不是万能捕获器；过滤器顺序和异常类型会影响去向。
2. 区分 API 的 JSON 状态与页面重定向，内部根因写受控日志，对外不暴露堆栈。

## 案例

1. 教学场景：业务异常是 JSON，匿名访问却返回 HTML 登录页，前端解析报错。

2. 分别测试匿名、权限不足、登录失败和业务校验，给各自边界配置一致的 API 错误契约。

3. 验证状态、类型和错误码正确，拒绝时业务未执行；正常页面入口仍可按产品设计重定向。

## 总结点

1. 异常处理覆盖实际发生层级。
2. 安全拒绝有独立处理契约。
