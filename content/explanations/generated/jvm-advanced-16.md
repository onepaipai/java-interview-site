<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jcmd.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银容器化沙盘:NMT 汇总显示已提交 334MB,容器 RSS 却长期 155MB,团队困惑"两本账对不上谁可信"。用同进程实测说明 NMT 的口径边界、RSS 的语义,以及两者各自能回答的问题。

1. NMT 是 JVM 内部账本:按类别统计保留/提交,但不包含它不感知的分配(如部分直接内存路径、第三方 JNI 库的 malloc)。
2. RSS 是操作系统视角的驻留页:受页面共享、换出、触及时机影响,同一时刻与 NMT 提交值可以差得很多,两者都真实但口径不同。
3. 解释 RSS 要分层:先用 NMT 解释 JVM 部分,再用工具(proc 映射/heapstat)补 JNI 与 OS 部分,差值要有去处才算闭环。

## 参考分析

### 机制:NMT 统计什么、漏掉什么

NMT 开启后 JVM 对自身 malloc/mmap 调用记账,分类包括 Java Heap、Class、Thread、Code、GC、Compiler、Internal、Symbol、Metaspace 等。实测(128MB 堆加 120MB 直接内存,Java 17.0.17):
```
Total: reserved=1718961KB, committed=342261KB
- Java Heap committed=131072KB
- Internal committed=222KB
- Thread committed=757KB / reserved=19501KB
- GC committed=64917KB
```
注意:120MB 直接内存不在 Internal 里(Internal 仅 222KB)——17 的 NMT 不把 direct buffer 记入该类目,这是它"解释不了 RSS"的典型来源之一。

### 反例:三个数互相矛盾但都是真的

同一进程实测:Private Memory 340MB、RSS 155MB、NMT committed 334MB。Private 含未触及页(已提交未驻留),RSS 只算此刻驻留(未触及或被 OS 裁剪的页不算),NMT 漏掉直接内存又叠加保留与提交的差别。三个数分别回答"进程占用的记账上限""此刻真实占用的物理内存""JVM 自我申报的提交量"。拿任何一个去否定另外两个都是口径错误;容器 OOMKilled 看的是 cgroup 内存账,又是第四种口径。

### 取舍:排查顺序与工具搭配

容器内存问题先看 cgroup 事件与 OOMKilled 日志;JVM 侧开 NMT 拿分类基线(开销约 5-10%,生产常开 summary 档);差值部分用 OS 工具(Windows 下 working set/private bytes,Linux 下 smaps)按映射区间归类。经验配比:堆加 GC 加 CodeCache 大头可由 NMT 解释,JNI 库与直接内存要另查;若 RSS 持续高于 NMT 合计,先怀疑 JNI 泄漏与 glibc malloc 碎片(容器内可用 jemalloc/tcmalloc 替换验证)。

## 案例

### 实证:同进程三口径对照

命令:java -XX:NativeMemoryTracking=summary -Xms128m -Xmx128m NmtExp(分配 120MB 直接内存后保活 20 秒),jcmd VM.native_memory summary 加 PowerShell 进程内存读数:
```
NMT Total committed=342261KB(约 334MB)
RSS(WorkingSet)=155MB
PrivateMemory=340MB
Internal committed=222KB(直接内存不在内)
```
验证:同进程同时刻三个数全部可复现;直接内存的 120MB 无法从 NMT 数字里找到,需要 BufferPool MXBean 或 OS 映射补账——这演示了"RSS 不是 NMT 能全解释的"。

### 追问链:RSS 三刀

一刀:"为什么 Thread 保留 19.5MB 提交才 757KB?"——线程栈按保留上限预留,提交只算实际触及页,这也解释了高线程数服务 RSS 不按 Xss 乘线程数爆炸(实测 20000 线程无异常)。二刀:"容器里 NMT 会不会看漏 cgroup 层?"——会,NMT 只看 JVM;容器级看 memory.stat 的 anon/file 分解,配合 NMT 才能定位是堆、元空间、堆外还是 page cache 挤压。三刀:"NMT 开销多大?"——官方口径约 5-10% 性能损耗,summary 档可接受,detail 档仅排障时临时开;长期开 detail 属于诊断命令扩大事故的反例(见第 39 题)。

## 总结点

1. NMT 记 JVM 的账,RSS 记系统的账
2. 保留不等于提交,提交不等于驻留
3. 差值要有去处,闭环才算排查完
