<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/invoke/MethodHandles.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银框架沙盘:动态调用选 MethodHandle 还是反射——MH:类型安全(签名编译期可验)+性能(接近直接调用,JIT 可内联)+不可访问私有(需 lookup 权限);反射:灵活(运行期发现)+慢+可访问私有(setAccessible)——按调用频率与访问需求选。

1. MH 的能力:MethodHandle(方法句柄——可验证签名的调用)+Lookup(句柄工厂——访问权限按查找方)+invokeExact(精确签名调用——JIT 友好)+参数自适应(invoke 通用形态+asType 适配)。
2. 反射 vs MH 的对照:反射(字符串方法名+Object[] 参数——灵活但装箱/查找开销,第 26 题);MH(方法类型+句柄——类型安全+性能);LambdaMetafactory(生成接口实现——最高性能,第 18 题机制)。
3. 选型阶梯:直接调用→LambdaMetafactory(接口形态的动态实现)→MethodHandle(非接口形态的动态调用+类型安全)→反射(运行期发现/私有访问/极端灵活)——按调用频率与灵活性需求选(第 26 题)。

## 参考分析

### 机制:Lookup 与访问权限

Lookup:MethodHandles.Lookup(工厂——权限=查找方的访问能力)——privateLookupIn(模块系统的跨模块私有访问——需目标模块 opens,第 26 题反射的模块化限制);Lookup 的能力降级(dropLookupMode)——权限的最小化原则(第 33 题)。invokeExact:签名严格匹配(不匹配 WrongMethodTypeException)——类型安全的强制;invoke(通用——asType 自适应,性能略降)。

### 反例:选型的两种错位

错位一,热路径用反射:高频调用的框架反射(第 26 题事故)——MH/生成类替代(性能 10 倍)。错位二,MH 的灵活性误用:需要"运行期按字符串发现方法"(反射的合法场景)用 MH(MH 需要预知签名——发现能力弱于反射)——灵活性与性能的反比关系(MH 中间态)。两条的正解:调用频率(热→MH/生成)+访问需求(私有→反射[或 opens+MH])+发现需求(运行期字符串发现→反射)。

### 取舍:MH 的工程成本

成本:API 学习曲线(MethodType/Lookup/适配)、调试的复杂度(句柄链的栈)、JDK 版本的 API 演进(VarHandle[字段]/MH 的 Java 9+ 语义)。收益:性能(接近直接调用)+类型安全(签名验证)+VarHandle(字段的原子操作[volatile/CAS 的现代形态——替代 Unsafe])。VarHandle 的独立价值:字段的 volatile/CAS 操作(Unsafe 的安全替代——并发工具的实现底座,第 19 题 AtomicLong 的底层)。

## 案例

### 验证:选型的断言组

验证:性能断言(直接/反射/MH/Lambda 的调用耗时对照——本机微基准,第 50 题distributed 纪律);类型安全断言(MH 的签名不匹配异常——invokeExact 的严格性实证);访问断言(privateLookupIn 的模块权限行为)——三组固化选型阶梯;MH 与反射的选择树进框架设计指南。

### 追问链:MH 三刀

一刀:"VarHandle 与 Unsafe?"——VarHandle(Java 9+,字段的内存语义操作[volatile/getAndSet/CAS])——替代 Unsafe(安全+可维护);Unsafe 的残留(高性能场景的绕过——deprecated 趋势,第 44 题)。二刀:"LambdaMetafactory 的场景?"——动态接口实现(每次生成的开销 vs 预生成缓存,第 18 题lambda 机制)——生成类的高性能与不可 introspect(调试图难)。三刀:"invokeExact 的严格?"——签名不匹配即异常(无自动适配)——invokeExact 的严格性=性能的前提(类型在编译期确定);invoke(适配)的代价(每次 asType)。

## 总结点

1. 按频率选:MH 生成类优于反射
2. invokeExact 严格,invoke 适配
3. VarHandle 替代 Unsafe
