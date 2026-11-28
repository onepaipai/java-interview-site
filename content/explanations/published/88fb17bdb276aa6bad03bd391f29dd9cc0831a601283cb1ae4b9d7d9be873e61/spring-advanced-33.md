<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银组件组沙盘:自研 SDK 的 spring.factories 里配置了 @ComponentScan("com.bank"),宿主应用引入后把 SDK 内部的 bean 全量扫入,还覆盖了宿主同名 bean。说明自动配置的边界纪律。

1. 自动配置的红线:不用 @ComponentScan(扫描即失控)、不用组件注解(@Component 进不了自动配置的注册通道,要 @Bean 显式声明)、条件化装配(@ConditionalOnMissingBean/@ConditionalOnClass/@ConditionalOnProperty)。
2. 优先级语义:@ConditionalOnMissingBean 让宿主可覆盖 SDK 默认——SDK 给默认,宿主说了算;反过来(SDK 强制覆盖)要用 @ConditionalOnProperty 显式开启。
3. 注册通道:AutoConfiguration.imports 文件(Spring Boot 2.7+/3.x)替代 spring.factories;配置类加 @AutoConfiguration,proxyBeanMethods=false 降低启动开销。

## 参考分析

### 第二步扩展① 机制:自动配置与组件扫描的分野

- 组件扫描的语义是"该包下所有东西都是我的 bean"——SDK 的包结构对宿主不可见,扫描边界天然失控(扫到内部工具类、与宿主类名冲突)。
- 自动配置的正确语义是"显式清单+条件装配":import 文件列出配置类,配置类里 @Bean 逐个声明、@ConditionalOn* 决定生效条件。
- 两者混用的形态就是事故源:@ComponentScan 塞进 AutoConfiguration——宿主全量受污染。

### 第二步扩展② 推演:污染的三种形态与防御(附真实容器行为锚点)

- 形态一,bean 风暴:SDK 扫描包覆盖宿主同包路径,宿主内部类成 bean。
- 形态二,同名覆盖:SDK 的 cacheManager 与宿主的并存,注入歧义或覆盖。
- 形态三,顺序依赖:SDK bean 依赖宿主尚未创建的 bean,启动顺序抖动。
- 防御:@Bean 显式声明+@ConditionalOnMissingBean(宿主优先)+配置属性前缀隔离(SDK 自己的 @ConfigurationProperties 不碰宿主命名空间)。
- 锚点:容器装配行为可实测(Q31 循环依赖实验展示了 AnnotationConfigApplicationContext 的装配纪律),自动配置的条件化语义为规范推演。
- 验证:SDK 的宿主兼容性测试=在最小宿主应用里引入 SDK,断言 bean 清单——这套测试放进 SDK 发布流水线。

### 第二步扩展③ 取舍:SDK 的开放面设计

- 开放点:配置属性(prefix 隔离)、可覆盖 bean(ConditionalOnMissingBean)、扩展接口(SPI,宿主实现 SDK 接口被收集——第 32 题注册表)。
- 封闭点:内部组件(@Bean 声明但不导出类型)、内部状态。
- 文档契约:属性清单+可覆盖 bean 清单+行为默认值——宿主集成只看文档,不看源码。
- 版本纪律:SDK 升级不改变默认行为(改默认走大版本+迁移说明,第 49 题)。

## 案例

### 第三步发散·验证与推演 验证:用 ApplicationContextRunner 逐条件

- 验证:用 ApplicationContextRunner 逐条件断言 bean 存在/不存在/被宿主覆盖。
- 最小宿主应用引入 SDK 的兼容性测试进发布流水线——条件矩阵全覆盖,污染即失败。

### 第三步发散·追问扩展 追问链:自动配置三刀

- **Q1：@AutoConfigureBefore/After 什么时候需要?**
  - 答：多 SDK 之间的装配顺序(如 SDK-B 的 @ConditionalOnMissingBean 依赖 SDK-A 先装配);同宿主内多个自研 SDK 的顺序要显式管理。
- **Q2：怎么调试条件为什么没生效?**
  - 答：启动加 --debug(condition evaluation report)输出每个条件的匹配详情;条件不生效的排查从报告开始而不是猜。
- **Q3：测试怎么覆盖自动配置?**
  - 答：ApplicationContextRunner(Boot 测试工具):逐条件断言 bean 存在/不存在/被覆盖——比起完整应用快一个量级,条件矩阵全覆盖。

## 总结点

1. 扫描即失控,清单即边界
2. MissingBean 让宿主优先
3. 宿主兼容测试进发布流水线
