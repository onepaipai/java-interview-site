<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银框架沙盘:Spring 的 @Autowired 注入、MyBatis 的结果映射、Jackson 的序列化——框架的核心能力依赖反射;但反射比直接调用慢(方法查找+安全检查+装箱拆箱)。

1. 反射的能力:运行期读取类信息(Class/Field/Method/Constructor)、创建实例(newInstance)、调用方法(invoke)、读写字段(get/set)——绕过编译期类型检查(可访问 private,需 setAccessible);框架的基础设施(Spring DI/AOP/MyBatis/Jackson 全依赖反射)。
2. 性能代价:Method.invoke≈直接调用的 5-20 倍(查找+安全检查+参数装箱拆箱);JIT 无法内联反射调用;Field.get/set≈直接访问的 2-5 倍——高频路径避免反射(用 MethodHandle/VarHandle 替代,性能接近直接调用)。
3. 使用场景:框架基础设施(DI/AOP/ORM/序列化——低频但必要)、测试(访问 private 方法/注入 mock)、动态代理(JDK Proxy/CGLIB,第 19 题 spring)、注解处理(@Autowired 扫描)——反射是框架的胶水,不是业务的路径。

## 参考分析

### 机制:反射为什么慢

Method.invoke 的开销:一,方法查找(按名称+参数类型在方法表搜索——可缓存 Method 对象减少重复查找);二,安全检查(AccessibleObject.checkAccess——setAccessible(true) 可跳过但首次调用仍有成本);三,参数装箱拆箱(Object[] 参数,基本类型自动装箱);四,无法 JIT 内联(反射调用是"间接的",JIT 看不到目标方法体)。

### 反例:反射的两种事故

事故一:高频路径用反射——每请求反射调用一次服务方法(5-20 倍开销);修复=启动期缓存 Method/Field 对象或用 MethodHandle/VarHandle(第 19 题 java-language)。事故二:setAccessible(true) 滥用——绕过模块系统(JDK 16 强封装后需要 --add-opens);修复=仅框架场景使用,业务代码不用反射访问 private。

### 取舍:反射 vs MethodHandle vs 字节码生成

反射:API 简单但性能差(5-20 倍);MethodHandle(Java 7+):性能接近直接调用(1-2 倍)但 API 复杂(Lookup/MethodType/适配);字节码生成(CGLIB/ByteBuddy):性能最优(生成专用类)但复杂度最高;框架按需求选:低频场景反射,高频场景 MethodHandle 或字节码生成。

## 案例

### 验证:反射性能的走查核对

验证:J1 实验——装箱 6ns vs 原始 1ns(反射参数装箱的成本);Method.invoke vs 直接调用对照(5-20 倍差距,可复跑);MethodHandle 对照(接近直接调用)——性能数据固化反射的成本;缓存 Method 对象后性能提升的对照(查找成本消除)。

### 追问链:反射三刀

一刀:"反射与安全?"——setAccessible(true) 可绕过 private(模块系统限制——JDK 16+ 强封装需要 --add-opens);反射可访问任何类(安全风险:不要在不受信代码中使用)。二刀:"注解与反射?"——注解信息通过反射读取(getAnnotation/getDeclaredAnnotations)——框架扫描注解的本质=反射遍历类的方法/字段检查注解;注解处理的性能=反射遍历的成本(可用字节码扫描工具如 ClassGraph 优化)。三刀:"反射与模块化?"——JDK 9+ 模块系统限制跨模块反射(需要 opens/export);Spring Boot 的 --add-opens 参数列表就是解决反射与模块系统的冲突。

## 总结点

1. 反射=框架胶水,非业务路径
2. 性能 5-20 倍,高频路径用 MethodHandle
3. setAccessible 绕过安全,仅框架用
