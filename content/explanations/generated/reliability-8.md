<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/25/troubleshoot/)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jcmd.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17+ 服务运行数小时后 RSS 持续升高并伴随延迟变化。需要区分 Java heap、类元数据、线程栈、直接内存、JNI/native 分配和业务缓存，先保留证据再决定是否调整 Xmx。

1. 先确认增长的是进程 RSS、Java heap、非堆/native memory 还是业务缓存；不同区域的证据和修复方式完全不同。
2. 比较多次 GC 后的 live set、分配速率、线程数、类加载、direct buffer 和 native memory，再用 heap dump/Native Memory Tracking/JFR 定位保留链或分配来源。
3. 临时增加 Xmx 只能延后 heap OOM，可能挤压容器或 native 空间；止损和修复要同时关注用户延迟、GC、容器限制和是否存在真实泄漏。

## 参考分析

### 先区分观测对象

RSS 上升不等于 Java 对象泄漏：堆提交、线程栈、Metaspace、Code Cache、DirectByteBuffer、JNI 分配、内存映射文件和 allocator 缓存都可能增加 RSS。先对照 JVM heap 使用、容器 cgroup、进程映射和线程数，避免只看监控平台的一个内存百分比。
如果老年代在 Full GC 或主要回收后仍阶梯式增长，更像对象存活/保留链；如果 heap 稳定而 RSS 上升，应转向 native memory、线程或缓存调查。类比体重上升先分清水肿还是脂肪：堆、元空间、堆外是三个不同的秤，上错秤结论全错。

### 证据顺序要控制扰动

记录分配速率、GC 日志、回收后存活量、类加载/卸载、线程数量、direct buffer 和连接/缓存大小。需要时在隔离或受控窗口采集 heap dump、JFR 和 Native Memory Tracking；dump 本身可能暂停应用、占用磁盘并改变问题现场。
比较多个时间点和相同负载，而不是凭一次快照判断泄漏。heap dump 的保留路径能说明谁持有对象，不能直接解释 JNI 或内核页缓存。

### 止损与修复边界

若接近容器上限，先降低流量、摘除实例或滚动重启并保留诊断证据；滚动重启是止损，不是泄漏修复。增加 Xmx 前必须确认 native 空间和 cgroup 余量，否则可能从 Java OOM 变成容器 OOM。
修复可能是清理监听器/缓存、关闭资源、限制批量大小、修正 ThreadLocal、释放 direct buffer 或升级依赖。验证要看多轮 GC 后存活曲线、RSS、GC 时间和业务尾延迟共同收敛。

## 案例

### 分层诊断演练

在隔离环境分别制造静态集合泄漏、线程不断创建、DirectByteBuffer 增长和类加载器无法回收。记录 heap、RSS、线程数、Metaspace、GC 与容器限制，预期不同故障呈现不同曲线；这是教学实验，不代表生产已执行。
对每类问题采集相应证据后再修复，不用统一增加 Xmx 掩盖差异。

### 恢复验收

部署修复版本并保持相同负载，比较多次主要 GC 后 live set、RSS 斜率、线程数和 p99。预期增长停止或回到可解释的缓存/工作集范围，且没有因为滚动重启暂时变平就误判泄漏消失。
同时验证告警能区分 heap、native 和容器压力，并保留 dump/JFR 的访问控制，避免泄露业务数据。

## 总结点

1. 堆、元空间、堆外，先上对秤
2. 先分区再判断是否堆泄漏
3. 多次回收后的存活量最关键
4. 加 Xmx 不是泄漏修复
