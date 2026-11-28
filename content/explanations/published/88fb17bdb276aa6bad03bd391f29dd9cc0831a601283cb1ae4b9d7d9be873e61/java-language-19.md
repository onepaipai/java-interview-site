<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Integer.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银计数沙盘:Long sum 循环 +=(每次装箱创建 Long 对象)——本机 J1 实测:装箱 6ns vs 原始 1ns(6 倍);正确性问题:Integer 的 ==(缓存 -128~127,J1 实测 128==false)——装箱的性能与正确性双坑(第 19 题distributed 累计的原始类型优化)。

1. 性能坑:Long/Integer 的包装对象(每次运算拆箱+重新装箱+分配)——循环内的装箱=百万次对象分配(GC 压力,J1 实测装箱 6 倍耗时)——热点循环用原始类型(long/int)+ long[] 替代 List<Long>(第 32 题collections 内存)。
2. 正确性坑:Integer 的 ==(引用比较,缓存 -128~127 内 true——J1 实测 128==false)——包装对象的等值判断必须 equals/compareTo/unboxing(== 只对缓存范围碰巧对——缓存外的错误)。
3. 缓存的意外依赖:Integer.valueOf(-128~127 缓存)——== 在缓存范围内碰巧 true——代码依赖这个"碰巧"(跨 JDK/参数 -XX:AutoBoxCacheMax 可变)——== 对包装类型是红线(banking 3 题 BigDecimal 同款)。

## 参考分析

### 第二步扩展① 机制:装箱的分配与缓存池

- 装箱:Integer.valueOf(i)——缓存池(-128~127 预建,AutoBoxCacheMax 可调)命中复用,池外 new Integer(分配)——J1 实测:127==true(池)、128==false(分配)。
- 性能的量化:装箱 6ns/次(分配+GC 压力)vs 原始 1ns——10 亿次累加的装箱=6 秒+亿级对象 GC——热点循环的红线。
- Long 的陷阱更隐蔽:Long sum 循环 +=(每迭代装箱—— Effective Java 的经典性能条目)。

### 第二步扩展② 反例:装箱的两种事故

- 事故一,热点循环装箱:百万次循环的 Long +=——GC 风暴+6 倍耗时(J1 实测)——接口延迟。
- 事故二,== 判等:订单状态 Integer==某值——状态>127 时 false(业务判断失效——状态机判断错误,第 40 题)。
- 两条的正解:热点循环原始类型。
- 包装对象判等 equals 或先拆箱(显式 intValue)。
- 状态枚举替代 Integer 状态(类型安全,第 8 题)。

### 第二步扩展③ 取舍:原始类型与包装类型的边界

- 原始类型:局部变量/数组/热点循环(性能)。
- 包装类型:集合元素(泛型需要)/可空表达(第 14 题)/对象字段(可空)。
- 三态语义:包装类型表达"三态"(null=未设置/值)——原始类型两态(默认值[0]与真值混淆——0 是合法金额)——三态需求包装类型的正当性(可空语义,第 14 题)。
- 边界转换:包装↔原始的转换点集中(边界函数)——散落的拆箱 NPE 风险(null 拆箱 NPE)。

## 案例

### 第三步发散·验证与推演 验证:装箱坑的断言组

- 验证:性能断言(J1 实测:装箱 6 倍耗时——热点循环对照)。
- 缓存断言(127/128 的 == 对照——J1 实测)。
- NPE 断言(null Integer 拆箱 NPE——null 拆箱的陷阱复现)——三组固化装箱纪律。
- 装箱热点的扫描器(循环内包装类型运算的检测)进 CI(抽查)。

### 第三步发散·追问扩展 追问链:装箱三刀

- **Q1：AutoBoxCacheMax?**
  - 答：XX:AutoBoxCacheMax=10000(缓存上限可调)——调缓存绕装箱(治标:分配变复用)——范围依赖 JVM 参数(不可移植)——默认纪律:热点用原始类型,不调缓存。
- **Q2：Long 的 == 常见源?**
  - 答：Long a = 1000L; Long b = 1000L; a==b false——"两个 Long 比较"是 == 事故的高发区(Long 的字面量自动装箱)——equals 习惯的强制。
- **Q3：泛型与装箱?**
  - 答：泛型只能包装类型(List<Long> 不能 List<long>)——流式数值(mapToLong,第 40 题)——泛型的装箱不可避免(容器边界),热点循环内拆箱后运算。

## 总结点

1. 热点循环零装箱
2. 包装对象 == 是红线
3. 三态语义是包装的正当性
