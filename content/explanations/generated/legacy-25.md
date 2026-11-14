<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ThreadLocal.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银用户上下文沙盘:拦截器存 userId/租户信息——ThreadLocal 每线程独立副本;线程池线程长命+不 remove→Entry 泄漏(弱 key 强 value)。

1. ThreadLocal 机制:每个 Thread 内有 ThreadLocalMap(key=ThreadLocal 弱引用,value=强引用)——set 存当前线程的 map,get 取本线程条目(线程隔离,无共享无竞争);典型用途:用户上下文/事务绑定/日期格式化副本(替代共享 SimpleDateFormat)。
2. 泄漏链:key 是弱引用(ThreadLocal 对象被回收后 key=null)但 value 是强引用——线程池线程存活数年,Entry(ThreadLocal→null,value 还在)无法触达也无法回收→随任务累积泄漏;强引用链:Thread→ThreadLocalMap→Entry→value。
3. 防泄漏三件事:finally 中 remove()(try-finally 配对,拦截器 afterCompletion 清理);set 前先 remove(防旧值);不存大对象;JDK 优化:Entry 的 key=null 时 set/get 遍历顺带清理 stale entry(探测式)——不能依赖(不触发 set 就不清)。

## 参考分析

### 机制:为什么 key 弱 value 强

key 弱引用的目的=ThreadLocal 实例外部无引用时可回收(key 自动置 null,防止 ThreadLocal 泄漏);但 value 无对应机制(无法自动判“不再使用”)——value 生命周期=线程生命周期;设计权衡:若 value 也弱,业务用一半就被 GC(不可接受)——所以防泄漏责任在使用者(remove)。

### 反例:ThreadLocal 的两种事故

事故一:线程池+不 remove——用户 A 的上下文残留到用户 B 的请求(数据串号!)+内存缓涨;修复=拦截器 finally remove(必须)。事故二:父子线程传递缺失——主线程 set 后线程池任务 get 为 null(InheritableThreadLocal 只在创建时继承,池线程不新建;跨池传递用 TransmittableThreadLocal)。

### 取舍:ThreadLocal vs 显式传参

ThreadLocal:免改方法签名(横切上下文)但隐式(难追踪/忘清理);显式传参:清晰(每个方法签名可见)但侵入所有层——上下文横切多处(日志 traceId/租户/用户)用 ThreadLocal+强规约(必须 remove);仅两三层传递用参数(简单直接)。

## 案例

### 验证:泄漏链的实测走查

验证:泄漏断言(线程池 50 线程循环 set 不 remove→堆中 value 实例持续增长不回收;finally remove 后回收);串号断言(任务 A set 后不清理,任务 B 读到 A 的值——复现上下文污染);弱 key 断言(置空 ThreadLocal 引用+System.gc→key=null,value 仍在——反射读 Thread.threadLocals)——三组固化泄漏语义,本机可复跑。预期:remove 是唯一可靠防线。

### 追问链:ThreadLocal 三刀

一刀:哈希机制=魔数 0x61c88647 斐波那契散列(2 的幂容量下均匀分布,开放寻址而非链表)。二刀:InheritableThreadLocal=子线程创建时复制父值(池线程失效——复用不新建);TTL 库=任务提交时捕获+执行时恢复(线程池可用)。三刀:Spring 场景=RequestContextHolder 本质 ThreadLocal+拦截器清理(spring 是 remove 纪律的样板,第 89 题)。

## 总结点

1. 线程隔离副本,无竞争
2. 弱 key 强 value→池线程泄漏
3. finally remove 是唯一可靠防线
