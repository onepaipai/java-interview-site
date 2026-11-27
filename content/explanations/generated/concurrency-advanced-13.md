<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/invoke/VarHandle.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：一个无锁结构的字段访问要在 plain、opaque、acquire/release、volatile 四档里选型，团队各执一词。按"可见性与有序性的实际需求"给出五档访问模式的选择表与误用示例。

1. plain：无可见性承诺，单线程访问的字段用它——最便宜，也最容易被并发场景误用。
2. opaque：保证读到最新写入的值，但不约束周边操作的顺序——只求"标志位可见"的场景。
3. acquire/release：一档有序——release 写之前的写对 acquire 读之后可见，适合发布数据（写数据后 release 发布标志）；比 volatile 少一个方向的屏障，成本更低。
4. volatile：全序双向——需要读写都构成完整 happens-before 时用；另有 getAndAdd、compareAndSet 等原子模式做读改写，等价于 AtomicXxx 但作用于普通字段。

## 参考分析

### 第二步扩展① 机制：四档是"承诺强度"的阶梯

- plain 是便签（可能被缓存看不到），opaque 是广播（听得到最新版，不保证节目顺序），acquire/release 是挂号信（发布方之后的、接收方之前的都有序），volatile 是双向公证。
- 类比选档：按"读者需要看到什么"倒推写方承诺，不上不下的浪费与不足都要避免。

### 第二步扩展② 反例：三档误用的现场

- 误用一：把 opaque 用在"先写数据再置就绪标志"的发布场景——标志可见了，数据写可能还不可见，需 release/acquire 或 volatile。
- 误用二：全字段 volatile——把只有单线程访问的配置字段也加上全序，白白付出屏障成本。
- 误用三：用 plain 存停止标志——经典可见性丢失（并发基础第 37 题）。

### 第二步扩展③ 取舍：VarHandle 与 AtomicXxx 的分工

- VarHandle 把原子能力带给任意字段（不必把字段包装成 AtomicReference 对象），并提供五档渐变。
- AtomicXxx 是封装好的现成组件。
- 字段是热点路径的一部分且需要档位控制——VarHandle。
- 常规计数与引用替换——AtomicXxx 更简单。
- 两者语义档位一一对应，混用时保持同一字段同一档位。

## 案例

### 第三步发散·验证与推演 对照操作：同场景四档对照

- 教学验证：发布场景（写 payload 再置 flag）分别用 opaque、release/acquire、volatile 实现，读线程校验 payload 可见性。
- 预期：opaque 版本出现数据未就绪，release 版本正确且基准优于 volatile。
- 实验可复跑（jcstress 更严谨），把选档表钉在实际行为上。

### 第三步发散·追问① 追问：access mode 与 memory ordering 是两个维度吗

- 是。
- 访问模式管"怎么改"（get/set/CAS/getAndAdd），内存序管"改了谁能看到、以什么顺序"——两者正交组合。
- 面试里能把 getAndAdd（原子模式）与 setRelease（序模式）分开论述，就证明理解了 VarHandle 的二维设计，而不是把它当"更快的 volatile"。

## 总结点

1. plain 便签，opaque 广播
2. 发布用 release，全序才 volatile
3. 一个字段一个档位，混用必踩坑
