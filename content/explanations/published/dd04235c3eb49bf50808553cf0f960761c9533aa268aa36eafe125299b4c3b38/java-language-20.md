<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/String.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银订单沙盘:订单号做 intern("省内存")——字符串常量池(PermGen[JDK7 前]/堆[JDK7+])被百万业务字符串填满:JDK7 前 PermGen OOM;JDK7+ 堆膨胀+池无淘汰——intern 的收益(共享)在高基数数据上变成风险。

1. intern 的机制:字符串入常量池(全局共享,唯一实例)——返回池中引用——收益=相同字符串共享一份(重复率高时省内存)+== 比较(池内引用相等)。
2. 高基数风险:业务数据(订单号)基数百万级且不重复——intern 把百万字符串塞池:JDK7 前 PermGen 固定大小 OOM(经典);JDK7+ 池在堆(可 GC)但池本身无淘汰策略+哈希表开销——堆膨胀+GC 扫描面扩大。
3. JDK7 的转折:intern 从 PermGen 移到堆(普通对象,可 GC)——"intern 会 OOM"的经典结论在 JDK7+ 需重新表述(堆膨胀+表开销替代 PermGen OOM)——版本边界(第 49 题JVM 回归)。

## 参考分析

### 第二步扩展① 机制:常量池的位置与共享语义

- 位置:字面量编译期入池(class 常量池)。
- 运行期 intern 动态入池——JDK7 起池在堆(GC 可回收无引用的池串)。
- 共享:intern 后的引用=池内唯一实例(相同内容共享一份)——收益=重复率×字节数。
- 成本=池表(hash 表)的内存+查询成本+GC 扫描。
- 高基数的账:百万唯一订单号 intern——池增百万条+哈希表——共享收益≈0(不重复),纯增成本。

### 第二步扩展② 反例:intern 的两种事故

- 事故一,PermGen OOM(JDK6):百万订单号 intern——PermGen 满OOM(经典案例,JDK7 前)。
- 事故二,堆膨胀(JDK7+):intern 的百万字符串+池表——堆内存膨胀+GC 标记面扩大——"省内存"变"费内存"(高基数下)。
- 两条的正解:intern 只用于"确定重复率高+生命周期长"的字符串(协议常量/枚举名)。
- 业务数据(订单号/手机号)禁 intern——用结构压缩(第 32 题)或直接存储。

### 第二步扩展③ 取舍:intern 的合法场景

- 场景:编译期字面量(自动入池,无需手动)、高度重复的运行期字符串(协议头/状态名——重复率>90%)。
- == 比较的诱惑:intern 后 == 比较(引用相等)——性能微优但语义危险(忘 intern 的比较错)——equals 纪律优先(第 19 题 == 红线同源)。
- G1 的字符串去重(-XX:+UseStringDeduplication,第 32 题)——自动去重替代手动 intern(JDK 8u20+ G1 特性)。

## 案例

### 第三步发散·验证与推演 验证:intern 行为的断言组

- 验证:共享断言(intern 后 == true——引用共享实证)。
- 高基数断言(百万唯一串 intern 的内存增长——堆/池的膨胀实测[JDK17 堆内])。
- 版本对照(JDK7 前后行为的文档级区分——推演标注,第 49 题)——三组固化 intern 的适用边界。
- 字符串去重(G1)的开关对照实验补充。

### 第三步发散·追问扩展 追问链:intern 三刀

- **Q1：intern 的线程安全?**
  - 答：池操作线程安全(全局锁/JVM 内部同步)——高并发 intern 的锁竞争(热点字符串的 intern 竞争)——性能的隐藏维度。
- **Q2：与字面量的关系?**
  - 答：字面量自动入池(intern 等价)——"he"+v 运行时结果 intern 后==字面量(J1 实测 true)——intern 统一引用的语义。
- **Q3：字符串去重的演进?**
  - 答：G1 去重(自动,JDK8u20+)/ZGC 无去重(JDK17)——去重特性随 GC 演进(第 49 题回归项)——手动 intern 的必要性随 GC 演进下降。

## 总结点

1. 高基数 intern 是反向优化
2. JDK7 前 PermGen OOM,7 后堆膨胀
3. intern 只给高重复低基数的串
