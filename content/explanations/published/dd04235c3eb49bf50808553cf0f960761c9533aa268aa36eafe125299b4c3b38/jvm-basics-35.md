<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/nio/ByteBuffer.html)
- [Java 17 GC 指南 · 2](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：从 100MB 直接缓冲上 slice 出 1KB 转存进缓存，结果堆外内存迟迟不释放。用"slice 共享底层内存 + 持有释放权"解释这种长尾泄漏，给出复制与生命周期管理两种解法。

1. slice（以及 duplicate）不复制数据：新 Buffer 与原 Buffer 共享同一块底层内存（堆数组或堆外内存），只是游标边界独立。
2. 释放权跟着对象走：直接缓冲的内存由堆内对象经 Cleaner 驱动释放——只要任何一个 slice/duplicate 还被引用，整块大内存就无法回收。
3. 因此"slice 1KB 缓存 10 分钟"实际把 100MB 拖住 10 分钟；长尾 slice 散落各处时，堆外内存的释放时间完全由最长寿的持有者决定。

## 参考分析

### 第二步扩展① 机制：视图对象是"带游标的借用"

- slice 不是小内存，是同一块大内存上的一个观察窗口。
- 类比长卷轴切视图：看的是同一张卷轴的某一段，卷轴本身必须一直摊着——一个视图在，整卷不能收。
- 堆内 HeapBuffer 同理（共享 byte[]），只是 GC 管堆数组时泄漏表现为"堆降不下来"，DirectBuffer 则表现为 RSS 涨（见第 33 题）。

### 第二步扩展② 故障推演：长尾视图拖住整卷

- 响应聚合服务把大 DirectBuffer 按 1KB slice 拆给下游，下游异步处理完各自丢弃——但其中一个"慢消费者"持有了某个 slice 数小时：整块 100MB 无法释放，内存监控呈锯齿状抬升后平台化。
- 定位：MAT 里 DirectByteBuffer 对象及其引用链（或 NMT 增长），找出最长寿视图。

### 第二步扩展③ 取舍：复制还是控生命周期

- 需要长期持有"小段"就复制（allocate + put，1KB 就是 1KB）。
- 需要零拷贝就严格管理视图生命周期（引用计数、try-with-finally release，Netty ByteBuf 的 retain/release 就是这套纪律）。
- 两者不可兼得——零拷贝的代价就是生命周期纪律。

## 案例

### 第三步发散·验证与推演 对照操作：slice 与 copy 的内存对照

- 教学验证：100MB DirectBuffer slice 1KB 存入集合，触发 GC 后观察 NMT/RSS。
- 对照组用 allocate 1KB 复制数据。
- 预期：slice 组整块 100MB 不释放，copy 组立即回落。
- 实验可复跑，一次讲清"视图共享底层"的代价。

### 第三步发散·追问① 追问：asReadOnlyBuffer 与 duplicate 有何不同

- duplicate 共享全量数据与独立游标。
- asReadOnlyBuffer 额外禁写（写操作抛 ReadOnlyBufferException）。
- 两者都不复制数据——与 slice 同属"视图三兄弟"，内存语义相同：底层一块，全员在场才能释放。

## 总结点

1. slice 是窗口，不是小房
2. 一视图在场，整卷不收
3. 长期持有就复制
