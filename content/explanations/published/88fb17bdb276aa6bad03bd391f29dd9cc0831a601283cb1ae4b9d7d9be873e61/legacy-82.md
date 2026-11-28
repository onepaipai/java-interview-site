<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)
- [Java 17 GC 指南 · 2](https://docs.oracle.com/en/java/javase/17/gctuning/collectors.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银内存沙盘:堆持续增长,Full GC 后不回落——内存泄漏的六类典型场景(静态集合/监听器/ThreadLocal/连接/缓存/内部类)与排查(jmap 对比+MAT)。

1. 六类典型泄漏:一,静态集合(put 后不 remove,第 28 题可达性);二,监听器未注销(事件源持有引用);三,ThreadLocal 不 remove(池线程 value 可达,第 72 题);四,连接未关闭(数据库/HTTP/文件句柄);五,缓存无淘汰(只加不删);六,非静态内部类隐式持有外部 this。
2. 排查流程:监控发现(堆持续增长+Full GC 后不回落)→jmap dump(两个时点对比)→MAT 分析(对比直方图的增量对象+dominator tree 的引用链)→定位泄漏源(代码中的引用链)→修复(remove/close/WeakReference)+验证(堆增长平稳)。
3. 预防:代码评审(关注 static 集合的生命周期/监听器的注销/ThreadLocal 的清理)、静态扫描(SonarQube 的泄漏检测规则)、运行时监控(堆增长趋势告警,第 42 题健康检查)——预防优于排查。

## 参考分析

### 第二步扩展① 机制:泄漏的"可达性"本质

- 内存泄漏=对象不再使用但仍然可达(GC 无法回收)——可达性分析从 GC Roots 出发:静态集合/活跃线程(线程池)/加载器/JNI 是可达的"根"——泄漏=业务逻辑断了引用,但 GC Roots 的链没断。
- 修复=断开 GC Roots 的引用链(remove/close/null)。

### 第二步扩展② 反例:泄漏排查的两种事故

- 事故一:堆增长就判断泄漏——可能只是缓存增长(正常行为,有上限)或数据量增长(业务需要)。
- 修复=对比 Full GC 后的堆使用(泄漏=Full GC 后不回落。
- 正常=Full GC 后回落到基线)。
- 事故二:MAT 只看大对象——泄漏的对象集合可能每个对象很小(百万个小 Entry)但总量大。
- 修复=按类分组看实例数(instance count 增长)。

### 第二步扩展③ 取舍:泄漏检测的自动化程度

- 手动排查(MAT 分析):准确但耗时。
- 自动化(堆增长告警+自动 dump 对比):及时发现但可能有误报(正常增长被误判)。
- 生产推荐:堆增长趋势告警(基线偏离)+定期自动 dump 对比+人工确认——自动发现+人工确认。

## 案例

### 第三步发散·验证与推演 验证:内存泄漏的走查核对

- 验证:六类泄漏场景各构造一个复现——静态 Map 不断 put→堆增长→Full GC 后不回落。
- ThreadLocal 不 remove→线程池中泄漏。
- 监听器不注销→事件源持有→泄漏。
- MAT 对比两个 dump 的增量(泄漏类 instance count 增长)——每个场景的复现与排查流程固化。
- 第 19 题 JVM 的容器 OOM 实测可复用。

### 第三步发散·追问扩展 追问链:泄漏三刀

- **Q1：内存泄漏与内存溢出的关系?**
  - 答：泄漏→持续增长→最终 OOM(泄漏是因,溢出是果);溢出也可能无泄漏(数据量增长/堆太小)——OOM 不一定是泄漏,泄漏不一定立即 OOM。
- **Q2：堆外内存的泄漏?**
  - 答：DirectByteBuffer 不受 GC 直接管理(Cleaner 兜底)+NMT 监控(第 33 题 JVM)——堆外泄漏的排查=Netty ByteBuf/DirectByteBuffer 的引用计数。
- **Q3：泄漏的修复验证?**
  - 答：修复后压测(同负载运行 24h)→堆增长平稳(不泄漏)→确认修复;修复的验证需要时间(短时间看不出)。

## 总结点

1. 六类场景:静态/监听/ThreadLocal/连接/缓存/内部类
2. Full GC 后不回落=泄漏信号
3. 预防(评审+扫描+监控)优于排查
