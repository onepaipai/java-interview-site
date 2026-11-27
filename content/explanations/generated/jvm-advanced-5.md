<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-g1-tuning.html)
- [Java 17 GC 指南 · 2](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银交易查询服务沙盘:老年代缓慢增长,团队不确定 mixed GC 是否在有效清理,以及何时该担心老年代"只进不出"。用两次实测对照说明 mixed 的触发条件、回收边界与判读方法。

1. mixed 不是定时任务:老年代占用跨过 IHOP 触发并发标记,标记结束后才有若干次 mixed young GC,顺带疏散高垃圾占比的老年代分区。
2. 关键判据是分区垃圾占比:G1 只回收"划算"的老年代分区,回收价值低于 G1HeapWastePercent(默认 5%)时 mixed 不发生。
3. 分析老年代增长要分三类:标记前的正常堆积、标记后 mixed 能清的部分、mixed 也清不掉的存活体(那是容量或泄漏问题的信号)。

## 参考分析

### 第二步扩展① 机制:IHOP 到 mixed 的完整链条

- 老年代占用达到 InitiatingHeapOccupancyPercent(默认 45%,支持自适应)触发并发标记周期。
- 标记确认存活后,G1 在后续若干次 young GC 里把高垃圾占比的老年代分区并入 CSet,日志显示为 Pause Young (Mixed)。
- 实测(128MB 堆,IHOP=15,晋升后整批丢弃模式):22 次 mixed,例如 Pause Young (Mixed) 90M->81M(128M) 1.131ms。
- 回收边界由并发标记的存活信息决定,mixed 自己不再做全堆标记。

### 第二步扩展② 反例:老年代满了标记照跑,mixed 一次不来

- 对照组实测:同样的分配负载,但存活对象长期持有(老年代分区几乎全活)。
- 结果:66 轮 Concurrent Mark Cycle 照常触发,Pause Young (Mixed) 次数为 0。
- 原因:老年代分区垃圾占比低于 G1HeapWastePercent 的 5%,疏散不划算,G1 选择只做 young。
- 这推翻了"标记完必有 mixed"的直觉——mixed 是划算才做,不是标记的必然产物。
- 这个形态正是缓存型服务的典型画像:老年代高占用但低垃圾,查 mixed 次数永远查不出问题。

### 第二步扩展③ 取舍:让 mixed 有活干的两条路

- 其一,业务侧制造可回收的老年代垃圾:批处理数据用完即弃、缓存设上限并定期淘汰,让老年代分区出现高垃圾占比。
- 其二,参数侧在确认"垃圾确实存在但 mixed 不动"时,提高 G1HeapWastePercent(如 10)或降低 IHOP 让标记更早介入。
- 两者都改变回收成本曲线,要连观察三次以上完整周期再定。
- 老年代只进不出且 mixed 无货可收时,问题已经不在 GC 参数,在对象生命周期设计。

## 案例

### 第三步发散·验证与推演 实证:mixed 触发与不触发的对照

- 触发组命令:-Xms128m -Xmx128m -XX:InitiatingHeapOccupancyPercent=15 -Xlog:gc* MixedExp2(每轮 3.8MB 分配,4 轮后整批晋升对象失效)。
- 输出:22 次 Pause Young (Mixed),样例 90M->81M(128M) 1.131ms。
- 对照(存活密集)输出:Concurrent Mark Cycle 66 次、mixed 0 次。
- 验证:两组差异只在存活模式,回收器与参数相同,结论可归因到垃圾占比。

### 第三步发散·追问扩展 追问链:mixed 三刀

- **Q1：mixed 会不会把暂停拖长?**
  - 答：会,老年代分区疏散比 Eden 贵,G1 按暂停目标把 mixed 分摊到多次 GC,单次实测仅 1.1ms 量级,但要防存活突增时单次超标。
- **Q2：IHOP 自适应是什么?**
  - 答：G1 会按标记耗时与老年代填充速率动态调整 IHOP(MaxGCPauseMillis 等参与计算),日志可见 adaptive IHOP 值,固定 45 是旧行为。
- **Q3：老年代增长曲线怎么判读?**
  - 答：标记前阶梯上升是正常,mixed 后台阶下降是健康;若 mixed 后高位横盘且每次标记后基线抬升,先查缓存无上限与静态集合,再谈扩堆。

## 总结点

1. 跨线先标记,划算才 mixed
2. 全活不回收,五折线说了算
3. 只进不出查缓存,扩堆是最后一步
