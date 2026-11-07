<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/beanfactory.html)

</details>

## 参考回答

1. BeanFactory 提供 Bean 定义、创建、依赖解析和获取等基础容器能力。
2. ApplicationContext 扩展 BeanFactory，整合国际化、应用事件、资源访问和上下文生命周期。
3. 常见应用上下文会自动发现并注册后处理器，也通常在刷新时实例化非懒加载单例；裸工厂需显式组织这些步骤。

## 案例

1. 场景（教学示例）：同一 Bean 构造时记录次数，分别放入裸 DefaultListableBeanFactory 和 AnnotationConfigApplicationContext。

2. 处理：裸工厂先注册定义，再调用 getBean；应用上下文先注册配置再 refresh。增加 BeanPostProcessor，比较自动注册与显式注册。

3. 预期：裸工厂未获取前不创建该 Bean；上下文刷新后非懒加载单例已创建，后处理器生效。两者都能 getBean，不能以是否支持注入作为唯一差别。

## 总结点

1. 工厂管理 Bean 基础能力。
2. 上下文组织应用生命周期。
