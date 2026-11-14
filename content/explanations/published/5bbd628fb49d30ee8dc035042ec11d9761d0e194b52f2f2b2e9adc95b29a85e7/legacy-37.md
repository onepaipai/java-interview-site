<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/classpath-scanning.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银分层架构沙盘:四层注解各归其位——本质都是 @Component 的语义化别名,差别=语义+少量附加行为(@Repository 异常转换/@Controller Web 路由)。

1. 本质同源:@Service/@Repository/@Controller 内部都标注 @Component——注册为 Bean 的机制完全一致;区别第一层=语义(分层意图可读):Controller(Web 入口)/Service(业务编排)/Repository(数据访问)/Component(通用组件)。
2. 附加行为:@Repository=持久层异常转换(DataAccessException 体系——统一翻译 ORM 厂商异常);@Controller=被识别为路由(@RestController=+@ResponseBody 返回 JSON);@Service/@Component 无额外行为。
3. 组件扫描:@ComponentScan 从主类包向下扫(@SpringBootApplication 默认扫本包及子包)——注解只决定“要不要注册与怎么用”,扫描决定“注册哪些”——外部包的 Bean 用 @Bean/@Import 显式注册。

## 参考分析

### 机制:语义注解的工程价值

语义化=架构约束的可执行化:Reviewer 看到数据访问逻辑写在 @Service 就能拦截(分层越界);工具可按注解统计分层(ArchUnit 规则:Repository 只被 Service 依赖)——注解不是编译器强制,但提供了静态检查的锚点。

### 反例:分层注解的两种事故

事故一:数据访问写在 Service 不用 Repository——丢失异常转换(MySQL 异常直穿上层,错误处理按厂商异常硬编码);修复=DAO 层 @Repository。事故二:业务逻辑写在 Controller——路由层膨胀(单类千行,复用为零);修复=Controller 只做参数装配+调 Service(薄控制器)。

### 边界:什么时候用 @Component

不属于任何层的通用组件(工具 Bean/配置类/事件监听)用 @Component;三层的用语义注解(即使行为相同)——语义注解是给人和工具看的,编译器不在乎,架构在乎。

## 案例

### 验证:分层注解的实测走查

验证:注册断言(四注解都注册成功——getBean 可取);异常转换断言(@Repository 的 DAO 抛出 DataAccessException 子类,而非厂商异常——翻译对照);路由断言(@RestController 方法返回对象→JSON,纯 @Controller 返回视图名——响应对照)——三组固化语义行为,Spring 模块测试可复跑。

### 追问链:分层三刀

一刀:薄控制器纪律=参数校验(@Valid)/转换 DTO/调服务/返回——不做业务(第 138 题 reliability 分层同源)。二刀:@Bean vs @Component=第三方类(改不了源码)用 @Bean 显式注册。三刀:扫描边界=跨包用 @ComponentScan(basePackages) 或 starter 自动配置(第 39 题)。

## 总结点

1. 四注解同源,语义分层
2. @Repository 换异常,@Controller 进路由
3. Controller 薄,业务在 Service
