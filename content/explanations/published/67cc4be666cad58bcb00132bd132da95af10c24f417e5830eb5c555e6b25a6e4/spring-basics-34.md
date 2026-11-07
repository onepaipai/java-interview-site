<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-boot/3.5/reference/using/structuring-your-code.html)

</details>

## 参考回答

1. @SpringBootApplication 包含组件扫描，默认扫描从该类所在包开始向下查找；放在过深子包可能遗漏兄弟包的业务组件。
2. 通常将启动类放在应用根包；确需分离时显式声明扫描与导入范围，并分别考虑实体或 Repository 的专用扫描。

## 参考分析

1. 默认包会造成过大扫描范围；多模块工程还要确认依赖确实在运行类路径，不是所有缺 Bean 都由包位置造成。
2. scanBasePackages 针对组件扫描，不应推断它自动改变所有持久化技术的实体与仓储扫描规则。

## 案例

1. 教学场景：启动类在 dev.app.web，Service 在 dev.app.order，控制器启动时找不到订单服务。

2. 将启动入口放到 dev.app 或显式配置正确根包，先检查服务的条件和类路径，避免添加多个重叠扫描。

3. 验证最小应用能找到订单服务且不会带入测试配置；再分别验证所用持久层的扫描范围。

## 总结点

1. 启动入口通常放应用根包。
2. 不同扫描机制分别检查。
