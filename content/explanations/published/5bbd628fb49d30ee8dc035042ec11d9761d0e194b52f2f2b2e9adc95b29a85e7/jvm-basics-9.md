<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html)
- [Java 17 GC 指南 · 2](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：排查一个"对象明明没人用却不回收"的问题，需要从 GC Roots 出发解释可达链。整理 HotSpot 的根来源清单，并给出用工具验证某对象为何存活的方法。

1. 线程栈：每个活跃线程栈帧里的局部变量表与操作数栈引用，是最动态、最常见的根。
2. 静态字段与运行时常量池：类被加载期间其静态引用字段都是根；系统类加载器加载的类几乎终身存活。
3. 跨运行时边界：JNI 全局引用与本地代码持有的引用、活跃中的线程对象本身、JVM 内部结构（如系统类加载器、异常表里的异常类），以及正被同步锁持有的对象。

## 参考分析

### 机制：根是"从外面进入堆的门"

GC 只能回收堆内对象，而"外面"（栈、类、本地代码）对堆的每一次伸手都是一个根。类比仓库门口的登记簿：工人手里的提货单（栈帧）、公告栏钉着的常期订单（静态字段）、外部合作方的长期合同（JNI）都构成入口。入口登记得越准，误删风险越小——这正是安全点要冻结线程状态的原因。

### 边界：常被漏数的三个来源

一是同步锁：被 synchronized 持有的对象在临界区内是根，锁退出前不会被回收。二是类加载器自身及其加载的全部类——自定义加载器活着，它加载的类与类的静态字段全是根（见第 38 题）。三是 JVM 内部引用（如基本类型 Class 对象、常驻异常对象），MAT 里以 "Unreachable objects" 之外的 system classes 呈现。

### 取舍：用工具读根，不靠背清单

清单用于建立直觉，实际排查用证据链：JFR 的 OldObjectSample 记录长寿命对象分配点；MAT 的 GC Roots 路径（Path to GC Roots，排除弱/软/虚引用）给出具体存活理由；`jcmd GC.class_histogram` 看类级分布。能说出"这个对象经哪条路径从哪个根可达"，比背十来源清单更有说服力。

## 案例

### 对照操作：Path to GC Roots 实战

教学验证：静态 List 不断 add 新对象后触发 Full GC，堆转储用 MAT 打开。预期：这些对象经 `static field -> ArrayList -> elementData -> 元素` 的路径从系统类可达；把 List 置 null 再转储，同样对象变为 Unreachable。转储前后对照可复跑，是"根决定存亡"的直接演示。

### 追问：ThreadLocal 值为什么会成为根的下游

ThreadLocalMap 的键是弱引用（下次 GC 清键），但值是强引用，从线程对象可达。线程池线程不死，值就一直从"线程"这个根可达——这正是 ThreadLocal 泄漏的根因（并发模块第 11 题）。用"根路径"视角能把它讲成 GC 问题而不是 API 使用问题。

## 总结点

1. 栈、静态、JNI 三类门，锁也拦人
2. 根决定存亡，路径给理由
3. MAT 读根路径，别背清单
