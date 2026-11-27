<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银配置沙盘:@Configuration 类中的 @Bean 方法互调容器拦截 CGLIB 代理单例保证;普通组件中调 @Bean 方法直接调用不走容器每次新实例。

1. @Configuration 默认 proxyBeanMethods=true CGLIB 代理拦截 @Bean 方法调用已创建的单例直接返回容器中的实例不重复创建。proxyBeanMethods=false 不代理方法调用普通 Java 调用每次新建。lite 模式收益启动提速跳过 CGLIB 代理生成。
2. 注册与拦截分开说：普通组件里的 @Bean 方法同样被容器扫描注册为 bean（默认单例，由容器管理）——被绕过的只是"方法间互调的拦截"：只有 @Configuration 的 CGLIB 代理拦截方法互调并返回容器单例，普通组件里 this.beanMethod() 是普通 Java 调用，每次执行方法体都新建对象。
3. proxyBeanMethods=false 适用于 Bean 方法之间无互调的配置类大多数 Boot 配置类检查 Bean 方法互调再决定。

## 参考分析

### 第二步扩展① 机制:CGLIB 代理与 Bean 方法互调

- Configuration 类被 CGLIB 代理 Bean 方法调用被拦截容器检查该 bean 是否已创建已创建返回容器实例单例未创建调用原方法并注册。
- 这保证了 Bean 方法互调时的单例语义。
- proxyBeanMethods=false 跳过代理方法调用普通 Java 调用每次新建启动提速但失去单例互调保证。

### 第二步扩展② 反例:非代理配置的重复实例

- 沙盘 proxyBeanMethods=false 的配置类 Bean 方法 A 调用 Bean 方法 B B 被调用时新建实例不走容器 A 与容器中的 B 是不同对象。
- 修复需要互调的配置类启用代理或重构避免互调独立 bean 注入。

### 第二步扩展③ 取舍:lite 模式的适用

- 适用 Bean 方法之间无互调独立定义加性能敏感大量配置类 lite 模式跳过 CGLIB 代理生成启动提速。
- 不适用 Bean 方法有互调需要单例保证 lite 模式下互调返回新实例违反单例语义。
- 检查方法 grep 配置类中的 Bean 方法互调有互调则不用 lite。

## 案例

### 第三步发散·验证与推演 验证:代理差异的断言组

- 验证:单例断言(Configuration 中 Bean 方法互调同一实例)。
- 非代理断言(proxyBeanMethods=false 或普通组件中不同实例)。
- 启动提速断言(proxyBeanMethods=false 的启动时间对比)——三组固化代理差异。

### 第三步发散·追问① 追问链:配置三刀

- 一刀 lite 模式 proxyBeanMethods=false 无代理方法调用不走容器 lite 模式的适用。
- 二刀 Configuration 的继承配置类可继承子类的 Bean 覆盖父类。
- 三刀 Configuration 的 proxyBeanMethods=false 何时用 Bean 方法无互调加性能敏感。

## 总结点

1. Configuration 代理保证单例互调
2. proxyBeanMethods=false 提速
3. 普通组件的 Bean 方法不走容器
