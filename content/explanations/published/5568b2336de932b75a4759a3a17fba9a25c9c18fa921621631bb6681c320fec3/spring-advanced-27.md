<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银前端沙盘:@RestControllerAdvice 捕获了业务异常,认证过期却返回了默认的 401 JSON(非统一格式)——认证异常发生在过滤器层,根本没进 DispatcherServlet,ControllerAdvice 看不见。用分层异常处理说明全覆盖的配置方法。

1. 异常处理的两个层:ControllerAdvice 管的是"进入 MVC 后"的异常(@RequestMapping 执行与消息转换阶段);过滤器链(认证/授权/第 17 题)的异常在其之前,由 AuthenticationEntryPoint/AccessDeniedHandler 处理。
2. 实测锚点:过滤链在 MVC 之外(Q17 首匹配语义),链内 JwtFilter 抛出的异常不会进 @RestControllerAdvice——两条异常通道必须分别配置。
3. 统一形态:业务异常走 ControllerAdvice;认证/授权失败走 EntryPoint(401)/DeniedHandler(403),输出与业务错误同构的响应体;格式统一由共享响应组装器保证。

## 参考分析

### 第二步扩展① 机制:两个异常通道的分界

- 请求路径:FilterChain(认证/授权)→ DispatcherServlet → Controller。
- ControllerAdvice 的 @ExceptionHandler 只覆盖 DispatcherServlet 内抛出的异常。
- 过滤链里 AuthenticationException/AccessDeniedException 由 ExceptionTranslationFilter 翻译并委托给 AuthenticationEntryPoint(未认证→401+认证入口)与 AccessDeniedHandler(已认证无权限→403)。
- 两条通道的输出若各写各的,前端就要适配两种错误格式——这是"统一异常处理"真正要统一的点。

### 第二步扩展② 推演:双通道的统一配置(附真实上下文锚点)

- 配置推演:自定义 JwtAuthenticationEntryPoint 实现 AuthenticationEntryPoint,响应体复用与 ControllerAdvice 相同的 ErrorResponse 组装器(code/message/traceId)。
- AccessDeniedHandler 同理。
- 本机锚点:认证上下文行为实测(Q19 alice:anonymous——anonymous 即未认证,EntryPoint 被触发的判定依据):
```
alice:anonymous
```
- 验证:双通道配置为规范推演,可集成测试覆盖(过期 token→401 统一体。
- 无权限→403 统一体)。
- 格式一致性用响应体断言。

### 第二步扩展③ 取舍:统一到什么程度

- 统一的部分:响应骨架(code/message/traceId/时间戳)——前端与网关按骨架处理。
- 不统一的部分:错误语义(认证错误的 401 带认证入口提示、业务错误的 422 带字段明细)——语义各归各。
- traceId 双通道都要带(过滤链异常也要可追踪,第 40 题):EntryPoint 里从 MDC 取。
- 回归集:双通道各至少一条用例(业务异常格式+认证异常格式),格式漂移进 CI。

## 案例

### 第三步发散·验证与推演 验证:集成测试双通道各一条:过期 token 断言 401 且响应

- 验证:集成测试双通道各一条:过期 token 断言 401 且响应体为统一骨架。
- 业务异常断言 422 同骨架——响应体格式断言进 CI,格式漂移(两种错误两种格式)直接失败。

### 第三步发散·追问扩展 追问链:异常通道三刀

- **Q1：过滤器里的业务异常怎么办?**
  - 答：过滤器层尽量只抛安全类异常,业务校验沉到 controller/service(第 18 题);过滤器必须失败时,自己组装统一响应并 return(不指望 Advice)。
- **Q2：Spring Security 6 的 AuthorizationDeniedException?**
  - 答：方法级授权(第 18 题)在 MVC 内抛出,可进 ControllerAdvice;过滤链内的同型异常走 DeniedHandler——同名异常两条通道,配置要两边都写。
- **Q3：怎么发现漏配?**
  - 答：枚举安全链过滤器,标注每个可能抛的异常与其出口;对照双通道配置表找空缺。

## 总结点

1. Advice 管不到过滤器,双通道各自配
2. 响应骨架统一,语义各自归位
3. traceId 双通道都带
