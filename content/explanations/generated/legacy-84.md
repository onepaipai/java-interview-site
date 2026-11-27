<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/service-level-objectives/)
- [事件溯源设计说明 · 2](https://martinfowler.com/articles/patterns-of-distributed-systems/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银框架沙盘:A 依赖 B,B 依赖 A(属性注入)——三级缓存解决:一级(singletonObjects 成品)/二级(earlySingletonObjects 半成品)/三级(singletonFactories ObjectFactory 工厂)——spring-basics 8 题的完整版。

1. 三级缓存:一级 singletonObjects(完整 bean——初始化完成);二级 earlySingletonObjects(提前暴露的半成品——实例化完成但未初始化);三级 singletonFactories(ObjectFactory——可生成早期引用的工厂,调用 getEarlyBeanReference)。
2. 解决流程:A 实例化→三级缓存放 A 的工厂→A 注入 B→B 实例化→B 注入 A(从三级缓存拿 A 的早期引用,升级到二级)→B 初始化完成→A 完成注入→A 初始化完成——A/B 各自完成(三级缓存的工厂在"第一次被需要"时调用并升级到二级)。
3. 为什么需要三级:二级缓存只能存"一种形态"的早期引用(裸对象或代理);三级缓存存 ObjectFactory(延迟决定"是否代理"——只有 AOP 需要时才生成代理)——"不知道是否需要代理"→存工厂(延迟决策,第 8 题 spring-basics 的延迟决策)。

## 参考分析

### 第二步扩展① 机制:构造器循环为什么无法解决

- 构造器循环:A 构造需要 B,B 构造需要 A——两者都没完成实例化(无半成品可暴露)→三级缓存的工厂无法调用(工厂需要实例化后的对象)。
- 属性注入循环=A 实例化(构造完成)→三级缓存暴露→注入 B 可获取早期引用——构造器循环=无解(鸡生蛋蛋生鸡),属性注入=可解。

### 第二步扩展② 反例:循环依赖的两种事故

- 事故一:Boot 3 默认禁止循环——升级后存量循环集中暴露(BeanCurrentlyInCreationException)。
- 修复=重构解循环(抽公共依赖/事件解耦,不是 allowCircularReferences=true)。
- 事故二:AOP+循环依赖——代理在 getEarlyBeanReference 中提前创建(可能不同于最终代理——微妙行为高发区,第 31 题 spring-advanced)。
- 修复=避免 AOP+循环依赖的组合(重构优先)。

### 第二步扩展③ 取舍:allowCircularReferences 的取舍

- 默认 true(spring-basics/spring-framework 传统):容忍设计债。
- Boot 3 默认 false:启动期暴露循环(强制修复)。
- 设 true=掩盖设计问题(第 37 题)——判据:循环依赖=职责边界模糊(第 2 题 distributed),解循环=架构治理。

## 案例

### 第三步发散·验证与推演 验证:三级缓存的走查核对

- 验证:spring-advanced 31 题实验——属性注入循环默认自解=true。
- 构造器注入循环拒绝(BeanCurrentlyInCreationException)。
- 三级缓存的断言(工厂调用后升级到二级缓存)。
- AOP 代理断言(有 AOP 时三级缓存工厂生成代理而非裸对象——getEarlyBeanReference)。
- 验证:循环依赖的断言可程序化(启动成功/异常对照)。

### 第三步发散·追问扩展 追问链:三级缓存三刀

- **Q1：二级缓存为什么不够?**
  - 答：二级存早期引用(一种形态);三级存工厂(延迟决定代理或裸)——如果只有二级:所有 bean 提前代理(改变生命周期)或循环场景拿到裸对象(与最终类型不一致)。
- **Q2：三级缓存的清空?**
  - 答：bean 完成后:三级移除(工厂已调用)+二级移除(升级到一级成品)——最终只有一级有完整 bean。
- **Q3：循环依赖与性能?**
  - 答：循环依赖的解析过程=多次从缓存获取+工厂调用(启动性能略降)——大量循环依赖=启动性能+设计质量双重问题。

## 总结点

1. 一级成品+二级半成品+三级工厂
2. 工厂延迟决定是否代理
3. 构造器循环无解,属性注入可解
