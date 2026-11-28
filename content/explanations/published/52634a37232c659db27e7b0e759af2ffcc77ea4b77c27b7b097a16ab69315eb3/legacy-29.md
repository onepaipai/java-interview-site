<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ref/SoftReference.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银缓存沙盘:强(永不回收)/软(内存不足回收,缓存)/弱(下次 GC 回收,映射)/虚(通知,堆外清理)——四种引用=GC 的四种容忍度。

1. 强引用:GC 永不回收——常规对象;软引用:内存不足时回收——可丢失缓存;弱引用:下次 GC 必回收——WeakHashMap(key 回收 entry 移除);虚引用:get() 恒 null,仅回收通知——DirectByteBuffer 的 Cleaner。
2. 引用队列 ReferenceQueue:软/弱/虚可关联——对象被回收时引用入队(程序轮询做清理);Cleaner(Java 9+)=虚引用+队列封装(无复活风险,替代 finalize,第 11 题 JVM)。
3. ThreadLocal 的弱引用 key:ThreadLocalMap Entry extends WeakReference<ThreadLocal<?>>——key 弱引用(ThreadLocal 回收后 key=null),value 强引用(泄漏链,第 72 题)。

## 参考分析

### 第二步扩展① 机制:回收强度是 GC 的容忍度

- 强=不容忍(GC 不回收)/软=容忍内存不足时回收/弱=容忍下次 GC 回收/虚=完全容忍(不影响生命周期)——类比租约:强=永久,软=可短租,弱=随时退租,虚=只通知不占房。

### 第二步扩展② 反例:引用误用的两种事故

- 事故一:软引用做主存储——高内存压力下大面积回收→命中率骤降。
- 修复=软引用只做二级缓存。
- 事故二:虚引用 get()——虚引用 get() 恒 null(与软/弱不同)——用途是回收通知不是延迟获取。

### 第二步扩展③ 取舍:引用与内存策略匹配

- 缓存=软引用(内存不足自动回收)+LRU。
- 数据安全=强引用+显式 null。
- 资源清理=虚引用+Cleaner(不复活)+显式 close——引用类型是 GC 的指令,选错=回收时机不可控。

## 案例

### 第三步发散·验证与推演 验证:四种引用的走查核对

- 验证:强引用断言(置 null 后才回收)。
- 软引用断言(-Xmx 小堆+大量分配→回收)。
- 弱引用断言(System.gc()→get()==null)。
- 虚引用断言(get()==null 但 queue.poll() 有值)——四组固化回收时机(本机可复跑)。

### 第三步发散·发散要点 追问链:引用三刀

- **追问①**：ThreadLocal 弱 key(第 72 题泄漏链)
- **追问②**：WeakHashMap(key 弱→entry 自动移除,value 非弱)
- **追问③·Cleaner vs finalize**：无复活+可注册多+显式 clean(第 12 题 JVM)

## 总结点

1. 强=不回收,弱=下次 GC 必回收
2. 软引用适合缓存,弱引用适合映射
3. 虚引用=通知,Cleaner 替代 finalize
