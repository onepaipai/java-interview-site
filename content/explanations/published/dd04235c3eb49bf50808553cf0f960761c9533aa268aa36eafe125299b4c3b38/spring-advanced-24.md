<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银重构沙盘:团队把 WebMVC 服务改成 WebFlux,却继续直接调 JPA/JDBC——阻塞调用发生在少量事件循环线程上,吞吐反而从 2000 QPS 掉到 300。说明阻塞与响应式的线程模型冲突及三种融合设计。

1. WebFlux 的事件循环线程只有 CPU 核数个:任何阻塞调用(JDBC/远程同步客户端/锁)都会挂起事件循环,整站请求排队。
2. 实测形态(社区普遍画像):MVC 200 线程扛 JDBC 阻塞 vs WebFlux 几个事件循环被同一个 JDBC 挂住——吞吐降一个数量级。
3. 三种融合:Schedulers.boundedElastic 包裹阻塞段(专用阻塞线程池)、R2DBC 替换 JDBC(真响应式)、该模块保持 WebMVC(混部按模块拆分)——不要裸调。

## 参考分析

### 第二步扩展① 机制:事件循环与阻塞的不兼容

- Netty 事件循环线程数=核数,设计假设"每任务微秒到毫秒级非阻塞":一个 50ms 的 JDBC 查询会让该循环上所有请求延迟 50ms。
- 与 MVC 的差异:MVC 每请求一线程(阻塞被隔离在各自线程),WebFlux 全请求共享几条线程(阻塞被放大到全站)。
- 响应式栈的正确姿势是全程非阻塞:R2DBC 驱动、WebClient、非阻塞 IO。
- 阻塞代码必须显式投放到 boundedElastic(弹性线程池,默认 10×CPU 上限)。

### 第二步扩展② 推演:阻塞调用的吞吐塌陷(附本机同构锚点)

- 量化推演:8 事件循环,每请求含 20ms JDBC——单循环串行 50 QPS,全站上限 400 QPS。
- 同负载 MVC 100 线程可 5000 QPS。
- 本机锚点(分布式 3 题,同构机制):共享资源被慢任务占满时快任务排队 967ms vs 舱壁 1ms——事件循环被 JDBC 占用即"全员排队"形态:
```
共享池:快任务排队=967ms
舱壁隔离:快任务排队=1ms
```
- 验证:线程模型冲突为规范推演,资源占用形态为本机实测同构。
- 完整 WebFlux 基准未在本机搭,标注。

### 第二步扩展③ 取舍:三种融合的适用

- boundedElastic 包裹:改造最小,publishOn(Schedulers.boundedElastic()) 包住阻塞段——注意池容量(阻塞线程数上限)与下游连接池匹配。
- R2DBC:语义统一真响应式,但生态(JPA 不可用)与团队学习成本高——新模块或重写时选。
- 模块拆分:重阻塞模块保持 WebMVC,响应式能力的新模块用 WebFlux——按团队现状最务实。
- 反模式清单:WebFlux 里出现 DriverManagerDataSource 直调、CompletableFuture.get()、synchronized 长段——评审直接打回。

## 案例

### 第三步发散·验证与推演 验证:测试期引入 BlockHound 检测事件循环上的阻塞调用,

- 验证:测试期引入 BlockHound 检测事件循环上的阻塞调用,列出全部 JDBC/同步调用点。
- 逐个包裹 boundedElastic 或替换 R2DBC 后,BlockHound 全绿为准——阻塞点清单即改造清单。

### 第三步发散·追问扩展 追问链:响应式三刀

- **Q1：怎么发现事件循环被阻塞?**
  - 答：BlockHound(测试期检测阻塞调用)、Reactor 的 onOperatorDebug/日志 warning(blocking call detected);线上看事件循环线程的 CPU 与等待栈。
- **Q2：boundedElastic 池多大?**
  - 答：默认 10×CPU 且 100k 排队上限:排队大=阻塞段过多,治本是减少阻塞调用而不是扩池;池线程阻塞时长监控与 MVC 线程池同一套纪律。
- **Q3：事务呢?**
  - 答：R2DBC 支持响应式事务;JDBC 事务在 boundedElastic 上要用编程式模板(第 12 题)并保证同线程同连接——响应式与线程绑定事务(第 8 题)的组合要格外小心。

## 总结点

1. 事件循环只有几条,阻塞即瘫痪
2. 阻塞投弹性池或换 R2DBC
3. 混部按模块,别裸调 JDBC
