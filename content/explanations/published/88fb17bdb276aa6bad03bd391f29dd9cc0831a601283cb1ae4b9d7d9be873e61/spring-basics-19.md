<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银接口沙盘:业务异常(BizException)与参数错误(MethodArgumentNotInvalidException)的响应格式不同——统一异常处理:ControllerAdvice 分类型处理+统一响应骨架+双通道覆盖(第 27 题 spring-advanced 的双通道)。

1. 统一骨架:code/message/traceId/timestamp,业务/参数/系统异常返回同构——前端一次接入。@ExceptionHandler 按类型分发:BizException 出业务码,校验异常出字段级错误,兜底 Exception 出 500 加 traceId。
2. 双通道:Controller 内异常(HandlerMethodArgumentResolver 之后→ControllerAdvice 可捕获)与过滤器异常(之前→AuthenticationEntryPoint 等,不可进 Advice,第 27 题 spring-advanced)——双通道都要统一骨架。
3. 与错误码体系的衔接:异常携带错误码(第 45 题)——ControllerAdvice 按 code 查注册表→组装响应(第 45 题注册表)——错误码与响应格式的一致性由注册表保证。

## 参考分析

### 第二步扩展① 机制:异常的分发管道

- Controller 异常→ControllerAdvice(按异常类型分发)→统一响应。
- 过滤器异常→不进 Advice(需独立处理)。
- 边界:DispatcherServlet 之前的异常不进 Advice,过滤器层需自行兜底统一格式。

### 第二步扩展② 反例:双通道不统一的后果

- 过滤器异常与 Controller 异常的响应格式不同——前端处理逻辑分裂。
- 治理:过滤器异常单独映射到同一骨架,错误码枚举全局唯一,响应格式全链路对齐后前端处理逻辑归一。

### 第二步扩展③ 取舍:统一骨架的设计

- code/message/traceId 统一——业务/参数/系统三类异常各自映射到骨架。
- 骨架字段演进只增不改,旧客户端兼容靠版本化错误码,而不是改字段语义。
- 错误码清单进接口文档,与前端对齐。

## 案例

### 第三步发散·验证与推演 验证:统一处理的断言组

- 验证:骨架一致断言(业务异常/参数错误/系统异常的响应骨架一致——code/message/traceId)。
- 字段级断言(参数错误的响应含字段级错误列表[field/message])。
- 双通道断言(过滤器异常与 Controller 异常的响应格式一致)——三组固化统一处理。
- 响应格式的 CI 断言(格式漂移拦截)。

### 第三步发散·追问扩展 追问链:异常处理三刀

- **Q1：异常处理的优先级?**
  - 答：@ExceptionHandler 的精确匹配(异常子类优先于父类)——异常层次的匹配规则(最近的 Handler 优先)。
- **Q2：异常与 HTTP 状态?**
  - 答：BizException→422(业务错误)/参数错误→400/系统错误→500——HTTP 状态的语义映射(第 14 题distributed REST 语义)。
- **Q3：异常日志的级别?**
  - 答：业务异常 WARN(可预期)/参数错误 INFO(用户操作)/系统错误 ERROR(告警)——日志级别按异常语义分级。

## 总结点

1. 统一骨架:code message traceId
2. 双通道覆盖过滤器与 Controller
3. 错误码注册表保证一致性
