<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/instrument/package-summary.html)
- [github.com · 2](https://github.com/openjdk/jdk17u/blob/master/src/hotspot/share/share/prims/jvm.cpp)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银营销活动沙盘:活动开始 10 分钟后 GC 频率翻倍,怀疑某次发布引入分配热点。给出从"确认速率升高"到"定位到代码行"的排查链路,含本机定位实验。

1. 先确认事实:GC 日志反推分配速率(每次回收间的堆增量除以时间),对比发布前后同型曲线,排除流量因素。
2. 定位靠分配剖析:JFR 的 ObjectAllocationSample(实测 profile 档 8 秒 120 条)给出大分配的类型与栈,jmap -histo 看堆内类型分布。
3. 代码归因常见三类:日志拼接、临时对象循环、大数组/大字符串构造;修法分别是结构化日志、对象复用、流式处理。

## 参考分析

### 机制:从 GC 日志反推分配速率

每次 young GC 日志给出堆用量迁移(如 25M->5M),两次 GC 间的时间差可得速率:rate≈(前次回收后堆量差值加回收量)/时间。速率升高但流量不变,说明单请求分配变多。JFR 的 ObjectAllocationSample 按对象大小采样并记录分配栈,是对"哪里在分配"的直接回答;实测 8 秒拿到 120 条样本,足够排序出大头。注意采样偏置(样本按大小加权,小对象欠采样),排序结论要用堆直方图交叉验证。

### 反例:被流量假象带偏的排查

活动期间 QPS 从 200 涨到 800,分配速率涨 4 倍——这不是代码回归,是流量放大;若此时按"代码热点"去修,方向就错了。判定:速率/QPS 的单请求分配量是否变化。实测对照里 CmpExp 每轮固定 15 万次分配,速率只与轮次线性相关;生产里把速率除以 QPS 得到单请求分配字节,发布前后对比这个归一化值,流量因素被消掉,剩下的才是代码变化。

### 取舍:三类热点的修法与验证

日志拼接热点(高频 debug 日志拼大字符串)改为占位符或条件输出,验证看速率回落与 CPU 下降;循环内临时对象(如每轮 new 解析器)提为复用或池化,验证看 TLAB 分配次数(JFR ObjectAllocationInNewTLAB 事件);大数组构造(一次性组装大 JSON)改流式写出,验证看 Humongous regions 增速归零。每类修改都要在预发同负载验证,别在高峰直接上。

## 案例

### 实证:分配剖析的最小闭环

命令与输出(Java 17.0.17):
```
java -XX:StartFlightRecording=duration=8s,filename=probe2.jfr,settings=profile ...
jfr summary probe2.jfr
  jdk.ObjectAllocationSample  120
```
配合 -Xlog:gc* 反推速率:每次 young GC 的堆迁移量(如 25M->5M)与间隔可得 MB/s。验证:对本机负载,速率与每轮分配字节数线性吻合;生产操作时先取两份(发布前后)再对比归一化速率,避免流量误判。

### 追问链:分配定位三刀

一刀:"为什么不直接上堆转储?"——堆转储是瞬时快照且 STW 长秒级,分配热点是速率问题,采样剖析更贴合;快照留给泄漏排查。二刀:"采样偏置会不会误导?"——会,ObjectAllocationSample 偏向大对象,小而多的对象被欠采样;用 jmap -histo(全量)与 JFR(带栈)交叉,结论才稳。三刀:"速率多高算高?"——没有绝对阈值,与堆、回收器、SLO 相关;实用判据是"速率变化率"——单请求分配字节环比突增即值得立案,绝对值交给容量规划。

## 总结点

1. 速率除以流量,归一才可比
2. JFR 采样看栈,直方图看面
3. 修日志改循环拆大对象,逐项验证
