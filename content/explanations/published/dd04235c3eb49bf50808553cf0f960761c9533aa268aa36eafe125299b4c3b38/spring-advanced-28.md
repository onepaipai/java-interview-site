<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银报表沙盘:某 bean 在 @PostConstruct 里保存了 this 供内部使用,后续事务调用走的是裸对象——事务失效。用类名对照实验说明代理化时序与"过早捕获"的修复。

1. 代理在 BeanPostProcessor 的初始化后阶段(postProcessAfterInitialization)生成:@PostConstruct 先于代理运行,此刻 this 是裸对象。
2. 实测:PostConstruct 捕获=EarlyBean(裸类),容器中=EarlyBean$SpringCGLIB$0(代理)——两个对象不是同一个。
3. 修复:捕获场景改 ObjectProvider 延迟取代理、或用 AopContext.currentProxy(需 exposeProxy)、或重新设计让 bean 不需要捕获自身;构造器注入依赖里捕获他人同样中招。

## 参考分析

### 第二步扩展① 机制:bean 生命周期的时序窗口

- 生命周期:实例化(构造器)→属性注入→Aware→BeanPostProcessor.before→@PostConstruct/afterPropertiesSet→BeanPostProcessor.after(代理在这里)→就绪。
- @PostConstruct 与构造器阶段捕获的 this/引用都是"代理化之前"的实例。
- 把该引用长期持有(静态字段、注册表、回调列表),后续调用绕过代理——事务/缓存/异步全部失效(第 1/13 题同一机制,只是失效窗口从调用路径变为引用捕获)。

### 第二步扩展② 实证:裸类与代理的类名对照

- 本机实验(Spring 6.2.19,@EnableTransactionManagement + @EnableCaching,EarlyBean 带 @Transactional 方法):
```
Q28 PostConstruct捕获=EarlyBean 容器中=SpringTxExp$EarlyBean$SpringCGLIB$0
```
- 解读:PostConstruct 阶段捕获的 this 无代理标记。
- 容器最终暴露的是 CGLIB 代理——两者调用同一 @Transactional 方法,前者事务生效=0(第 1 题实测结论)。
- 验证:同程序重跑一致。
- JDK 动态代理模式下容器中类名形态为 $ProxyN,判断方式同理。

### 第二步扩展③ 取舍:捕获需求的四种替代

- 替代一,ObjectProvider<EarlyBean>:使用时 get() 拿到的是容器最终对象(代理)——首选,延迟且正确。
- 替代二,事件/回调延迟注册:注册的是"取对象的 Supplier"而不是对象本身。
- 替代三,AopContext.currentProxy():需 @EnableAspectJAutoProxy(exposeProxy=true),侵入小但线程绑定(异步里取不到,第 8 题)。
- 替代四,重新设计:需要"捕获自己"多半是生命周期纠缠,拆 bean 更干净。
- 评审问句:这个字段/注册表里存的是谁——创建期还是使用期取的?

## 案例

### 第三步发散·验证与推演 验证:assertSame(捕获对象, 容器 getBean 对象

- 验证:assertSame(捕获对象, 容器 getBean 对象)的生命周期测试——捕获发生在代理化之前即失败。
- 修复后(ObjectProvider 延迟取)断言同一性成立,该测试锁死时序缺陷。

### 第三步发散·追问扩展 追问链:代理时序三刀

- **Q1：构造器注入的依赖里捕获他人呢?**
  - 答：同样风险:依赖对象可能尚未代理化(创建顺序),捕获即裸引用;同样用 ObjectProvider/Supplier 延迟。
- **Q2：@Autowired 字段注入拿到的会是裸对象吗?**
  - 答：结论明确:取决于注入时刻目标 bean 的状态。字段注入发生在属性填充阶段(代理化之前);若目标 bean 尚未代理化、也未通过三级缓存暴露早期代理引用(getEarlyBeanReference),注入的就是裸对象——自引用与循环依赖场景正是如此(第 31 题成因之一);正常创建顺序(目标已完整创建)拿到的已是代理。"字段注入不受影响"是错觉,只是常见创建顺序恰好避开了窗口。
- **Q3：怎么系统性发现?**
  - 答：生命周期审计:凡在构造/@PostConstruct/自引用路径上保存 this 或注入对象的代码点逐个过;测试断言"捕获对象与 getBean 同一性"(assertSame)即锁死该缺陷。

## 总结点

1. PostConstruct 先于代理,捕获即裸奔
2. 类名看代理:$SpringCGLIB$
3. 延迟取代理,ObjectProvider 首选
