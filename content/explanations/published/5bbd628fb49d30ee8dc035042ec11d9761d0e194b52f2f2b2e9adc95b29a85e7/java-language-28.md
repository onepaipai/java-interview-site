<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/annotation/RetentionPolicy.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银框架沙盘:自定义注解 RetentionPolicy.CLASS(编译进 class 但运行期反射读不到)——框架的注解扫描(反射)读不到——SOURCE/CLASS/RUNTIME 三级保留与框架的读取时机(编译期注解处理器/运行期反射)。

1. 三级保留:SOURCE(仅源码,编译丢弃——@Override/编译期检查)、CLASS(编译进 class 文件,运行期 classpath 不可反射读——字节码工具[ASM]可读——编译期注解处理器[APT]的输出)、RUNTIME(运行期反射可读——Spring 的 @Component/@Autowired)。
2. 框架的读取时机:编译期(注解处理器 APT:生成代码/校验——Lombok/MapStruct)、字节码期(ASM/Javassist 修改字节码——AOP 的织入)、运行期(反射读取——Spring 的扫描)——保留策略必须匹配读取时机。
3. 与模块化的交互:RUNTIME 注解的反射读取(第 26 题)--add-opens 的模块边界——注解扫描的模块依赖清单(第 33 题供应链)。

## 参考分析

### 机制:三级保留与读取时机

SOURCE:@Override(编译器检查覆写——丢弃,运行期不存在)。CLASS:APT 的产物标记(编译期处理器生成代码的输入/输出标记——运行期反射读不到)——Lombok 的 @Getter(SOURCE——编译期改 AST)。RUNTIME:反射读取(@Retention(RUNTIME)——Spring 扫描 @Component/@Transactional)——运行期框架的生命线。错配事故:运行期反射读 CLASS 注解=读不到(框架失效,静默——第 49 题文档背离的注解版)。

### 反例:保留策略错配的事故

事故一,RUNTIME 写成 CLASS:自定义 @Audit 注解保留 CLASS——AOP 的反射扫描读不到——审计静默失效(第 32 题)。事故二,APT 与 RUNTIME 混淆:编译期生成代码的场景用 RUNTIME(运行期反射读——多此一举的性能成本)。事故三,元注解的保留:@Inherited(注解的类继承传递)与 @Target(适用位置)的遗漏——注解的作用范围错误。三条的正解:保留策略=读取时机(编译期 SOURCE/CLASS、运行期 RUNTIME)——注解设计的第一决策。

### 取舍:注解 vs 显式配置

注解的便利:声明式(贴注解即生效)+零配置。注解的代价:隐式性(行为藏注解里,阅读代码看不见)、侵入(注解依赖进业务代码)。取舍:横切基础设施(事务/缓存——注解)+业务规则(显式代码)——注解的滥用(业务逻辑藏注解参数)反模式(第 24 题分布式)。替代形态:显式配置(Java Config/DSL——第 32 题分布式)——注解与配置的分工(声明式基础设施 vs 显式业务)。

## 案例

### 验证:保留策略的断言组

验证:保留断言(三级注解的反射可达性:SOURCE/CLASS 反射 null,RUNTIME 可读——三级对照实证);APT 断言(注解处理器的生成产物存在[编译期]——编译日志);框架失效复现(CLASS 保留的 @Audit 反射扫描读不到——静默失效实证)——三组固化保留策略;注解清单(每注解的保留策略与读取方)进框架文档(第 49 题)。

### 追问链:注解三刀

一刀:"注解的继承?"——@Inherited(类级注解的子类继承——接口不继承)+元注解的组合——注解的继承边界(方法级注解不继承——覆写方法的注解要重标)。二刀:"repeatable?"——@Repeatable(同位置多注解——Java 8+)——多实例注解(多个规则标签)——重复注解的容器注解机制。三刀:"注解与密封?"——sealed 类的注解继承(sealed 的许可子类与注解扫描的配合,第 7 题)——注解扫描与模块系统的协同(第 26 题)。

## 总结点

1. 保留策略=读取时机,错配即静默失效
2. RUNTIME 才能反射读
3. 注解管横切,业务规则显式
