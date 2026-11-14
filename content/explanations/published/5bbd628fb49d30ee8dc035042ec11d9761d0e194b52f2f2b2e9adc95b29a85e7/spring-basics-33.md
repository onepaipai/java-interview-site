<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 SDK 沙盘:SDK 的 ComponentScan 扫到宿主的类 bean 污染——自动配置管 SDK 自己的 bean,组件扫描管宿主的 bean,两者边界 SDK 用自动配置宿主用扫描。

1. 扫描的问题 SDK 的扫描边界不可控包路径重叠宿主类被误扫。自动配置的优势显式清单加条件化加无扫描污染。
2. 边界规则 SDK 禁 ComponentScan 扫描等于失控——SDK 用 AutoConfiguration 加 Bean 显式声明;宿主的组件用 ComponentScan 宿主自己的包。
3. 协作 SDK 的自动配置提供默认 bean MissingBean 让宿主覆盖,宿主的扫描创建宿主 bean——SDK 默认加宿主覆盖的分层。

## 参考分析

### 机制:扫描与自动配置的边界

扫描:@ComponentScan 扫描指定包下的所有注解类——边界等于包路径不可控宿主与 SDK 的包可能重叠。自动配置:@Bean 显式声明——边界等于声明清单可控。规则:SDK 禁扫描防污染宿主用扫描自己的包自己知道。协作:SDK 默认 MissingBean 加宿主覆盖。

### 反例:扫描污染的事故

沙盘:SDK 的 ComponentScan com.bank 扫到宿主的 com.bank.legacy 包——legacy 的类被注册为 bean与宿主的 bean 冲突启动失败或行为异常。修复:SDK 禁扫描改用 AutoConfiguration 加 Bean 显式声明 bean 清单可控。

### 取舍:库 vs 框架的角色

库被调用不注册 bean SPI 模式;框架调用用户代码注册 bean 自动配置模式——SDK 的角色决定 bean 注册方式。库模式宿主主动调用 SDK 不注册 bean 最干净。框架模式 SDK 注册 bean 并调用宿主回调需要自动配置。

## 案例

### 验证:边界的断言组

验证:扫描隔离断言(SDK 的 bean 不含宿主类 bean 清单检查);MissingBean 断言(宿主覆盖 SDK 默认 bean 类型检查);边界断言(SDK 无 ComponentScan ArchUnit 扫描 SDK 包)——三组固化边界纪律。

### 追问链:边界三刀

一刀:组件扫描的粒度 ComponentScan basePackages 的粒度精确包避免扫到无关类加 includeFilters 精确定义。二刀:库 vs 框架库被调用不注册 bean SPI,框架调用用户代码注册 bean。三刀:Spring Boot 的扫描起点 SpringBootApplication 的 scanBasePackages 启动类包为根。

## 总结点

1. SDK 用自动配置宿主用扫描
2. MissingBean 让宿主覆盖默认
3. 扫描边界等于宿主包 SDK 禁扫
