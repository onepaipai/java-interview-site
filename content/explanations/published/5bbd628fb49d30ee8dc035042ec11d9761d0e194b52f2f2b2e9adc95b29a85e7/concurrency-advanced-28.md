<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [OpenJDK 设计说明 · 1](https://openjdk.org/jeps/425)
- [OpenJDK 设计说明 · 2](https://openjdk.org/jeps/446)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：团队规划升级 JDK 21 使用虚拟线程，现有代码里每个请求链路挂了十几个 ThreadLocal。以 JDK 19+ 的虚拟线程语义为基准（Java 17 无虚拟线程，预览始于 JEP 425），说明百万级虚拟线程 × ThreadLocal 的内存放大与清理失效问题。

1. 内存放大：每个虚拟线程携带自己的 ThreadLocalMap；平台线程数百个、map 常驻可控，虚拟线程动辄百万——十几个 ThreadLocal 条目乘以百万线程就是可观的常驻内存，且多数条目在虚拟线程生命周期里根本没用过。
2. 清理失效：平台线程池靠"线程复用前 remove"治理泄漏；虚拟线程一次性用完即弃，泄漏变成另一种形态——载体线程不变、堆内存随线程对象整体回收，但海量短命 ThreadLocalMap 制造分配与回收压力。
3. 继承与传递：InheritableThreadLocal 在虚拟线程上语义进一步扭曲（见并发基础第 12 题的复制时机问题），上下文传递的正确方向是 ScopedValue 与结构化并发的共享变量（JEP 446 一系）。

## 参考分析

### 机制：ThreadLocal 的成本模型在线程数上翻倍

ThreadLocal 的代价 = 每线程一份 map + 每条目维护成本。平台线程模型下线程是稀缺资源，代价天然有界；虚拟线程把线程变成"几乎免费"的资源，ThreadLocal 成了唯一不免费的部分——多数线程根本不读某些值，却都要建表。类比给每间钟点房配一套完整的酒店行政办公桌：房间越多，桌子的总成本越失控。

### 边界：版本事实与迁移路径

Java 17 没有虚拟线程（JEP 425 预览在 19、转正在 21），本题为升级预研口径。迁移前先做两件事：审计 ThreadLocal 的真实使用（哪些是请求上下文、哪些是缓存复用）；把请求上下文迁往显式传参或 ScopedValue（JDK 21+），缓存类改并发容器。ThreadLocal 不是禁区，是要"少而准"。

### 取舍：ScopedValue 替代 ThreadLocal 的边界

ScopedValue 的值与作用域绑定、不可变、随作用域自动消失——没有清理责任、没有泄漏路径，代价是要求值不可变且作用域结构化。ThreadLocal 仍适合"跨多层调用传递的可变组件"（如事务资源句柄），但这类场景本身就该优先考虑显式参数化。升级虚拟线程前完成这轮改造，比上线后救火便宜得多。

### 底座：ThreadLocalMap 的弱引用键与经典泄漏链

ThreadLocalMap.Entry 继承 WeakReference<ThreadLocal<?>>：键（ThreadLocal 实例）是弱引用，值是强引用。经典泄漏链（平台线程池）：Thread → ThreadLocalMap → Entry(key=null) → value——ThreadLocal 实例被回收后键变 null，但 value 沿强引用链无法回收。设计意图：键弱引用让 map 能探测过期条目（expungeStaleEntry 在后续 set/get/remove 时顺手清理 null 键条目）；值强引用是局限（map 无法知道业务何时不再需要它）。治理：池化线程必须在任务边界 remove，别依赖被动清理。虚拟线程一次性回收掩盖了泄漏，却把成本转成规模风险（见机制块）——同一结构，两种失效形态。

## 案例

### 对照操作：内存放大的量化预估

教学推演（JDK 21 环境验证口径）：百万虚拟线程 × 每个 12 个 ThreadLocal 条目 × 每条目约 40 字节起，仅 map 结构即数百 MB 常驻；对照平台线程 200 个时同项不足 1MB。在 21 上用 JFR 对比改造前后的分配速率与驻留，Java 17 阶段以估算与审计为主。

### 追问：为什么说虚拟线程让 ThreadLocal "更便宜也更危险"

更便宜：虚拟线程的一次性生命周期让"忘记 remove"不再泄漏（线程整体回收）；更危险：海量线程让"每线程一份"的内存模型被无限放大，且 Inherits 复制语义在共享载体上更难推理。代价从"泄漏风险"迁移到"规模风险"，治理动作完全不同。

## 总结点

1. 百万线程配百万张桌
2. 池化清理失效，规模成新风险
3. 上下文走 ScopedValue，缓存走容器
