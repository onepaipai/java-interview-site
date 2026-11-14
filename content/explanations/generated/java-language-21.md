<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/StringBuilder.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银日志沙盘:循环内 1000 次 s += piece(每次创建新 String——O(n²) 总)vs StringBuilder.append(O(n) 总)——编译器的优化边界:单表达式拼接(编译成 StringBuilder)会被优化,循环内的 += 不会(每次循环新 SB)。

1. 编译器优化边界:单表达式 "a"+b+"c" 编译期转 StringBuilder(等价)——自动优化;循环内 s += piece——每次循环创建新 StringBuilder+新 String(O(n²) 总成本)——优化不了(循环跨迭代)。
2. 本机实测形态(理论+推演标注):千次拼接的 += vs StringBuilder——差距随字符串长度平方增长(每次 += 拷贝全部已有内容)——第 10 题distributed ArrayList 扩容的字符串版。
3. 选择纪律:单表达式拼接(编译器处理);循环内→StringBuilder(显式);常量拼接编译期折叠(J1)。JDK 9+ 的 invokedynamic 使单表达式拼接比手写 SB 更快。

## 参考分析

### 机制:编译期折叠与 invokedynamic

编译期折叠:全字面量拼接("he"+"llo")编译期合并为 "hello"(常量池,J1 实验 s1==s2 true)——零运行时成本。invokedynamic(JDK 9+):单表达式拼接(a+b+c 含变量)编译为 invokedynamic+StringConcatFactory——运行期选择最优策略(MethodHandles+字节数组直构——比传统 StringBuilder 链更快)。循环 +=:编译器不跨迭代优化(每次循环独立拼接)——O(n²) 的本质。

### 反例:+= 循环的三种代价

代价一,O(n²):1000 次 +=(每次拷贝已有内容)——总拷贝量≈n²/2(千次×百字符=5 万字符拷贝——可感)。代价二,GC:每次 += 产生中间 String+StringBuilder——千次循环的千个临时对象(GC 压力)。代价三,尾延迟:大字符串(日志聚合)的 += 在尾部翻倍增长(第 10 题 distributed 扩容抖动同构)。三条的正解:循环内 StringBuilder.append(一个 SB,循环外声明)。

### 取舍:SB 的容量与线程纪律

SB 容量:预估长度构造(new StringBuilder(256)——免扩容,第 10 题预分配同源)。SB 非线程安全:多线程共享 SB=未定义行为(单线程局部使用——SB 是局部变量,不共享)。日志的拼接:日志参数化(log.debug("x={}", x)——延迟格式化,零拼接成本,第 34 题 distributed)+条件拼接的守卫(isDebugEnabled 或参数化——第 34 题distributed 的日志纪律)。

## 案例

### 验证:拼接姿势的断言组

验证:折叠断言(J1 实测:字面量折叠 == true);性能对照断言(千次 += vs StringBuilder 的耗时对照——O(n²) vs O(n) 的实测);invokedynamic 断言(单表达式拼接 vs 手写 SB 的耗时——JDK 9+ 优化的实证,标注环境相关)——三组固化拼接姿势;循环内 += 的扫描器(代码评审检查点)。

### 追问链:拼接三刀

一刀:"StringJoiner?"——多元素拼接的专用(String.join/StringJoiner——分隔符语义清晰,第 41 题顺序)——join 的语义优于循环 append(可读)。二刀:"文本块?"——文本块(JSON/SQL 多行,Java 15+)——多行常量的可读性+/incident 缩进规范化——文本块与格式化(格式化占位与文本块的组合)。三刀:"格式化?"——String.format(慢但表达力强)/MessageFormat/占位符日志——format 的性能红线(热路径禁 format,参数化日志替代)——格式化的层级选择。

## 总结点

1. 单表达式让编译器优化,循环内显式 SB
2. invokedynamic 让单表达式更快
3. 日志参数化,热路径禁 format
