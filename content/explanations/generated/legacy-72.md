<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银请求沙盘:ThreadLocal 存用户上下文,线程池复用线程——上一个请求的值残留给下一个请求(数据串号);线程池中的 ThreadLocal 必须 remove(并发进阶 28 题的完整版)。

1. 泄漏机制:ThreadLocalMap 的 Entry key 是弱引用(ThreadLocal 实例被 GC 后 key=null)但 value 是强引用(仍被线程的 ThreadLocalMap 持有)——线程池线程永不死亡→value 永远可达→泄漏(value 无法被 GC 回收)。
2. 线程池的串号:线程复用前未 remove→新任务读到旧任务的值(数据串号,安全风险)——修复=任务完成后 finally{threadLocal.remove()}(确定性清理)。
3. 内存放大:每个线程一份 ThreadLocalMap——百万线程×12 个 ThreadLocal 条目×40 字节/条目=数百 MB(虚拟线程场景,并发进阶 28 题);治理:减少 ThreadLocal 使用+显式 remove+虚拟线程一次性回收(规模风险替代泄漏风险)。

## 参考分析

### 机制:弱引用 key 与强引用 value 的泄漏链

Thread → ThreadLocalMap → Entry(key=null) → value——ThreadLocal 实例被回收后 key 变 null(弱引用),但 value 仍沿强引用链可达(线程活着→map 活着→value 活着)——设计意图:key 弱引用让 map 能探测过期条目(expungeStaleEntry 清理);value 强引用是局限(map 不知道业务何时不再需要)。

### 反例:ThreadLocal 的两种事故

事故一:线程池忘记 remove——下个请求读到上个请求的用户上下文(数据串号);修复=finally remove 或拦截器统一清理(框架级:Spring 的 RequestContextHolder 已内置清理)。事故二:InheritableThreadLocal 在线程池——ITL 在线程创建时复制(不是任务提交时)→线程池中的"子线程"读到"创建线程池线程"的父值(不是提交任务的父值,并发基础 12 题)。

### 取舍:ThreadLocal vs 显式传参 vs ScopedValue

ThreadLocal:隐式传递(改代码少)+泄漏风险+测试难;显式传参:显式(每个方法带上下文参数)+改动大但可测试;ScopedValue(JDK 21):作用域绑定+不可变+自动消失(无泄漏)——推荐:请求上下文用框架管理(Spring RequestContextHolder)或显式传参;ThreadLocal 限基础设施(事务资源句柄)。

## 案例

### 验证:ThreadLocal 的走查核对

验证:泄漏断言(线程池 100 个任务不 remove→堆转储中 ThreadLocalMap 的 value 可达);串号断言(任务 1 set "userA"→任务 2 不 set→读到 "userA"——串号复现);remove 断言(finally remove→任务 2 读到 null——正确清理);并发进阶 28 题的虚拟线程对照(百万线程×ThreadLocal 的内存放大)。验证:泄漏/串号/清理断言可程序化。

### 追问链:ThreadLocal 三刀

一刀:"ThreadLocalMap 的清理机制?"——expungeStaleEntry(探测式:发现 null key 条目→清理 value)+cleanSomeSlots(启发式:抽样清理)——被动清理(依赖后续 set/get/remove 触发),不可靠;主动清理(finally remove)是唯一可靠手段。二刀:"InheritableThreadLocal 的复制时机?"——Thread 创建时复制 parent 的 ITL 值(不是任务提交时)——线程池中线程已创建→ITL 值=创建线程池时刻的父值(过期);修复=TransmittableThreadLocal(TTL,阿里开源)或显式传递。三刀:"虚拟线程的 ThreadLocal?"——百万虚拟线程×ThreadLocal=内存放大(并发进阶 28 题);ScopedValue(不可变+作用域绑定+自动消失)是替代方向(JEP 446)。

## 总结点

1. 弱 key 强 value=泄漏链
2. 线程池必须 finally remove
3. 虚拟线程场景用 ScopedValue 替代
