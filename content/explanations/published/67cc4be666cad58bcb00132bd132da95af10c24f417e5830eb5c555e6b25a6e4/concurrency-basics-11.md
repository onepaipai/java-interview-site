<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ThreadLocal.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：Web 请求处理线程池复用 20 个工作线程，任务里用 ThreadLocal 缓存用户会话对象。任务结束未 remove，下一个请求读到上一用户的会话，同时大对象长期被 ThreadLocalMap 持有。

1. ThreadLocalMap 的键是对 ThreadLocal 的弱引用，值是强引用：线程不死，条目就不随任务的结束消失，值会一直挂着。
2. 线程池的工作线程与进程同寿，任务级数据写进 ThreadLocal 后忘记 remove，就等于塞进了一根永不清空的口袋。
3. 泄漏有两层危害：内存上大对象无法回收；语义上同一线程的下一个任务可能读到旧值，属于业务错误而不只是内存问题。

## 参考分析

### 机制：口袋跟着线程走，不跟着任务走

每个 Thread 身上挂着一张 ThreadLocalMap，键是 ThreadLocal 实例（弱引用），值是你放的对象（强引用）。类比更衣室编号柜：柜子属于场馆（线程），不是属于每位客人（任务）；客人走时不取走物品，柜子就一直占着。键的弱引用只保证 ThreadLocal 对象本身可被回收，被回收后条目变 stale，只有等后续 set/get 触发清理才可能腾出位置，值在此之前仍被强引用着。

### 故障推演：串号比 OOM 更早出现

请求 A 在拦截器把用户上下文 set 进 ThreadLocal，处理完不再清理。请求 B 复用同一线程，鉴权代码读到 A 的身份——越权或脏数据。若对象是大图缓存，多个线程各持一份时才逐渐逼近 OOM；而串号在第二次请求就会发生，且难以稳定复现（取决于线程分配）。两类故障的同一根因都是"任务结束没清场"。

### 取舍：让清理发生在结构里而不是靠自觉

用 try/finally 包裹 remove 是最低要求；更可靠的是把 set/remove 收敛到框架唯一入口（拦截器、任务装饰器），任务代码只读不写。传递型场景优先考虑显式参数或结构化并发的作用域值（JDK 21 预览的 ScopedValue，Java 17 不适用），它随作用域结束自动失效。TransmittableThreadLocal 解决的是传递而非清理，两者不要混为一谈。

## 案例

### 对照操作：读旧值与内存驻留的验证

教学验证：固定 2 线程池循环执行任务，任务 set 一个大 byte 数组后不 remove，下一个任务先 get 并断言为 null。预期断言间歇性失败（复用线程时读到旧值），堆转储中数组随线程存活；补上 finally remove 后断言恒过。实验代码可复跑，串号概率取决于线程复用顺序，多次运行必有命中。

### 追问：InheritableThreadLocal 为什么也救不了线程池

它只在"创建子线程"那一刻复制父线程的值。线程池的工作线程早已创建，之后提交的任务不会触发复制，读到的仍是工作线程首次被创建时的旧上下文——既不新也不干净。这正是线程池上下文传递需要装饰 Runnable 或用 TTL 的原因，属于第 12 题的展开。

## 总结点

1. 口袋跟线程，不跟任务走
2. set 完 finally remove，清场写进结构
3. 先防串号，再谈内存
