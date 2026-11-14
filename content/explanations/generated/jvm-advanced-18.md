<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Thread.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银推送服务沙盘:计划把每连接一线程的架构扩到十万连接,担心 -Xss 与线程数上限。用实测数据(2 万线程秒建)厘清栈内存的真实成本模型,并给出容量预算方法。

1. Xss 是保留上限不是提交量:实测 20000 线程在 -Xss8m 下约 2 秒建完无 OOM——未使用的栈页不占物理内存,按 Xss 乘线程数算内存是错的。
2. 真实成本是"提交页":每线程实际用到的栈深(通常几十 KB)决定物理内存,异常深递归才会逼近 Xss 上限。
3. 高并发的真实瓶颈在 OS 线程调度与上限参数:线程创建数受 OS 与 JVM 双重限制,预算要算调度开销与上限配置,不是栈内存。

## 参考分析

### 机制:保留、提交与栈深

线程创建时按 -Xss 保留虚拟地址空间(Windows/Linux 都是 reserve),首个栈页提交,随调用深入逐页提交(guard page 触发)。所以 20000×8MB=160GB 只是保留量;实测本机 20000 线程 2 秒创建完成且无 OOM(两种 Xss 对照同结果)。NMT 佐证:Thread 类目 reserved 19501KB、committed 757KB(空闲 JVM 含少量线程),保留与提交差 25 倍。栈深才决定提交:普通业务栈深几百到几千帧,提交几十到几百 KB。

### 反例:"Xss 调小省内存"在错误前提下的操作

若以为 10000 线程×8MB=80GB 必炸而把 Xss 调到 256k,省下的是"从未被用到的保留空间",真实收益为零;反而深递归或深框架栈(序列化、表达式引擎)会撞 StackOverflowError 的概率上升。实测对照:20000 线程 -Xss256k 与 -Xss8m 都约 1.9 秒建完,创建速度与 OOM 行为无差异。正确动作是压测观察 RSS 与调度延迟,而不是拍参数。

### 取舍:容量预算的正确算式

预算三行:提交栈内存≈线程数×平均栈深(压测测得,如 64KB);调度开销≈活跃线程数对 CPU 的影响(数万 OS 线程的上下文切换开始显著);上限配置=OS 限制(ulimit/内核参数)+ JVM 线程创建失败阈值。架构层面,十万连接应走向虚拟线程(JDK 21+)或事件驱动(Netty),每连接一线程是过渡形态;JDK 17 无虚拟线程(JEP 425 是 19),版本边界要先讲清。

## 案例

### 实证:2 万线程的创建对照

命令(Java 17.0.17):
```
java -Xss8m StackExp2 20000   -> created=20000 用时ms=2013 (未触发OOM)
java -Xss256k StackExp2 20000 -> created=20000 用时ms=1918 (未触发OOM)
```
线程存活 20 秒后程序退出。验证:两组无 OOM 且耗时同量级,证明创建成本与 Xss 无关;把 cap 提到 10 万级才会触及 OS 或 JVM 限制(未测,标注)。

### 追问链:线程预算三刀

一刀:"那什么时候会 unable to create native thread?"——OS 内存提交不足(容器 commit limit)、内核线程上限、JVM 保留地址空间耗尽;报错时先看 OS 日志与 cgroup,不是先调 Xss。二刀:"栈深多少算深?"——监控里可看线程栈快照(jstack)帧数,递归解析、深 AOP 链会到千帧;压测时统计 P99 栈深乘线程数才准。三刀:"虚拟线程改变了什么预算?"——栈搬到堆上按需增长,百万并发成为可能,但 synchronized 大块与 native 调用造成的固定(pinning)在早期版本限制吞吐(见第 43 题),预算模型要按版本重写。

## 总结点

1. 保留不占内存,提交看栈深
2. Xss 别乱调,压测定预算
3. 瓶颈在调度与上限,不在栈字节
