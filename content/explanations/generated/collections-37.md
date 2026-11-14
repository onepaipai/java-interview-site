<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/WeakHashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银缓存沙盘:WeakHashMap 当缓存(键弱引用,GC 自动清)——不能:值强引用键(值持有键的字段→键永不清)、无 TTL/容量上限、无过期回调——WeakHashMap 是"键生命周期跟随外部"的映射,不是缓存。

1. WeakHashMap 的真实语义:键被 GC 后条目自动移除(expungeStaleEntries 在访问时清理)——适合"键的生命周期由外部管理"的场景(对象附加元数据:ThreadLocal 的替代、监听器关联)。
2. 当缓存的三个缺口:值持键(缓存值对象含键引用[如 CacheEntry(key, value)]→键强可达→永不清除——泄漏)、无淘汰策略(只有 GC 压力触发,内存不足才清——不可控)、无 TTL(过期语义缺失)。
3. 正确替代:通用缓存用 Caffeine(TTL/容量/统计,第 6 题);"对象附加元数据"用 WeakHashMap(元数据跟随对象生死)——语义匹配才是关键。

## 参考分析

### 机制:弱引用与清理时机

弱引用:键被 WeakReference 包装——GC 回收键(无强引用)后,条目进 ReferenceQueue;WeakHashMap 在下次访问(expungeStaleEntries)时移除对应条目——清理时机=下次 get/size 等(被动,不及时)。值持键的陷阱:CacheEntry(key, value) 的 value 字段引用 key→键强可达(经 value)→弱引用失效→永不清理——经典泄漏(值的设计要避开键)。

### 反例:WeakHashMap 当缓存的事故

事故一,值持键泄漏:缓存 entry 的 value 引用 key(哪怕间接:值对象持有 key 的字段)——WeakHashMap 永不清——内存涨到 OOM。事故二,清理不及时:无访问则不清(哪怕 GC 已回收键)——内存峰值依赖 GC 调度(不可控)。事故三,无淘汰语义:业务要求"1000 条上限"——WeakHashMap 无容量概念。三条的正解:缓存语义(容量/TTL/淘汰)交给 Caffeine;WeakHashMap 只做"元数据跟随对象"的窄用途。

### 取舍:WeakHashMap 的合法场景

场景一,对象元数据:给第三方对象(不能改类)附加信息——WeakHashMap<Object, Meta>(对象销毁,元数据随走)——生命周期跟随。场景二,临时关联:监听器关联(ThreadLocal 的替代——线程退出自动清)——避免强引用阻止回收。判据:键的生命周期"由外部决定"且"元数据与键同生共死"——这才是 WeakHashMap 的语义。

## 案例

### 验证:语义边界的断言组

验证:自动清理断言(键失去强引用+触发访问后,条目消失——GC 配合的用例[System.gc()+访问]);泄漏断言(值持键的形态:条目永不消失——泄漏实证);替代对照(Caffeine 的 TTL/容量行为——WeakHashMap 缺失的能力清单)——三组固化语义边界。

### 追问链:WeakHashMap 三刀

一刀:"值持键怎么防?"——值设计不含键(值只含派生数据)+自查(值的可达路径审计)——防泄漏的设计纪律。二刀:"清理的主动性?"——无主动清理 API(expunge 私有)——定期 size 检查(间接触发清理)——清理的被动性是它的本质缺陷。三刀:"与 WeakReference 手写的对照?"——WeakHashMap=封装好的弱键映射;复杂需求(值持键+主动清理)→手写 WeakReference+ReferenceQueue(第 29 题 C2 的原理层)——复杂场景手写,简单场景用容器。

## 总结点

1. WeakHashMap 是元数据映射,不是缓存
2. 值持键=永不清除
3. 缓存语义交给 Caffeine
