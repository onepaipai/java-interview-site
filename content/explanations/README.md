# 题目解析规范与落地方案

面向资深 Java 开发和架构设计面试。复习提纲与深入题解分开维护：旧版短题解仍兼容，复杂工程题使用场景、口述结论、机制与取舍、故障推演及追问。题量、字数和格式检查都不代表内容达到资深水平。

<!-- content-status:start -->
当前解析包为 `explanations-v36`，共 1215 道：1215 道题目级正文、0 道固定样例、0 道主题正文。独立正文不等于事实核验完成；审核台账中 977 道有完整事实审核证据，其余保持待审核。结构、案例执行、事实核验及人工合并分别记录在 [审核台账](review-ledger.json)。
<!-- content-status:end -->

## 写作规则

### 深入题解

`answers/deep-answers.mjs` 为原有 12 道核心题保存独立正文；`answers/review-answers-20261023.mjs` 为本次发现的共享组错配等问题保存 14 道逐题修订，其中 6 道采用深入格式。目前合计 18 道深入题解。通过 `scripts/question-contents.mjs` 统一读取，禁止回退到共享主题案例。

| 层次 | 应回答的问题 |
| --- | --- |
| 场景与约束 | 版本、业务不变式、规模、原子边界和不在本次假设内的能力是什么？ |
| 面试口述 | 用 2–5 个结论直接回答原题，条件与结论一起说清。 |
| 机制与取舍 | 至少三个独立子问题：为什么成立、反例是什么、方案成本和适用边界是什么？ |
| 故障推演与追问 | 至少两段题目专属推演，给出操作顺序、预期结果、验证证据及进一步追问。 |
| 关键判断 | 保留 2–5 条能用于决策的短句，不用口号替代机制。 |

深入解析允许段落、三级标题、比较表和机制代码，不再受每点 80/110 字的提纲限制。口述部分保持简洁。长度下限只防止空段发布，不能替代相关性和事实评审。每题引用具体官方资料，并区分理论推演、简化模型与真实中间件实验。

前端将“参考回答 / 参考分析 / 案例 / 总结点”对应显示为“面试口述 / 机制与取舍 / 故障推演与追问 / 关键判断”，提供完整解析和口述复习切换。原题与稳定来源键保持，场景约束在题目卡片中展开；手工修改不会被新版自动覆盖。

### 旧版短题解（保留兼容，不作为架构题标准）

| 段落 | 写法 | 重点 |
| --- | --- | --- |
| 参考回答 | 1–6 个编号要点，够答清原题即可 | 回答“是什么、怎么做、关键前提” |
| 参考分析 | 可省略；保留时每点增加独立信息 | 补充回答中未讲明的机制、反例或取舍 |
| 案例 | 按场景、核心代码或操作、结果、验证分步骤 | 只保留解释本题所需的信息 |
| 总结点 | 最后一段，2–4 条短句 | 好记、准确，能快速复述 |

1. 回答和分析逐条编号，避免一段混讲多个知识点。
2. 每点通常一两句话；结论在前，条件紧随，删去重复铺垫。
3. 总结点每条尽量 8–18 个字符；不写空泛口号，也不省略关键条件。
4. 回答已讲明原因时，不再设置分析复述一遍；复杂题可以保留分析，将结论与论证各放在合适的位置。
5. 引用、技术版本和完整运行代码链接放在题目下方，不放到总结点后面。
6. 场景由编写者构造时明确说明；不虚构生产经历和性能数据。
7. 算法写复杂度，诊断写证据，架构写约束与失败路径；按题型选择重点。
8. 答案不能只说“用幂等、加重试、做监控”：写清业务身份、原子边界、重试条件及观测结果，按题目取舍。
9. 参考分析必须比参考回答多出机制或反例；把同一句换词不算分析。手写题的案例必须给核心实现，不能仅调用现成库。
10. 案例中的代码输出要实际运行；外部系统场景未实测时写“预期”或“判断”，不虚构耗时、吞吐及故障恢复成绩。

通用骨架见 [TEMPLATE.md](TEMPLATE.md)。不以长篇幅或题量替代内容质量。

## 图示规则

1. 只为调用链、状态流转、并发交错或架构关系画图。
2. 每张图只解释一个问题；常规题最多一张图，按阅读顺序单独放置。
3. 案例步骤先交代前提，再放图，图后接验证；图与代码之间保留间距。
4. 手机优先纵向布局；节点短句、连线清晰，避免交叉和多图并排。
5. 图中文字应能正常阅读；复杂图拆成独立子问题，不靠缩小字体塞进一张图。
6. 图和文字不重复讲一遍；文字补充图中没有表达的条件与结论。

目前有三张复用图源：Spring 自调用、RAG 证据流程、Outbox 投递。每题最多一张，实际引用数以验证脚本输出为准；其余题目使用代码或具体场景。度量比较与 Top-K 题已移除无关 RAG 图。图源位于 `frontend/public/explanations`，随前端构建和源码包交付。

## 三道样例

| 原题 | 样例 |
| --- | --- |
| equals 与 hashCode 的契约为何会影响领域对象设计？ | [Java 语言第 1 题](samples/java-language-001.md) |
| 事务代理为什么会在同类自调用时失效？ | [Spring 进阶第 1 题](samples/spring-advanced-001.md) |
| 库存扣减怎样避免先查后改的超卖？ | [数据库进阶第 26 题](samples/database-advanced-026.md) |

三道样例保留用于旧格式与图文排版回归；Spring 第 1 题的正式正文已由深入题解替换。全量清单包含新增 1,050 题与原始 165 题，共 1,215 题。

## 验证

1. 项目根目录执行 `node scripts/validate-explanations.mjs`，检查 1,215 题的覆盖、摘要、段落顺序、编号、长度、总结点及图资源。
   题目级修订的回归验证由 `validate-explanations.mjs` 与后端真值测试承担；历史修订脚本(`test-explanation-corrections.mjs`)及内容生成脚本(`build-explanations.mjs`)已随内容重整退役，需要时从 git 历史取回(`git show bf8768a:scripts/<脚本名>`)。
2. 后端打包后执行 `mvn -B test`，其中 `*ExamplesTest` 编译运行正文中的 Java 源码并验证执行结果。使用专用 H2 内存库。
3. 前端开发服务启动后，在 frontend 目录执行 `npm run test:explanations`，检查 1440、390、320 宽度的正文、图和代码排版。截图输出到 frontend/test-results/explanations。
4. 库存的 H2 并发演示只验证条件更新思路；正式 SQL 与锁行为仍需 MySQL 8.4 验证。
5. `TEST_BASE_URL` 指向独立测试环境，在 frontend 执行 `npm run test:explanation-pack`，核对所有答案与发布摘要，并检查 21 个模块和短题解在三种宽度的真实阅读页。
6. `node scripts/test-deep-answers.mjs` 验证深入题解边界与教学模型。通过 `scripts/test-e2e.ps1 -Suite test:deep-reader` 启动独立数据库测试全部 12 题、场景、分级目录、键盘阅读切换以及 1440/390/320 宽度；结果不代表正文中的 MySQL/Kafka/Redis 故障实验已经实际执行。

## 阅读排版

1. 题解段落以同一篇文章连续呈现，用标题和细分隔线区分；编号、正文宽度和段落间距统一。
2. 桌面和手机均按原文顺序显示步骤、流程图、代码与验证结果，不把图移到侧栏。图按自然比例自适应，代码允许横向滚动，正文不强制等高或截断。
3. 代码独立高亮并可复制，流程图可点击放大；参考资料收进题目下方的展开项。
4. 阅读、回答编辑预览、知识来源预览共用 `frontend/src/answer.ts` 及题解样式；支持三段或含独立分析的四段结构。知识来源允许受控本地流程图，其他图片保留提示和原文入口。
5. `npm run test:explanation-reader` 使用浏览器响应替换验证正式阅读页，检查 1440、390、320 三种屏幕宽度及图文顺序，不向题库写入样例。

## 现有题库升级

senior-v1 保留原来的 1,050 道题及稳定来源键；解析使用独立的 `explanations-v1` 发布清单。启动顺序为原始导入、增量题包、解析升级。

1. 扫描有效题，区分空答案、原始要点、完整解析和手工内容；回收站不恢复。
2. 用稳定来源键对应解析文件，先生成升级预览，再备份执行。
3. 只自动替换与发布基线一致的标题及短答案；手工改写内容保留，提供候选解析合并。
4. 保存时检查版本，跳过并发修改；记录更新、保留、冲突与解析版本。
5. 同步更新对应知识片段，重跑不重复加题，并保留回滚依据。
6. 已生成所有 21 个模块的 50 道解析，并补齐原始题的缺失答案；独立自编题不自动覆盖。

第一阶段继续使用 questions.answer Markdown 字段和现有阅读页，统一显示四段及目录。学习材料直接存入题库，AI 用于辅助起草与补充，不作为获得基本解析的前提。

## 内容维护与发布

1. `topics/*.tsv` 保存 249 组概念分析与教学案例；相关题可共用同一机制案例，每题的参考回答仍围绕原题。`@数字` 显式对应模块题号，普通词用于原始题匹配，不以无关通用案例兜底。
   旧版逐题修订保存在 `question-overrides.json`，深入正文保存在 `answers/deep-answers.mjs`；后续按题或模块修订分别位于 `answers/review-answers-20261023.mjs`、`answers/spring-core-answers.mjs`、`answers/spring-advanced-answers.mjs`、`answers/database-basics-answers.mjs`、`answers/concurrency-basics-answers.mjs`。两种格式完整拥有本题的分析与案例，生成前核对题号及完整标题，拒绝局部缺段。模块批次按 `scripts/question-contents.mjs` 顺序合并，后合并的完整修订优先；题目级正文整体优先于固定样例和主题内容。
2. `legacy-answers.json` 为原始 165 题分别保存干练结论；`topic-overrides.json` 校正跨模块或复合题的案例对应。
3. `generated/*.md` 是可直接审阅的最终正文；`manifest.json` 保存来源键、标题、旧答案基线及新文件摘要；`assignments.json` 可核对题目与概念对应，`coverage.json` 要求无遗漏。
   `assignments.json.contentSource` 标出题目级、样例或主题来源；`coverage.json.qualityReview` 单独记录人工修订范围，不将“匹配成功”冒充“全库审查通过”。
4. `ExplanationImporter` 在写库前校验全包及必需段落、连续编号、案例结果和总结长度；仅更新基线或上一发布版本一致的答案。题目 ID、标签、模块、难度、排序和学习记录保持，版本只在答案变化时递增；手工改题、归档与并发冲突均保留并报告。重复启动无内容更新时不获取全库分类写锁。
5. `explanation_publications` 保存首次原答案、原版本和最后发布摘要。新包不能降级覆盖更高发布版本；重复启动不重复写入，提交后统一刷新知识来源。
6. 发布前运行快照脚本并停服备份数据库；发布后运行 `verify-explanation-upgrade.mjs` 核对实际修改范围。备份目录不进入发布包。
7. 生成时先校验完整正文及图资源，再写入 `published/<摘要>/` 不可变快照，最后原子替换清单；中途失败不让后端读到半份文件。`generated` 保留便于审阅的副本。
8. V6 的整包版本记录独立于单题摘要；即使更高版本没有改某题正文，也不能再由旧包覆盖。此记录不引起题目版本或学习数据变化。

## 本轮逐题复查范围

1. 当前为 1215 道题目级修订及 0 道独立样例。本次 46 道修改范围记录在 `review-fixes-20261020.json`，此前 21 道深度改写记录仍保留在 `senior-depth-review.json`；范围有重叠，不能直接相加。
2. 剩余 0 道仍使用主题级分析与案例，尚未逐题完成事实与适配性核验。`review-status.json` 列出各模块进度，不能以格式检查通过代替该工作；其余已有独立正文的题目也不自动视为达到本轮深度标准。
3. `node scripts/test-explanation-publication.mjs` 验证失败生成保留旧清单和不可变文件；`test-explanation-corrections.mjs` 等历史一次性验收脚本已退役(git 历史可恢复)。
4. 正文中的 Java 示例由后端 `*ExamplesTest` 编译执行（舍入、二分、前缀和、背包和零钱案例等），另验证错误捕获片段编译失败。历史脚本 `verify-reviewed-examples.ps1` 已退役，需要时从 git 历史取回(`git show bf8768a:scripts/verify-reviewed-examples.ps1`)。
5. 历史脚本 `prepare-review-examples.mjs` 已退役，从 git 历史取回(`git show bf8768a:scripts/prepare-review-examples.mjs`)后提取正文代码，再以 Java 17 执行 `backend/target/ReviewExamples20261020.java`；包含交接、丢更新、LRU、空值、顺序和可见性等 14 项验证。
6. Spring 基础模块现有 59 题均有独立正文，本轮将其中 54 题从主题正文改为逐题编写，新增 15 道深入格式。`SpringCoreExamplesTest` 编译运行正文中 3 段 Java 源码并验证事务回滚对照；执行证据由 `SpringCoreExamplesTest` 与审核台账承接(历史核对脚本已退役)。完整范围及限制见 [整改记录](../../docs/reports/content/SPRING-CORE-CONTENT-20261023.md)。
7. Spring 进阶模块现有 60 题均有独立正文，新增 54 道题目级修订，其中 12 道深入格式。`SpringAdvancedExamplesTest` 执行正文中 3 段程序和 2 项真实事务事件对照；执行证据由 `SpringAdvancedExamplesTest` 与审核台账承接(历史核对脚本已退役)。范围和未验证部分见 [进阶整改记录](../../docs/reports/content/SPRING-ADVANCED-CONTENT-20261023.md)。
8. 数据库基础模块现有 59 题均有独立正文，新增 53 道修订及 12 道深入格式。`DatabaseBasicsExamplesTest` 执行正文中 3 组 SQL 并记录 H2 结果，`node scripts/test-database-basics-answers.mjs` 核对证据。相同 SQL 接入显式隔离 MySQL 8.4 门禁，本机未运行该门禁，不以 H2 结果代替索引或锁验证；范围见 [数据库整改记录](../../docs/reports/content/DATABASE-BASICS-CONTENT-20261023.md)。

## 版本核对依据

1. 代理自调用、可见性与回滚边界按 [Spring Framework 6.2 文档](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/declarative/annotations.html) 区分，避免把旧版本限制套用到所有方法。
2. 快照读的隔离级别差异按 [MySQL 8.4 一致性读](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html) 核对；教学用 H2 不替代生产数据库验证。
3. 虚拟线程固定问题区分 JDK 21 与 24 之后的实现，参见 [Oracle JDK 24 迁移指南](https://docs.oracle.com/en/java/javase/24/migrate/jdk-migration-guide.pdf)。项目 Java 17 示例不混用虚拟线程 API。
4. 租约与持有者校验参考 [Redis 分布式锁说明](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)；消息投递边界参考 [Kafka 4.1 设计](https://kafka.apache.org/41/design/design/)。模块资料是延伸阅读，不冒充每条教学场景的生产证据。
