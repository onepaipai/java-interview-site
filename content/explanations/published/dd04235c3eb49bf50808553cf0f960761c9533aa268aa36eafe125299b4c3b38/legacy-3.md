<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/String.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银日志沙盘:循环拼接 10 万次日志——String 每次创建新对象(10 万次分配+GC);StringBuilder 原地修改(一个对象);StringBuffer 线程安全(每方法 synchronized)——三者的选型取决于并发需求与修改频率。

1. String 不可变:内部 char[]/byte[](JDK 9 Compact Strings,第 36 题 JVM)声明为 final,无修改方法——不可变的原因:安全性(密码/路径/类名不可被篡改)+哈希缓存(String 的 hashCode 缓存,首次计算后不重算)+线程安全(不可变天然线程安全)+字符串常量池(共享引用)。
2. StringBuilder:可变字符序列,内部 char[]/byte[] 动态扩容(默认 16,不足×2+2)——append/insert/replace 原地修改(不创建新对象);非线程安全(单线程拼接首选,性能最好)。
3. StringBuffer:StringBuilder 的线程安全版(所有方法 synchronized)——并发安全但性能低于 StringBuilder(锁开销,并发基础 21 题偏向锁默认禁用后的真实成本);实际场景中多线程拼接罕见(通常单线程内拼接后一次转 String),StringBuffer 使用率极低。

## 参考分析

### 第二步扩展① 机制:String 不可变的四层原因

- 一,安全性:String 常用于文件路径/类名/网络地址——如果可变,恶意代码可修改路径指向其他文件。
- 二,常量池:String Pool 依赖不可变(多个引用共享同一实例——修改会影响所有引用)。
- 三,hashCode 缓存:不可变才能缓存 hashCode(HashMap 的 key 优化)。
- 四,线程安全:不可变对象天然线程安全(无需同步)。

### 第二步扩展② 反例:拼接选型的两种事故

- 事故一:循环用 String +=——每次 += 创建新对象(旧对象变垃圾)+复制内容(O(n) 每次拼接→O(n²) 总)——10 万次拼接耗时秒级。
- 修复=StringBuilder.append(O(1) 均摊)。
- 事故二:多线程用 StringBuilder——并发 append 内部数组越界(非线程安全)。
- 修复=StringBuffer 或外部同步——但实际场景多为单线程拼接(日志/SQL),StringBuilder 足够。

### 第二步扩展③ 取舍:StringBuilder 的容量优化

- 默认容量 16 字符,不足时扩容(×2+2,Arrays.copyOf)——频繁扩容=反复复制。
- 预分配:new StringBuilder(expectedSize) 避免扩容(已知大小时)。
- toString 会创建新 String(拷贝一份——不可变保证)——toString 后的 String 与 StringBuilder 独立。

## 案例

### 第三步发散·验证与推演 验证:String 三类的走查核对

- 验证:J1 实验——拼接性能(String += vs StringBuilder:10 万次,差距数量级)。
- 不可变断言(String.substring 返回新对象,原串不变)。
- hashCode 缓存断言(同字符串两次 hashCode 调用耗时:第二次≈0ns——缓存命中)。
- 验证:性能断言可程序化(JMH 或 System.nanoTime)。
- 本机 J1 实验已覆盖(拼接/String hashCode 缓存/常量池)。

### 第三步发散·追问扩展 追问链:String 三刀

- **Q1：String Pool 在哪?**
  - 答：JDK 7 起在堆中(此前在永久代);intern() 将堆中字符串登记进 Pool(已存在则返回池内引用);-XX:StringTableSize 可调桶数(默认 65536)。
- **Q2：字符串拼接的编译器优化?**
  - 答：编译期常量拼接("a"+"b")在编译时折叠为"ab"(零运行时开销);运行时变量拼接编译为 StringBuilder.append(Java 9 后用 invokedynamic/StringConcatFactory)。
- **Q3：String 的内存优化?**
  - 答：JDK 9 Compact Strings(byte[]+coder,Latin1 省一半内存)+G1 字符串去重(UseStringDeduplication,GC 期间合并内容相同的底层数组)——三个优化维度(第 36 题 JVM)。

## 总结点

1. String 不可变:安全+池+哈希缓存+线程安全
2. 循环拼接用 StringBuilder
3. StringBuffer 线程安全但极少用
