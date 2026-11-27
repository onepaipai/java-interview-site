<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/nio/file/Files.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银文件网关沙盘:Files.readAllBytes(用户上传的 2GB 文件)——整个文件加载进内存(byte[2GB])——堆不够即 OOM(且大数组分配的 GC 压力)。大文件的流式处理(InputStream 逐块/Files.lines 逐行)替代全量加载。

1. readAllBytes 的行为:一次性读取整个文件到 byte[]——文件大小=内存需求(2GB 文件=2GB 堆分配)——并发请求多个大文件=内存乘法(OOM,第 23 题 distributed 队列堆积同构)。
2. 大数组的额外代价:byte[2GB] 的分配(堆需要连续空间——碎片化时分配失败)+GC 扫描(2GB 的 byte 数组的标记成本)——即使堆够,分配与 GC 的代价也可观。
3. 流式替代:InputStream 逐块读取(8KB 缓冲循环)、Files.lines(逐行流)、Files.copy(直接到输出流)——内存 O(缓冲区) 不 O(文件大小)——文件处理的流式纪律。

## 参考分析

### 第二步扩展① 机制:全量加载的内存账

- 内存账:byte[2GB]=2GB 堆分配(需连续空间)+复制期间的旧数组(如果是从流拷贝)——并发 3 个请求=6GB(堆 4GB 即 OOM)。
- 大数组的 GC:大对象进老年代(分配直接进 old gen[大对象阈值])——Full GC 的扫描面。
- 替代:流式处理(逐块校验/转存/解析)——内存 O(8KB) 不 O(2GB)。

### 第二步扩展② 反例:全量加载的三种事故

- 事故一,上传接口 OOM:Files.readAllBytes(上传文件)——用户上传 2GB 文件——OOM(并发上传更糟)。
- 事故二,配置加载 OOM:配置文件被替换为大文件(恶意或误操作)——readAllBytes OOM。
- 事故三,CSV 解析 OOM:大 CSV 全量读入内存解析(第 42 题distributed N+1 的全量加载版)——流式解析(逐行)替代。
- 三条的正解:文件大小预检(超过阈值拒绝/流式)+流式处理+并发限流(第 42 题)。

### 第二步扩展③ 取舍:全量 vs 流式的判据

- 全量:文件小(≤堆的 10%)+需要随机访问(SeekableByteChannel)+多次遍历——readAllBytes/readAllLines 合理。
- 流式:文件大/顺序处理/单次遍历——InputStream/lines。
- 随机访问大文件:FileChannel + MappedByteBuffer(内存映射——不占堆,OS 页缓存)——大文件的随机访问用 mmap 而非 readAllBytes。

## 案例

### 第三步发散·验证与推演 验证:OOM 防护的断言组

- 验证:OOM 复现断言(大文件 readAllBytes 在小堆下 OOM——-Xmx 限制的复现)。
- 流式对照断言(同一文件流式处理的内存峰值——对照)。
- 大小预检断言(超过阈值的文件拒绝/流式——预检生效)——三组固化大文件纪律。
- 文件大小限制进接口层(第 42 题distributed 查询限流)。

### 第三步发散·追问扩展 追问链:大文件三刀

- **Q1：上传的大小限制?**
  - 答：上传的预检(Content-Length 头校验)+流式接收(边收边写盘,不全量进内存)——上传的限制在入口层(第 42 题)。
- **Q2：Files.lines 的资源?**
  - 答：Stream<String> 的资源关闭(try-with-resources——Stream 是 AutoCloseable,第 12 题)——Files.lines 不关闭=文件句柄泄漏。
- **Q3：mmap 的适用?**
  - 答：MappedByteBuffer 的随机访问高效(页缓存)+文件关闭的 unmap 问题(显式 unmap 无 API——GC 延迟释放)——mmap 的适用与陷阱(随机大文件,不用于顺序读)。

## 总结点

1. 全量加载=文件大小的堆分配
2. 流式处理,内存 O(缓冲)
3. 大文件随机访问用 mmap
