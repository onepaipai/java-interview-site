<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/aop/proxying.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/core/aop.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银审计日志沙盘:每个敏感操作前后记日志(20 个方法重复写)——AOP 切面一处定义全局织入;典型场景=事务/日志/权限/限流/缓存。

1. AOP(面向切面编程):把横切关注点(日志/事务/安全)从业务方法中抽出为切面——切点(Pointcut,匹配哪些方法)+通知(Advice,前/后/环绕/返回/异常)+织入(Weaving,运行时动态代理);业务只写业务,横切逻辑集中管理。
2. Spring AOP 实现:运行时动态代理——目标有接口→JDK 动态代理(实现接口);无接口→CGLIB 子类代理(final 类/方法不行);AspectJ 是编译期/类加载期织入(功能更强,注解裁剪/构造器切点,Spring 只用其注解风格)。
3. 五种通知:@Before/@After/@AfterReturning/@AfterThrowing/@Around——环绕最强(可控制是否执行目标/改参/改返回值);典型场景:声明式事务(@Transactional=环绕)、操作审计、接口限流、权限校验、缓存(方法结果缓存)、慢查询监控。

## 参考分析

### 机制:代理为什么拦不到自调用

AOP 代理是包在目标外的对象——this.method() 走的是目标对象自身(未经代理),切面不生效;@Transactional 自调用失效是经典事故(第 90 题);修复=AopContext.currentProxy() 或拆类或自注入;这也是字段注入难测的同一根因(容器增强都发生在代理上)。

### 反例:切面的两种事故

事故一:切点表达式过宽(execution(* com..*.*(..)))——非业务方法也被代理(反射/getter 全被套上,性能+日志噪音);修复=精确到注解或包+方法语义。事故二:切面里抛异常吞业务——通知异常传播会覆盖业务异常;修复=切面内部 try-catch(监控类切面绝不抛,事务切面除外)。

### 取舍:Spring AOP vs AspectJ

Spring AOP=方法级+运行时代理(覆盖 95% 场景,无编译期依赖);AspectJ=字段/构造器切点+编译期织入(无代理开销,功能全但构建链复杂);选型:方法级横切用 Spring AOP,需要字段级/性能敏感/非 Spring 环境用 AspectJ。

## 案例

### 验证:切面的实测走查

验证:织入断言(切面计数器:一次调用=一次通知;自调用断言(this 调用不触发,代理调用触发——失效复现+修复对照);异常传播断言(AfterThrowing 拿到业务异常,切面抛异常覆盖验证);代理类型断言(有接口 JDK 代理/无接口 CGLIB——instanceof 检查)——Spring 模块 AOP 实验可复用。预期:五种通知顺序与自调用失效均可复现。

### 追问链:AOP 三刀

一刀:@Transactional 失效场景族=自调用/final/private/非 public/异常被吞/传播配置错(第 90 题事务详解)。二刀:通知顺序=Around 前→Before→目标→AfterReturning→After→Around 后(异常走 AfterThrowing);同切面多通知用 @Order。三刀:代理与 BeanPostProcessor=AnnotationAwareAspectJAutoProxyCreator 在初始化后创建代理(第 33 题 BPP 同源)。

## 总结点

1. 切点+通知+织入,运行时代理
2. 自调用不走代理=切面失效
3. Spring AOP 方法级,AspectJ 全量
