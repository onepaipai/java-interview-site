<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银缓存沙盘:缓存键用可变的配置对象——放入后修改键字段,再 get 拿不到(哈希变了桶也变)——collections C1 实测:可变 key 修改后 get=null、containsKey=false。不可变键的设计纪律。

1. 可变键的失效:put 时 hashCode=X→桶 A;修改键字段→hashCode=Y→get 按 Y 找桶 B——桶 A 的条目"丢失"(实测 get=null、containsKey=false)。
2. 不可变键的设计:键类 final+字段 final+equals/hashCode 仅用不可变字段(record 天然满足)——键的状态永不变化,容器行为确定。
3. 与 collections 8 题的衔接:equals/hashCode 契约违约的容器行为(消失/重复)在可变键上的放大——可变性使违约不可控(不可控时机=任意时刻)。

## 参考分析

### 第二步扩展① 机制:哈希桶与可变键的失效链

- 失效链:put(hash=X,桶 A)→键字段修改→hash=Y→get 按 Y 找桶 B→桶 A 的条目不在 B(丢失)。
- containsKey 同理 false——键"消失"但不释放内存(条目还在桶 A,不可达)。
- 第 2 题 distributed 的 HashMap 并发丢数据是并发版的丢失。
- 可变键是单线程版的丢失——两者都破坏"键能找到"的预期。

### 第二步扩展② 反例:可变键的三种事故

- 事故一,缓存丢失:可变配置对象做键,配置更新后缓存全部 miss——缓存失效风暴(回源打满,第 15 题)。
- 事故二,Set 重复:可变键修改后重新 add——原条目不删、新条目加入(Set 出现"重复")。
- 事故三,弱一致键:WeakHashMap 的可变键——GC 判断与 hash 判断的不一致(清理时机不可控)。
- 三条的正解:键类 record 化+不可变字段+不可变集合封装(List.copyOf,第 8 题)。

### 第二步扩展③ 取舍:可变键的防御性方案

- 防御:键的快照化(put 前拷贝键的不可变快照——record 键)——快照的 hash 永不变。
- 或键的类型约束(接口声明不可变契约——调用方承诺)。
- 防御的层次:类型系统(record 编译期保证)>文档(注释"键不可变")>运行时检查(修改时抛异常)——前移到编译期最优(第 25 题)。

## 案例

### 第三步发散·验证与推演 验证:可变键的断言组

- 验证:丢失断言(可变键修改后 get=null、containsKey=false——collections C1 实测)。
- record 断言(record 键修改=新对象,原键不受影响)。
- 快照防御断言(put 前拷贝键快照,后续修改不影响缓存)——三组固化不可变键的必要性。

### 第三步发散·追问扩展 追问链:可变键三刀

- **Q1：String 键安全吗?**
  - 答：String 不可变(final char[]→byte[]+无修改方法)——String 键是安全的(缓存 key 最常用)——不可变的天然键类。
- **Q2：record 键的 equals?**
  - 答：record 的 equals/hashCode 自动(全组件)——组件不可变→键安全;组件可变→键不安全(record 的浅不可变边界,第 9 题)。
- **Q3：键的可变字段?**
  - 答：键类的不可变字段+可变字段共存——equals/hashCode 只用不可变字段(显式控制)——但键的"业务相等"可能与可变字段有关——设计矛盾要显式决策。

## 总结点

1. 键改哈希变,条目就丢失
2. record 键天然不可变
3. String 是安全的键
