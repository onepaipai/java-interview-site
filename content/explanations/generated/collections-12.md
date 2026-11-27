<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/List.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银参数传递沙盘:Arrays.asList 的返回"能 set 不能 add/remove"(定长视图,底层是原数组——改了影响原数组);List.of 真不可变(任何修改抛 UnsupportedOperationException,且拒绝 null)——三者(含 new ArrayList<>)的行为矩阵要清楚。

1. 行为矩阵:Arrays.asList——set 可用(穿透原数组)、add/remove 抛异常(定长)、允许 null、是原数组的视图;List.of——全不可变、拒绝 null(NullPointerException)、与源无关联(拷贝);new ArrayList<>(...)——完全可变、允许 null、拷贝。
2. 陷阱:Arrays.asList 的 set 穿透(改了"参数列表"影响调用方的原数组);List.of 的 null 拒绝(含 null 元素的集合传入即抛——数据里混 null 直接崩,第 30 题分布式 null 语义)。
3. 选择:只读常量→List.of(不可变+紧凑);数组适配→Arrays.asList(要与数组联动时);可变构建→new ArrayList<>(...) 或 builder 模式——三种形态各司其职。

## 参考分析

### 第二步扩展① 机制:三种形态的底层

- Arrays.asList:返回 java.util.Arrays.ArrayList(内部持有原数组引用)——set 直接写原数组。
- size 固定(数组定长)——add/remove 抛 UnsupportedOperationException。
- List.of:ImmutableCollections.SetN/ListN(内部紧凑数组,元素不可变要求——元素自身的可变性[如 Date]不受控,第 13 题)——null 检查在 of() 入口。
- ArrayList:标准动态数组——三者中唯一全功能的。

### 第二步扩展② 反例:三种误用的事故

- 误用一,Arrays.asList 后 add:定长视图 add 抛异常(运行时才发现"不是普通 List")。
- 误用二,List.of 收 null:外部数据(可能含 null)直接 List.of 构建常量——NPE 在启动期(算运气好)或请求期。
- 误用三,set 穿透:Arrays.asList 的列表传给方法,方法内 set 改了调用方的原数组(跨层副作用)。
- 三条的正解:按行为矩阵选择,数组视图的穿透性显式注释。

### 第二步扩展③ 取舍:不可变层级的选择

- List.of:编译期确定的常量(协议/枚举值清单)——不可变+不可 null 是特性。
- Arrays.asList:与已有数组联动(数组是事实源)——视图语义是特性。
- Collections.unmodifiableList:包装已有可变列表(视图,原列表变它跟着变,第 13 题)——防御性只读。
- 三种"只读"的语义差异(不可变/视图/包装)是面试与实战的区分点。

## 案例

### 第三步发散·验证与推演 验证:行为矩阵的断言组

- 验证:set 穿透断言(Arrays.asList set 后原数组变化)。
- null 断言(List.of(null 元素) 抛 NPE、Arrays.asList 允许)。
- 修改断言(List.of 任何修改抛异常。
- Arrays.asList add 抛异常但 set 不抛)——行为矩阵的断言组进工具类单测(选型歧义的终结)。

### 第三步发散·追问扩展 追问链:列表形态三刀

- **Q1：List.of 的内存优势?**
  - 答：紧凑布局(无容量冗余)+不可变共享(线程安全,第 30 题)——常量场景性能与安全双优。
- **Q2：元素的可变性?**
  - 答：List.of 的元素若是可变对象(Date/自定义 bean)——列表结构不可变但元素内部可变(深浅不可变的区分,第 13 题 unmodifiable 同题)——不可变是浅层语义。
- **Q3：序列化差异?**
  - 答：Arrays.ArrayList 可序列化(数组);List.of 的序列化形态(自定义)——跨版本序列化的兼容注意(第 49 题)。

## 总结点

1. set 穿透原数组,add 抛异常
2. List.of 拒 null,真不可变
3. 三种只读语义各不同
