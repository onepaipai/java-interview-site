<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/ArrayList.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银风控清单沙盘:遍历黑名单时删除命中项——抛 ConcurrentModificationException(fail-fast);安全删除三法:iterator.remove/removeIf/并发容器。

1. fail-fast 机制:集合维护 modCount(结构修改计数)——迭代器创建时记录 expectedModCount,每次 next/remove 前校验 modCount==expectedModCount,不等抛 CME——设计目标是尽早暴露并发修改 bug,不是保证(fail-fast 只是尽力而为)。
2. 安全删除三法:iterator.remove()(通过迭代器删,同步维护 expectedModCount/modCount);collection.removeIf(Predicate,JDK8 内部用迭代器删,语义清晰);并发容器 CopyOnWriteArrayList(写时复制,迭代旧快照,弱一致)或 CHM 条目遍历。
3. 易错场景:for-each 中 list.remove(i)——直接改 modCount,下一轮 next 抛 CME;倒序 for 循环按索引删(只对 ArrayList 这类可随机访问且删后索引可控的场景可行,通用性差);遍历 Map 删除需 entrySet().iterator().remove 或 removeIf。

## 参考分析

### 机制:modCount 为什么不能被迭代器删绕过

iterator.remove 先调 list 的删除(改 modCount)再把 expectedModCount=modCount(同步)——所以迭代器自己的删除不触发校验失败;而 list.remove 绕过迭代器只改 modCount——期望值与实际值脱节。类比:只有持票人能改票面座位号,别人改了票就作废(检测到外部改动)。

### 反例:删除的两种事故

事故一:for-each 删第一个命中后继续遍历——CME 在下一次 next 抛出(有时滞后到 hasNext 才抛,给人偶然不抛的假象);修复=removeIf。事故二:依赖 fail-fast 保证正确性——modCount 校验无同步保证,并发下可能漏检(Javadoc 明示 fail-fast 不可依赖);真正的并发安全靠并发容器或锁。

### 取舍:三法的适用边界

单线程+条件删:removeIf(首选,代码短);需要删除时做额外动作:iterator.remove;并发读写并存:CopyOnWriteArrayList(读多写少)或加锁(写多)——并发容器遍历的是快照/弱一致,不是 fail-fast。

## 案例

### 验证:fail-fast 的实测走查

验证:CME 断言(for-each 中 remove→CME,且 hasNext 偶发不抛的滞后现象);iterator.remove 断言(删除顺利+modCount 同步);removeIf 断言(等价于迭代器删);CopyOnWriteArrayList 断言(遍历中并发写不抛 CME,读到旧快照)——四组固化删除语义,本机可复跑。预期:fail-fast 抛出时机与 modCount 校验点一致。

### 追问链:fail 三刀

一刀:fail-safe 对比=CopyOnWrite/COW 迭代快照不抛 CME(代价:内存复制+弱一致)。二刀:modCount 也用于 subList 视图校验(原集合结构性修改→视图操作抛 CME)。三刀:Map 遍历删=entrySet removeIf(CHM 用 entry 迭代器 remove 或 values removeIf——弱一致)。

## 总结点

1. fail-fast=modCount 校验,尽早暴露 bug
2. 安全删:iterator.remove/removeIf/COW
3. fail-fast 不可依赖为正确性保证
