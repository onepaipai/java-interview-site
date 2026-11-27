<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Record.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银沙盘:record Order(List<Item> items)——record 保证:类 final+组件 final+无 setter;不保证:items 引用的 List 内容不可变(可变元素穿透,第 8 题)——record 的浅不可变与深度不可变的边界。

1. record 的自动保证:类与组件 final、访问器(组件名())、equals/hashCode/toString(全组件)——"自动"的部分到此为止。不自动的:组件的深度不可变(List 内容/可变元素——开发者责任)、组件的校验(紧凑构造器做校验—— Objects.requireNonNull/范围检查)。
2. 深不可变的 record 模板:record Order(List<Item> items) { Order { items = List.copyOf(items); } }——紧凑构造器拷贝(防御性,第 8 题)——访问器返回的 List 本身不可变(copyOf 的产物)——完整深不可变。
3. 紧凑构造器(无参数列表重复)的职责:校验+规范化(规范化=规范化大小写/编码,第 33 题 banking 键)+防御性拷贝——record 的"构造期约束"集中在这里。

## 参考分析

### 第二步扩展① 机制:record 的自动与手动边界

- 自动:头组件的 final 字段+访问器+三件套——组件类型为 List 时,record 只保证"引用不变"。
- 手动责任:List.copyOf(构造时)+紧凑构造器校验(负金额拒绝)+可达性(组件不泄露 this——构造期 this 逃逸=record 不变式被破坏)。
- 紧凑构造器:`public Order { if (amount <= 0) throw ...。
- items = List.copyOf(items)。
- }`——校验与拷贝的集中点。

### 第二步扩展② 反例:record 浅不可变的两种事故

- 事故一,可变 List 穿透:record Order(List<Item>) 直接持有调用方 List——调用方 add 改变 record"内容"(equals/hashCode 随之变——集合中的行为异常,第 1 题)。
- 事故二,可变组件元素:List.copyOf 包装后 List 不可变,但 Item 元素可变(字段改)——深度穿透。
- 两条的正解:紧凑构造器 copyOf+组件类型 record 化(递归不可变,第 8 题)。

### 第二步扩展③ 取舍:record vs 手写不可变类

- record:代码极简(一行顶 50 行)/语义清晰(纯数据载体)/不可变默认——数据传输/值对象。
- 手写类:需要继承/懒字段/自定义 equals 细节/大量行为方法——record 的限制(不可继承、组件即字段、行为方法受限)。
- 选择:纯数据+值语义→record。
- 有行为与生命周期→手写(或类)。
- record 的限制清单:不可继承/不能声明实例字段(组件外)/组件不可变引用——限制即特性(不可变保障的代价)。

## 案例

### 第三步发散·验证与推演 验证:record 边界的断言组

- 验证:浅不可变断言(record 的可变 List 组件被外部修改——穿透实证)。
- 深不可变断言(copyOf 紧凑构造器后修改源 List——不穿透)。
- 三件套断言(record 的 equals/hashCode/toString 自动生成且一致)——三组固化 record 的边界。
- 紧凑构造器的校验用例(负金额拒绝)进单测。

### 第三步发散·追问扩展 追问链:record 三刀

- **Q1：record 与序列化?**
  - 答：record 的序列化用组件(不走字段反射——反序列化调用紧凑构造器!校验在反序列化也生效)——record 的序列化安全性优于传统类(校验不可绕过)。
- **Q2：静态组件?**
  - 答：record 不允许实例组件外字段——类级常量(static final)可以——组件与常量的边界。
- **Q3：局部 record?**
  - 答：方法内局部 record(临时结构,Java 16+)——中间结果的类型化(不污染类域)——局部 record 与 Stream 的配合(第 40 题分组统计的中间类型)。

## 总结点

1. record 自动浅不可变,深不可变是责任
2. 紧凑构造器:校验加 copyOf
3. 序列化走构造器,校验不可绕过
