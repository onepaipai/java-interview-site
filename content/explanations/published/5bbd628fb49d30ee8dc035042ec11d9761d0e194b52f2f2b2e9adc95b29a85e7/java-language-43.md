<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Comparator.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银沙盘:TreeSet 的判等=compare(collections 8 题)——比较器的不一致(对称/传递违约)导致 TimSort 异常(第 34 题)或元素"消失"——有序集合的正确性=比较器契约(comparing 链+唯一键兜底,第 44 题)。

1. 有序集合(TreeSet/TreeMap/PriorityQueue)的判等与排序=compare——compare==0=同一元素(替换/拒绝);compare 的契约(对称/传递/自反)违约=集合行为不可预测(元素消失/排序异常)。
2. 比较器的设计:comparing(字段).thenComparing(次字段).thenComparing(唯一键)——比较链落到唯一键(总序,第 44 题)——链式构建 Comparator.comparing 的组合器模式(第 9 题)。
3. 一致性的校验:随机对象对的属性测试(对称+传递断言,第 34 题断言组)——比较器的契约测试进有序集合的组件单测。

## 参考分析

### 机制:compare 的契约与有序集合

契约:sgn(compare(x,y))=-sgn(compare(y,x))(对称)+传递性+(compare(x,y)>0 && compare(y,z)>0 → compare(x,z)>0)——违约的后果:TreeSet 的元素丢失/TreeMap 的键覆盖/PriorityQueue 的堆序破坏(第 26 题collections)/TimSort 异常(第 34 题)。compareTo 与 equals 的一致性(第 8 题):一致(推荐)或不一致(显式声明语义——"按业务键排序"的刻意设计)。

### 反例:比较器违约的三种事故

事故一,传递违约:比较器"A 在 B 前如果 A 大,否则按时间"——交叉条件的传递断裂——TimSort 异常(偶发,数据依赖)或 TreeSet 行为异常。事故二,字段遗漏:比较器只比金额(同金额不同单号)——TreeMap 的键覆盖(后者吞前者,第 8 题collections)——比较链落到唯一键。事故三,比较器与 equals 不一致:compareTo 用金额+equals 用全字段——TreeSet 的 size 与 HashSet 的 size 不同(判等分野,collections 8 题)——不一致要显式声明(有意设计)。

### 取舍:Comparable 与 Comparator 的分工

Comparable(自然序):类自身实现(默认排序——金额类的自然序=金额)——单一序。Comparator(外部序):多排序维度(按金额/按时间/按名称——每个维度一个 Comparator 常量)——多序。组合:自然序(Comparable)+外部序(Comparator)并存——Collections.sort(list, BY_TIME)(外部序)与 Collections.sort(list)(自然序)并存——两种排序的语义显式。

## 案例

### 验证:比较器契约的断言组

验证:一致性断言(随机对象对的对称+传递+自反断言——属性测试);总序断言(比较链的唯一键兜底——无并列);有序集合断言(TreeSet 的判等行为与比较器一致——无意外吞元素)——三组固化比较器契约;比较器的常量注册(第 9 题策略注册)进指南。

### 追问链:比较器三刀

一刀:"Comparator 的 null 处理?"——nullsFirst/nullsLast(显式 null 位置)——默认 null 抛 NPE——null 的排序语义显式(第 18 题)。二刀:"reverse 的组合?"——reversed()(反转)+thenComparing(链)——reverseOrder(自然序反转)——比较器的组合代数(链式+反转)的表达力。三刀:"比较器的异常?"——compare 内抛异常(字段 null 的 NPE)——比较器的健壮性(防御 null/类型)——比较器的异常=排序整体失败(异常传播到调用方)。

## 总结点

1. 有序集合的判等=compare
2. 比较链落到唯一键
3. 契约测试:对称传递自反
