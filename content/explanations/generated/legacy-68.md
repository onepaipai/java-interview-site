<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银并发沙盘:JMM(Java Memory Model)定义可见性规则——happens-before 是"证据链"(同步动作配对→可见性保证);volatile 靠内存屏障禁止重排(并发基础 2 题的完整版)。

1. JMM 的核心:主内存(共享)与工作内存(线程私有副本)——线程操作工作内存,写回主内存的时机不确定(可见性问题的根源);happens-before 规则定义了"哪些操作保证可见"(程序顺序/监视器锁/volatile 写读/线程 start-join/传递性)。
2. 指令重排:编译器和 CPU 为优化而重排指令顺序(单线程语义不变,多线程可见性受影响)——as-if-serial(单线程看起来按序)在多线程下不成立——重排的解决=内存屏障(volatile/synchronized/final)。
3. volatile 的内存语义:写=StoreStore+StoreLoad 屏障(写前不能重排写,写后不能重排读);读=LoadLoad+LoadStore 屏障——volatile 保证可见性(写立即可见)+禁止重排,但不保证原子性(i++ 仍不安全,并发基础 1 题)。

## 参考分析

### 机制:happens-before 是"契约"不是"时间戳"

happens-before=A 操作的结果对 B 可见(通过同步动作配对建立)——不是"A 在时间上先于 B"(墙钟时间),是"B 能看到 A 的写入效果"(可见性承诺);并发基础 2 题的"证据链"类比:签收记录证明你拿到哪版,不证明寄件先后。

### 反例:JMM 的两种事故

事故一:测试一万次都正常就断言安全——重排是概率事件(窗口小/编译层次变化都会影响,并发基础 50 题);修复=规范推理(JMM 有同步动作)+jcstress 压力测试。事故二:volatile 代替锁——volatile 不保证复合操作原子性(i++ 仍不安全);修复=volatile 只用于"单写多读的标志位",复合操作用锁或 CAS。

### 取舍:volatile vs synchronized vs Atomic

volatile:可见性+禁止重排(轻量,不互斥,适合标志位);synchronized:互斥+可见性(重量,适合复合操作);Atomic:原子性+可见性(CAS,适合计数/引用替换)——选择=需要什么保证(可见性/互斥/原子性),不是"哪个更强"。

## 案例

### 验证:JMM 的走查核对

验证:本机实验——volatile 可见性(停止标志:普通 boolean 循环不退出 vs volatile 退出,并发基础 1 题);重排推演(x=1;y=1→r1=y,r2=x 可能 r1=1,r2=0——无同步时);指令重排的 jcstress 验证(并发进边 50 题"运行一万次都正常"的陷阱)。验证:JMM 行为的断言=规范推理+压力测试(单测无法覆盖交错空间)。

### 追问链:JMM 三刀

一刀:"happens-before 的完整规则清单?"——程序顺序/监视器锁解锁先于加锁/volatile 写先于读/start 先于 run/所有动作先于 join/传递性(并发基础 2 题)+final 的安全发布(JLS 17.5)——完整清单进评测(第 49 题)。二刀:"内存屏障的种类?"——LoadLoad/StoreStore/LoadStore/StoreLoad 四种(不同处理器选择性发射,第 12 题并发进阶)——业务代码消费 happens-before 契约,不直接写屏障。三刀:"DCL 为什么需要 volatile?"——new Object() 三步(分配/初始化/赋值)可能重排(赋值先于初始化)→另一线程拿到非 null 但未初始化的对象→volatile 禁止重排(并发基础 8 题 DCL)。

## 总结点

1. JMM=可见性规则,HB=证据链
2. volatile 禁止重排,不保证原子性
3. 内存屏障是 JVM 实现层,业务消费契约
