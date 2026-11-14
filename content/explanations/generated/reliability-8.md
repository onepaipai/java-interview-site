<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/service-level-objectives/)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/troubleshoot/diagnostic-tools.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银服务沙盘:RSS 每天涨 200MB,一周后 OOM——内存增长排查有固定顺序:先分账(堆内/堆外/元空间/直接内存),再对账(增长曲线与业务事件),后取证(堆转储/直接内存明细)——jvm 批次实测:三种口径互不相等,不先分账必然走弯路。

1. 排查四步:分账(堆/元空间/线程栈/直接内存各区账本,NMT/RSS 对照——jvm 实测三口径互不相等)、对账(增长曲线 vs 发布与流量:发布后涨=新代码泄漏,周末不涨=业务相关)、取证(堆转储查支配树/直接内存按类型统计)、验证(修复后同口径回归)。
2. 常见泄漏源清单:集合缓存无界(缓存 Map 只增不删——上限+淘汰)、ThreadLocal 未清理(线程池复用线程,残留累积)、监听器/回调未注销、类加载器泄漏(动态生成类,元空间涨)、直接内存(Netty ByteBuf 漏 release,Q29 引用计数;DirectByteBuffer 池化)、连接/流未关闭。
3. 分级处置:堆内泄漏→堆转储定位+修复+发布;直接内存→按类型(-XX:MaxDirectMemorySize 上限+jvm 批次 direct OOM 证据:allocated 130MB/limit 134MB 的报错形态)、Netty 泄漏检测开 PARANOID 抽查;元空间→类加载器分析。临时缓解=定期重启(发布节奏内),但根因必须修。

## 参考分析

### 机制:内存账本的分区

进程内存=堆(对象)+非堆(元空间/Code Cache)+线程栈(线程数×Xss)+直接内存(NIO/Netty)+JNI/mmap;每区有独立的增长原因与观测工具(NMT 分区统计/jcmd VM.native_memory、堆转储、pmap);RSS≈committed 总和(jvm 批次实测 RSS=155MB vs Private=340MB 的口径差异)——排查第一步是"哪个区在涨",pmap/NMT 一看便知,然后才进对应工具链。

### 反例:内存排查的三种弯路

弯路一:直接 dump 堆找泄漏——实际是堆外涨(堆转储看不到),白忙;先分账。弯路二:把"缓存大"当泄漏——缓存有上限有淘汰是设计,增长曲线趋于平台不是泄漏(泄漏=线性不封顶);区分"增长"与"泄漏"看封顶性。弯路三:重启解决根因——定期重启掩盖泄漏(每周三凌晨重启的"祖传脚本"),泄漏源还在;重启只是止血。

### 取舍:转储的成本

堆转储(几十 GB 堆=暂停数十秒+磁盘大文件):生产上用 -XX:+HeapDumpOnOutOfMemoryError(故障时自动)+按需 jmap(低峰+摘流量后);在线反复 dump=二次事故——取证与止损分开,转储在摘流量后做。

## 案例

### 验证:分账的实测证据(交叉引用)

jvm 批次实测(NMT/direct OOM/线程栈):
~~~
NMT(128m 堆+120MB direct):Total committed≈334MB,Heap 128MB,Internal 仅 222KB
RSS=155MB、Private=340MB——三种口径互不相等
direct OOM:allocated: 130031616, limit: 134217728(默认上限≈maxMemory)
4000 线程 -Xss256k 与 8m 均 2 秒建完(保留≠提交)
~~~
验证:"先分账再取证"的排查顺序在既有实测上成立——堆外/元空间/栈的分区各有独立证据链;堆内泄漏的 MAT 流程按工具语义推演并明示。

### 追问链:内存三刀

一刀:容器环境——容器内存限制(OOMKilled)vs JVM 自觉(-XX:MaxRAMPercentage),JVM 不感知 cgroup 限额时容器先杀(进程级);容器与 JVM 参数对齐。二刀:GC 日志先行——增长伴随 GC 频率变化(Full GC 后老年代水位不再回落=真泄漏;jvm 批次 humongous 证据:Full GC 54->0 vs 回不来的形态)。三刀:与 Q29 ByteBuf 的衔接——引用计数泄漏不进 GC 账,泄漏检测器是堆外的专属工具。

## 总结点

1. 先分账再取证
2. 增长看封顶性辨泄漏
3. 重启止血根因必修
