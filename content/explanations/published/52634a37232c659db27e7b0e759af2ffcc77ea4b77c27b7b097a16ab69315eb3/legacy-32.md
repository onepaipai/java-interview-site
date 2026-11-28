<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)
- [Java 17 GC 指南 · 2](https://docs.oracle.com/en/java/javase/17/gctuning/collectors.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银故障沙盘:SOE(栈满,递归无终止)vs OOM: Java heap space(堆满)——区域不同(栈 vs 堆),成因与排查完全不同(第 32 题 JVM 的完整版)。

1. SOE:虚拟机栈满——递归无终止/深度过大/栈帧过大;排查=栈顶方法(stack trace 第一个重复帧);配置=-Xss(默认 512K-1M)。
2. Heap OOM:堆满——泄漏(不再使用但可达)/大对象批量分配/堆太小;排查=heap dump(MAT dominator tree);配置=-Xmx 或修泄漏。
3. 其他 OOM:Metaspace(类泄漏)/unable to create native thread(线程数)/Direct buffer memory(堆外)——每种排查路径不同(第 77 题 JVM 详解)。

## 参考分析

### 第二步扩展① 机制:栈与堆的物理位置

- 栈=线程私有(每线程独立,大小 -Xss)。
- 堆=线程共享(全局,大小 -Xmx)。
- 栈总量=线程数×栈大小(第 11 题实测:4000/20000 线程均 2s 建完——保留≠提交)。

### 第二步扩展② 反例:OOM 混淆的两种事故

- 事故一:SOE 误判为堆 OOM——看到 OutOfMemoryError 就调 -Xmx(实际是递归)。
- 修复=看错误子类型。
- 事故二:线程 OOM 误调 -Xmx——unable to create native thread(线程栈空间不足)调堆无效。
- 修复=区分 OOM 子类型。

### 第二步扩展③ 取舍:-Xss 的设置

- 大=递归深但总线程少(内存=线程数×栈大小)。
- 小=可创建更多线程但递归受限——默认 512K-1M 足够绝大多数场景。
- 深递归业务→改迭代或增大 -Xss,同时监控线程总量。

## 案例

### 第三步发散·验证与推演 验证:两种 OOM 的走查核对

- 验证:SOE 复现(无限递归→stack trace 重复帧)。
- Heap OOM 复现(无限 new→OOM: heap space,heap dump)。
- 线程 OOM 复现(大量线程→OOM: native thread)——三种 OOM 形态与排查路径完全不同(第 32 题 JVM)。

### 第三步发散·发散要点 追问链:OOM 三刀

- **追问①·OOM 子类型**：heap/Metaspace/native thread/direct buffer——各走不同排查路径
- **追问②·-Xss 默认**：512K-1M(Linux x64 1MB);大部分方法栈帧<1KB
- **追问③**：SOE 可 catch(Throwable 子类)但栈已满,再调方法可能再 SOE——catch SOE 通常无意义(修代码)

## 总结点

1. SOE=栈满看栈顶,Heap OOM=堆满看转储
2. 子类型不同排查路径不同
3. -Xss 管栈深,-Xmx 管堆大小
