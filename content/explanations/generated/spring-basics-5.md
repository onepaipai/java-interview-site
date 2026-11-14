<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银架构沙盘:BeanFactory=基础容器(Bean 定义管理+依赖解析——懒加载);ApplicationContext=BeanFactory 的超集(+事件发布/国际化/资源加载/AutoPostProcess——预实例化 singleton)。用 BeanPhasesExample 的 definition 与 instance 阶段说明两者的启动差异。

1. BeanFactory:最小容器接口(getBean/定义管理)——懒加载,首次 getBean 才创建。ApplicationContext:继承 BeanFactory,追加事件/国际化/资源加载/环境,refresh 时预实例化全部 singleton——生产应用的功能全集。
2. 真值示例(BeanPhasesExample 本机实测):BeanFactory 注册 definition 后、getBean 前无 instance;getBean 后 instance 出现——懒加载语义铁证。ApplicationContext refresh 一次性预实例化,启动后立即可用。
3. 工程实践:生产代码用 ApplicationContext(ApplicationContext 的功能是业务必需——事件/AOP 自动代理/资源加载);BeanFactory 仅在框架内部或特殊场景(延迟初始化的精细控制)使用。

## 参考分析

### 机制:懒加载与预实例化的差异

BeanFactory 懒加载:definition 注册→首次 getBean 触发实例化(BeanPostProcessor/依赖注入/生命周期回调)——启动快但首次访问慢(且配置错误延迟暴露)。ApplicationContext 预实例化:refresh 时遍历所有 bean definition→逐个实例化→启动慢但配置错误启动期暴露( fail-fast)。真值示例:BeanFactory 的 definition:instance 阶段(definition 存在时无 instance)。

### 反例:混用的两种代价

代价一,BeanFactory 做业务容器:无 AOP 自动代理(BeanFactory 不自动应用 BeanPostProcessor——需手动注册)——@Transactional/@Autowired 失效(静默)。代价二,ApplicationContext 的启动开销:大型应用的预实例化(数千 bean 的启动时间)——懒加载优化(@Lazy/懒初始化,第 40 题)。两条的正解:业务用 ApplicationContext(功能完整);BeanFactory 理解为 ApplicationContext 的内核(教学与框架内部)。

### 取舍:预实例化与懒加载的平衡

全预实例化:启动慢(但错误早暴露)+运行时快(无首次延迟)。全懒加载:启动快(但错误延迟到首次使用)+运行时首次慢。混合:singleton 预实例化(核心 bean)+@Lazy 标记非核心(第 40 题distributed 启动优化)——启动时间的优化手段。Spring Boot 的默认:预实例化(但支持 spring.main.lazy-initialization=true 全局懒加载)。

## 案例

### 验证:BeanFactory 语义的断言组

验证:真值断言(BeanPhasesExample 的 definition:instance——后端真值测试持续执行);预实例化断言(ApplicationContext refresh 后 getBean 零延迟);懒加载断言(BeanFactory 注册后 getBean 前无 instance)——三组固化两者的启动语义。

### 追问链:容器三刀

一刀:"ApplicationContext 的实现?"——AnnotationConfigApplicationContext(Java 配置)/ClassPathXmlApplicationContext(XML)/Spring Boot 的 SpringApplication.run(自动)——实现的演进(XML→Java→Boot 自动)。二刀:"容器的层次?"——ApplicationContext 包含 BeanFactory(getBeanFactory() 返回内核)——ApplicationContext 是门面(facade——增强功能委托内核)——门面模式(第 7 题distributed 防腐的容器版)。三刀:"容器的关闭?"——ctx.close()(销毁 singleton/调 @PreDestroy)——关闭顺序(依赖反向,第 38 题 spring-advanced)。

## 总结点

1. BeanFactory 懒加载,ApplicationContext 预实例化
2. ApplicationContext 是超集,功能完整
3. 生产用 ApplicationContext
