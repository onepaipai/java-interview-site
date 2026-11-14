<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/reflect/Type.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银接口沙盘:分页返回 Page<T>(T=不同类型的列表)——泛型的正确边界:Page<T> 的泛型(列表类型+分页元数据)、通配边界(第 5 题 PECS)、子类列表的协变(Page<SpecialOrder> 传给 Page<Order> 消费)。

1. 分页对象的结构:Page<T>{ List<T> content; long total; int page; int size; }——T 的边界=列表元素类型。泛型的协变限制:Page<SpecialOrder> 不是 Page<Order> 的子类(泛型不变,第 5 题)——需要协变处用 ? extends Order(PECS 生产者)。
2. 通配的形态:Page<? extends Order>(消费 Order 的方法可接 SpecialOrder 的 Page)——消费侧的灵活性(第 5 题 PECS);写入侧(Page<T> 的构建)精确类型。
3. 与分页稳定性的配合:T 的比较字段(排序链,第 44 题)——Page 的泛型不影响排序稳定性(排序在 T 的类型层面)——分页对象的泛型与排序契约独立。

## 参考分析

### 机制:泛型边界与 PECS

不变性:Page<SpecialOrder> ≠ Page<Order>(Java 泛型不变)——消费方法签名 Page<? extends Order>(PECS 生产者——读侧协变)。构建:Page.of(List<T> content, total, page)——精确类型(构建用具体 T)。递归泛型:Page<T extends BaseEntity>(T 的上界——分页对象的通用行为[createdAt 等])——上界约束的泛型。

### 反例:泛型边界的两种事故

事故一,raw 类型:Page(无泛型参数)——类型安全丢失(元素 Object,调用方强转——第 4 题泛型擦除的 raw 形态)。事故二,通配滥用:Page<? extends ? super T>(嵌套通配——不可读不可用)——通配的滥用(第 5 题 distributed)。两条的正解:精确 T 构建+消费侧 ? extends(PECS 纪律)——泛型边界的干净。

### 取舍:分页对象的抽象层次

抽象:通用 Page<T>(所有接口共用)vs 专用 Page(每接口自定义)——通用=复用+统一前端分页组件;专用=灵活(额外元数据)。泛型边界:通用 Page<T> 的 T 上界(BaseEntity?还是无界——无界更灵活,上界按需)——抽象层次的选择(第 49 题)。Spring Data 的 Page:标准形态(Pageable/Page——生态的事实标准)——用生态标准减少自建(第 17 题)。

## 案例

### 验证:泛型边界的断言组

验证:协变断言(Page<SpecialOrder> 传入 Page<? extends Order> 方法——编译通过);不变断言(Page<SpecialOrder> 不能直接赋 Page<Order>——泛型不变实证);上界断言(Page<T extends BaseEntity> 的行为方法可用)——三组固化泛型边界;PECS 的签名检查(第 5 题)进 API 评审。

### 追问链:分页泛型三刀

一刀:"泛型与序列化?"——Page<T> 的序列化(T 的类型信息擦除——反序列化需显式类型,第 4 题)——序列化的泛型边界(TypeReference,第 4 题)。二刀:"Page 的排序字段?"——排序的字段名(String)类型安全(类型化排序键——枚举/常量)——排序键的类型安全(第 34 题)。三刀:"Page 与游标?"——游标分页(keyset,第 44 题)的游标对象(Cursor<T>——游标编码[最后记录的排序键])——游标的泛型与序列化。

## 总结点

1. Page<T> 不变,消费用 extends
2. 构建精确,消费协变
3. raw 类型是擦除的 raw 形态
