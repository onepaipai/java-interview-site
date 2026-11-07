# 架构与代码审查 · 2026-10-21

审查对象为根目录当前源码，不包含 release、backups 中的历史副本。此次新增审查文档，没有修改业务实现或业务数据库。结论基于源码、配置、当前内容清单和本轮实际测试；未连接真实模型供应商、生产 MySQL 或远程服务器，也未重新执行整套浏览器回归。

## 总体判断

项目已经具备小规模知识库应用需要的主要能力，继续采用 Vue + Spring Boot 单体是合理的。下一阶段应优先补齐故障处理、测试隔离和可重复发布，再逐步拆清业务边界。现阶段没有足够依据要求引入微服务、消息队列、Elasticsearch 或独立向量数据库。

当前系统包含三条主要链路：

1. 阅读与管理：Vue 3 / TypeScript → Vite 开发代理或 Nginx → Spring Security 会话与 CSRF → MVC / JdbcTemplate → H2 或 MySQL，Flyway 管理 V1–V6 迁移。
2. 内容发布：原始 Markdown 导入 → senior-v1 增量题包 → explanations-v6 解析发布；稳定来源键、答案摘要及版本号共同保护已有内容。
3. AI 检索：题目、参考资料、上传文档 → 数据库分片 → 进程内 BM25 倒排快照及可选向量相似度 → 最多 6 个片段 → 兼容模型服务。内容事务提交后标记索引失效，下次读取更新。

值得保留的设计包括：参数绑定 SQL；题目编辑的乐观锁；模块归档与恢复的锁顺序；事务提交后的索引通知；图片格式校验、像素限制及重新编码；Markdown 清洗；模型响应大小限制；内容发布基线和人工编辑保护。此次审查不是推翻这些已经有效的机制。

## 优先修改事项

P1 表示建议在正式对外发布或日常默认操作前解决；P2 表示下一轮迭代应处理的维护性、容量或交付缺口。以下分别标明已观察的问题与基于代码的风险，未做生产压测的地方不作性能承诺。

### 1. P1：AI 请求缺少覆盖正文读取的截止时间

**位置：** [ModelClient.java](../../../backend/src/main/java/dev/interview/ModelClient.java:32)、[AiController.java](../../../backend/src/main/java/dev/interview/AiController.java:14)。

代码使用 Java 17 的 `HttpRequest.timeout` 配合阻塞 `http.send`，并通过 `BoundedBody` 限制响应字节数。Java 17 的请求超时不能保证响应正文在截止时间内读完；上游及时返回响应头、随后停止发送正文时，字节限制也无法触发。Java 团队说明这一超时范围在 Java 26 才扩展到正文消费，参见 [Oracle Java 团队的 Timeout Update](https://inside.java/2026/03/04/jdk-26-http-client/)。

根据调用链推断，两个请求都卡在正文读取时，会持续占用全站两个 AI 槽位。浏览器的 120 秒超时或代理断开，不能作为后端取消上游读取的保证。本轮未进行该故障的端到端注入。

**建议：** 为完整上游交换建立总截止时间，超时后实际取消 HTTP 交换及正文订阅，确保退出调用并释放并发名额；保留现有字节上限。不要仅给另一个 Future 加超时而留下后台读取继续运行。

**验收：** 增加“响应头立即返回、正文停滞”和“正文持续缓慢发送”的回归；超时后请求终止，后续正常请求能重新取得槽位。关键词检索降级与聊天请求分别验证。

### 2. P1：部署配置模板含字面量换行转义

**位置：** [.env.example](../../../.env.example:7)。

已读取确认：AI 配置被写在同一物理行，以 `\n# Optional AI / RAG\nAI_ENABLED=false...` 开头。这不是独立的注释和环境变量，按部署说明直接复制不能得到预期 AI 配置，也可能造成解析错误。[Compose 环境文件规则](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/#env-file-syntax)要求逐行定义变量。

**建议：** 改为实际多行文本；把使用示例配置执行 `docker compose --env-file .env.example config --quiet` 加入发布检查。本机未发现 Docker CLI，本轮没有执行 Compose 校验。

### 3. P1：默认浏览器测试可以写入日常数据库

**位置：** [package.json](../../../frontend/package.json:9)、[smoke.mjs](../../../frontend/tests/smoke.mjs:3)、[smoke.mjs](../../../frontend/tests/smoke.mjs:34)。

`npm test` 默认连接 5173，并读取日常后端的管理员密码文件。测试会创建题目、模块、账号和图片。结束时删除题目属于软删除，不能恢复数据库到测试前状态；上传图片也不会随这些题目清理。文档已有隔离提醒，但脚本没有强制边界。

**建议：** 默认测试入口执行单元测试或全部 API 拦截的浏览器测试。真实端到端测试由统一脚本启动独立应用、独立数据库和上传目录，使用专用测试凭据；未明确提供测试目标时拒绝执行写入测试。

**验收：** 普通 `npm test` 不读取业务管理员密码，也不修改业务数据；端到端环境结束后可整体销毁。本轮没有运行这些会写业务数据的脚本。

### 4. P2：搜索重复读取并清洗全量答案，列表返回完整详情

**位置：** [QuestionService.java](../../../backend/src/main/java/dev/interview/QuestionService.java:35)、[QuestionService.java](../../../backend/src/main/java/dev/interview/QuestionService.java:51)、[GlobalSearch.vue](../../../frontend/src/GlobalSearch.vue:8)、[useWorkbench.ts](../../../frontend/src/useWorkbench.ts:261)。

非空搜索将候选题目的标题和完整答案全部取回 Java，再清洗 Markdown、匹配并排序。搜索定位接口重复同一过程；详情页还会接着请求当前列表。列表使用 `q.*`，连完整答案、笔记等字段一起返回，前端只为摘要又做一次提取。全局搜索有防抖和过期结果校验，但没有取消已发出的请求。

当前发布的 1,215 份答案合计约 1.40 MiB，尚不能据此认定线上性能不达标；问题在于工作量随内容和搜索频次重复增长。本轮没有测量数据库搜索延迟或并发吞吐。

**建议：** 先给题库建立可复用的纯文本搜索投影，按内容变更增量失效；查询排序与定位继续共用规则。列表返回 `QuestionSummary`，包含必要标题、模块、版本和命中摘要，详情再返回正文。前端取消过期搜索，后端限制关键词长度。用实际查询集测量延迟和分配量后，再决定是否需要专门搜索服务。

**验收：** 保留标题优先及翻页/定位一致性；重复搜索不重复清洗整个题库；列表响应不携带不需要的完整答案。

### 5. P2：Controller、业务规则和数据访问边界混杂

**位置：** [QuestionController.java](../../../backend/src/main/java/dev/interview/QuestionController.java:12)、[LearningController.java](../../../backend/src/main/java/dev/interview/LearningController.java:11)、[AuthController.java](../../../backend/src/main/java/dev/interview/AuthController.java:17)。

题目 Controller 同时维护题目、模块、标签、资料和导出，直接执行 SQL；其他 Controller 依赖 `AuthController` 解析用户身份。事务入口也分布在 Controller 和 Service 中。这会使新增批量操作、定时任务或管理入口时容易绕开原有规则。

**建议：** 按 `account`、`question`、`knowledge`、`publication` 划分业务包。Controller 负责 HTTP 映射和输入校验，Service 定义业务事务，Repository 封装 SQL；抽取 `CurrentUser` 或稳定的用户 principal，解除 Controller 间依赖。保留 JdbcTemplate，按高频修改功能逐步迁移即可。

### 6. P2：前端工作台承担过多职责，源码可读性影响维护

**位置：** [useWorkbench.ts](../../../frontend/src/useWorkbench.ts:15)、[App.vue](../../../frontend/src/App.vue:17)、[AiPanel.vue](../../../frontend/src/AiPanel.vue:1)。

`useWorkbench.ts` 约 657 行，集中处理登录、手写路由、历史恢复、列表、编辑、删除、AI 采用和图片弹窗；App 解构大量内部状态。另一些组件和后端类将整个函数压在单行，修改和审查都难以定位到小范围。

**建议：** 先统一 Java、Vue、TypeScript 的源码格式，再拆出题目列表、题目编辑、阅读导航等 composable。路由可逐步迁移到 Vue Router，迁移前固定已有链接、失效搜索回退、未保存离开和浏览器后退行为。状态只在必要边界共享，当前没有必须引入全局状态库的证据。

**验收：** 一次编辑行为变更不需要理解整套工作台；保留已修复的异步串题防护及路由回归。

### 7. P2：接口输出与表结构耦合，部分更新无法区分记录不存在

**位置：** [QuestionService.java](../../../backend/src/main/java/dev/interview/QuestionService.java:59)、[QuestionController.java](../../../backend/src/main/java/dev/interview/QuestionController.java:49)、[QuestionController.java](../../../backend/src/main/java/dev/interview/QuestionController.java:55)、[api.ts](../../../frontend/src/api.ts:45)。

后端大量返回数据库 Map 和 `SELECT *`，前端 `api<T = any>` 容易让字段变化绕过编译检查。标签和资料的部分 PUT 操作没有检查更新行数，目标不存在时仍可返回成功。当前源码范围未发现 OpenAPI 或可运行的 Postman 契约。

**建议：** 先明确题目摘要、题目详情、分页和错误响应 DTO；为 PUT 目标不存在、版本冲突和参数错误定义明确语义及测试。前端为业务请求指定返回类型，逐步收紧 `any`。选择一种可维护的接口契约；若使用 Postman，保存登录、CSRF、权限和版本冲突断言，不必为工具覆盖率重复维护无用途的多份契约。

### 8. P2：生产 MySQL 与交付产物缺少自动验证链路

**位置：** [SiteTest.java](../../../backend/src/test/java/dev/interview/SiteTest.java:18)、[RegressionTest.java](../../../backend/src/test/java/dev/interview/RegressionTest.java:29)、[package-release.ps1](../../../scripts/package-release.ps1:14)、[backend/Dockerfile](../../../backend/Dockerfile:6)。

本轮 41 项后端测试全部通过，但数据库集成使用 H2 MySQL 模式；这不能验证生产 MySQL 的排序规则、锁与死锁、时间和迁移行为。发布脚本直接打包现有源码、现有 JAR 和现有 dist，没有保证三者来自同一轮构建；Docker 后端构建跳过测试。当前目录未被 Git 识别为仓库，也未发现 `.github` 工作流，这可能是交付副本，不能据此断言源仓库没有版本管理或 CI。

**建议：** 建立单一验证及发布入口：固定 Java 17 / Node 24 → 后端测试 → 前端类型检查、单测和构建 → 内容校验 → 独立 MySQL 8.4 集成测试 → 打包同一轮产物。发布清单记录源码版本、依赖锁文件、内容摘要和产物 SHA256；失败不得继续交付旧产物。若当前目录就是开发主目录，应补充 Git 版本管理。

MySQL 优先验证迁移、模块归档与保存/恢复竞争、并发创建相同标签、题解升级和备份恢复。测试可以使用临时容器，不需要接触业务实例。

### 9. P2：单实例状态和 AI 资源预算需要明确运行边界

**位置：** [SecurityConfig.java](../../../backend/src/main/java/dev/interview/SecurityConfig.java:13)、[AiController.java](../../../backend/src/main/java/dev/interview/AiController.java:14)、[KnowledgeIndex.java](../../../backend/src/main/java/dev/interview/KnowledgeIndex.java:18)、[KnowledgeService.java](../../../backend/src/main/java/dev/interview/KnowledgeService.java:131)。

会话撤销、AI 并发控制、索引脏标记和检索快照都在进程内。现有文档也声明单实例设计；直接增加副本会使撤销、限流及索引更新不再具有全站一致性。当前没有必要为此立即分布式化，但部署必须遵守这个边界。

同时，AI 只有同时请求数限制，没有按账号的时间窗口预算；聊天请求未设置可配置的生成长度上限。检索快照会加载全部分片与匹配模型的向量，模型输出字节上限也不能代替费用、输入 token 和堆内存预算。

**建议：** 当前明确限制单实例；增加可配置的账号频率、输入/输出预算及知识库容量预算。记录 AI 耗时、错误、429、降级、可用槽位和索引重建耗时。真正需要多实例时，再一起处理共享会话及撤销、共享额度、跨实例内容修订通知和索引版本。

### 10. P2：内容质量状态与当前文档发生漂移

**位置：** [coverage.json](../../../content/explanations/coverage.json:6)、[README.md](../../../README.md:41)、[解析规范](../../../content/explanations/README.md:95)。

本轮实际校验通过；当前清单为 1,215 道题解，340 道题目级正文、2 道固定样例、873 道主题正文。当前 README 和解析规范仍写 244 / 2 / 969。历史验收报告应保留当时结果，但当前入口文档应跟随最新清单。

独立正文数量也不等于事实审核通过数量。对这个项目而言，题目与案例的对应关系、技术版本和结论依据，是与代码质量同等重要的产品能力。

**建议：** 从清单自动生成当前统计，并区分“结构合格”“案例可运行”“事实已核验”“人工修改待合并”等状态；保留历史报告日期。优先审核高风险并发、事务、分布式和支付题目，每题记录适用版本、参考依据、审核结果及可验证案例。此次未重新进行全库事实审核，不能把剩余 873 道直接判成错误。

## 建议执行顺序

1. 第一批解决 AI 正文截止时间、环境文件模板和默认测试隔离。每项都可独立提交和验收。
2. 第二批建立统一发布入口、MySQL 集成测试、摘要 DTO 及搜索投影，同时统一源码格式。
3. 第三批按功能拆分后端业务包和前端 composable，补充接口契约、运行指标和内容审核状态。

建议采用小步重构：每次只迁移一条业务链路，保留既有回归，不同时替换数据库访问框架、路由、状态管理和检索架构。

## 本轮实际验证

| 检查 | 结果与边界 |
| --- | --- |
| Java 17 后端测试 | `mvn -o -B -DforkCount=0 test`：41 项通过，0 失败、错误、跳过；使用独立 H2 内存库，模型协议测试使用本机 HTTP 测试服务 |
| 前端生产构建 | `npm run build`：类型检查及 Vite 构建通过 |
| 前端单元测试 | Vitest 单工作线程运行：4 个文件、14 项通过 |
| 高级题包结构 | `node scripts/validate-content.mjs`：21 模块、1,050 道高级题通过 |
| 题解清单和正文一致性 | `node scripts/validate-explanations.mjs`：1,215 题解、3 个样例、20 处图示引用及 340 处题目级修订通过；不代表事实核验 |
| 配置及故障风险 | 环境文件问题由原文件确认；Java 超时风险由代码和 JDK 官方说明确认，未做正文停滞故障注入 |

本机默认 Java 为 11，测试进程已显式切换到已安装的 Java 17。前端构建和单测首次被沙箱的 Windows 子进程权限 `spawn EPERM` 阻止，以正常权限重跑后通过；这不属于应用构建失败。真实模型质量与计费、生产 MySQL、Docker 启动及完整恢复演练仍未验证。
