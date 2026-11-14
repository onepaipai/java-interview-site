<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银平台组沙盘:启动报 BeanCurrentlyInCreationException,团队第一反应是加 allowCircularReferences;追根是两个服务互相调用导致的循环。用实测说明循环依赖的两类行为与治理优先级。

1. 两类行为实测:属性注入(setter/@Autowired 字段)循环默认自解(三级缓存提前暴露)=true;构造器注入循环直接拒绝,根因 BeanCurrentlyInCreationException。
2. 治理优先级:重构解循环(抽出共同依赖/事件解耦)永远优先于开关——allowCircularReferences 只是延后爆炸,三级缓存的提前暴露还伴随代理时序风险(第 28 题)。
3. 工程约束:新代码禁构造器循环(必炸);存量属性循环登记治理;Boot 3 默认禁循环引用,升级会集中暴露存量问题(第 49 题回归集)。

## 参考分析

### 机制:三级缓存与构造器循环的死结

属性注入循环的自解:创建 A(构造完成,未注入)→提前暴露 A 的 ObjectFactory(三级缓存)→注入时发现依赖 B→创建 B→B 注入 A 时从三级缓存拿到早期 A→B 完成→A 注入 B 完成。构造器循环的死结:A 构造需要 B,B 构造需要 A,谁也没到"可提前暴露"的阶段——创建中即抛。三级缓存还有一层:早期引用可能不是最终代理(Spring 对此有代理提前化的处理),循环引用与 AOP 组合时是微妙行为的高发区。

### 实证:两类注入的对照

本机实验(Spring 6.2.19,AnnotationConfigApplicationContext):
```
Q31 属性注入循环(允许自解)=true
Q31 构造器注入循环=拒绝, 根因=BeanCurrentlyInCreationException
```
解读:A/B 互相 @Autowired 字段注入,上下文正常启动(getBean 非 null);改为构造器互相注入,refresh 即抛。注意异常被 BeanCreationException 包装,取 rootCause 才见真身——排查时别被表层类名带偏。验证:同程序重跑一致。

### 取舍:解循环的三种重构

重构一,抽公共服务:A、B 共同依赖的逻辑下沉为 C,A、B 都依赖 C——最常见解。重构二,事件解耦:A 发事件,B 监听——依赖方向单向化(第 29 题形态)。重构三,回调注入:B 只需要"通知 A"的能力时,注入回调接口的弱引用(ObjectProvider 延迟解析)——治标但可行。开关兜底(allowCircularReferences)只用于:存量无法立即重构+明确登记治理计划——长期开着等于把设计债固化。

## 案例

### 验证:CI 启动冒烟(完整上下文刷新)断言无 BeanCurren

验证:CI 启动冒烟(完整上下文刷新)断言无 BeanCurrentlyInCreationException;启动后打印 bean 依赖图做环检测;属性注入循环的存量登记治理——三道闸防止循环回潮。

### 追问链:循环依赖三刀

一刀:"为什么 Boot 3 起默认禁止?"——循环依赖掩盖设计问题且与代理/懒加载组合出微妙 bug;默认禁止让问题在启动期暴露(好过运行期)。升级 Boot 时存量循环集中报错——先跑启动测试,逐个重构而不是全局开开关。二刀:"ObjectProvider 能解构造器循环吗?"——不能:构造器参数阶段仍互相依赖;要改成字段/setter 延迟解析或重构。三刀:"怎么防新增?"——CI 启动冒烟(每次构建起完整上下文)+依赖图检查( bean 依赖环检测,可用 ArchUnit 或启动后打印依赖图)。

## 总结点

1. 属性循环自解,构造器循环必炸
2. 重构优先,开关兜底要登记
3. 启动冒烟进 CI,环检测前移
