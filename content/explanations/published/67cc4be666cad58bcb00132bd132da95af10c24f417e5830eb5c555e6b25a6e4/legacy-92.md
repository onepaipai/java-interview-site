<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-boot/3.5/reference/features/developing-auto-configuration.html)

</details>

## 参考回答

1. 将依赖聚合与自动配置职责划分清楚，定义专属配置前缀、默认 Bean、启用条件和用户覆盖契约。
2. Boot 3 通过 AutoConfiguration.imports 发布候选，避免宽扫描；使用小上下文和独立打包宿主验证，而非只在同仓源码运行。

## 参考分析

1. 可选依赖需避免条件生效前的类加载失败，依赖版本与宿主 Boot 兼容范围要明确。
2. 测试缺库、关闭、默认、用户 Bean 和属性非法分支，日志及配置报告不泄露秘密。

## 案例

1. 教学场景：团队给多个服务提供通知能力，希望默认可用且允许各服务替换。

2. 配置类按缺失 Bean 和开关退让，starter 引入必需依赖，打包检查 imports 和类型化配置。

3. 验证独立宿主默认装配，用户实现不冲突，禁用后不污染原应用，非法必需项在启动明确失败。

## 总结点

1. 依赖聚合与自动配置分责。
2. 产物发现和覆盖分支都验证。
