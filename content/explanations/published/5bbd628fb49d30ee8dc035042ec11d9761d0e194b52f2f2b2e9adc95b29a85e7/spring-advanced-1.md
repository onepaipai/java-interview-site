<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银订单沙盘:OrderService.save() 里 this.saveInTx() 调用自己的 @Transactional 方法,数据没进事务。用同容器实测说明代理的调用路径与自调用绕过,并给出三种修复的取舍。

1. 事务是代理实现的:调用必须先经过代理对象(开事务→调目标→提交),this 调用绕过代理直达目标方法,注解形同虚设。
2. 实测:同容器内自调用事务生效=0,经 facade 走代理调用生效=1(Spring 6.2.19,H2 实测)。
3. 修复三选:拆到另一个 bean、注入自身代理(ObjectProvider/AopContext)、改用 TransactionTemplate 编程式边界;没有第四种"配置让 this 也走代理"。

## 参考分析

### 机制:代理的调用链与 this 的绕行

Spring 事务由 AOP 代理包裹:调用方持有的是代理,代理在目标方法前后开提交事务。容器返回的 OrderService 实际是 CGLIB 子类实例,方法调用先入拦截器链。this.saveInTx() 的 this 是目标对象自身,不经代理——拦截器链根本没被触发,事务开关代码没执行。这就是"注解在,事务不在"的全部机制,与注解的传播级别、rollbackFor 都无关。

### 实证:同容器对照自调用与代理调用

本机实验(Spring 6.2.19 + H2,AnnotationConfigApplicationContext + @EnableTransactionManagement):OrderService.saveWithSelfCall() 内部 this.saveInTx(),以及 OrderFacade 持有注入的 service 调同一方法,各自统计事务活跃标志:
```
Q1 自调用事务生效=0 代理调用生效=1
```
验证:同程序重跑一致;把 saveInTx 改 public 之外的可见性结论不变——失效只取决于"有没有经过代理",不取决于注解写得多正确。

### 取舍:三种修复的适用边界

拆 bean:语义最清晰,事务边界即 bean 边界,首选;代价是多一个类与注入。注入自身代理:ObjectProvider<OrderService> 延迟取代理,改动最小,但"类内部自己代理自己"可读性差,容易在重构中再被绕过。TransactionTemplate:边界显式可见(第 12 题),适合边界与业务流不一致的场景;代价是模板代码。共同前提:评审时凡是"@Transactional 方法被同类调用"都要点名,这是静态可查的缺陷。

## 案例

### 验证:在本容器内用 TransactionSynchronizat

验证:在本容器内用 TransactionSynchronizationManager.isActualTransactionActive() 分别断言自调用与代理调用两条路径,自调用应为 false——把该断言固化成 ArchUnit 规则或单元测试后,同类调用事务注解方法的回归在 CI 直接失败。

### 追问链:自调用三刀

一刀:"为什么 private 方法加 @Transactional 也没用?"——双重原因:代理不拦截私有方法(CGLIB 子类覆写不了),自调用又绕过代理;两类失效叠加。二刀:"@Autowired 自注入能修复吗?"——能(注入的是代理),但注入自身有循环依赖风险,推荐 ObjectProvider 延迟解析;修复后验证方式还是"事务活跃标志"。三刀:"怎么在评审或静态检查里发现?"——ArchUnit 规则:禁止同类内调用 @Transactional 注解方法;或 IDE 检查 this 调用注解方法。发现成本远低于线上排查成本,值得进 CI。

## 总结点

1. 代理是门卫,this 走了侧门
2. 自调用零事务,实测为零
3. 拆 bean 最稳,模板次之
