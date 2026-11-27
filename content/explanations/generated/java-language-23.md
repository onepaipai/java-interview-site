<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Enum.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银配置沙盘:单例的序列化破坏(反序列化新实例)与反射破坏(Constructor.setAccessible)——枚举单例(JVM 保证唯一)与静态持有者(类加载线程安全)是两种安全实现——双重检查锁的 volatility 纪律(手写 DCL 的最后场景)。

1. 单例的三种安全实现:枚举(天然防反射+防序列化——首推)、静态持有者(类加载线程安全+懒加载)、双检锁(DCL:volatile+两次判空——手写正确形态)。
2. 单例的破坏面:反射(setAccessible 调私有构造——防:构造器二次检查[已存在抛异常])、序列化(readObject 返回新实例——防:readResolve 返回单例/枚举天然防)、克隆(不实现 Cloneable)。
3. 单例的代价与替代:全局可变状态(第 47 题)、测试困难(状态隔离)、依赖隐藏——单例的替代=DI 容器的单例 bean(可控生命周期+可 mock,spring-advanced 38 题)——单例模式的现代形态是容器单例。

## 参考分析

### 第二步扩展① 机制:枚举单例与 DCL 的 volatile

- 枚举单例:INSTANCE——反射 setAccessible 构造枚举抛 IllegalArgumentException(JVM 禁)+序列化 readObject 特殊处理(枚举不建新实例)——语言级唯一性保证。
- DCL 的 volatile:实例字段 volatile(禁止"分配+构造"与"赋值"的重排——半初始化发布,第 8 题spring DCL)——无 volatile 的 DCL 在重排下发布半初始化对象。
- 重排为何非法、happens-before 完整规则清单与内存屏障对应,见并发基础第 2 题。
- 静态持有者:内部静态类在"首次引用"时类加载(JVM 初始化锁保证线程安全)——懒加载+零锁(类加载锁替代 DCL)。

### 第二步扩展② 反例:单例的三种事故

- 事故一,反射破坏:攻击/误用 setAccessible 调私有构造——第二个实例(状态分叉)。
- 事故二,序列化破坏:单例序列化往返产生新实例(单例失效)。
- 事故三,DCL 无 volatile:半初始化对象发布(另一线程拿到"构造到一半"的对象——字段默认值)——最难排查的并发 bug(第 8 题 spring)。
- 三条的正解:枚举/静态持有者(语言机制)+DCL 必须 volatile+反射防护(构造器守卫)。

### 第二步扩展③ 取舍:单例 vs DI 容器单例

- 手写单例:无依赖(容器外场景)/状态全局(测试难)/破坏面(反射序列化)。
- 容器单例(spring @Component):生命周期管理/依赖注入(可测试)/作用域可控——业务单例的现代形态。
- 手写单例的残余地:工具类(无状态——其实不需要单例,静态方法即可)/JVM 级(与容器无关的基础设施)——业务代码的单例交给容器。

## 案例

### 第三步发散·验证与推演 验证:单例安全的断言组

- 验证:枚举反射断言(setAccessible 调枚举构造抛 IllegalArgumentException)。
- DCL 断言(volatile 的 DCL 正确性[JMH/压力下的实例唯一]。
- 无 volatile 的风险标注推演[难以稳定复现,第 8 题 spring])。
- 序列化断言(枚举序列化往返实例不变)——三组固化单例安全。
- 反射防护的守卫用例(构造器二次检查)进模板。

### 第三步发散·追问扩展 追问链:单例三刀

- **Q1：单例的测试?**
  - 答：单例的状态隔离(测试间重置[reset 方法——污染单例纯粹性])vs DI 注入 mock(测试友好)——单例的测试困难是 DI 的最强理由。
- **Q2：静态持有者的类加载?**
  - 答：Holder 类的初始化时机(首次引用 Holder 类时——JVM 类加载锁)——类加载失败的传播(Holder 初始化异常=NoClassDefFoundError 后续引用全挂)。
- **Q3：枚举单例的字段?**
  - 答：枚举的实例字段与方法(枚举即类)——枚举单例可以有状态与方法(不只是常量)——枚举的能力被低估。

## 总结点

1. 枚举防反射防序列化,语言级唯一
2. DCL 必须 volatile
3. 业务单例交容器,手写只留基础设施
