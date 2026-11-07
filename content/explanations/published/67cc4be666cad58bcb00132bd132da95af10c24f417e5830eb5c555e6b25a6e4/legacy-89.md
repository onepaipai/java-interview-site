<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-config/interceptors.html)

</details>

## 参考回答

1. Filter 在 Servlet 链包围请求，可覆盖非 MVC 资源，范围由注册与分派类型决定；Interceptor 围绕 MVC 已选处理器。
2. 成功同步路径通常过滤器顺序进入、拦截器 pre 顺序进入，再逆序执行相应后置回调并退出过滤器；异常和异步需分别分析。

## 参考分析

1. preHandle 返回 false、绑定失败和异步分派都会改变后续回调，不能背一条序列覆盖所有路径。
2. 安全优先使用明确过滤器链并校验资源授权；MVC 拦截器不能天然保护其他 Servlet。

## 案例

1. 教学场景：F1、F2 包围 MVC，I1、I2 包围成功控制器，另测静态文件和拒绝请求。

2. 固定排序并记录探针，对比正常同步、拦截中止、控制器异常和异步完成。

3. 验证成功路径进入顺序明确，其他路径回调与清理正确，非 MVC 资源不会凭空经过控制器拦截器。

## 总结点

1. 过滤器范围取决于注册。
2. 异常和异步另验回调顺序。
