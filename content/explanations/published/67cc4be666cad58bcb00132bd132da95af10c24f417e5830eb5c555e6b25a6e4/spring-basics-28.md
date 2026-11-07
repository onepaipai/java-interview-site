<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/java/basic-concepts.html)

</details>

## 参考回答

1. 完整配置类可通过代理协调 Bean 方法调用，普通组件中的直接方法调用可能只是普通 Java 调用。
2. 需结合代理配置理解实例数量。

## 参考分析

1. 完整 Configuration 的 Bean 方法可由容器增强协调，lite 模式直接调用仍是普通 Java 方法。
2. proxyBeanMethods=false 适合不依赖跨 Bean 方法拦截的配置。

## 案例

1. 场景（教学示例）：a() 内调用 b()，同时容器也注册了 b Bean。

2. 处理：分别在完整配置与禁用方法代理的配置中比较对象身份；优先用方法参数注入 b。

3. 验证：lite 直接调用可能创建额外实例；改为参数注入后使用容器管理实例，不误以为 Bean 注解自动拦截所有调用。

## 总结点

1. 完整与 lite 配置分清。
2. 依赖优先用参数注入。
