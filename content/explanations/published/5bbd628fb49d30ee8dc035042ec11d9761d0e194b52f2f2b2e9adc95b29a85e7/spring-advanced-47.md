<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银账务沙盘:工具类的 static SimpleDateFormat 在并发下日期错乱(内部可变状态被并发覆写);另一个 static 缓存 Map 无界增长。用"可变全局=并发 bug+内存泄漏双风险"说明治理清单。

1. 全局可变对象的两宗罪:并发安全(SimpleDateFormat 的内部 Calendar 并发错乱,经典事故)、生命周期(无界集合无人清理=慢泄漏,分布式 13 题画像)。
2. 治理三招:无状态化(工具方法纯函数)、实例化注入(有状态改 bean,生命周期归容器)、并发安全替代(ConcurrentHashMap/ThreadLocal 隔离/不可变快照)。
3. 扫描清单:static 可变字段(非 final、可变类型)、static Map/List/Date、单例里的可变成员——静态分析与 code review 双通道。

## 参考分析

### 机制:共享可变状态的两种故障

故障一,并发错乱:SimpleDateFormat.format 内部操作共享 Calendar,两线程交错→日期错乱或异常——低频偶发、难复现(数据错误型)。故障二,慢泄漏:static Map 做缓存无上限(分布式 13 题实测画像:基线单调抬升、Full GC 后高位横盘)——内存型。两者共同根因:全局可变状态的"共享写"。Java 17 的记录类与不可变集合让"不可变快照"成本低——优先不可变。

### 推演:治理前后对照(附泄漏画像证据)

对照:SimpleDateFormat static→DateTimeFormatter(不可变)或每次 new;static Map→Caffeine(上限+TTL)或 ConcurrentHashMap+容量告警。锚点(分布式 13 题,本机实验):代理对象保活→200 类在册,不保活→类卸载——"static 集合保活一切"的机制实证:
```
保活:GC.class_histogram -> 200 个 $Proxy 类在册
不保活:这些类从直方图消失
```
验证:治理对照为工程推演;static 保活机制为本机实测。

### 取舍:三类工具对象的归宿

纯函数工具(字符串/日期计算):无状态 static 方法,无风险——保留。有状态工具(缓存/计数器):升级为 bean(注入使用,生命周期与监控归容器)或明确命名空间的全局组件(单例+上限+监控)。配置常量(static final 不可变):保留——final+不可变类型(Records/List.of)无共享写问题。扫描规则的例外:static final 不可变集合与原子类(AtomicLong 计数)可接受——判据是"是否共享可变写"。

## 案例

### 验证:静态扫描(static 非 final 可变字段、单例 be

验证:静态扫描(static 非 final 可变字段、单例 bean 可变成员)清零;SimpleDateFormat 类替换后并发用例(多线程格式化)断言输出正确——并发与泄漏双回归。

### 追问链:全局状态三刀

一刀:"ThreadLocal 算全局可变吗?"——算变体:线程内全局,线程池复用即污染(第 19/8 题)——用完必 remove,框架类 ThreadLocal 要查清理路径。二刀:"单例 bean 的可变成员呢?"——同性质问题(第 47 题全局=单例):单例的实例字段被并发读写即共享可变——要么无状态要么并发安全容器。三刀:"怎么系统性发现?"——SpotBugs/ArchUnit 规则:static 非 final 可变字段告警;单例 bean 可变字段扫描;存量按"泄漏风险(是否集合)>并发风险(是否格式化器)"排序治理。

## 总结点

1. 全局可变,双罪并发
2. 无状态优先,有状态进容器
3. static final 不可变,才是安全区
