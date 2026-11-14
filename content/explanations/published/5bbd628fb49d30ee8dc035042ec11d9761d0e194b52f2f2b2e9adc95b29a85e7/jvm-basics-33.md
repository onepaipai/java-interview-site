<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/nio/ByteBuffer.html.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：Netty 服务 RSS 涨到上限但堆转储"很干净"。解释直接内存的存放位置、堆内对象与堆外内存的引用关系，给出用 NMT/JFR 定位堆外泄漏的方法。

1. ByteBuffer.allocateDirect 的数据本体在堆外本地内存：堆转储只包含 Java 对象，最多看到占用几十字节的 Cleaner/Buffer 对象与引用，几十 GB 的本体不在其中。
2. 堆外内存的生命周期由"堆内 Cleaner + 引用可达性"驱动：Buffer 对象被回收时才触发释放；Buffer 被缓存持有，堆外内存就一直常驻——堆外泄漏的根因几乎都是堆内引用被缓存住了。
3. 观测工具换轨道：NMT（-XX:NativeMemoryTracking=summary + jcmd VM.native_memory）、JFR 的 NativeMemory 与 allocation 事件、操作系统层 RSS/pmap；MaxDirectMemorySize 限上限。

## 参考分析

### 机制：堆转储照的是"屋内"，堆外是"院子"

堆转储 = 对 Java 堆对象图拍全景照；直接内存在院子里的独立库房，照片天然照不到。堆内只剩一张"库房钥匙"（DirectByteBuffer 对象 + Cleaner）。类比解释了为什么堆转储干净而 RSS 爆表：爆的是院子，不是屋子。

### 故障推演：池化缓存的堆外泄漏

业务把 DirectByteBuffer 放进无界本地缓存"复用"，引用一直可达 → Cleaner 永不触发 → 堆外内存只增不减；堆转储里每个 Buffer 只占几十字节，全堆看着无害。定位：NMT 的 Internal/Other 类目持续增长，jcmd VM.native_memory diff 前后两次；或 JFR 直接内存分配点采样指向缓存写入处。

### 取舍：池化与上限的配套

直接内存适合"大块、复用、由框架统一池化"的场景（网络缓冲），配合上限 MaxDirectMemorySize 与池化组件的引用计数；业务代码直接 allocateDirect 又自行缓存是最危险组合。监控上把"直接内存使用量"作为独立指标，与堆指标并列。

## 案例

### 对照操作：NMT 抓堆外增长

教学验证：开启 NMT，循环 allocateDirect 且持有引用，前后两次 `jcmd VM.native_memory detail`。预期：Internal（或 direct）类目增长与分配量吻合，堆转储几乎无变化；释放引用并 GC 后类目回落。实验可复跑，是堆外排查的标准手法。

### 追问：为什么 DirectByteBuffer 设计成堆内引用驱动释放

把释放时机交给 GC 免去了手动 free 的语言层风险（引用还在就释放会 use-after-free），代价是释放不即时。这是"安全换及时"的取舍：需要即时与精确时，用显式引用计数的池化框架（Netty ByteBuf）并严格遵守 release。

## 总结点

1. 堆转储照屋内，本体在院子
2. 泄漏根因是引用被缓存
3. NMT 对账，MaxDirectMemorySize 封顶
