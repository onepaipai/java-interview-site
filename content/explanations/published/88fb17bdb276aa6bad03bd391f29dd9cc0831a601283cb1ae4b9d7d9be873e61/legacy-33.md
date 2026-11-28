<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)
- [Google SRE · 2](https://sre.google/sre-book/service-level-objectives/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银模块解耦沙盘:订单服务 new 支付服务(硬编码)vs 容器注入接口(可替换可测试)——IoC 是思想(创建权反转),DI 是实现(依赖注入)。

1. IoC(控制反转):对象的创建与依赖管理权从业务代码反转给容器——业务不 new,向容器要;DI(依赖注入)是 IoC 的实现手段——容器把依赖通过构造器/setter/字段注入进来;两者关系:IoC 是原则,DI 是落地技术(还有 ServiceLocator 等其他实现)。
2. 三种注入方式:构造器注入(依赖不可变+必填保证,推荐)/setter 注入(可选依赖)/字段注入(@Autowired 直接打字段——隐藏依赖难测试,不推荐);Spring 官方推荐构造器注入(单构造器可省注解)。
3. 好处:解耦(依赖接口而非实现——换支付渠道只改配置)、可测试(mock 注入替代真依赖)、生命周期托管(单例/初始化/销毁回调统一管理)、装配一致(AOP/事务等横切能力以 Bean 为前提)。

## 参考分析

### 第二步扩展① 机制:容器启动装配链

- 启动扫描(@ComponentScan/自动配置)→BeanDefinition 注册→实例化(构造器注入在此解析依赖图,循环依赖在此暴露——setter/字段注入靠三级缓存兜底,第 88 题)→初始化(Aware/BeanPostProcessor/init)→就绪。
- 构造器注入的循环依赖无法三级缓存解决(实例未成无法提前暴露)——Spring Boot 2.6+ 默认禁止循环依赖,引导设计解耦。

### 第二步扩展② 反例:IoC 误用的两种事故

- 事故一:new 出来的对象里 @Autowired 注入为 null——字段注入依赖容器装配,new 绕过容器=依赖永不注入。
- 修复=该类本身交容器管理,或 new 时手动传依赖。
- 事故二:静态工具类注入——静态字段不属于 Bean 生命周期,注入时机不确定。
- 修复=组件类持有依赖或 Setter 写静态桥(过渡方案)。

### 第二步扩展③ 取舍:字段注入为何流行又为何被劝退

- 字段注入代码最短(现场常见)——但依赖隐藏(看构造器不知道要什么)、无法脱离容器单测(反射才能 mock)、强耦合容器。
- 构造器注入多写几行,换来依赖显式+测试友好——评审要点=新代码用构造器,存量字段注入迁移风险另评。

## 案例

### 第三步发散·验证与推演 验证:注入行为的实测走查

- 验证:单测断言(构造器注入 mock 依赖,不启容器即可测。
- 字段注入必须 @SpringBootTest)。
- 循环依赖断言(构造器互注→启动失败明确报错。
- setter 互注→成功——Boot 2.6 前行为)。
- 作用域断言(singleton 唯一/prototype 每次新)——Spring 模块测试可复用。
- 预期:构造器注入的依赖图在启动期完全可解析。

### 第三步发散·发散要点 追问链:IoC 三刀

- **追问①·IoC 容器两级**：BeanFactory(基础,懒加载)vs ApplicationContext(事件/国际化/AOP 集成,业务用)
- **追问②·BeanPostProcessor**：容器扩展点(代理生成/AutowireAnnotationProcessor 都靠它——第 87 题 AOP 同源)
- **追问③·Spring Boot 自动配置**：IoC 的规模化(条件化 BeanDefinition,第 39 题 starter 同源)

## 总结点

1. IoC 是原则,DI 是实现
2. 构造器注入首选:显式+可测
3. new 绕过容器=注入失效
