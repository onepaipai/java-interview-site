# 文档重组、交互优化与并发题解整改（2026-10-24）

> 状态：本轮记录 2026-10-24 三条工作线的改动与验证。后续轮次取代其结论时按导航页约定归档。

本轮包含三部分：文档按功能重组、阅读/编辑/AI 交互与深色模式、并发基础 50 题深入格式重写（explanations-v12）。

## 一、文档按功能分类重组

- 新增 `docs/reports/`，11 份带日期的轮次报告移入并加状态说明；5 份过时轮次（10-15/10-19/10-20/CONTENT-DEPTH）移入 `docs/history/` 并补历史横幅。
- `docs/README.md` 重写为功能分类导航（架构与接口/部署运维/测试验证/内容题解/轮次报告/历史归档），补录 4 份脱离导航的文件与 `ANSWER-FIX-20261015.json`。
- 根 README「文档」节收敛为单一入口；`deploy/README.md` 验收清单更新（阅读页已有先答再看/自评/收藏/笔记入口）。
- 修正移动文件的相对链接（`../` → `../../`）、ARCHITECTURE-REVIEW 中 10 处 `F:/IDEA-JavaWeb` 绝对链接；链接检查脚本确认 docs/、deploy/、content 的相对链接全部可达（历史基线文档指向重构前源码路径的链接按其文首声明保留）。

## 二、交互与易用性（前端）

阅读体验：
- TOC 门槛从「答案≥800 字符且标题≥3」放宽为「≥400 字符且标题≥2」（`useWorkbench.ts` answerOutline）。
- 详情页顶部新增 3px 阅读进度条（`.reading-progress`，随窗口滚动）。
- 个人笔记改为 800ms 防抖自动保存 + localStorage 草稿兜底（`zhixu-note-draft-<id>`）+ 字数显示；blur 时立即保存，切题不丢。

编辑保护：
- 编辑器草稿按题目 id 自动保存（`zhixu-edit-draft-<id>`，500ms 防抖），保存成功或确认放弃时清除；冲突「重新加载」改为跳过放弃确认并保留草稿的专用路径（`reloadEditor`），重载后自动恢复草稿并提示「丢弃草稿」出口。
- 新增题目难度选择（基础/进阶/高级/专家），编辑旧题沿用并允许修改（后端值域校验既有）。

AI 面板：
- AI 回答渲染收紧为 `markdown(content, { media: false })`（不再允许任意远程图片），turns 渲染改 computed 缓存。
- 对话按题目存 sessionStorage（`zhixu-ai-chat-<id>`），切题返回不丢。

深色模式：
- `theme.css` token 从 9 个扩到 24 个（surface-2/3、border-strong、success/warn 族、inverse 族等）。
- 全部 9 个全局 CSS 做属性感知的颜色→token 替换（约 940 处；带透明度的阴影保留原值），`:root` 为浅色基线。
- 新增 `theme-dark.css`：`html[data-theme='dark']` 重映射全部 token + highlight.js 暗色 token 覆盖。
- 头部新增三态切换按钮（跟随系统/浅色/深色，存 `zhixu-theme`，matchMedia 自动跟随）。

## 三、并发基础 50 题深入格式重写（explanations-v12）

- 新增 `content/explanations/concurrency-basics-answers.mjs`：concurrency-basics 全部 50 题逐题深入格式（场景与约束、口述结论、机制与取舍 ### 子标题、故障推演案例、关键判断），覆盖 `question-overrides.json` 中同题的旧版 compact 修订（合并顺序后者优先）。
- 按新「通俗好记」标准：每题至少一个生活化类比 + 总结点含口诀；`REVIEW-STANDARD.md` 与 `TEMPLATE.md` 增补通俗好记验收要求。
- 后端 `ExplanationImporter` 深入格式总结点上限 40→60 字（容纳口诀），`scripts/explanation-deep.mjs` 同步两处；标准格式不动。
- 包版本 v11→v12（`build-explanations.mjs`）。
- 事实核验：写入前逐题复查版本敏感断言，修正 1 处错误（fixed-rate 补跑不并发执行——`ScheduledThreadPoolExecutor` 与 `Timer` 的 Javadoc 均明确不并发）；`scripts/review-concurrency-basics-facts.mjs` 为 50 题填入 `review-ledger.json` 的 factualReview（verified + Java 17 + 官方文档证据），台账状态块同步为「50 道有完整事实审核证据」。

## 四、验证记录

- 内容：`node scripts/build-explanations.mjs`（1215 题，v12）、`validate-explanations.mjs` PASS、`validate-content.mjs` PASS、`sync-content-status.mjs --check` PASS。
- 后端：`mvn -B test` 81 项通过 0 失败（13 项 MySQL 集成为未配置门禁的预期跳过，不据此声称 MySQL 已验证）。
- 前端：`npm test` 20 项单测通过；`npm run build` 类型检查与构建通过。
- 本地启动：stop-local 后以 Java 17 重启，后端启动导入 v12；浏览器抽查目录页、题目详情（深入题解）、深浅色切换。
- 未验证范围：MySQL 8.4 门禁、完整浏览器回归套件（`verify.ps1` 需 Docker 与 Chrome，本轮未执行）、其余 20 个模块的题解重整。

## 五、遗留与后续

- 按既定顺序继续逐模块重整：并发进阶 → JVM 基础/进阶 → 数据库进阶 → 缓存与消息 → 分布式 → 其余模块；每批完成后跑同一 build/validate/sync 管道并补台账证据。
- 深色模式在个别 1-2 次出现的装饰色上可能存在对比度小瑕疵，浏览器抽查已覆盖主要页面；如发现局部问题按 token 修正。
- 文档历史基线（DEEP-REVIEW、ARCHITECTURE-REVIEW）内指向重构前源码的链接按文档自身声明保留原状。

## 六、文档整理事故与重建记录（2026-10-24 补记）

按用户要求把 `docs/reports/` 按主题分子目录、题解源移入 `content/explanations/answers/`。子目录移动后的链接改写脚本存在写入错误（把文件名而非正文写回文件），导致 10 份报告正文被覆盖为存根；仓库尚无提交，无版本历史可用。

恢复与重建结果：
- **完整恢复**：`ARCHITECTURE-REVIEW-20261021.md` 从 `backups/architecture-before-20261021-203521/source.zip` 恢复（zip 内 10-21 20:23 版本），链接已适配新位置；`SEARCH-BENCHMARK-20261021.json` 与本报告未被脚本触及，完好。
- **标注重建（9 份）**：ARCHITECTURE-IMPLEMENTED-20261021、GITHUB-PROJECT-REVIEW-20261023、GITHUB-REFERENCE-REDESIGN-20261023、SPRING-CORE/SPRING-ADVANCED/DATABASE-BASICS-CONTENT-20261023、UI-CONTENT-REVIEW/FIXES-20261023、UI-USABILITY-GITHUB-REVIEW-20261023——各份基于导航摘要、测试指南、解析规范与留存截图/审计数据重建，文首有重建版横幅与「待补」清单；原始逐项明细与源码行级引用不可恢复。
- 会话转录、`db`、`exec`、发布包均确认无这些文件的完整副本；Windows 卷影副本因权限不可用。

教训（已记入后续流程）：批量重写文件必须校验写入内容（本次错误为 `write(f)` 误写文件名变量）；仓库在首次提交前缺少最基本的快照保护，建议完成首次提交后不再依赖备份目录。

## 七、题解质量审查与 JVM 基础批次（2026-10-24 第二轮）

质量审查（按重点/记忆/扩展三维度）确认了三层分化：深入格式 158 题（口述中位 317 字）质量最高；紧凑逐题修订 410 题重点准但缺记忆钩子；共享主题正文 647 题参考回答中位仅 62 字，是主要质量洼地。审查发现并修复并发基础 50 题 61 处参考链接双 `.html` 缺陷（manifest 归零，证据链重新锚定）。

JVM 基础批次（explanations-v13）：
- 新增 `content/explanations/answers/jvm-basics-answers.mjs`：jvm-basics 全部 50 题逐题深入格式（运行时数据区、GC 算法与回收器、类加载、JIT、诊断与容器调优五个板块），沿用通俗好记标准（每题类比 + 总结点口诀）。
- 本批新增「延伸」链接实践：追问块中显式指向同模块相邻题目（呼应审查改进计划第 4 项）。
- 包版本 v12→v13；`scripts/review-jvm-basics-facts.mjs` 为 50 题填入 factualReview（verified + Java 17 + JVMS/GC 调优指南/JEP 官方证据），台账达 100 道有完整事实核验证据。
- 后端重启导入验证：updated=93（46 道新题 + 修复链接的并发题），3 处人工修改保留，`/api/health` UP。

待办（按审查计划顺序）：旧轮 108 道深入题补口诀与类比 → 前端自测卡形态 → 延伸链接回填并发基础批次。

## 八、旧轮 110 道深入题补口诀与类比（explanations-v14，2026-10-24 第三轮）

按质量审查改进计划第 2 项，为旧轮全部 110 道深入格式题解补齐「通俗好记」要素：
- **总结点**：每题新增一条口诀（先钩子后机制，如「存档不结束整局，新局另付成本」「RR 首拍定格，RC 每问重拍」），置于首点，其余机制短语保留。
- **分析段**：每题在一个机制块末尾追加一个生活化类比（机场安检、红绿灯、快递站点、分诊台、水塔水位等），类比后紧贴机制，不当结论用。
- 分布：deep-answers 10（另 2 道被 review 新版覆盖）、review-answers 59、spring-core 15、spring-advanced 12、database-basics 12。
- 包版本 v13→v14；这批题目的事实核验状态保持 pending（此前无证据，本次改动不重置任何 verified 记录，台账仍为 100 道）。
- 后端重启导入：updated=106，3 处人工修改保留，`/api/health` UP。
- 改写过程中的脚本缺陷（summary 逐字符拆分、引号错位）均在 validate 阶段暴露并修复，最终 `validate-explanations.mjs` PASS。

待办：前端自测卡形态（顺序项 3）→ 延伸链接回填并发基础批次 → 内容批次继续并发进阶。

## 十、内容批次：并发进阶（explanations-v15，2026-10-24 第五轮）

内容批次第一批：并发进阶（concurrency-advanced）模块补齐逐题深入正文：
- 该模块 50 题中 13 题已是 review-answers 的深入题（v14 已含类比与口诀），本批补写其余 36 题（2–8、10–14、16、18、23、25、28–30、34–50），源文件 `content/explanations/answers/concurrency-advanced-answers.mjs`。
- 板块：AQS 家族与锁设计（独占/共享、非公平插队、分段跨段操作、StampedLock、锁膨胀诊断）、CAS 与内存序（退避、版本状态机、JMM 契约分层、VarHandle 选档）、线程池治理（动态调参失效、下游舱壁隔离、指标设计、假死定位）、异步与限流（请求合并、按键串行、令牌扣减原子性）、工程专题（对象池反效果、不可变快照、环形队列序号、批量与幂等、优雅停机、重试熔断振荡、分布式锁释放、租约栅栏、热点键、事故根因链）。
- 每题沿用通俗好记标准（类比 + 总结点口诀）；延伸链接继续落地；版本边界诚实标注（虚拟线程/结构化并发在 Java 17 不可用，JEP 425/428/446/453）。
- 包版本 v14→v15；`scripts/review-concurrency-advanced-facts.mjs` 为 36 题填入 factualReview（verified + Java 17 证据），台账达 **136 道有完整事实核验证据**。
- 后端重启导入：updated=36、3 处人工修改保留、`/api/health` UP。

并发模块至此全部 50 题逐题深入正文齐备。下一批：数据库进阶（database-advanced，其中 6 题已深入，待补 44 题）。

## 十一、内容批次：数据库进阶（explanations-v16，2026-10-24 第六轮）

内容批次第二批：数据库进阶（database-advanced）补齐 43 题逐题深入正文（7 题已深入：24 在 deep-answers、26–31 在 review）：
- 板块：索引与优化器（按负载设计、优化器放弃原因、统计失真、热点值、超宽索引、ICP/filesort/覆盖联合分析、LIMIT 与游标）、分区与分库分表（分区裁剪、能力边界、分片键、全局唯一、跨片分页、键变更迁移、跨片聚合）、在线 DDL 与大表变更（MDL 阻塞、安全加列、唯一索引上线、限速回填）、死锁与写偏斜（日志还原、同序死锁、RC 边界、约束防御）、复制与缓存失效（binlog 时序、一致性档位）、备份与恢复（PITR 演练、逻辑/物理取舍、误删处置）、诊断（连接数、CPU/IO 分型）、大事务与跨库一致（outbox 落地、注解边界）、治理（审计分权、多租户、软删除归档、字符集时区、expand-contract、四层校验、容量触发、治理收益汇报）。
- 每题沿用通俗好记标准；参考资料统一为 MySQL 8.4 官方手册页。
- 包版本 v15→v16；`scripts/review-database-advanced-facts.mjs` 为 43 题填入 factualReview（verified + MySQL 8.4 手册证据），台账达 **179 道有完整事实核验证据**。
- 后端重启导入：updated=43、3 处人工修改保留、`/api/health` UP。

下一批：缓存与消息（cache-messaging，2 题已深入，待补 48 题）。

## 十二、内容批次：缓存与消息（explanations-v17，2026-10-24 第七轮）

内容批次第三批：缓存与消息（cache-messaging）补齐 47 题逐题深入正文（3 题已深入：1、30 在 deep-answers，4 在 review）：
- 板块：缓存一致性（延迟双删、热点击穿、TTL 抖动、热键大键、value 形态、Redis 事务与 Lua、序列化演进、L1/L2 组合）、Redis 专项（分布式锁原子加锁/释放校验/看门狗/主从切换/Redlock、过期与淘汰策略、AOF/RDB、Cluster 槽）、消息核心（确认层级、至少一次与幂等、位点提交顺序、双写一致、分区内有序、消费者扩容、积压指标、再平衡、故障窗口、版本收敛）、消息工程（重试死信、退避抖动、消息体形态、协议演进、压缩、毒消息、延迟消息、消息追踪、一致性检测、MQ 替代数据库边界、重放安全、消费者不可用、批量确认、缓存预热、削峰边界、保留期对齐、基础设施降级、中间件评估、事故复盘）。
- 每题沿用通俗好记标准；Redis/Kafka 版本事实按 7/4.1 核对。
- 包版本 v16→v17；`scripts/review-cache-messaging-facts.mjs` 为 47 题填入 factualReview（verified + Redis 7/Kafka 4.1 证据），台账达 **226 道有完整事实核验证据**。
- 后端重启导入：updated=47、3 处人工修改保留、`/api/health` UP。

缓存与消息模块至此全部 50 题逐题深入正文齐备。下一批：分布式（distributed，14 题已深入，待补 36 题）。

## 十三、内容批次：分布式（explanations-v18 起步，2026-10-24 第八轮·进行中）

内容批次第四批：分布式（distributed）开始补齐逐题深入正文。14 题已深入（1–3、5–14、16），本批已写 5 题（4、15、17–19）：
- Q4 一致性哈希（取模/环/虚拟节点/CHW 的迁移率与均衡度对照）
- Q15 分布式锁与共识服务选择（效率层 vs 共识层 vs 资源端原子）
- Q17 全局 ID 时钟回拨（等待/备援序列/逻辑时钟）
- Q18 分布式限流一致性与容错（强一致 vs 容错、分层限流）
- Q19 令牌桶与漏桶（信用制 vs 排队制）
- 包版本 v17→v18；`scripts/review-distributed-facts.mjs` 为 5 题填入 factualReview，台账达 **231 道**。
- 后端重启导入：updated=5、3 处人工修改保留、`/api/health` UP。

**剩余 31 题待后续批次继续**：20–23（多层限流协调、熔断 vs 限流、服务降级、舱壁隔离）、24–30（负载均衡成本差异、热点账户、请求合并、库存分层、在途容量、重试预算、退避与并发上限）、31–37（配置中心、服务发现、缓存版本失效、双写分叉、灰度迁移回退、跨机房读取、多活难点）、38–50（单元化、时钟偏差、链路追踪 vs 审计、任务重复领取、断点续跑、扇出尾延迟、对冲请求、故障注入、单节点 vs 集群容量、热点 vs 协调成本、端到端超时、最终一致解释、过度设计评审）。

## 九、前端自测卡形态（2026-10-24 第四轮）

按质量审查改进计划第 3 项，在题目阅读页新增第三种阅读模式「自测卡」，补全记忆闭环：
- **模式三态**：完整解析 / 口述复习 / 自测卡（`readingMode` 持久化到 `zhixu-reading-mode`，沿用既有存储）。
- **自测卡行为**：只显示总结点（关键判断），口述与分析隐藏；点「回忆完成，对照参考回答」展开口述（分析/案例仍隐藏）；对照后卡片提供「想起来了 / 模糊 / 没想起来」三个快评按钮，直接走既有自评接口（reviewed=true，进待复习统计）。
- **实现**：`QuestionDetail.vue` 新增 quiz 态与显隐类（`answer-quiz-hidden/open`，复用口述复习的 CSS 隐藏机制，token 化样式兼容深色模式）；自测卡目录按口述复习口径只列二级标题；切题或切回该模式自动重置揭示状态。
- **验证**：构建与 20 项单测通过；浏览器实测完整流程（切模式 → 总结点可见/口述隐藏 → 揭示 → 快评 → 「自评已保存」toast → 测试自评还原）并截图确认深色模式渲染。
- 深浅两套样式均走语义 token，无硬编码色值。
