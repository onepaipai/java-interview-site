<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/Collectors.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银统计沙盘:Collectors.toMap(key, value) 遇重复键直接抛 IllegalStateException("Duplicate key")——生产事故的经典(数据里有重复键,统计接口 500)。三参数重载(merge 函数)是标准解。

1. 默认行为:toMap(keyFn, valFn) 遇重复键抛 IllegalStateException——一次性炸掉整个统计(数据驱动的事故:上游数据多了一条重复记录)。
2. 三参数重载:toMap(keyFn, valFn, mergeFn)——merge(old, new) 决定重复键的处理(取首/取后/求和/自定义)——merge 的语义=业务决策(统计口径)。
3. 分组统计的替代:groupingBy(分组本身容忍重复——每组 List)+下游聚合(summingLong)——"去重取一"用 toMap+merge,"分组聚合"用 groupingBy——语义选择(第 40 题)。

## 参考分析

### 机制:重复键的抛出与合并

抛出:Map.merge 的缺省形态(toMap 内部用 merge,key 已存在且无 merge 函数→抛 IllegalStateException("Duplicate key ..."))——异常即"数据与假设不符"(假设键唯一)。merge 函数:(old, new) → 决策——取首(old,保留首次)、取后(new,最后赢)、求和、自定义业务规则(banking 45 题:按时间取最新)。merge 的原子性:并行流的 toMap(merge 在合并时调用——并发段的合并语义)。

### 反例:重复键的三种事故

事故一,炸接口:统计接口 toMap 无 merge——上游数据重复一条→IllegalStateException→接口 500(全局故障)。事故二,静默取错:有 merge 但取错方向(取 first 实际业务要最新)——统计口径错(静默,第 50 题distributed)。事故三,HashMap.put 的隐式覆盖:非 toMap 场景直接 put(后写覆盖)——覆盖语义与 merge 混淆。三条的正解:toMap 必带 merge(团队规范)+merge 的业务语义评审(第 24 题)。

### 取舍:toMap vs groupingBy 的选择

toMap:键唯一语义(每键一条,重复=异常或合并)——一对一映射。groupingBy:键分组语义(每键多条,聚合)——一对多。边界:统计"每账户最新一条"(toMap+merge 按时间)vs "每账户全部交易"(groupingBy)——数据形态与业务意图决定。Map 的类型指定:toMap 的第四参(TreeMap::new——有序输出,第 41 题)。

## 案例

### 验证:重复键的断言组

验证:抛出断言(无 merge 的重复键抛 IllegalStateException——默认行为实证);merge 断言(三参数 toMap 的取首/取后/求和行为);分组对照断言(groupingBy 的分组聚合语义)——三组固化重复键处理;merge 函数的单元测试(合并语义的可测)进规范。

### 追问链:toMap 三刀

一刀:"null 值?"——toMap 的 value 为 null 抛 NPE(toMap 不允许 null value——HashMap.merge 的语义)——null 值的过滤(map 前滤)或哨兵(第 18 题)。二刀:"键的 null?"——keyFn 返回 null 同样 NPE——键的规范化(第 33 题banking)。三刀:"toMap 的并发?"——toMap 非并发容器(HashMap)——并发流的 toMap(Parallel 流的合并正确但容器非线程安全[最后 collect 单线程])——parallel toMap 的语义(合并发生在子结果层)。

## 总结点

1. toMap 默认抛,merge 必带
2. 取首取后求和,语义即业务
3. 一对一 toMap,一对多 groupingBy
