<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银渠道沙盘:PaymentService 接口 3 个实现注入时歧义 NoUniqueBeanDefinitionException,Primary 设默认 Qualifier 精确指定两者配合默认加覆盖。

1. Primary 多实现中的默认注入时无 Qualifier 则取 Primary 一个类型只能一个 Primary;Qualifier 精确指定按 bean 名注入覆盖 Primary。配合 Primary 设默认 Qualifier 精确切换。
2. 与注册表的衔接多实现加路由注册表管按参数路由 Primary Qualifier 管静态注入两种模式编译期注入 vs 运行期路由。
3. 类型安全限定符自定义注解防字符串 typo 编译期不可查改类型安全限定符自定义注解。

## 参考分析

### 第二步扩展① 机制:Primary 与 Qualifier 的解析

- Primary 多实现中的默认注入时无 Qualifier 则取 Primary 的实现一个类型只能一个 Primary。
- Qualifier 精确指定按 bean 名或限定符注入覆盖 Primary。
- 解析优先级 Qualifier 大于 Primary 大于唯一实现大于异常。
- 组合 Primary 设默认加 Qualifier 精确覆盖默认加覆盖的模式。

### 第二步扩展② 反例:多实现注入的歧义

- 沙盘 PaymentService 有 3 个实现注入时无 Primary 无 Qualifier 启动抛 NoUniqueBeanDefinitionException 启动期暴露好过运行时。
- 修复 Primary 设默认加 Qualifier 精确切换或集合注入 List 获取全部。

### 第二步扩展③ 取舍:类型安全限定符

- 字符串 Qualifier wechat 的 typo 运行时才发现 NoSuchBeanDefinitionException 类型安全限定符自定义注解编译期检查自定义 WeChatChannel 注解加 Qualifier 作为元注解注入时用 WeChatChannel typo 在编译期暴露。

## 案例

### 第三步发散·验证与推演 验证:多实现注入的断言组

- 验证:Primary 断言无 Qualifier 注入 Primary 实现。
- Qualifier 断言 Qualifier wechat 注入 WeChat 实现。
- 歧义断言无 Primary 无 Qualifier 的多实现注入抛异常——三组固化多实现注入。

### 第三步发散·追问① 追问链:注入三刀

- 一刀 Qualifier 的元注解自定义限定符类型安全的 Qualifier 字符串 typo 编译期不可查改类型安全限定符。
- 二刀 集合注入 List 注入全部实现注册表的收集。
- 三刀 Profile 的作用环境维度条件装配与 Qualifier 正交环境 vs 实现。

## 总结点

1. Primary 设默认 Qualifier 精确覆盖
2. 集合注入获取全部实现
3. 类型安全限定符防 typo
