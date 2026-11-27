<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Optional.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银接口沙盘:Optional<User> 做字段/参数/集合元素——Optional 的设计意图=返回值表达"可能无结果"(方法签名语义化);字段/参数用 Optional=设计意图滥用(序列化问题/嵌套 Optional/接口噪音)。

1. 设计意图(官方口径):Optional 是"可能无返回值"的方法返回类型——强制调用方面对"可能无";字段/参数的"可能无"用重载/哨兵/null(按既有模式)——设计者意图如此(Stuart Marks 的使用建议)。
2. 字段 Optional 的三个问题:不可序列化(Optional 不实现 Serializable)、嵌套(Optional<Optional<T>> 的丑陋)、两状态变三状态(null/empty/present——更复杂)。
3. 正确用法:返回值(Optional<User> findUser(id)——找不到=empty)、链式(map/orElse 组合)、集合元素不用(集合空即表达"无"——empty collection 优于 null 优于 Optional 元素)。

## 参考分析

### 第二步扩展① 机制:返回值的强制语义

- 强制语义:Optional 返回值=调用方编译期必须处理(empty——isPresent/orElse/orElseThrow)——null 返回值可以被无视(NPE 延后),Optional 不行——把"可能无"从运行时前移到编译期(类型即文档)。
- 链式:findUser(id).map(User::getEmail).orElse("未绑定")——null 检查的嵌套被链式替代(可读性)。
- orElseThrow(异常语义:必须存在,否则抛业务异常)——三种出口(orElse 默认值/orElseGet 供应商/orElseThrow 异常)。

### 第二步扩展② 反例:Optional 滥用的三种事故

- 事故一,Optional 字段:实体字段 Optional<User>——不可序列化(JPA/序列化框架)且两状态变三状态(null/empty/present)。
- 事故二,Optional 参数:方法参数 Optional<String>——调用方被迫包装(ofNullable 包一下再传)——接口噪音。
- 参数的"可选"用重载表达(两个方法签名)。
- 事故三,Optional 元素:List<Optional<T>>——集合元素的可空性用集合设计解决(filter 掉 null 后装——不要 Optional 元素)。
- 三条的正解:Optional 只做返回值。

### 第二步扩展③ 取舍:Optional 的性能与语义

- 性能:Optional 对象分配(每次 ofNullable 一次分配)——热路径的分配成本(第 19 题 J1 装箱同族)。
- 空 Optional 可复用(Optional.empty() 是单例)。
- 语义边界:内部代码(自己可控)可用可不用(null 纪律好则少用)。
- 对外 API(第三方调用)Optional 值得(强制语义)——Optional 的价值随调用方的不可控程度上升。

## 案例

### 第三步发散·验证与推演 验证:使用边界的断言组

- 验证:链式断言(map/orElse 组合替代嵌套 null 检查——可读性对照)。
- 三出口断言(orElse 立即求值[默认值有副作用时慎用]vs orElseGet 惰性——两者差异实证)。
- 误用扫描断言(字段/参数的 Optional 扫描为零——静态检查进 CI)——三组固化使用边界。

### 第三步发散·追问扩展 追问链:Optional 三刀

- **Q1：Optional 的 null?**
  - 答：Optional.ofNullable(null)=empty;Optional.of(null)=NPE——ofNullable vs of 的选择(已知非空用 of——语义更强)。
- **Q2：optional ifPresent 的陷阱?**
  - 答：ifPresent 的 lambda 内做副作用(写库)——副作用藏在 Optional 链里(可读性降)——副作用显式化(ifPresentOrElse[Java 9]或拆语句)。
- **Q3：orElse 与 orElseGet 的差异?**
  - 答：orElse 的参数总是求值(立即);orElseGet 惰性(默认值昂贵时用 orElseGet)——两者差异的经典面试点与真实事故源(默认值构造有副作用时 orElse 的意外执行)。

## 总结点

1. Optional 只做返回值
2. 字段参数用重载,集合用空表达
3. orElse 立即 orElseGet 惰性
