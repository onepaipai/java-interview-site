<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-ann-async.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-security/reference/6.5/servlet/integrations/mvc.html)

</details>

## 参考回答

1. Callable、DeferredResult 等可让 Servlet 请求进入异步处理，原线程释放后在后续分派完成响应；并非所有业务操作因此非阻塞。
2. 明确执行器容量、容器与代理超时、取消及异常协议；线程本地事务、身份与日志上下文不能假定全部自动保留。

## 参考分析

1. Spring 对部分 MVC 异步路径有安全上下文集成，但用户自建线程和完成回调仍需按实际设施验证。
2. 超时返回不保证后台任务已经终止，副作用需要自己的幂等、时间预算和可恢复状态。

## 案例

1. 教学场景：DeferredResult 已返回超时，后台任务仍写库，客户端重试造成重复操作。

2. 用闩锁控制完成顺序，记录请求线程、工作线程和再次分派，统一超时与业务状态查询。

3. 验证超时、正常完成和异常都只产生符合协议的最终响应，晚到结果不重复产生副作用。

## 总结点

1. Servlet 异步不等于全链路非阻塞。
2. 超时响应与任务终止分开。
