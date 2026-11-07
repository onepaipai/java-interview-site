<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-controller/ann-validation.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-ann-rest-exceptions.html)

</details>

## 参考回答

1. MVC 可用 @RestControllerAdvice 及异常处理方法统一映射错误，返回稳定错误码、合适 HTTP 状态和追踪标识。
2. 过滤器中的认证授权错误需要安全链对应处理器；不要假设所有异常都会经过控制器建议。

## 参考分析

1. Spring 6.2 要区分绑定校验、方法校验、JSON 解析等异常；字段错误应帮助客户端定位输入，不泄露内部类名和堆栈。
2. 未知错误记录服务端日志并返回受控 5xx；不能把所有失败包装成 200，也不能把数据库异常原文直接发给客户端。

## 案例

1. 教学场景：创建订单分别输入负数量、损坏 JSON、业务冲突和触发未知故障。

2. 为每条路径定义状态、稳定 code、字段错误与 traceId；安全拒绝另由入口处理器按相同协议输出。

3. 验证客户端能区分重填、冲突和稍后重试；响应无 SQL 或堆栈，日志可以通过 traceId 定位原因。

## 总结点

1. 统一协议但保留失败语义。
2. 安全入口异常另有处理边界。
