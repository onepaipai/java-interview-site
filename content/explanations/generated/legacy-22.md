<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/atomic/AtomicInteger.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银状态位沙盘:running 标志位用 volatile(可见性)但 count++ 仍丢更新(非原子)——volatile=可见性+有序性,不等于原子性。

1. volatile 两保证:可见性(写立即刷主存并使其他 CPU 缓存行失效,读走主存——JMM 层面=写后读有 happens-before 关系);有序性(禁止指令重排——内存屏障:volatile 写前 StoreStore+写后 StoreLoad,读后 LoadLoad)。语义上=轻量级同步(读写本身原子,但复合操作不原子)。
2. 不能保证原子性:count++ 是 读-改-写 三步(volatile 只保证每步可见,不保证三步连续)——两个线程同时读到旧值+1 后写回→丢失更新;验证:10 线程×1 万次 volatile int++ 结果<10 万;替代=AtomicInteger(CAS)或 synchronized。
3. 典型正确场景:状态标志(running/double-check 的 instance 引用,禁止半初始化对象重排序暴露)+一次性写多读(配置刷新);典型错误场景:计数器/累加器(用 Atomic/LongAdder)。

## 参考分析

### 第二步扩展① 机制:可见性与 happens-before 的关系

- JMM 规则:volatile 写 happens-before 后续对同一变量的 volatile 读——读线程必见写线程之前的所有写(不仅是 volatile 变量本身)——这是 DCL 单例正确性的关键(instance 为 volatile,getInstance 读到非 null 时对象构造一定完成,并发基础 2 题规则清单)。

### 第二步扩展② 反例:volatile 误用的两种事故

- 事故一:volatile 计数器——压测对账发现少计(丢失更新)。
- 修复=AtomicInteger/LongAdder(第 8 题 CAS)。
- 事故二:非 volatile 标志——后台线程永远看不到 running=false( JIT 缓存到寄存器)→死循环。
- 修复=volatile 标志位(可见性是它的本职)。

### 第二步扩展③ 取舍:三种方案的性能谱系

- volatile(最轻,仅可见+有序)<Atomic(CAS 自旋,无锁)<synchronized(互斥,最重但语义完整)——按操作复杂度选:单变量读写=volatile,单变量复合=Atomic,多变量临界区=synchronized(或 Lock)。

## 案例

### 第三步发散·验证与推演 验证:原子性缺失的实测走查

- 验证:丢失更新断言(10 线程×1 万 volatile int++ → 结果<10 万,多次复跑均丢)。
- AtomicInteger 对照(同条件=恰好 10 万)。
- 可见性断言(非 volatile 标志死循环复现,volatile 后正常退出)。
- 内存屏障效果(并发基础 2 题 happens-before 断言同源)——四组固化 volatile 边界,本机可复跑。

### 第三步发散·发散要点 追问链:volatile 三刀

- **追问①·volatile 与 64 位读写**：long/double 非 volatile 可能撕裂(JVM 允许),volatile 后原子
- **追问②·volatile 数组**：仅数组引用 volatile,元素读写不 volatile(AtomicIntegerArray 才保证)
- **追问③·DCL**：volatile instance 防半初始化(第 80 题逃逸分析/并发基础 23 题同源)

## 总结点

1. volatile=可见+有序,不保证原子
2. count++ 丢更新,换 Atomic/CAS
3. 标志位与 DCL 是正确场景
