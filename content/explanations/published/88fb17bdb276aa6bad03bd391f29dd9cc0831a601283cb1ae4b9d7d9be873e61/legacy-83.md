<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/service-level-objectives/)
- [事件溯源设计说明 · 2](https://martinfowler.com/articles/patterns-of-distributed-systems/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银框架沙盘:Bean 生命周期=实例化→属性注入→Aware→BPP.before→初始化(@PostConstruct→afterPropertiesSet→init-method)→BPP.after(代理化)→销毁——spring-basics 6 题的完整版(BPP 的作用=每个 bean 创建过程中插入自定义逻辑)。

1. 生命周期:实例化(构造器)→属性注入→Aware 回调(BeanName/BeanFactory/ApplicationContext)→BPP.before→@PostConstruct→afterPropertiesSet→init-method→BPP.after(代理化)→就绪→销毁(@PreDestroy/destroy-method)。
2. BPP 的作用:在每个 bean 初始化前后插入逻辑——before 修改 bean;after 代理化(AbstractAutoProxyCreator 在此包裹 @Transactional/@Async 代理,第 87 题)——AOP/校验/注入扩展全靠 BPP(Spring 扩展核心接口)。
3. Aware 接口:BeanNameAware( bean 名)/BeanFactoryAware(容器引用)/ApplicationContextAware(上下文)——由 ApplicationContextAwareProcessor(BPP) 在 before 阶段统一调用(第 6 题 spring-basics 的 Aware 驱动)。

## 参考分析

### 第二步扩展① 机制:BPP 是 Spring 的"插件系统"

- BPP=每个 bean 创建时的钩子(before/after)——Spring 的核心功能(AOP 代理/Autowired 注入/校验)全部通过 BPP 实现:AutowiredAnnotationBeanPostProcessor(注入)、AbstractAutoProxyCreator(代理)、CommonAnnotationBeanPostProcessor(@PostConstruct/@Resource)——BPP 是 Spring 的"微内核"(第 7 题 spring-basics)。

### 第二步扩展② 反例:BPP 的两种事故

- 事故一:@PostConstruct 捕获 this——代理在 after 阶段才生成,PostConstruct 拿到的是裸对象(事务/缓存失效,第 28 题 spring-advanced)。
- 修复=ObjectProvider 延迟取代理。
- 事故二:BPP 影响所有 bean——BPP 不筛选类型→对每个 bean 都调用(性能成本=BPP 数×bean 数,第 7 题 spring-basics)。
- 修复=限类型或限 scope。

### 第二步扩展③ 取舍:BPP 与 BeanFactoryPostProcessor 的边界

- BPP=实例级(每个 bean 创建后修改实例)。
- BFPP=定义级(所有 definition 加载后修改 BeanDefinition,不涉及实例)——BFPP 在 BPP 之前(定义先于实例)。
- BeanDefinitionRegistryPostProcessor(可注册新 definition)先于普通 BFPP(第 7 题 spring-basics 的 refresh 阶段)。

## 案例

### 第三步发散·验证与推演 验证:生命周期的走查核对

- 验证:时序断言(构造→注入→Aware→BPP.before→@PostConstruct→afterPropertiesSet→init-method→BPP.after→就绪,日志顺序断言)。
- BPP 断言(AbstractAutoProxyCreator 的代理生成——类名含 CGLIB/$Proxy)。
- Aware 断言(ApplicationContextAware 拿到上下文)。
- 验证:本机 BeanPhasesExample 真值(spring-basics Q7:definition:instance)。
- 本机 Q28 PostConstruct 捕获=裸类。

### 第三步发散·追问扩展 追问链:生命周期三刀

- **Q1：@PostConstruct 与 afterPropertiesSet 的顺序?**
  - 答：@PostConstruct 先(JSR-250 注解,CommonAnnotationBeanPostProcessor 处理)→afterPropertiesSet 后(InitializingBean 接口)→init-method 最后——三者同"初始化阶段"但顺序固定(spring-basics 6 题)。
- **Q2：循环依赖的代理提前?**
  - 答：正常路径=after 阶段代理化;循环引用路径=getEarlyBeanReference 提前代理化(三级缓存第 8 题 spring-basics);@PostConstruct 时"是否已代理"取决于是否有循环依赖。
- **Q3：销毁的顺序?**
  - 答：与创建相反:@PreDestroy→DisposableBean.destroy→destroy-method——销毁顺序=创建顺序的逆序(第 38 题 spring-advanced)。

## 总结点

1. 十一步生命周期,BPP 贯穿
2. BPP.after=代理化(事务/AOP)
3. @PostConstruct 先于代理化
