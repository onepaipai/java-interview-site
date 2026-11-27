<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/record/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银金额沙盘:Money 对象(final 类+final 字段)但字段是可变 List(内部状态可改)——不可变的完整性=类 final+字段 final+无 setter+可变成员防御性处理+不可变元素(record 与 List.copyOf 的组合,第 13 题 collections)。

1. 不可变五条:类 final(防子类破坏)、字段 final(构造后赋值一次)、无 setter、可变成员防御(构造入拷贝/getter 出拷贝或不可变视图)、元素不可变(深不可变,第 13 题 unmodifiable 的深浅)。
2. record 的便利与边界:record 自动 final+字段 final+生成访问器——但 record 的 List 字段仍是可变引用(浅不可变)——record+List.copyOf(构造时拷贝)才完整(record 的防御性构造是开发者责任)。
3. 不可变的收益:线程安全免费(第 20 题 distributed 替换思想)、hashCode 缓存(String,第 1 题)、防御性设计零成本(第 43 题)——不可变是"一次投入多处免维护"的设计(第 46 题 banking 替换优于修改)。

## 参考分析

### 第二步扩展① 机制:防御性处理的进与出

- 入向:构造器接收可变集合→List.copyOf(in)(拷贝断开源引用,第 43 题collections)——拷贝后源变化不影响对象。
- 出向:访问器返回 Collections.unmodifiableList(items)(视图)或直接返回 List.copyOf 构造的不可变列表(零拷贝防御)——元素的深浅:元素 record(不可变)→浅拷贝即完整。
- 元素可变→深拷贝或不可变包装(成本)。

### 第二步扩展② 反例:伪不可变的三种形态

- 形态一,字段可变引用:final List 字段但 List 内容可变(外部经 getter add)——"final"只锁引用。
- 形态二,record 的可变字段:record Order(List<Item> items)——items 引用可变(浅不可变)。
- 形态三,可变元素:Money 列表的元素是可变 bean(字段可改,引用不变)——深不可变缺失。
- 三形态的正解:copyOf 包装+元素 record 化+类 final——不可变要"递归到底"(第 20 题 distributed 递归不可变)。

### 第二步扩展③ 取舍:不可变与可变的性能权衡

- 不可变的成本:修改=新对象(分配+GC,第 19 题J1 装箱的分配同族)——高频修改大对象(渲染帧)不可变代价高。
- 可变的收益与风险:修改原对象(省分配)+并发风险(同步负担)。
- 判据:修改频率×对象大小×并发暴露——值对象(金额/配置/DTO)不可变优先。
- 可变独占(单线程局部缓冲)可变合理。
- 混合:可变缓冲类(内部)+不可变快照(对外暴露)——内部可变,边界不可变。

## 案例

### 第三步发散·验证与推演 验证:不可变完整性的断言组

- 验证:五条断言(类 final/字段 final/无 setter/入拷贝/getter 视图或拷贝——逐条断言或 ArchUnit)。
- 深浅断言(可变元素的字段修改穿透[对照]、record 元素不穿透)。
- 并发断言(不可变对象跨线程共享零同步)——三组固化不可变的完整性。
- ArchUnit 规则(值对象包内类必须 final+无 setter)进 CI。

### 第三步发散·追问扩展 追问链:不可变三刀

- **Q1：with 方法的链式?**
  - 答：record 的 withX(生成新实例)——不可变的"修改"语义(替换,第 20 题)——链式 with 的可读性(冗长但显式)。
- **Q2：不可变与框架?**
  - 答：JPA/Hibernate 需要可变实体(懒加载/脏检查)——实体不可变与 ORM 冲突——分层:实体可变(持久层)+值对象不可变(领域层)——不可变的适用面按层分。
- **Q3：builder 模式?**
  - 答：不可变对象的构建(多字段构造)→builder(构建期可变,build 后不可变)——builder 的线程安全(构建器不共享)——builder 是不可变的构造伴侣。

## 总结点

1. 五条缺一不可,不可变要递归到底
2. record 加 copyOf 才完整
3. 修改即替换,替换即原子
