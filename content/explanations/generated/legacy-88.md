<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/factory-scopes.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银框架沙盘:引入 spring-boot-starter-web 无需配置即可启动 Web 服务——自动装配=@EnableAutoConfiguration→spring.factories/AutoConfiguration.imports→条件注解(@ConditionalOnClass/@ConditionalOnMissingBean)筛选→注册 BeanDefinition。

1. 自动装配三步:一,@SpringBootApplication 含 @EnableAutoConfiguration;二,ImportSelector 读 AutoConfiguration.imports(Boot 3);三,条件筛选(@ConditionalOnClass/@ConditionalOnMissingBean——用户优先)注册 Bean。
2. 条件注解族:@ConditionalOnClass(classpath 有此类才装配)+@ConditionalOnMissingBean(用户未自定义才装配——用户优先)+@ConditionalOnProperty(配置属性匹配)+@ConditionalOnWebApplication(Web 环境才装配)——条件的组合=精细的装配控制。
3. 自定义 starter:一,自动配置类(@Configuration+@Bean+条件注解);二,META-INF/spring/...AutoConfiguration.imports(注册配置类);三,可选属性类(@ConfigurationProperties——绑定配置);四,打包为 jar→其他项目引入即生效(第 92 题详述)。

## 参考分析

### 机制:自动装配的"约定优于配置"

Spring Boot 的核心理念=classpath 有什么→自动装配什么(有 spring-web→配 DispatcherServlet;有数据源驱动→配 DataSource)——"约定优于配置"的实现=条件注解(探测 classpath/已有 bean/配置属性)+starter 聚合依赖(一个 starter 带来一组依赖+一组自动配置)。

### 反例:自动装配的两种事故

事故一:自动配置与用户配置冲突——用户定义了 DataSource 但自动配置也注册了一个→冲突(@ConditionalOnMissingBean 保证用户优先——用户定义了就跳过自动配置);修复=理解"用户优先"的机制(第 88 题排序)。事故二:自动装配不可控——不需要的功能也装配了(多余 bean);修复=排除(@SpringBootApplication(exclude=...))+--debug 条件评估报告(第 49 题诊断)。

### 取舍:starter 的粒度

粗粒度 starter(一个 starter 包含全部相关依赖):使用简单但可能引入不需要的依赖;细粒度 starter(按功能拆分):精确控制但 starter 数量多——按"依赖的聚合力"定(同一功能域的依赖打包在一起)。

## 案例

### 验证:自动装配的走查核对

验证:条件评估断言(--debug 输出每个自动配置的匹配/不匹配——第 49 题诊断);@ConditionalOnMissingBean 断言(用户定义 DataSource→自动配置跳过);starter 断言(引入 starter→相关 bean 自动注册);排除断言(exclude→不装配)。验证:自动装配的断言可程序化(Spring Boot 测试切片:@WebMvcTest/@DataJpaTest 的条件装配)。

### 追问链:装配三刀

一刀:"自动装配的顺序?"——用户 bean 先注册→自动配置评估(@ConditionalOnMissingBean 看用户是否有)→自动配置的 bean 注册——用户优先=配置顺序的关键(第 88 题排序)。二刀:"Spring Boot 3 的变化?"——spring.factories→AutoConfiguration.imports(文件路径变化)+Jakarta EE( javax→jakarta)+GraalVM Native 支持——升级时注意自动配置文件路径变化。三刀:"自动装配的调试?"——--debug(条件评估报告)+actuator/beans(所有 bean 列表)+actuator/conditions(条件报告)——排障的三把钥匙(第 49 题诊断)。

## 总结点

1. @EnableAutoConfiguration→imports 文件→条件筛选
2. @ConditionalOnMissingBean=用户优先
3. starter=依赖聚合+自动配置
