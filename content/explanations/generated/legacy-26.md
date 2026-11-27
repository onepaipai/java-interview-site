<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)
- [Java 17 GC 指南 · 2](https://docs.oracle.com/en/java/javase/17/gctuning/collectors.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银应用沙盘:OOM 发生在哪个区域?JVM 内存分区各有用途与 OOM 形态——堆/栈/元空间/程序计数器/本地方法栈。

1. 线程私有:程序计数器(字节码行号)+虚拟机栈(栈帧,SOE)+本地方法栈(Native);线程共享:堆(对象,GC 主战场)+元空间(类信息,JDK 8 替代永久代,用本地内存)。
2. 堆细分:新生代(Eden+Survivor From/To)与老年代;对象优先 Eden 分配,大对象直接进老年代(Humongous);TLAB 每线程私有分配缓冲(无锁)。
3. OOM 按区域:heap space(堆满)/Metaspace(类泄漏)/unable to create native thread(线程数超限)/Direct buffer memory(堆外)——每种排查路径不同。

## 参考分析

### 第二步扩展① 机制:线程私有与共享的生命周期

- 线程私有随线程创建销毁(栈帧随方法进出)。
- 共享区域随 JVM 存活(堆 GC 管理,元空间按类加载卸载)。
- 类比办公楼:工位按员工分配回收,会议室按需预订,档案室按项目存档。

### 第二步扩展② 边界:三种 OOM 的事故

- SOE:递归无终止→栈满(看栈顶定位)。
- 元空间 OOM:CGLIB 代理持续生成不卸载(排查类加载器泄漏)。
- 堆 OOM:内存泄漏或大对象(dump 分析 dominator tree)。
- 每种 OOM 的区域决定排查路径。

### 第二步扩展③ 取舍:堆大小与区域比例

- -Xms=-Xmx(生产相等避免扩容)+-XX:NewRatio+SurvivorRatio+-XX:MetaspaceSize——依据=负载画像(对象大小/存活率/分配速率)与压测校准,不是默认值。

## 案例

### 第三步发散·验证与推演 验证:内存区域的实测走查

- 验证:-Xlog:gc+heap=info 查看堆布局。
- NMT 查看各区域 committed。
- OOM 各形态可构造复现(堆 OOM=无限 new/栈 SOE=无限递归/元空间=循环生成代理)。
- NMT 三种口径互不相等(第 19 题 jvm-advanced 实测)。
- 预期:实测与理论分区对应。

### 第三步发散·发散要点 追问链:内存三刀

- **追问①·堆外内存**：DirectByteBuffer(NMT 监控,Cleaner 兜底,第 33 题)
- **追问②·元空间 vs 永久代**：本地内存 vs 堆内(JDK 8 移除永久代);字符串常量池 JDK 7 起在堆
- **追问③·栈帧**：局部变量表+操作栈+动态链接+返回地址;-Xss 设栈大小(第 11 题线程栈实测 4000/20000 线程)

## 总结点

1. 线程私有:计数器+栈;共享:堆+元空间
2. OOM 按区域分类排查
3. 堆是 GC 主战场,元空间本地内存
