<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/annotation-config/resource.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/core/beans/annotation-config/autowired.html)

</details>

## 参考回答

1. @Autowired 按类型解析并支持 Primary、Qualifier 等候选选择，可用于构造器；单个构造器通常可省略该注解。
2. Resource 用于字段或属性方法：指定 name 仅按名称查（找不到即失败，不回退）；未指定先按属性名，再回退类型（回退后仍适用 Qualifier）。

## 参考分析

1. 不能把两者简写成永远只按类型和永远只按名称；候选歧义、显式 name 及容器解析规则会影响结果。
2. 多实现时表达业务限定比依赖字段重命名的偶然结果可靠，必需依赖仍优先用构造器暴露契约。

## 案例

1. 教学场景：存在 emailSender 与 smsSender，原字段改名后 Resource 注入目标变化或失败。

2. 用最小上下文分别测试显式 Resource(name)、默认名与 Autowired 加 Qualifier；明确记录每个注入目标。

3. 验证重命名不会悄悄改掉约定实现，歧义应失败；不要把 Resource 放在构造器上当作 Autowired 的直接替代。

## 总结点

1. Autowired 以类型候选为核心。
2. Resource 名称与回退需分清。
