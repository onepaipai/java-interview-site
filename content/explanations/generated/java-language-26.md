<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/reflect/Method.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银框架沙盘:反射调用比直接调用慢(10-100 倍量级,随版本与 inflation 优化浮动)——原因链:方法查找(解析)/参数装箱(Object[])/安全检查/无法内联——框架的应对:缓存 Method、inflation(JIT 化)、MethodHandle/LambdaMetafactory 替代。

1. 慢的四个原因:方法查找(getMethod 需缓存)、参数装箱(Object[]+varargs 分配)、访问检查(setAccessible+模块)、无法内联(JIT 受限——inflation 机制)。
2. 优化的阶梯:缓存 Method(getMethod 一次,Method.invoke 复用)→setAccessible(true)(跳过访问检查)→MethodHandle(比反射快的现代形态,第 27 题)→LambdaMetafactory(生成调用类——接近直接调用的性能,第 18 题 lambda 机制)。
3. 本机量级(推演标注:本机未做精确基准,引用社区普遍数据+第 27 题 MethodHandle 选型):直接调用 1ns 量级(A1)、反射 10-100ns 量级(inflation 后)、MethodHandle 接近直接调用——框架的性能设计(反射在冷路径/热路径用 MH)。

## 参考分析

### 机制:inflation 与 MethodHandle

inflation:反射调用前 15 次(JDK 的 inflation 阈值)走 Native 实现;15 次后生成字节码 stub(JIT 化的 MethodAccessor)——反射的"先慢后快"(inflation 的名字由来)——JDK 18 起改为 MethodHandle 统一(旧机制废弃)。MethodHandle:type-safe 的方法句柄(编译期可验证签名+JIT 可内联 invokeExact)——比反射快(接近直接调用)。LambdaMetafactory:接口的运行时实现(Proxy 的现代替代——性能接近手写类,spring-advanced 32 题的动态代理替代)。

### 反例:反射滥用的两种事故

事故一,热路径反射:高频接口的每请求反射调用(未缓存 Method+未 inflation)——10-100 倍的调用开销(接口 P99)。事故二,反射绕类型:反射绕过编译期检查(类型错误运行期才爆,第 4 题泛型擦除的反射形态)——类型安全的流失。两条的正解:热路径缓存+MH/生成类替代;反射只留冷路径(配置加载/工具,第 39 题)。

### 取舍:反射的合法场景与替代

合法场景:框架的装配(容器/SPI——冷路径一次)、跨模块的解耦(运行期发现)、注解处理(第 28 题)。替代阶梯:直接调用(编译期)→MethodHandle(运行期+类型安全+快)→LambdaMetafactory(生成实现)→反射(最慢最灵活)——按调用频率选。反射的参数纪律:可变参数的打包(Object[] 分配)、基本类型的装箱(第 19 题)——反射的参数传递是第二重的开销。

## 案例

### 验证:反射开销的断言组

验证:开销对照断言(直接调用 vs 反射 vs MethodHandle 的耗时对照——本机微基准[JMH 或简化循环+预热,第 50 题distributed 基准纪律]);缓存收益断言(getMethod 缓存 vs 每次查找);inflation 断言(反射调用的前 15 次与后续的耗时差)——三组量化反射开销;基准报告的口径(第 50 题)标注环境。

### 追问链:反射三刀

一刀:"setAccessible 的模块化?"——JDK 17 的模块封闭(java.base 不 opens——本机 --add-opens 的实验经历)——模块化对反射的限制(第 4 题)——--add-opens 的依赖治理(哪些模块需要 opens——清单化)。二刀:"注解的反射?"——注解保留策略(第 28 题:RUNTIME 才可反射读)——注解+反射的框架形态(第 29 题 SPI)。三刀:"反射与安全?"——setAccessible 绕访问控制(私有方法调用)——安全敏感模块的反射防护(模块封闭+安全管理器的弱化[deprecated])——反射的安全边界随模块化收紧。

## 总结点

1. 四重开销:查找装箱检查不内联
2. inflation 先慢后快,18 起 MH 统一
3. 热路径缓存加 MH,反射留冷路径
