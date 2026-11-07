<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-boot/3.5/reference/testing/spring-boot-applications.html)

</details>

## 参考回答

1. 根据要验证的边界选择最小足够环境：业务分支用普通单测，MVC 绑定或持久化配置用相应切片，跨模块装配和启动契约用完整上下文。
2. @SpringBootTest 默认不等于真实网络测试；需要真实服务端口时显式选择 RANDOM_PORT 等方式。

## 参考分析

1. WebMvcTest 的替身依赖无法证明服务事务，持久化切片的内存数据库也不能直接证明 MySQL 方言或锁行为。
2. 切片可能包含安全设施且需要显式导入相关配置；不要为了让测试过而把要验证的边界全部 mock 掉。

## 案例

1. 教学场景：想验证参数错误、事务回滚和登录 Cookie，原先全部由一个 mock 控制器测试承担。

2. 拆成 MVC 请求绑定测试、隔离数据库事务测试和真实端口登录测试，只在每层替换它不负责的外部依赖。

3. 验证各测试能因对应缺陷失败；完整上下文测试保留启动与装配覆盖，避免重复启动来测试纯函数。

## 总结点

1. 按风险选择最小足够边界。
2. 完整上下文不自动等于网络。
