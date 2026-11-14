<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银金额沙盘:Integer a=127,b=127;a==b 为 true;Integer c=128,d=128;c==d 为 false——Integer 缓存导致 == 行为不一致,金额场景必须用 equals 或拆箱比较。

1. 基本类型(int/long/double)直接存值,包装类(Integer/Long/Double)是对象(堆分配,可为 null)——自动装箱调用 valueOf,自动拆箱调用 intValue,装箱/拆箱有性能成本(对象分配+GC)。
2. Integer 缓存:-128~127 的 Integer 由 IntegerCache 预创建,valueOf 在此范围内返回缓存实例(==为 true);超出范围创建新对象(==为 false)——JLS 5.1.7 保证,但仅限 Integer/Short/Byte/Character/Long/Boolean,Double/Float 无缓存。
3. 金额场景的坑:Integer 做 == 比较(依赖缓存范围)+ 包装类做算术(自动拆箱 null 则 NPE)——正确做法:金额用 BigDecimal(第 2 题 java-language)或 long 分,比较用 equals/compareTo,不依赖 ==。

## 参考分析

### 机制:缓存是"预热的对象池"

IntegerCache 在类加载时预创建 -128~127 的 Integer 实例——valueOf 在此范围内返回已有实例(不 new),超出范围才 new 新对象。类比食堂餐盘:常用尺寸的餐盘提前洗好放架(缓存),不常用的现洗(new)——常用尺寸的盘子"同一个",不常用的"每次新的"。

### 边界:缓存的适用范围与陷阱

缓存仅覆盖 -128~127(可通过 -XX:AutoBoxCacheMax 扩展上限)——Long 缓存同样 -128~127;Double/Float 无缓存(浮点无限多值,无法预热)。陷阱:HashMap<Integer,V> 的 key 用 == 比较(应为 equals)——Integer 作为 key 时哈希查找用 equals(正确),但直接用 == 判断 key 会因缓存范围不一致而 bug。

### 取舍:包装类的适用场景

包装类适用于:集合泛型(List<Integer>——泛型不支持基本类型)、可 null 语义(区分"没值"和"值为 0")、反射/泛型(需要对象);基本类型适用于:高性能计算(避免装箱拆箱开销)、金额/计数(避免精度和 null 问题)——JMH 实测装箱开销约 6ns vs 原始 1ns(java-language J1 实验)。

## 案例

### 验证:缓存边界的实测断言

验证:本机 J1 实验——Integer 127==true/128==false(缓存边界);Long 同理;Double 无缓存(两个 new Double(1.0) !=);装箱性能(6ns vs 原始 1ns)。验证:缓存边界断言(-128/127/128)与性能断言可程序化;equals 断言(所有值 equals 比较→true)——金额场景的正确写法固化。

### 追问链:包装类三刀

一刀:"自动拆箱的 NPE?"——Integer x=null;int y=x→NPE(拆箱调用 intValue);修复=判 null 或用 Optional。二刀:"三目运算符的自动拆箱?"——condition?a:b 中 a/b 类型不同时触发拆箱(可能 NPE);修复=统一类型或显式拆箱。三刀:"包装类的不可变性?"——Integer 不可变(值一旦设定不可改)——线程安全(第 8 题)但频繁修改=频繁创建新对象;大量计算用 int/long 避免对象爆炸。

## 总结点

1. 缓存 128 分界,== 不可靠
2. 金额用 BigDecimal 或 long
3. 拆箱判 null,防 NPE
