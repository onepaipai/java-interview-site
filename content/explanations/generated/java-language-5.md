<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Collections.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银风控 API 沙盘:RiskService.process(List<? extends RiskEvent> events)——extends 还是 super 的选择决定 API 的灵活性(调用方能传什么)。用"生产者 extends 消费者 super"(PECS)说明集合型 API 的签名设计。

1. PECS:Producer Extends(集合用于读取=生产者→? extends T:可传入 T 及子类的集合);Consumer Super(集合用于写入=消费者→? super T:可传入 T 及父类的集合)。两者兼用→不写通配(精确类型)。
2. 实例:copy(List<? extends T> src, List<? super T> dst)(JDK Collections.copy 的签名)——src 只读(生产者,任意 T 子类列表)、dst 只写(消费者,任意 T 父类列表)——一个签名覆盖所有合理调用。
3. 通配的代价:extends 后不能 add(编译器禁止,除 null)、super 后 get 返回 Object——通配符是用"调用灵活性"换"使用限制"——API 设计在两者间权衡。

## 参考分析

### 机制:协变逆变的编译期表达

Java 泛型不变(List<String> 不是 List<Object> 的子类)——PECS 用通配符表达"使用处的协变/逆变":? extends T(协变读——把子类列表当 T 生产者);? super T(逆变写——把父类列表当 T 消费者)。编译器的护栏:extends 列表禁 add(T 及子类之外无法保证类型安全——编译器禁止);super 列表 get 返回 Object(只能按 Object 用)。

### 反例:通配符缺失与滥用的两种僵化

僵化一,缺 extends:process(List<RiskEvent> events)——调用方只有 List<MarketRiskEvent>(子类列表)传不进来——每个子类重载或强制转换(API 硬化)。僵化二,滥用通配:所有参数都 ? extends ? super(可读性崩塌+实现受限)——通配只在"生产/消费"语义明确处用;集合参数既是生产者又是消费者(读改写)→精确类型。两条的正解:按方法内对该集合的实际用法(read-only→extends,write→super,both→精确)——用法定签名。

### 取舍:通配符与函数式接口

函数式接口的 PECS:Predicate<? super T>(消费 T——super)、Supplier<? extends T>(生产 T——extends)——Stream API 的签名全按 PECS(filter 的 Predicate<? super T>)。Stream 流的 PECS 一致性让链式调用自然——集合 API 设计对照 Stream 的签名风格(JDK 的实践是范本)。

## 案例

### 验证:PECS 的编译期断言

验证:extends 灵活性断言(子类列表传入 ? extends 参数编译通过);super 灵活性断言(父类列表传入 ? super 参数通过);限制断言(? extends 列表 add 编译错——护栏实证)——三组用编译通过/失败的形式固化 PECS;JDK Collections.copy 的签名作为范本引用。

### 追问链:PECS 三刀

一刀:"通配符捕获(Wildcard Capture)?"——? extends T 列表的 add 被"捕获"限制(不能 add 任意 T)——capture helper(私有方法转换捕获的通配)是标准技巧(JDK swap 的 helper 形态)——捕获的处理写进 API 设计指南。二刀:"与数组协变的对比?"——数组协变(子类数组可赋父类数组——运行期 ArrayStoreException)vs 泛型不变+通配(编译期安全)——泛型+PECS 把数组的运行期错误前移到编译期(第 3 题 bankings 泛型擦除的正面)。三刀:"自类型限定?"——<T extends Comparable<? super T>>(自比较+父类可比)——排序 API 的经典限定——自限定与 PECS 的组合是排序/集合 API 的签名范本。

## 总结点

1. 生产者 extends,消费者 super
2. 通配换灵活,限制要知情
3. 用法定签名,JDK 签名是范本
