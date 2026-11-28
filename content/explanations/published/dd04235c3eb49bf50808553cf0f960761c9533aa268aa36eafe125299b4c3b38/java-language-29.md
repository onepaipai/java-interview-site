<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/ServiceLoader.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银插件沙盘:渠道接入的扩展——SPI(ServiceLoader:运行期发现实现,零容器依赖)与 DI 容器(Spring:依赖装配+生命周期+AOP)——SPI 解决"发现",DI 解决"装配"——互补不竞争(spring-advanced 29 题SPI 的深入版)。

1. SPI 的机制:META-INF/services 文件声明实现→ServiceLoader.load(接口).iterator() 运行期发现——零依赖(无容器)、懒加载(iterator 惰性)、模块化友好(ServiceLoader 与模块系统,第 26 题)。
2. DI 容器的机制:依赖装配(bean 之间的注入关系)、生命周期(创建/销毁/作用域)、AOP(代理增强)——容器解决"组装与治理"。SPI 解决"发现"(有哪些实现、运行期发现)——DI 解决"装配"(实现之间的依赖关系)。
3. 配合形态:SPI 发现实现→实现的依赖由容器装配(SPI 发现的 bean 交给 Spring 管——Spring Boot 的自动配置即此形态,第 33 题)——发现与装配的组合。

## 参考分析

### 第二步扩展① 机制:SPI 的流程与边界

- 流程:接口定义(SDK)→第三方实现+META-INF/services 声明→ServiceLoader 发现→遍历使用。
- 边界:SPI 无依赖注入(实现的依赖要自己解决——构造参数无容器装配)、无生命周期(创建与销毁自己管)、无 AOP(增强自己包)。
- Spring Boot 的自动配置=SPI 思想的容器化(spring.factories/AutoConfiguration.imports——发现+容器装配的组合,第 33 题)。

### 第二步扩展② 反例:SPI 与 DI 错位的两种代价

- 错位一,DI 场景用 SPI:复杂依赖的实现用 ServiceLoader(实现的依赖自己 new——依赖地狱手工版,第 29 题)。
- 错位二,插件依赖容器:第三方插件强制依赖 Spring(插件不可用于非 Spring 宿主)——SPI 的零依赖价值丢失(插件的用户面收窄)。
- 两条的正解:零依赖插件(库/SDK)用 SPI。
- 宿主内组件(服务)用 DI——扩展点的归属判据(第 43 题分布式:库 vs 服务同构)。

### 第二步扩展③ 取舍:SPI 的演进与替代

- SPI 的演进:META-INF/services(经典)→ServiceLoader 的模块化(ServiceLoader 与 module-info 的 provides/uses——模块化的 SPI)→注解发现(@AutoService[Google——编译期生成 services 文件])。
- 替代形态:OSGi(重,服务注册中心——金融少用)、Spring 的条件装配(第 33 题)——SPI 的轻量与 OSIG 的重量的取舍(引入成本,第 17 题)。

## 案例

### 第三步发散·验证与推演 验证:SPI 机制的断言组

- 验证:发现断言(Services 文件声明后 ServiceLoader 发现全部实现)。
- 懒加载断言(iterator 惰性——未遍历不实例化)。
- 模块化断言(module-info 的 provides/uses 的发现)——三组固化 SPI。
- SPI 与 DI 的组合用例(SPI 发现的实现交容器装配)进框架指南。

### 第三步发散·追问扩展 追问链:SPI 三刀

- **Q1：SPI 的失败隔离?**
  - 答：一个实现的构造失败影响整个 ServiceLoader 迭代(ServiceConfigurationError)——实现的构造健壮性(防御)+迭代的 try-catch(跳过失败的实现)。
- **Q2：SPI 的排序?**
  - 答：实现的顺序(文件内的声明序——优先级机制[顺序+优先级字段]自定义)——发现的排序协议。
- **Q3：SPI 的测试?**
  - 答：SPI 发现的测试(services 文件的正确性——文件名/格式/类的存在)——文件格式的 typo 是 SPI 的常见故障(测试覆盖)。

## 总结点

1. SPI 管发现,DI 管装配
2. 零依赖插件走 SPI,宿主组件走 DI
3. 失败隔离与排序要自定义协议
