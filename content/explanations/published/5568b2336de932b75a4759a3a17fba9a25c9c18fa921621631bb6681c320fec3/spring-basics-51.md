<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/integration/rest-clients.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网关沙盘:一个 Spring Boot 3.5 服务调用下游 HTTP 接口，团队在 RestTemplate、WebClient 与 Spring Framework 6.1 引入的 RestClient 之间选择；需要给出同步/异步、依赖与演进的判据。

1. RestClient 是 Spring Framework 6.1 引入的同步 HTTP 客户端，API 风格接近 WebClient 但基于阻塞 I/O，适合传统 Servlet 线程模型；它不是 RestTemplate 的简单重命名。
2. WebClient 面向响应式与非阻塞场景，收益要在 Reactor 与下游全链路非阻塞时才能兑现；只因为"异步听起来更快"而引入，会增加调试与背压复杂度。
3. RestTemplate 进入维护模式，新代码优先 RestClient；版本前提是当前项目使用 Spring Framework 6.1+，旧版本不能直接使用。

## 参考分析

### 第二步扩展① 机制:同步 API 也能有现代体验

- RestClient 提供链式 URI、请求头、状态码与响应体绑定，底层仍走阻塞 HTTP 客户端。
- 它把 WebClient 的人机接口带到同步世界，而不是把事件循环带进来。
- 类比餐厅点餐:RestTemplate 是纸质菜单（老式但能用），WebClient 是自助点单机（要整套系统配合），RestClient 是电子菜单但仍由服务员下单（体验更新、流程不变）。

### 第二步扩展② 边界:别把异步当万能加速

- WebClient 的非阻塞收益依赖整个调用链不阻塞:连接池、事件循环、响应式数据访问都要配套。
- 若在 WebClient 链路里调用阻塞 JDBC 或 Thread.sleep，仍会占住事件循环线程。
- 同步服务用 RestClient 反而更容易推理线程与事务边界。

### 第二步扩展③ 取舍:迁移策略与测试

- 新代码直接用 RestClient。
- 存量 RestTemplate 可按接口逐步迁移，保留超时、重试、错误解码的契约测试。
- 选择时要核对 Spring Framework 版本与底层 HTTP 客户端依赖，避免把 6.1+ 的 API 写进 6.0 项目。

## 案例

### 第三步发散·验证与推演 验证:契约测试的推演

- 教学验证:用同一 Mock HTTP 服务分别实现三个客户端，断言 GET 的状态码映射、JSON 绑定、超时异常与取消行为一致。
- 记录线程模型与代码行数差异。
- 该验证为设计口径，不代表本项目已集成三套客户端做实测。

### 第三步发散·追问① 追问:RestClient 支持流式响应吗

- RestClient 面向典型请求-响应体。
- 需要 SSE/流式读取时要按版本查看官方支持，不要默认它等价于 WebClient 的流式能力。
- 版本能力以 Spring Framework 参考文档为准。

## 总结点

1. 同步选 RestClient，异步才用 WebClient
2. 维护态 RestTemplate 逐步迁
3. 版本先对齐，异步不等于快
