<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-5.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：服务启动偶发卡在某个 Bean 初始化前，jstack 显示线程 WAITING 在类初始化。用 <clinit> 的 JVM 级锁解释死锁与"先到先得"阻塞两类卡顿，给出识别与拆解方法。

1. 类初始化由 JVM 保证线程安全：第一个触发线程持类锁执行 <clinit>，其余线程阻塞等待且不再重复执行——这把锁不在你手里，jstack 看不到传统锁信息。
2. 死锁形态：类 A 的 <clinit> 引用类 B、B 的 <clinit> 又依赖 A（常经注册表、回调、日志工厂互相引用），两个线程各持一类锁互等。
3. 非死锁形态：某个 <clinit> 本身很慢（读配置、建连接池），所有后续使用该类的线程在启动期集体排队，表现为"启动突然停住然后突然全过"。

## 参考分析

### 机制：初始化锁是 JVM 内置的"一次性开关"

每个类有一把不可见的初始化锁，线程进入 <clinit> 前拿锁，完成置状态位后释放；等待线程不但等锁，还要等"初始化完成"标志。类比会议室一次通电：第一个按开关的人做完所有电路测试，其余人只能在门外等灯亮——门外的人不知道里面在做什么，也插不进手。

### 故障推演：循环依赖如何锁死启动

A 的静态块注册自己到 Registry 并 new B()；B 的静态块从 Registry 取 A。线程 1 初始化 A（持 A 锁）等 B；线程 2 先触发了 B（持 B 锁）等 A——两边互等，启动挂死。jstack 特征：线程栈顶是 `<clinit>` 且状态 WAITING，没有熟悉的 ReentrantLock 行。修复：拆掉循环引用，初始化动作移出静态块。

### 取舍：哪些动作不该放进静态块

I/O、网络、线程创建、读环境配置都可能慢且引入依赖顺序问题；静态块只做纯内存赋值。需要"全局唯一且线程安全"的重量初始化，用 holder 类（靠 JVM 初始化锁的良性用法）或显式的受控生命周期（框架 Bean 体系），把初始化顺序变成可见、可测的代码。

## 案例

### 对照操作：jstack 里的初始化死锁

教学验证：构造 A、B 互相在静态块引用，双线程分别触发。预期：启动挂住，jstack 显示两个线程分别 `<clinit>` WAITING（jstack 可能报 "deadlock" 或只显示 waiting on class init）。再把初始化挪出静态块，启动恢复。实验可复跑，是类初始化死锁的最小样本。

### 追问：holder 模式为什么不受此困扰

holder 单例只有一条初始化路径（首次访问 getInstance 触发 holder 类初始化），没有多类互相等待的环；JVM 初始化锁反而成了免费的正确性保障。死锁的根源是"环"，不是锁本身——这也是并发模块第 32 题死锁四条件在类初始化上的投影。

## 总结点

1. clinit 一把 JVM 锁，环上必卡死
2. 静态块只做纯赋值
3. 卡住看 jstack，锁不在手里
