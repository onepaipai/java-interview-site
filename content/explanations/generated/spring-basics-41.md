<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银测试沙盘:WebMvcTest 切片只加载 MVC 层(2 秒)vs SpringBootTest 加载全部 bean(15 秒)——切片快但覆盖窄完整慢但覆盖全。

1. 切片的选择 WebMvcTest 测 Controller 只加载 MVC 组件;DataJpaTest 测 Repository 只加载 JPA;JsonTest 测 JSON;SpringBootTest 测全部交互——切片等于只加载被测层不加载无关层。
2. 切片与完整的互补 切片测层级行为 MVC 参数绑定 JSON 序列化 JPA 查询;完整测跨层协作 集成路径——两层都用不互替。
3. 成本 切片 2 到 5 秒 vs 完整 15 到 30 秒——切片优先完整补充——测试金字塔的 Spring 版。

## 参考分析

### 机制:切片与完整的覆盖差异

切片 WebMvcTest 只加载 MVC 组件 Controller Advice Filter 不含 Service Repository mock 掉。完整 SpringBootTest 加载全部 bean 真实依赖链。覆盖差异 切片测层级行为参数绑定校验异常处理完整测跨层协作事务传播依赖注入 AOP。两层互补切片密集测层级行为完整稀疏测集成路径。

### 反例:切片误用的两种代价

代价一 切片当完整 切片通过但跨层协作失败事务传播依赖注入——切片的 mock 掩盖了真实问题。代价二 完整当切片所有测试用 SpringBootTest 启动时间乘测试数等于套件瘫痪。两条的正解 切片优先层级行为完整补充集成路径测试金字塔的分层。

### 取舍:切片的 mock 策略

MockBean mock 掉 Service 层 Controller 切片不需要真实 Service 隔离 MVC 层测试。MockBean 的问题 改变上下文指纹每个不同 MockBean 组合等于新上下文。替代 测试 profile 注入替身 bean 减少 MockBean 使用。

## 案例

### 验证:切片选择的断言组

验证:切片速度断言(WebMvcTest 启动小于 5 秒 vs SpringBootTest 大于 15 秒);覆盖对照断言(切片测 Controller 参数绑定完整测端到端事务)——两层各测各的。验证结论:覆盖不足在集成测试中暴露,补对应层级的测试。

### 追问链:切片三刀

一刀:切片的 mock MockBean mock Service 层 Controller 切片不需要真实 Service MockBean 的上下文指纹问题。二刀:切片与事务 WebMvcTest 无事务无 DataSource 事务测试用 DataJpaTest 或完整。三刀:切片的 JSON JsonTest 只加载 Jackson JSON 序列化的独立测试。

## 总结点

1. 切片测层完整测协作
2. 切片快完整全
3. 两层互补不互替
