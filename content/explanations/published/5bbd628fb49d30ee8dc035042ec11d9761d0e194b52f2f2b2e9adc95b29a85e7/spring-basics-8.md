<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银沙盘:A 构造器需要 B,B 构造器需要 A——两者都没完成构造,无法提前暴露——构造器循环=鸡生蛋蛋生鸡的死结(spring-advanced 31 题的深入版:三级缓存为何救不了构造器循环)。

1. 三级缓存的边界:三级缓存(early reference)在"实例化后、属性注入前"提前暴露——构造器循环在"实例化"阶段就卡住(两者都未完成实例化,无东西可暴露)——属性注入循环可自解,构造器循环不可。
2. 实测形态:构造器循环启动抛 BeanCurrentlyInCreationException(本机 spring-advanced 31 题实验:根因=BeanCurrentlyInCreationException);属性注入循环默认可解(spring-advanced 31 题:allowCircularReferences 默认 true)。
3. 解法优先级:重构解循环(抽公共依赖/事件解耦)>ObjectProvider 延迟>allowCircularReferences 开关(最后手段,第 31 题 spring-advanced)。

## 参考分析

### 机制:三级缓存与构造器死结

三级缓存:singletonObjects(成品)/earlySingletonObjects(半成品)/singletonFactories(ObjectFactory——可生成早期引用)。属性注入循环:A 实例化(构造完成)→提前暴露→注入 B→B 实例化→B 注入 A(从三级缓存拿 A 的早期引用)→B 完成→A 完成注入→A 完成。构造器循环:A 构造需要 B→创建 B→B 构造需要 A→创建 A→A 又需要 B——循环在"构造"阶段(连半成品都没有)——三级缓存的提前暴露无法介入。

### 反例:构造器循环的启动失败

沙盘:A(B b) 构造器注入 B,B(A a) 构造器注入 A——启动抛 BeanCurrentlyInCreationException(rootCause,第 31 题 spring-advanced 实验:根因=BeanCurrentlyInCreationException)。修复:改属性注入(降级——引入可变字段,第 2 题 spring-basics)、抽公共依赖(重构首选)、事件解耦(第 13 题)。禁止:allowCircularReferences=true 长期开启(掩盖设计问题)。

### 取舍:构造器注入与循环依赖的矛盾

构造器注入的优点(不可变+显式依赖)与缺点(不支持循环)是同一枚硬币的两面——不可变=构造时全依赖就绪=循环无法满足。设计上的解:构造器注入+禁止循环=设计质量的守门(循环依赖在启动期暴露——好过运行期)。属性注入的"灵活"=循环依赖可隐藏=设计债(第 37 题)。

### 展开:三级缓存的延迟决策——为什么两级不够

三级缓存存的是 ObjectFactory 而不是引用本身:工厂回调 getEarlyBeanReference(SmartInstantiationAwareBeanPostProcessor),bean 需要 AOP 代理时才生成代理,不需要时返回裸对象——早期引用的形态延迟到"第一次有人要"才决定。若只有两级(直接存早期引用),就必须在实例化后立刻决定是否代理:要么所有 bean 提前代理(改变生命周期语义),要么循环场景注入裸对象(与最终 bean 类型不一致)。工厂是"代理不确定性"与"提前暴露需求"之间的折中——这是三级结构真正的设计动机,也是"背过三级缓存"与"理解三级缓存"的分水岭。

## 案例

### 验证:构造器循环的断言组

验证:抛异常断言(构造器循环启动抛 BeanCurrentlyInCreationException——spring-advanced 31 题实测);属性注入对照断言(属性注入循环自解——allowCircularReferences 默认 true 时);解法断言(重构后启动成功+行为不变)——三组固化循环依赖的治理;spring-advanced 31 题的实验为本机制的直接证据。

### 追问链:循环依赖三刀

一刀:"Spring Boot 3 的变化?"——Boot 2.x 默认允许循环(可配),Boot 3 默认禁止——升级时存量循环集中暴露(第 49 题 distributed 回归集)。二刀:"三级缓存为什么需要三个?"——一级(成品)+二级(半成品)+三级(工厂)——三级存在的目的=处理 AOP 代理的提前引用(需要生成代理而不是裸对象)——三级的设计动机。三刀:"循环依赖与设计?"——循环依赖=职责边界模糊(第 2 题 distributed 领域边界)——解循环=重新划边界——循环依赖的治理即架构治理。

## 总结点

1. 构造器循环:无半成品可暴露
2. 属性注入可自解,构造器不可
3. Boot 3 默认禁,升级集中暴露
