<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/nio/ByteBuffer.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html)
- [Java 17 规范与 API · 3](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jcmd.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银文件网关沙盘:NIO 缓冲池监控平稳,容器内存却持续上涨直至 OOMKilled。说明直接内存的三本账(BufferPool、NMT、OS)为何会背离,以及完整的核对清单。

1. BufferPool MXBean 只统计 NIO allocateDirect 的登记量,Unsafe/JNI 直配的 native 内存不在里面——指标稳定不代表直接内存没涨。
2. 17 的 NMT 也不把 direct buffer 记入 Internal 类目(实测 Internal 仅 222KB,同时有 120MB 直接内存存在),NMT 与 BufferPool 会同时"失明"。
3. 上限护栏是 -XX:MaxDirectMemorySize(默认≈最大堆):超限抛 Cannot reserve ... direct buffer memory,这条 OOM 是硬证据。

## 参考分析

### 第二步扩展① 机制:直接内存的登记与实际分配

- ByteBuffer.allocateDirect 走 Bits.reserveMemory,先检查 MaxDirectMemorySize 余量,再 Unsafe.allocateMemory 真分配。
- 登记计数与实际内存同步增减,但"谁在分配"只有栈,没有内置的类型账。
- JNI 库直接 malloc 的内存连登记都没有。
- 因此监控要三层:BufferPool MXBean(登记账)、NMT(JVM 自账,不含 direct buffer 明细)、OS 级映射/私有字节(总账)。
- 三层对比,缺哪层就是盲区。

### 第二步扩展② 反例:三本账同时说谎的现场

- 实测同进程(120MB 直接内存):BufferPool 显示 120MB(登记正确)、NMT Internal 仅 222KB(不含明细)、NMT Total committed 334MB 里找不到这 120MB、RSS 155MB(部分页未驻留或被裁剪)。
- 若只看 NMT 会得出"JVM 没用多少 native"的结论,若只看 RSS 会归因到堆,若只看 BufferPool 会漏掉 Unsafe 直配。
- 三本账必须同时读,互相校验后差值按映射区间归类。

### 第二步扩展③ 取舍:护栏与监控的落点

- 显式设置 -XX:MaxDirectMemorySize(与业务峰值匹配,如 512m),让超限变成可预期的 OOM 而不是容器 OOMKilled。
- 应用侧用池化复用(如 Netty 的 PooledByteBufAllocator)并登记释放。
- 监控加 BufferPool 与容器 RSS 的双水位告警。
- kafka/Netty 类中间件自身有堆外池,容量治理见第 30 题,排查时先把已知池的账对掉再找无名增长。

## 案例

### 第三步发散·验证与推演 实证:超限 OOM 与三本账对照

- 超限复现(Java 17.0.17):默认 MaxDirectMemorySize≈128m 时循环分配 4MB 直接缓冲,32 块后抛出:
```
java.lang.OutOfMemoryError: Cannot reserve 4194304 bytes of direct buffer memory
  (allocated: 130031616, limit: 134217728)
```
- 正常分配(30 块)后同进程读数:BufferPool 登记 120MB、NMT Internal 222KB、RSS 155MB、Private 340MB。
- 验证:limit 与堆强绑定的行为可通过 -XX:MaxDirectMemorySize 显式修改后复测,超限点随之移动。

### 第三步发散·追问扩展 追问链:直接内存三刀

- **Q1：为什么要绕开堆放堆外?**
  - 答：IO 零拷贝路径要避免堆内对象地址漂移(疏散搬移)与额外一次拷贝,网络/文件密集场景收益大;代价是生命周期要自己管。
- **Q2：泄漏了怎么定位?**
  - 答：对照三层账确定是 direct buffer 还是 JNI;direct buffer 可用堆转储找 DirectByteBuffer 实例(登记账在堆上,哪怕数据在堆外),JNI 泄漏用 native 剖析或替换分配器。
- **Q3：Netty 的堆外池为什么也要治理?**
  - 答：池化只是复用,总量仍受 PooledByteBufAllocator 配置约束;池内缓存与跨请求引用不释放,增长照旧,池化不等于有上限。

## 总结点

1. 登记账不等于真实账
2. NMT 看不见 direct,别只信一面
3. 护栏显式设,超限变 OOM
