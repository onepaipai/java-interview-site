<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/service-level-objectives/)
- [事件溯源设计说明 · 2](https://martinfowler.com/articles/patterns-of-distributed-systems/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银代理沙盘:JDK 代理(实现接口,Proxy.newProxyInstance)vs CGLIB(继承目标类,Enhancer+Objenesis)——自调用(this.method())绕过代理因为 this 是目标不是代理(spring-basics 9/10 题的完整版)。

1. JDK 动态代理:实现目标接口(代理=接口的实现)——可代理方法=接口声明的方法;目标必须实现接口;Proxy.newProxyInstance(类加载器,接口列表,InvocationHandler)——代理对象≠目标对象(字段在 target,代理的字段全 null,第 19 题 spring-advanced)。
2. CGLIB:继承目标类(代理=目标子类)——可代理=非 final 非 private 非 static 方法;无需接口;Enhancer.setSuperclass+MethodInterceptor;Objenesis 跳过父类构造器(第 10 题 spring-basics 修正版)。
3. 自调用不生效的机制:代理的拦截发生在"外部调用经代理对象"时;自调用 this.method() 是在目标对象内部直接调用(this 是目标不是代理)——拦截器链不在调用路径上;两种代理的自调用都绕过(JDK 代理的 this=目标,CGLIB 的 this=代理子类但内部方法调用不走拦截器链)。

## 参考分析

### 第二步扩展① 机制:代理的两层对象

- Spring 容器返回的是代理对象(内部持有 target 引用)——外部调用=经过代理(拦截器先执行再调 target)。
- 自调用=在 target 内部直接调 this.method()(this=target,不经代理)——两层对象(代理+目标)是理解自调用失效的关键。
- AopContext.currentProxy()(exposeProxy=true)可获取代理引用解决。

### 第二步扩展② 反例:代理的两种事故

- 事故一:@Transactional 方法自调用——事务失效(spring-advanced 1 题实测:生效=0)。
- 修复=拆 bean/注入自身代理/AopContext.currentProxy/TransactionTemplate。
- 事故二:CGLIB 代理读字段——代理对象的字段全 null(字段在 target)。
- 修复=经 target 读字段(不在代理上读)。

### 第二步扩展③ 取舍:代理方式的选型

- JDK 代理:有接口+性能略优(反射调用)。
- CGLIB:无接口或 proxyTargetClass=true(统一代理方式)+final 方法失效。
- Boot 默认 CGLIB(spring.aop.proxy-target-class=true)——统一代理方式避免"有接口和没接口的行为差异"(第 10 题 spring-basics)。

## 案例

### 第三步发散·验证与推演 验证:代理的走查核对

- 验证:spring-basics 9 题真值(ProxyBoundaryExample:proxy.run() intercepted=1,target.run() intercepted=0,累计 1:2)。
- spring-advanced 1 题(自调用事务生效=0,代理调用=1)。
- spring-advanced 19 题(代理字段全 null,经 target 读正确)。
- 类名断言(getClass 含 CGLIB/$Proxy)。
- 验证:代理的断言可程序化(真值测试持续执行)。

### 第三步发散·追问扩展 追问链:代理三刀

- **Q1：CGLIB 的 final 方法?**
  - 答：CGLIB 无法覆写 final 方法→@Transactional 标在 final 方法→事务失效(静默,无报错);修复=final 方法不加事务注解或去掉 final(spring-basics 10 题)。
- **Q2：Spring 的代理创建时机?**
  - 答：AbstractAutoProxyCreator 在初始化后(postProcessAfterInitialization)包裹;循环引用时 getEarlyBeanReference 提前创建(第 8 题 spring-basics 三级缓存)。
- **Q3：代理与序列化?**
  - 答：CGLIB 代理不可序列化(含合成字段)——返回 DTO 而非代理实体(spring-basics 10 题)。

## 总结点

1. 自调用=this 是目标不是代理
2. JDK 限接口,CGLIB 限非 final
3. Boot 默认 CGLIB 统一代理
