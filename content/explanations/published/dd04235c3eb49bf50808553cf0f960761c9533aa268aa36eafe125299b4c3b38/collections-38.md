<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/IdentityHashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银重构沙盘:HashMap 换 IdentityHashMap 想提速(跳过 equals/hashCode)——语义变了:按引用相等(==)判键——同值的两个对象不再同一键,equals 重写的类行为全变——IdentityHashMap 是"按对象身份"的特化 Map,不是提速的 HashMap。

1. 语义差异:IdentityHashMap 用 ==(引用相等)判键(跳过 equals/hashCode)——两个内容相同的对象=两个键;HashMap 用 equals(内容相等)=一个键——同一段代码换 Map 类,行为全变(语义变更)。
2. 合法场景:对象身份有业务含义(对象图遍历的已访问标记[防循环:同一对象只处理一次,内容相等的不同对象要各处理]、序列化的引用保持、瞬态标记)——"每一个对象实例"是键的本意。
3. 性能的真相:跳过 hashCode/equals 的收益微(哈希仍要 System.identityHashCode)——它的动机是语义(身份),不是性能——为性能换它是错误的动机。

## 参考分析

### 第二步扩展① 机制:身份语义与适用面

- 身份键:System.identityHashCode 定位+== 判等——"这个对象"而不是"这个值"的对象图场景:遍历对象图(每个实例访问一次——同值不同实例是不同节点)、序列化引用保持(同一对象序列化一次+引用)。
- 业务 Map 的判等=业务键(值语义:同单号同键)——IdentityHashMap 的身份语义与业务键(值)直接冲突(第 3 题banking 幂等键的值语义同源)。

### 第二步扩展② 反例:身份语义的两种误用

- 误用一,提速换 Map:缓存(按业务键)换 IdentityHashMap——同值不同实例=缓存永远 miss(缓存失效)+内存涨(同值多份)——语义错误+性能双输。
- 误用二,equals 重写类的行为混乱:重写了 equals 的类(String/List)在 IdentityHashMap 中"每个实例都是键"——与业务直觉(同值同键)冲突——团队里出现 IdentityHashMap=语义警报(必须有身份注释)。

### 第二步扩展③ 取舍:身份场景的工程形态

- 场景实现:对象图遍历用 IdentityHashMap(visited 集合——每个实例一次)+序列化引用保持(JDK 序列化内部形态)+对象池的身份判断。
- 工程纪律:IdentityHashMap 的使用必须注释"为什么需要身份语义"+评审确认(第 24 题)——它出现的默认反应是质疑,不是接受。
- 替代:WeakIdentityHashMap(第三方[Guava 无内置,需手写或 Caffeine weakKeys=Caffeine 的 weakKeys 即身份键!])——Caffeine 的 weakKeys 语义=身份键(缓存场景要慎用同款陷阱)。

## 案例

### 第三步发散·验证与推演 验证:语义差异的断言组

- 验证:身份断言(同值不同实例:HashMap 一个键、IdentityHashMap 两个键——语义差异实证)。
- 重写类断言(String 键在两种 Map 的行为差)。
- 性能断言(两 Map 的吞吐对照——性能差异微小的实证,反驳提速动机)——三组固化语义边界。

### 第三步发散·追问扩展 追问链:身份 Map 三刀

- **Q1：hashCode 的影响?**
  - 答：identityHashCode 不可重写(对象默认)——身份键的哈希=对象头派生(稳定)——与 equals 重写无关(跳过)——设计自洽。
- **Q2：与 WeakIdentity 的组合?**
  - 答：身份+弱引用(对象图元数据不阻止回收)——组合语义的窄用途。
- **Q3：业务里真有身份需求吗?**
  - 答：极少(对象图/序列化/池)——99% 的"想用"其实是值语义想提速(错误动机)——评审的默认质疑成立。

## 总结点

1. 身份键是语义选择,不是性能优化
2. 同值不同实例=不同键
3. 出现即质疑,注释必须说明身份
