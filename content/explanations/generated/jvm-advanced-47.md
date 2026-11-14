<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jcmd.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银订单沙盘:无界缓存修复上线,堆占用回落,但容器 RSS 三天没降,运维质疑修复无效。解释 RSS 的粘性(驻留页不主动归还、page cache、分配器碎片)与验证修复的正确口径。

1. RSS 是驻留页不是占用义务:进程释放的内存页未必立即归还 OS(glibc malloc 碎片、JVM 堆水位线策略),RSS 有粘性。
2. JVM 侧堆通常不缩(默认 Xms=Xmx 时堆常驻,本机 NMT:Heap committed=131072KB 全额提交),缓存修复的收益体现在"堆内可回收空间变大",不是 RSS 缩水。
3. 验证口径用三线对比:堆内活对象基线(直方图差量)、GC 后堆占用(日志)、容器 RSS——修复有效看前两条,RSS 下降要靠主动归还手段或重启。

## 参考分析

### 机制:RSS 粘性的三个来源

来源一,堆常驻:Xms=Xmx 的容器里堆全额提交(本机实测 Heap committed 128MB 全额),缓存清理只是让堆内出现大量"可回收"空间,堆对 OS 的承诺没变。来源二,分配器碎片:glibc 的 malloc 空洞使 free 后的页不归还(OS 层 RSS 不降),JNI 与堆外路径同理。来源三,page cache 与预触碰:文件读多的服务 cache 占 RSS,PreTouch(第 45 题)让堆页启动即驻留。三者都让"逻辑修复"与"物理 RSS"脱钩。

### 反例:用 RSS 验证堆内修复

修复后团队盯 RSS 三天无变化,准备回滚"无效修复"——实际堆内活对象基线已从 92% 降到 55%,Full GC 频率归零,修复完全有效。判别错位:修复的是堆内账本(可达性),RSS 是物理驻留账(第 16 题的口径差)。验证修复的口径必须与修复对象同层:堆内泄漏看活对象基线与 GC 行为,堆外泄漏看 BufferPool 与 native 账,RSS 只做长期趋势参考。

### 取舍:主动归还与重启策略

主动归还手段:启动参数 -XX:+UseG1GC 配 MaxHeapFreeRatio 调整(有缩容行为但受 Xms=Xmx 约束)、-XX:MaxRAMPercentage 配 Xms<Xmx 允许堆收缩、System.gc 后依赖 G1 的并发周期收缩(Java 12+ G1 支持并发归还,行为按版本验证)、glibc 场景用 malloc_trim 或替换 jemalloc。运维面:接受"重启归零"作为最终手段,把修复验证与 RSS 回收拆成两个目标,别用后者否定前者。

## 案例

### 实证:三口径的粘性对照

本机证据(Java 17.0.17,NmtExp):
```
NMT: Heap committed=131072KB(全额,不随使用量变化)
RSS=155MB / Private=340MB(同进程互不相等)
Internal committed=222KB(直接内存不在 NMT)
```
解读:堆对 OS 的承诺是 Xms 全额——堆内对象清空也不改 committed 与 RSS;同进程 RSS 与 Private 都不等于 NMT 合计。验证:把 Xms 调低于 Xmx 重跑,committed 可变但缩容行为按版本与参数(G1 并发归还)验证;生产修复的验证口径按本节三线对比执行。

### 追问链:RSS 三刀

一刀:"什么时候 RSS 会降?"——进程释放整段映射(大 chunk munmap)、分配器 trim、内核回收 page cache、或重启;JVM 堆默认不主动归还到 OS(Xms=Xmx 时永不)。二刀:"为什么运维爱盯 RSS?"——容器 OOMKilled 按物理内存判,它的关切合理;对应方案是把 JVM 各账有界化(第 19 题),让 RSS 可预测,而不是要求 RSS 实时反映逻辑修复。三刀:"缩容参数值得开吗?"——G1 并发归还对潮汐负载(夜间低谷)有收益,但要压测缩容期间的行为(归还时的并发开销、再扩容的抖动);固定负载服务开缩容纯增风险。

## 总结点

1. 修复看堆内账,RSS 是物理账
2. 承诺常驻,归还看策略
3. 重启归零是兜底,口径分层才复盘
