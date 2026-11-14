<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/nio/ByteBuffer.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银行情网关沙盘:Netty 池化堆外缓冲配额 1GB,行情洪峰时 RSS 顶到容器 limit 触发 OOMKilled,团队以为"池化即安全"。解释池的账本边界、无界路径与治理清单。

1. 池化管复用不管总量:PooledByteBufAllocator 只保证块内复用,池的 arenas/chunk 配置决定上限,默认值未必小于你的容器。
2. 无界路径三处:临时 buffer 泄漏(未 release)、跨请求引用滞留、池预扩容在洪峰时一次吃满;直接内存 OOM 的硬护栏是 MaxDirectMemorySize,越过即抛 Cannot reserve。
3. 治理三件套:显式配额(allocator 配置与 -XX:MaxDirectMemorySize 对齐)、泄漏检测(Level 参数与采样)、RSS 与 BufferPool 双水位监控。

## 参考分析

### 机制:池的账本与默认值

Netty PooledByteBufAllocator 按 arena 组织 chunk(默认每 chunk 16MB,arena 数随核数),池内分配从 chunk 切页;池总上限=arena 数×chunk 上限+缓存,可计算但常被忽略。池外路径:分配大于 chunk 的缓冲、堆外直接分配(DirectByteBuffer 走 Bits.reserveMemory,受 -XX:MaxDirectMemorySize 限,默认≈最大堆,实测超限抛 Cannot reserve ... direct buffer memory)。因此池内池外是两本账,都要有界。

### 反例:洪峰把池推到容器 limit

行情洪峰:每连接订阅缓冲翻倍,arena chunk 预扩容一次性申请;若 RSS 早就高企(堆外+堆+元空间合计接近 limit),扩容直接顶破容器。此场景无 Java OOM(见第 19 题),内核静默杀。防御:容量模型=堆(MaxRAMPercentage 折算)+池上限+直接内存上限+元空间与线程,合计必须显著小于容器 limit;洪峰扩容做灰度限速,扩容请求本身也要预算。

### 取舍:配额、检测与监控的落点

配额:MaxDirectMemorySize 显式设(如 512m)与池配置加总校验;arena 数按容器有效核数(不是宿主机核数)调整。检测:Netty ResourceLeakDetector 设 PARANOID 仅预发、SIMPLE 生产;泄漏日志进告警。监控:BufferPool MXBean 与容器 RSS 双水位,背离超过阈值即查未 release 或 JNI 直配(对照第 17 题的三本账方法)。

## 案例

### 实证:直接内存护栏与账本背离

本机证据(Java 17.0.17):
```
30×4MB 直接缓冲分配成功;第 33 块(超默认上限)抛:
OutOfMemoryError: Cannot reserve 4194304 bytes of direct buffer memory
  (allocated: 130031616, limit: 134217728)
同进程三本账:BufferPool 120MB / NMT Internal 222KB / RSS 155MB
```
验证:显式调小 -XX:MaxDirectMemorySize 重跑,超限点前移,护栏行为可预期;池化框架的配额最终都要落到这条 JVM 护栏与 OS limit 的合计上。

### 追问链:堆外池三刀

一刀:"池化为什么快?"——复用 chunk 免去每次 malloc/释放与页错误,分配是池内指针推进;它优化的是分配延迟,不是总量。二刀:"泄漏检测怎么开?"——System.setProperty(io.netty.leakDetection.level,...) 或启动参数;PARANOID 全量检测只在预发,生产 SIMPLE 抽样,漏检率与开销的平衡写进预案。三刀:"和直接内存上限是什么关系?"——池是应用层账,MaxDirectMemorySize 是 JVM 层护栏,容器 limit 是内核层边界;三层配额必须自洽,任何一层单独看都会得出"没问题"的错觉(对照第 19 题)。

## 总结点

1. 池化省分配,不省总量
2. 池内池外两本账,三层配额要对齐
3. 泄漏检测常开,RSS 双水位
