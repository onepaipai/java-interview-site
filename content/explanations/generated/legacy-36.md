<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/annotation-config/resource.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/core/beans/annotation-config/autowired.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银多实现注入沙盘:同一接口三个实现类(微信/支付宝/银联)——@Autowired byType 歧义报错,@Resource byName 先行;装配语义不同导致启动期差异。

1. @Autowired:Spring 提供——默认 byType(按类型);同类型多候选→按字段名/参数名匹配→仍不唯一→报 NoUniqueBeanDefinitionException,需 @Qualifier 指名或 @Primary 标主;required=false 允许缺失。
2. @Resource:JSR-250 标准注解——默认 byName(按名字),名字找不到再回退 byType;name 属性显式指定;与 Spring 解耦(JSR 标准,换容器理论上可用);不支持构造器注入(只能字段/setter)。
3. 装配行为差异:@Autowired 支持构造器/方法/参数注入;@Resource 只字段+setter;多候选时 @Autowired(name 匹配+@Qualifier/@Primary)生态更全——团队统一一种(常见 Spring 项目用 @Autowired+构造器),避免混用造成装配路径不一致。

## 参考分析

### 机制:两种查找策略的失败模式

byType 失败=歧义(多候选)或缺失(无候选)——失败发生在启动期(早失败,好);byName 失败=名字对不上(回退 byType 可能又歧义)——名字是隐式契约(重构改名=装配断,编译期无感知)。显式 @Qualifier/name=把隐式变显式(可读性优先)。

### 反例:注入的两种事故

事故一:@Autowired 字段名与 Bean 名不一致+多实现——启动报 NoUnique;修复=@Qualifier 或改字段名对齐(隐式匹配,不推荐)。事故二:依赖 @Resource 的 byType 回退——改名后回退到 byType 碰上多实现,行为随重构漂移;修复=显式指定 name 或统一 @Autowired。

### 取舍:注解的选择

Spring 项目+构造器注入=@Autowired(唯一选择,@Resource 不支持构造器);需要按名装配=@Resource(name) 或 @Autowired+@Qualifier(等价,前者少一个注解);脱离 Spring 的可移植诉求=@Resource(JSR 标准)——实际上 Spring 一统,可移植性是弱理由;一致性>个体偏好。

## 案例

### 验证:装配语义的实测走查

验证:byType 歧义断言(三实现+@Autowired 无限定→启动失败;@Qualifier 后成功);byName 断言(@Resource 按字段名命中对应实现;name 属性断言);构造器断言(@Resource 用于构造器→不支持,编译/运行报错);required 断言(@Autowired(required=false) 缺 Bean 不炸)——四组固化装配语义,Spring 模块测试可复跑。

### 追问链:注入三刀

一刀:集合注入=List<PayChannel>/Map<String,PayChannel> 注入全部实现(策略模式天然落法,第 55 题)——新增实现零改动。二刀:@Primary vs @Qualifier=全局默认 vs 局部指定(多候选治理)。三刀:Optional/Provider 注入=可选依赖与延迟获取(ObjectProvider 语义,第 34 题 prototype 同源)。

## 总结点

1. @Autowired byType,@Resource byName 先
2. 多候选:@Qualifier/@Primary
3. 构造器注入只能 @Autowired
