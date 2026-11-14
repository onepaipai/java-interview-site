<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Google SRE · 1](https://sre.google/sre-book/addressing-cascading-failures/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银升级沙盘:JDK 17→21 升级——兼容性五面:语言与 API(移除/弃用的 API)、字节码与运行时(类文件版本/JIT 行为)、GC 与内存(默认 GC 行为变化,第 46 题)、依赖与工具链(框架/构建工具的版本支持)、序列化与安全(JEP 290 过滤器/安全管理器移除)。

1. 五面的验证清单:语言 API(jdeps 扫描)、字节码(类文件版本)、GC(默认参数变化——日志对比)、依赖(框架 JDK 支持)+序列化(过滤器/SecurityManager 移除)。
2. 验证的三级:静态分析(jdeps/jdeprscan 的 API 使用扫描)、运行测试(全量回归+真值测试,第 49 题)、灰度对照(生产流量双版本对照——分布式 42 题框架)。
3. 与本仓库的衔接:本仓库已跑 JDK 17(spring 6.2.19)——升级 21 的回归集=本仓库的真值测试(SpringAdvancedExamplesTest)+90 后端测试+前端测试——回归集的完备性决定升级的可信度(第 49 题)。

## 参考分析

### 机制:五面的具体验证

面一,语言 API:jdeps --jdk-internals(内部 API 使用)+jdeprscan(deprecated 使用)——扫描清单逐项处理(替换/保留[配 --add-opens])。面二,运行时:类文件版本(61→65——编译目标与运行版本)、instrumentation(agent 的兼容)。面三,GC:默认 GC 的参数变化(G1 的默认值演进)+新 GC(分代 ZGC[21]的评估)+GC 日志的对比(暂停时间/吞吐)。面四,依赖:框架矩阵(Spring/MyBatis/Netty 的 JDK 支持表)+构建工具(maven-compiler-plugin 的 release 参数)。面五,序列化:JEP 290 过滤器的默认行为+SecurityManager 移除(17 deprecated,24 移除)——依赖 SecurityManager 的代码迁移。

### 反例:升级遗漏的三种事故

事故一,内部 API 依赖:sun.misc.BASE64Encoder(JDK 内部)——升级后 NoClassDefFoundError——jdeps 前移发现。事故二,GC 行为漂移:默认堆参数/GC 触发阈值变化——内存行为漂移(第 46 题distributed 的升级兼容)。事故三,依赖不兼容:框架不支持新 JDK(字节码增强[ASM 版本]失败)——启动即崩(依赖矩阵先行)。三条的正解:五面清单+三级验证+灰度对照——升级的系统化。

### 取舍:升级的策略与节奏

策略:LTS 跳跃(17→21→25)+每 LTS 内小版本跟安全补丁——LTS 策略减少升级频率。节奏:升级先于"必须"(被动升级=紧急+风险;主动升级=从容)——升级的保鲜期(第 17 题 distributed)。回滚:旧版本制品保留(第 35 题)+回滚条件(第 46 题)+升级演练(第 46 题灾备演练)——升级是变更,走变更纪律。

## 案例

### 验证:升级验证的断言组

验证:静态断言(jdeps/jdeprscan 扫描零未处理项);回归断言(全量测试在新 JDK 全绿——含真值测试[本仓库 SpringAdvancedExamplesTest 编译执行]);灰度断言(双版本对照的性能与稳定性指标)——三组固化升级验证;升级报告(五面清单+验证结果)进 ADR(第 18 题)。

### 追问链:升级三刀

一刀:"preview 特性?"——preview 特性(--enable-preview)的锁定(版本绑定——preview 在下一版变更)——preview 的生产禁用(除非接受版本锁定)。二刀:"依赖的先行?"——依赖的升级先行于 JDK(框架先支持新 JDK,再升 JDK)——顺序:依赖兼容性检查→依赖升级→JDK 升级——顺序反了=依赖崩(第 49 题回归集)。三刀:"升级的团队沟通?"——升级的影响面(行为变化/性能变化/依赖变化)进团队公告——升级的知识共享(第 38 题评审不垄断)——升级不是个人的事。

## 总结点

1. 五面验证:API/运行时/GC/依赖/序列化
2. 三级验证:静态/回归/灰度
3. LTS 策略+主动升级,不被动
