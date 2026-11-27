<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 SDK 沙盘:接口代理(JDK 动态代理——只代理接口方法)与类代理(CGLIB——代理非 final 非 private 方法)——两者的可代理方法集不同(接口方法 vs 非 final 公有方法)。影响:final 方法的 @Transactional 失效(CGLIB 无法覆写)。

1. JDK 动态代理:实现目标接口(代理对象=接口的实现)——可代理方法=接口中声明的方法(类中非接口方法不可代理)——目标必须实现接口。CGLIB:继承目标类(代理对象=目标子类)——可代理方法=非 final 非 private 非 static 的方法(可被覆写)——无需接口。
2. 可代理方法集:JDK=接口方法(窄);CGLIB=公有非 final 方法(宽)——final 方法的 @Transactional 在 CGLIB 下静默失效(不报错,只是不生效——第 28 题 distributed 静默失效)。
3. Spring 的默认策略:目标有接口→JDK 代理(默认 proxyTargetClass=false);无接口→CGLIB;proxyTargetClass=true→强制 CGLIB——Boot 2.x 默认 CGLIB(spring.aop.proxy-target-class=true)——CGLIB 的宽代理面是默认选择。

## 参考分析

### 第二步扩展① 机制:接口代理与类代理的方法集

- JDK 代理:Proxy.newProxyInstance(类加载器, 接口列表, InvocationHandler)——代理实现接口(所有接口方法→InvocationHandler.invoke)。
- CGLIB:Enhancer.setSuperclass(目标类)——代理继承目标(覆写非 final 方法→MethodInterceptor)。
- 方法集:JDK=接口交集。
- CGLIB=目标类公有非 final 方法(含继承的公有方法)。

### 第二步扩展② 反例:代理方式的两种失效

- 失效一,final 方法:CGLIB 覆写不了 final 方法——@Transactional 标在 final 方法上→事务失效(静默,第 28 题 distributed)。
- 失效二,无接口的目标:JDK 代理要求接口——无接口时强制 proxyTargetClass=false 抛异常——需切 CGLIB 或加接口。
- 两条的正解:final 方法不加事务注解(拆方法或去掉 final)。
- 无接口的类确认 proxyTargetClass=true(Boot 默认)。

### 第二步扩展③ 取舍:CGLIB 的兼容代价

- 代价:代理对象的字段是空壳(字段在 target——代理的字段全 null,第 19 题 spring-advanced 实测)——不要在代理上读字段(经 target)。
- 构造器调用:JDK 动态代理不涉及目标类构造器(基于接口创建新对象)。
- CGLIB 默认通过 Objenesis 跳过父类构造器(若不用 Objenesis 则调无参构造)。
- 依赖:cglib 库(spring 内嵌 repackaged)——版本与 JDK 兼容(第 49 题)。

## 案例

### 第三步发散·验证与推演 验证:代理方式的断言组

- 验证:接口代理断言(JDK 代理的类实现目标接口——instanceof 接口 true)。
- 类代理断言(CGLIB 代理的类是目标子类——instanceof 目标类 true)。
- final 失效断言(final 方法的 @Transactional 不生效——事务标志对比)——三组固化代理方式差异。
- 代理类型判断(getClass 含 $Proxy 或 $$SpringCGLIB)进排查工具。

### 第三步发散·追问扩展 追问链:代理方式三刀

- **Q1：proxyTargetClass 的选择?**
  - 答：true=强制 CGLIB(统一代理方式——但 final 方法失效);false=有接口用 JDK 无接口用 CGLIB(混合——行为不一致)——Boot 默认 true(统一)——统一与灵活的取舍。
- **Q2：接口的必要性?**
  - 答：面向接口编程(为 JDK 代理铺路)vs 类直接(CGLIB)——接口的价值(DIP,第 1 题 spring-advanced)与 CGLIB 的便利的权衡。
- **Q3：代理与序列化?**
  - 答：代理对象的序列化(CGLIB 代理不可序列化——含合成字段)——代理对象的序列化限制(返回 DTO 而非代理实体)。

## 总结点

1. JDK 代理限接口,CGLIB 限非 final
2. final 方法的事务静默失效
3. Boot 默认 CGLIB 统一代理
