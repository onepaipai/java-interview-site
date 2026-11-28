<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 Service 沙盘:字段注入(@Autowired 直接标字段)的三个问题:依赖不可见(构造器签名看不出依赖)、不可变 impossible(字段可变)、测试需反射(mock 注入要 Spring 上下文)。构造器注入的三优势+何时字段注入合理。

1. 构造器注入三优势:依赖显式(构造器签名=依赖清单——一眼看清)、不可变(final 字段——注入后不变)、测试友好(new Service(mockDep) 直接构造——无需 Spring)。字段注入的三劣势:依赖隐藏(读签名不知道要什么)、可变(非 final)、测试需反射或完整上下文。
2. 实测锚点(spring-advanced 1 题):构造器注入的 mock 测试纯单测(毫秒);字段注入测试需 @SpringBootTest(秒级)——测试成本差百倍(第 4 题 distributed 同理)。
3. 字段注入的合法场景:测试代码(@Autowired in @SpringBootTest——简化测试配置)、原型/脚本(快速验证)——生产业务代码一律构造器。

## 参考分析

### 第二步扩展① 机制:构造器注入的不变式保障

- 构造器注入的不变式:对象创建时依赖已就绪(构造参数必填——缺依赖启动失败而非运行时 NPE)+字段 final(不可变——注入后不变,第 8 题)。
- 字段注入的时序问题:对象先创建(空字段)→后注入(反射 set)——注入前的字段=null(如果业务方法在注入前被调——NPE)。
- 循环依赖的字段注入可自解(第 31 题 spring-advanced)但构造器不可(设计约束)。

### 第二步扩展② 反例:字段注入的三种事故

- 事故一,隐藏依赖:service 的 5 个 @Autowired 字段——新增调用方不知道要配全 5 个 bean。
- 事故二,NPE:字段注入的对象在 @PostConstruct 前被使用(时序 bug)——字段=null。
- 事故三,循环依赖:字段注入允许 A↔B 循环(自解)——掩盖设计问题(第 31 题 spring-advanced)。
- 三条的正解:构造器注入+显式依赖+启动期暴露循环。

### 第二步扩展③ 取舍:构造器注入的循环依赖限制

- 限制:构造器注入不支持循环依赖(A 构造需要 B,B 构造需要 A——鸡生蛋)——Boot 3 默认禁循环,这是推构造器注入的配套约束。
- 解法:重构解循环(第 31 题 spring-advanced)>字段注入(临时)>ObjectProvider(延迟解析)。
- 构造器注入的"限制"恰恰是设计质量的守门员——循环依赖在构造器注入下无法隐藏。

## 案例

### 第三步发散·验证与推演 验证:注入方式的断言组

- 验证:测试成本断言(构造器注入的纯单测[毫秒] vs 字段注入的上下文测试[秒]——对照)。
- 不可变断言(final 字段注入后不可变——编译器强制)。
- 循环依赖断言(构造器循环启动失败——Boot 3 默认拦截)——三组固化注入纪律。
- 字段注入的 ArchUnit 规则(生产包禁 @Autowired 字段)进 CI。

### 第三步发散·追问扩展 追问链:注入三刀

- **Q1：@RequiredArgsConstructor?**
  - 答：Lombok 的 final 字段自动构造器——减少样板代码;但隐藏了构造器签名(lombok 生成的不可见)——权衡:样板 vs 可见性。
- **Q2：optional 依赖?**
  - 答：ObjectProvider/setter(可选依赖——缺失不阻塞启动)vs 构造器(必填)——可选依赖用 ObjectProvider(延迟解析)。
- **Q3：注入与 AOP?**
  - 答：构造器注入的对象经过代理(第 1 题 spring-advanced)——注入的是代理而非裸对象(注入点即代理边界)。

## 总结点

1. 构造器三优势:显式不可变可测
2. 字段注入隐藏依赖不可变缺失
3. 循环依赖被构造器暴露
