<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银平台组沙盘:后端测试套件每次全量跑 12 分钟,其中 Spring 上下文启动占了 8 分钟——40 个测试类各自加载不同的配置组合,上下文缓存大量失效。用上下文缓存机制说明启动成本的结构与治理。

1. 上下文缓存按配置指纹缓存:@Configuration 组合、属性、profile、ContextCustomizer 任一不同即新上下文——测试类配置碎片化是启动成本的主因(实测画像:40 类 30 个不同上下文)。
2. 治理三件套:配置归并(测试类共享同一配置类)、瘦身(去掉 @MockBean 频繁变化——它改变上下文指纹)、懒加载(懒初始化减少未用 bean 的装配)。
3. 分层配合:纯单元测试不上 Spring(零启动)、H2 上下文测试共享缓存、容器测试单容器复用(第 39 题)——三层把 12 分钟压到 3 分钟量级。

## 参考分析

### 机制:上下文缓存的指纹与失效

TestContext 框架按"上下文键"缓存:配置类集合、@ActiveProfiles、@TestPropertySource、@MockBean/@SpyBean 列表、DirtiesContext 标记等组合成指纹;指纹相同复用,不同则新起。碎片化来源:@MockBean 差异(每个测试类 mock 不同 bean=独立上下文)、测试专属属性(每个类一套属性)、继承混乱(子类改配置)。每个新上下文=全部 bean 重建+数据源建立——秒级到十秒级的成本乘以碎片数。

### 推演:归并前后的成本对比(附本仓库现状)

对比:30 个碎片上下文×平均 15 秒=7.5 分钟 vs 3 个归并上下文×15 秒=45 秒——归并收益一个量级。本仓库现状锚点:90 测试 45 秒内完成(2026-11-08 实测,Test Files 7/Tests 20 的前端与后端 90 项)——测试基建已较健康;治理手段供大规模套件参考。验证:归并收益为推演模型;当前仓库的快速事实为实测(全量后端 45 秒,含 13 个 MySQL 跳过)。

### 取舍:治理手段的优先级

优先级一,归并配置:统一测试基类/配置类,差异用 @TestPropertySource 单点属性而不是整类配置;@MockBean 集中到共享配置或改用测试 profile 的 bean 替换。优先级二,懒加载:spring.test 懒初始化(全局 lazy)对"测不到的 bean 不装配"——注意懒加载掩盖的装配错误要在专门的全量启动测试里兜住(第 31 题启动冒烟)。优先级三,并行与分层:JaCoCo 等插件从测试阶段剥离;容器测试独立阶段(第 39 题)。度量:构建日志打印上下文创建次数——数字是治理的起点与验收。

## 案例

### 验证:构建报告输出上下文创建数与 bean 装载量;归并前后对比启

验证:构建报告输出上下文创建数与 bean 装载量;归并前后对比启动时长;新测试类引入新上下文时评审必问能否归并——上下文数进报告,治理以数字验收。补充:@DirtiesContext 只用于真实污染全局状态的用例;MockBean 集中到共享配置改测试 profile 替身 bean,保持上下文指纹稳定。

### 追问链:启动成本三刀

一刀:"@DirtiesContext 该怎么用?"——污染全局状态的测试类标注(如改了静态缓存),它强制重建上下文——用得越少越好;污染状态应修复而不是靠重建遮掩。二刀:"MockBean 的替代?"——测试 profile 注入替身 bean(@TestConfiguration+@Primary)——不改上下文指纹,可跨类复用;MockBean 留给真正需要每类不同的场景。三刀:"怎么持续监控?"——构建报告输出"contexts created/beans loaded";新增测试类的 PR 若引入新上下文,评审必问"能否归并"。

## 总结点

1. 指纹相同才复用,配置碎片是主因
2. 归并瘦身,懒加载兜住
3. 上下文数进构建报告
