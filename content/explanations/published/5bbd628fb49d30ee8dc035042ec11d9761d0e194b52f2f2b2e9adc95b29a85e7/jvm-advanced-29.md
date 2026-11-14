<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 GC 指南 · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-g1-tuning.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/io/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银对账单下载沙盘:单个响应体 20MB JSON,高峰期 GC 频率与 P999 同步恶化。拆解大 JSON 的内存链路(解析树、字符串膨胀、临时缓冲)与延迟链路(分配压力、大对象、序列化 CPU),给出流式改造路径。

1. 堆链路:20MB JSON 解析成对象树通常膨胀 3-10 倍,加上字符串与临时缓冲,单请求堆账可达百 MB,直接改写 GC 频率与晋升曲线。
2. 延迟链路:序列化与解析是纯 CPU,大响应挤占核;大数组成为 Humongous 候选;响应期间分配曲线突刺触发更早的并发标记。
3. 改造优先流式:分页限界、流式序列化(JSON generator)、按需字段;参数侧只是兜底(调大 region 或直接内存池),治标不治本。

## 参考分析

### 机制:一份 20MB 响应的内存放大账

以 Jackson 解析为例:JSON 文本 20MB,char[]/byte[] 存一份;解析成 JsonNode 树,每个节点是对象加字段引用,树结构膨胀 3-5 倍;再绑定业务对象又一份。峰值同时存在文本、树、业务对象三份。若响应里含大数组,数组本身可能超 region 一半成为 Humongous(实测判定线:超过 region/2,64MB 堆下 600KB 即触发,见批 1 证据)。分配速率因此出现尖刺,GC 行为从"背景噪音"变"主导因素"。

### 反例:分页缺失引发的雪崩链

对账导出一次拉全量(20MB),并发 10 个请求即 200MB 瞬时堆账加数十个 Humongous 候选;实测形态映射:Humongous regions 暴涨(对照批 1:54 个 region 占 64MB 堆 84%)、to-space 紧张触发 evacuation failure(对照批 1:855 次 To-space exhausted)、P999 击穿。故障链的每一环都有本机实测对应,唯一无法本机复现的是生产并发规模——归因靠日志对齐,不靠想象。

### 取舍:流式与分页的工程账

分页是第一优先:响应按 1-5MB 切页,前端增量拉取,堆账立即降一个量级。流式序列化:Jackson generator 直接写 socket 流,树与业务对象不完整驻留;流式解析同理(逐条处理对账记录)。字段裁剪:审计日志类大字段拆独立接口。参数兜底:若业务确实需要 10MB+ 单对象,调大 G1HeapRegionSize 让其脱离 Humongous,但 region 变大的副作用(碎片、粒度)要回归验证——参数永远排在改造之后。

## 案例

### 推演:从单请求内存账到 GC 行为(附本机对应证据)

内存账推演:20MB 文本+树 60-100MB+业务对象≈单请求峰值 150MB 级。GC 行为对应(本机实测锚点):Humongous 判定与回收行为见 hum.log(Humongous regions 29->15/54->0);分配突刺下的疏散压力见 evac.log(To-space exhausted 855 次);GC 频率与分配速率的线性关系见批 1 速率实验。验证方式:构造 1MB/5MB/20MB 三档响应的压测对照 GC 频率与 P999(待在类生产环境补测,标注)。

### 追问链:大 JSON 三刀

一刀:"为什么不直接换二进制协议?"——协议换了放大系数变小(3-10 倍到 1-2 倍),但分页缺失的问题还在;先修结构问题再谈编码。二刀:"序列化 CPU 怎么省?"——字段级零拷贝(不建中间树)、复用 ObjectMapper(它是线程安全的,每次 new 也是分配热点)、热点路径考虑手工生成器;CPU 省下来的是别的请求的延迟。三刀:"响应体大小监控怎么做?"——APM 记响应字节数分位,P99 响应体超 2MB 即告警;把"大响应"变成可观测指标,而不是等 GC 告警才发现。

## 总结点

1. 文本树对象,三份叠峰值
2. 大数组进专区,疏散先告急
3. 分页流式裁字段,参数排最后
