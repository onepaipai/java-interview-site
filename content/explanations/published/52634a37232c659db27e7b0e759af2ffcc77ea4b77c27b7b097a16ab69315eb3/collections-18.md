<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银缓存沙盘:HashMap 可以存 null 值(get 返回 null 有歧义),CHM 拒绝 null——歧义问题:map.get(k)==null 无法区分"键不存在"与"值就是 null"——并发下这个歧义不可接受(无法用 containsKey 二次确认的原子性代价)。

1. 歧义的本质:HashMap 单线程可以 get+containsKey 二次确认(两次调用之间无并发修改);CHM 并发下两次调用之间状态可能变(containsKey=true 但 get 时已删)——二次确认失效,歧义无解→设计上拒绝 null。
2. 与本机实验呼应(C2/col-18 推演):CHM put(null) 直接 NPE——错误前移到入口(而不是并发时的诡异行为)。
3. 迁移影响:HashMap 代码迁 CHM 时 null 值处理要显式(Optional/哨兵对象 NULL_VALUE/拆分"存在与值"两层)——迁移清单项。

## 参考分析

### 第二步扩展① 机制:歧义与并发的不可调和

- 单线程的消解:HashMap.get 返回 null→containsKey 区分(两步之间无并发,可靠)。
- 并发的失效:CHM 两步之间另一线程 remove→containsKey(true) 但 get(null)——判断错误。
- 或反向——语义不确定。
- 设计选择:与其留歧义(调用方各自防),不如类型上拒绝(null 进不来)——错误从运行时诡异性变成入口 NPE(第 25 题分布式"错误前移"同构)。

### 第二步扩展② 反例:null 歧义的事故形态

- 事故一,缓存穿透误判:CHM.get(k)==null 判"未缓存"→重复加载(实际缓存的就是 null 语义的"不存在")——穿透防护失效(第 15 题分布式)。
- 事故二,HashMap 迁 CHM 的 NPE 风暴:存量代码 put(k, null)(HashMap 合法)迁 CHM 批量 NPE——迁移清单遗漏 null 审计。
- 两条的正解:哨兵对象(NULL_VALUE 常量,区分"未缓存"与"缓存了空")或 Optional 包装。

### 第二步扩展③ 取舍:哨兵与 Optional 的选择

- 哨兵对象:缓存内部用 NULL_VALUE 常量占位(穿透防护:缓存"不存在"的结果)——对外转 Optional 或抛查——性能优(无分配)。
- Optional:对外接口返回 Optional.ofNullable——语义清晰(调用方强制处理)。
- 分配成本(每次 Optional 对象)。
- 选择:内部缓存哨兵,对外接口 Optional——内外分层。
- HashMap 的 null 合法性:单线程场景 null 值有表达力(值缺失的显式存储)——工具性差异,按并发需求选容器(第 2 题)。

## 案例

### 第三步发散·验证与推演 验证:null 语义的断言组

- 验证:拒绝断言(CHM.put(k, null) 与 put(null, v) 均 NPE)。
- 歧义演示断言(HashMap 存 null 值后 get 与 containsKey 的歧义形态)。
- 哨兵断言(NULL_VALUE 哨兵的穿透防护:缓存"不存在"后不再回源)——三组固化 null 语义。
- 迁移审计(null 值使用的扫描清单)进 CHM 迁移流程。

### 第三步发散·追问扩展 追问链:null 三刀

- **Q1：key 的 null 呢?**
  - 答：HashMap 允许一个 null 键(hash=0 桶);CHM 拒绝——同源设计决策;null 键的业务语义本来就有争议(什么都没有的键=?)——拒绝是简化。
- **Q2：List/Set 的 null?**
  - 答：ArrayList 允许 null 元素;List.of 拒绝(第 12 题);CHM 同理——并发容器的 null 政策一致(拒)。
- **Q3：Optional 的滥用?**
  - 答：Optional 做字段/参数(反模式,设计意图是返回值)——Optional 的边界:返回值表达"可能无",字段与参数用其他设计(哨兵/重载)。

## 总结点

1. 并发下歧义无解,类型上拒绝 null
2. 哨兵区分未缓存与缓存空
3. 迁移先审计 null 使用
