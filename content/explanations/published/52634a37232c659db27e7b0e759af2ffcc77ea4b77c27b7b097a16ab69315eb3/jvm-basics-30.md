<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/OutOfMemoryError.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：值班同学遇到 OOM 第一反应是调大 Xmx，结果三类 OOM 里两类没解决还拖垮了容器。把 OOM 按错误信息分类，说明哪些与堆无关、扩堆的正确前提。

1. 不是。OOM 是一族错误：Java heap space（堆）、Metaspace（类元数据）、Direct buffer memory（直接内存）、unable to create native thread（线程资源）、GC overhead limit exceeded（回收收益过低）——只有第一类与 Xmx 直接相关。
2. 扩堆前必须看三件事：错误信息指哪个区、heap dump 里是否真有"堆不下的合理对象"、容器内存上限还剩多少余量。盲调 Xmx 在容器里等于把 OOM 从 Java 层推给 cgroup kill。
3. GC overhead limit 与 unable to create native thread 更危险：它们说明堆或资源结构本身失衡，扩堆只会让进程更早被系统杀掉。

## 参考分析

### 第二步扩展① 机制：OOM 报的是"某资源申请失败"

- 每一类 OOM 都对应一种资源账本：堆看 Xmx，类看 MetaspaceSize，直接内存看 MaxDirectMemorySize，线程看 Xss×线程数与系统限制。
- 类比各仓库都有自己的库存上限，爆仓时报的是各自仓库的名字——按名字找仓库，而不是把所有仓库都扩建。

### 第二步扩展② 反例：两个扩堆翻车现场

- 现场一：Metaspace OOM 起因是 CGLIB 无限生成类，扩堆没用，扩 MetaspaceSize 只会延后爆炸，正解是停止生成（见第 37 题）。
- 现场二：Direct buffer OOM 调大 Xmx，直接内存一分没多，进程 RSS 反而先撞 cgroup——正解是 MaxDirectMemorySize 与缓冲池化（见第 33 题）。

### 第二步扩展③ 取舍：扩堆的合法前提

- 堆 OOM 且转储显示存活对象是业务合理的（大查询、批量任务峰值），扩堆成立。
- 同时确认容器 limit 同步扩大且堆内无泄漏。
- 若存活对象本身就是泄漏，扩堆只是买时间（见第 29 题）。
- 一句话流程：先分类 → 再看证据 → 最后动参数。

## 案例

### 第三步发散·验证与推演 对照操作：三类 OOM 的错误信息对照

- 教学验证：分别制造 heap space、Metaspace、Direct buffer 三种 OOM，对照错误文本与触发参数。
- 预期：错误名字指向不同资源，堆转储只有第一种能给出"大对象"证据。
- 三段现场并排，就能训练值班同学"先分类再动手"，实验可复跑。

### 第三步发散·追问① 追问：unable to create native thread 该查什么

- 查线程数与资源：jstack 数线程、`ulimit -u` 与容器 pids 上限、Xss×线程数的栈内存合计。
- 它常见于"线程池无界 + 每请求一线程"设计，正解是限流与池化（见第 32 题），与堆毫无关系。

## 总结点

1. OOM 是一族，名字先分类
2. 扩堆先看 dump，容器看余量
3. 线程与直接内存，扩堆救不了
