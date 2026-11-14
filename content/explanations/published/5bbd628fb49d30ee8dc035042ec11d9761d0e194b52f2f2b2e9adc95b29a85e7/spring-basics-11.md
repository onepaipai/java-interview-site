<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银沙盘:代码里 new OrderService()——绕过容器:无依赖注入(字段 null)、无 AOP 代理(事务失效)、无生命周期管理——容器只管它创建的 bean,new 的对象与容器无关(spring-advanced 1/11 题)。

1. new 绕过容器三层:无注入(字段 null——容器不知道这个对象)、无代理(非容器管理的 bean,AOP 不生效)、无生命周期(@PostConstruct 不执行)。三条全失效——new 的对象是"裸对象"。
2. 实测锚点(spring-advanced 1 题:自调用事务生效=0;spring-advanced 28 题:PostConstruct 捕获裸类):容器外的对象无代理、无注入——IoC 的前提是"对象由容器创建"。
3. 修复:需要容器能力的对象必须由容器管理(注入而非 new);确实需要动态创建的(工厂模式),由容器管理的工厂创建(工厂本身是 bean,工厂创建的对象可手动注入依赖)。

## 参考分析

### 机制:容器能力由 BeanPostProcessor 在生命周期中安装

注入与代理不是对象的自带属性,而是容器在创建 bean 的过程中装上去的:@Autowired 由 AutowiredAnnotationBeanPostProcessor 在属性填充阶段赋值;@Transactional 代理由 AbstractAutoProxyCreator 在初始化后的 postProcessAfterInitialization 包裹。new OrderService() 跳过了实例化→属性填充→Aware→初始化→后处理→代理的整条生命周期,两个后处理器都没机会运行——所以字段 null、事务方法直调时拦截器链不存在(与 advanced 1 题自调用失效同源:都绕过了代理)。这与第 1 题的"依赖方向"是两件事:本题讲能力安装时机,不是耦合方向。

### 反例:new 对象的三重失效与误诊

失效一,注入缺失:new 出来的 service 依赖字段全 null,NPE 发生在运行期而非启动期——本该启动期暴露的问题被推迟到流量打进来。失效二,事务失效:@Transactional 方法被直接调用,TransactionInterceptor 不在调用链上,事务开关没执行。失效三,生命周期缺失:@PostConstruct/@PreDestroy 不执行,资源初始化与释放静默跳过。常见误诊:把 NPE 当普通 bug 修、给 new 的对象加注解期待生效——正解只有一个:需要容器能力的对象必须由容器交付,动态创建交给容器管理的工厂(工厂本身是 bean)。

### 取舍:IoC 的适用边界

有依赖+需替换+需测试→IoC;无依赖值对象→直接 new。过度 IoC(一切皆 bean)=配置地狱。判断顺序:先问是否有替换与测试诉求,再决定是否入容器——容器规模与收益保持正比。

## 案例

### 验证:new 绕过的断言组

验证:注入断言(new 的 service 字段 null——注入缺失实证);代理断言(new 的对象无 CGLIB 标记——非代理);事务断言(new 的对象 @Transactional 不生效)——三组固化 new 的三重失效。

### 追问链:new 三刀

一刀:"工厂模式呢?"——工厂本身是 bean(容器管理)→工厂创建的对象由工厂注入依赖(工厂持有依赖并传递)——间接的容器管理。二刀:"static 工具?"——无状态工具不需要注入(纯函数)——静态工具与容器无关(合法,第 47 题)。三刀:"什么时候 new 合理?"——值对象(record)、无依赖的纯计算、DTO——无容器需求的对象 new 合法。

## 总结点

1. new 绕过注入代理生命周期
2. 容器只管容器创建的 bean
3. 需要容器能力就注入不 new
