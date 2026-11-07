<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-boot/3.5/reference/testing/spring-boot-applications.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/testing/mockmvc.html)

</details>

## 参考回答

1. MockMvc 在无真实 HTTP 服务器的环境中运行 MVC 分派，可检查映射、绑定、校验、转换和所配置的过滤器与安全链。
2. 真实端口测试还覆盖嵌入容器、HTTP 编解码、Cookie 和部分部署行为；代理、TLS 与网关仍需相应环境才能验证。

## 参考分析

1. standaloneSetup 与完整 WebApplicationContext 的配置不同，只有显式包含的设施会参与测试。
2. 真实端口下请求通常在服务端独立线程事务中执行，测试方法的自动回滚不能代替请求数据清理。

## 案例

1. 教学场景：MockMvc 登录用例通过，但浏览器因 Cookie Path 或跨源配置无法保持会话。

2. 保留 MVC 错误映射测试，再在隔离服务中用真实 HTTP 客户端和浏览器走登录、刷新和受保护请求。

3. 验证 Cookie 属性与重定向符合部署协议；使用一次性测试数据库，不能因测试侧有事务注解就触碰日常数据。

## 总结点

1. MockMvc 验证配置内的 MVC。
2. 网络测试覆盖容器和协议边界。
