<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银连接池沙盘:连接池 bean 的初始化——构造器(依赖未注入)/@PostConstruct(依赖已注入)/afterPropertiesSet(同 @PostConstruct 时序)/ApplicationRunner(容器全就绪后)——四个阶段的依赖就绪度不同(第 6 题spring-advanced BeanPhases 的深化)。

1. 四阶段依赖就绪度不同:构造器(注入前,字段 null)/@PostConstruct(注入后,代理未生成[见 spring-advanced 28 题])/afterPropertiesSet(同 PostConstruct 时序,走接口)/ApplicationRunner(refresh 完成后,全部 bean 就绪)。
2. 初始化资源的选择:依赖注入的协作者使用(如 DataSource 连接)→@PostConstruct(依赖已注入);需要全部 bean 就绪(如扫描其他 bean)→ApplicationRunner;代理相关(需要代理对象)→ BeanPostProcessor.after 或 @PostConstruct 后的独立阶段。
3. 危险阶段:构造器(字段 null——禁用)、@PostConstruct 捕获 this(代理缺失,第 28 题)——每个阶段的能力边界要清楚。

## 参考分析

### 机制:生命周期时序与依赖就绪度

时序:实例化(构造器)→属性注入(字段赋值)→Aware 回调(BeanNameAware→BeanFactoryAware→ApplicationContextAware/EnvironmentAware 等,由 ApplicationContextAwareProcessor 这个 BPP 在 before 阶段统一驱动)→BeanPostProcessor.before→@PostConstruct→afterPropertiesSet→自定义 init-method→BeanPostProcessor.after(代理化:AbstractAutoProxyCreator 的 postProcessAfterInitialization)→就绪。依赖就绪度:构造器=无依赖;@PostConstruct=注入完成但代理未生成——这正是"@PostConstruct 里调本 bean 方法不会被增强"的原因(代理在 after 才包上);ApplicationRunner=全部就绪(含代理)。补充:循环引用场景代理可能提前发生(getEarlyBeanReference,见第 8 题)——同一坑有两个入口。

### 反例:阶段误用的三种事故

事故一,构造器调依赖:构造器中 this.dependency.doSomething()——dependency 尚未注入(字段 null)——NPE。事故二,@PostConstruct 捕获 this:this 赋值给静态字段——捕获裸对象(代理缺失,第 28 题spring-advanced)。事故三,初始化做重活:@PostConstruct 查全表(启动慢,第 35 题)——重初始化移到 ApplicationRunner。三条的正解:@PostConstruct 只做"依赖就绪后的轻量初始化";重活走 ApplicationRunner;代理相关的延迟到 BeanPostProcessor.after。

### 取舍:初始化的分层策略

分层:构造器(赋值注入参数,不做业务)→@PostConstruct(依赖校验+轻量初始化)→ApplicationRunner(重初始化+预热——依赖全部就绪)。每一层的"能做什么"由依赖就绪度决定——分层纪律进评审清单(第 24 题)。

## 案例

### 验证:生命周期时序的断言组

验证:真值断言(BeanPhasesExample 的 definition:instance——后端真值测试);时序断言(生命周期回调的执行顺序日志:构造→注入→PostConstruct→afterPropertiesSet→after→就绪);代理缺失断言(@PostConstruct 捕获的 this 无 CGLIB 标记——第 28 题 spring-advanced 实测)——三组固化生命周期时序。

### 追问链:生命周期三刀

一刀:"afterPropertiesSet vs @PostConstruct?"——同时序(InitializingBean 接口 vs JSR-250 注解)——接口=Spring 耦合(不推荐)+注解=标准(JSR-250)——优先注解。二刀:"init-method?"——XML 时代的自定义初始化方法(init-method 属性)——Java 配置用 @Bean(initMethod=...)——遗留兼容。三刀:"销毁的对称?"——@PreDestroy(销毁前)/DisposableBean.destroy/destroy-method——与初始化对称(销毁的顺序=创建的反向,第 38 题 spring-advanced)。

## 总结点

1. 构造器零依赖,PostConstruct 轻量,Runner 重活
2. @PostConstruct 后代理化,捕获 this 有坑
3. 分层策略:每阶段做什么有边界
