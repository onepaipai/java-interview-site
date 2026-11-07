<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-servlet.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-controller/ann-validation.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Spring MVC 6.2 Servlet 栈教学场景：客户端提交 POST /orders，先经过安全过滤，再由 @RequestBody 绑定 JSON、执行校验并调用服务。对比成功、参数错误和未认证三条路径。

1. 请求先进入 Servlet Filter 链，再到 DispatcherServlet。它通过 HandlerMapping 找到处理器及拦截器链，由合适的 HandlerAdapter 调用处理方法。
2. 以注解控制器为例，适配器协调参数解析、消息转换、校验及返回值处理；JSON 响应通常由 HttpMessageConverter 写回，不必经过视图模板渲染。
3. 异常可由 MVC 的异常解析机制处理；在 Filter 中被拒绝的请求可能根本没有到达控制器。异步请求还涉及再次分派，不能只背一条同步调用链。

## 参考分析

### 入口分派：先确定哪个边界接住请求

Servlet 容器按注册规则调用过滤器，安全过滤器可以在 DispatcherServlet 之前完成认证或拒绝请求。DispatcherServlet 进入后通过 HandlerMapping 解析映射，结果不仅包含处理器，还可带拦截器。没有匹配映射、方法不支持、媒体类型不支持和未认证是不同失败来源，不应全部归结为 Controller 代码出错。类比机场到达流程：安检（Filter）在前，柜台分拣（DispatcherServlet）选柜台（HandlerMapping），柜员（HandlerAdapter）按票据办理——每一环都可能办不下去。

### 方法适配：参数准备本身就可能失败

RequestMappingHandlerAdapter 为注解控制器选择参数解析器：路径变量、请求参数与请求体有不同来源。请求体通常经消息转换器反序列化，再按签名触发校验；缺失字段、JSON 错误或约束违规可以使业务方法根本不执行。返回值处理器再决定写响应体、使用 ResponseEntity 还是转到视图流程。

### 异常与异步：不能假设所有请求都有相同步骤

MVC 异常通常交给 HandlerExceptionResolver 链，@ExceptionHandler 与控制器建议可参与处理；过滤器中发生的错误不天然由该链接管。异步返回值可能释放原处理线程并在后续分派完成响应，拦截器回调时机相应不同。记录请求号时必须考虑这些分派，否则容易重复计时或遗漏异常。

## 案例

### 三条路径：成功、绑定错误与入口拒绝

教学接口接收数量为正的下单 DTO，并给过滤器、拦截器、控制器和服务加测试探针。合法 JSON 应进入服务并返回约定状态；负数量或损坏 JSON 应在绑定校验阶段返回明确客户端错误；未认证请求应被安全入口拒绝，控制器探针没有记录。验证每条路径的状态、响应体和调用次数，不把只返回 200 当成整条链正确。

### 追问：返回 JSON 为什么没有 ViewResolver

把同一查询分别设计为 @ResponseBody DTO 和普通视图名，对照返回值处理与消息转换行为。预期 JSON 路径由适合的转换器写出，视图名路径才解析视图；再制造不可序列化数据验证服务成功并不保证响应写出成功。此教学设计只描述同步路径，异步接口需要另测超时、二次分派与上下文清理。

## 总结点

1. 安检在前，柜台分拣，柜员办理
2. 过滤器先于 MVC 分派
3. 映射找处理器，适配器负责调用
4. 参数和响应处理都可能失败
