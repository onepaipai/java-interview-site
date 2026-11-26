# 测试与发布验证

需要 Java 17（JAVA_HOME 与 PATH 一致）、Node 24；首次构建需要下载 Maven/npm 依赖。所有后端常规测试使用独立 H2 内存库，模型协议与故障测试使用本机 HTTP 服务，不需要模型密钥。

## 证据等级

验证结论按以下三档记录，不相互替代：

1. 结构/格式门禁：接口契约、内容结构、审核状态、类型检查与格式检查；只能证明文件符合当前规则。
2. H2 行为证据：正文中的 Java/SQL 片段在 JDK 17 或独立 H2 内存库编译执行；只证明教学样本在该环境成立。
3. MySQL 真实证据：在显式隔离的 MySQL 8.4 测试库中实际运行；只有明确记录运行时间、配置与结果后才能声称 MySQL 已验证。

报告、题解与发布记录中的「实测」「已验证」必须对应第 3 档或明确写明所属环境；跳过、未展开的参数化方法、CI 配置存在都不算真实证据。

## 日常无业务写入检查

```powershell
# backend
mvn -o -B -DforkCount=0 test
# frontend
npm test
npm run build
```

`npm test` 现在只执行单元测试，不读取日常管理员密码，也不连接业务后端。MySQL 集成测试没有显式测试连接时会报告跳过，不能据此声称 MySQL 已通过。

## 统一验证与发布

```powershell
# 根目录；需要 Docker 和本机 Chrome
.\scripts\verify.ps1
# 全部检查通过后打包；此入口会重新运行验证，拒绝旧产物
.\scripts\package-release.ps1
```

完整验证包含后端测试及打包、前端单测/格式/类型/构建、Java 格式、接口契约、内容结构和状态、原子发布回归、Compose 校验、独立 MySQL 8.4、隔离浏览器回归。发布清单记录源码及 JAR/dist 的 SHA256。`-SkipMySql`、`-SkipE2E` 仅用于诊断，生成的验证记录不能用于正式发布。

```powershell
.\scripts\verify.ps1 -SkipMySql -Offline
```

`-Offline` 只控制 Maven；npm ci 仍需可用的缓存或网络。Java 格式通过 frontend 的固定版本 Prettier/Java 插件检查。

## 隔离的端到端测试

```powershell
# 使用已构建的 JAR；只占用 18081 和 15181，端口被占用会拒绝启动
.\scripts\test-e2e.ps1
.\scripts\test-e2e.ps1 -Suite test:regressions
.\scripts\test-e2e.ps1 -Suite test:explanation-pack
.\scripts\test-e2e.ps1 -Suite test:learning-reader
.\scripts\test-e2e.ps1 -Suite test:catalog
.\scripts\test-e2e.ps1 -Suite test:spring-core-reader
.\scripts\test-e2e.ps1 -Suite test:spring-advanced-reader
.\scripts\test-e2e.ps1 -Suite test:database-basics-reader
.\scripts\test-e2e.ps1 -Suite test:data-admin
.\scripts\test-e2e.ps1 -Suite test:ai
```

`test:ai` 覆盖折叠面板展开后才检查状态、勾选「使用知识库」后的提问、Markdown 清洗与来源展开，以及 1440/390/320 三种宽度。
`test:data-admin` 覆盖数据管理页的导入预览与资料勾选、题库与完整备份下载、解析发布状态、业务库审核结论写回，以及知识模块的归档/取消归档与题目批量移动；它写入隔离测试环境的可丢弃数据，不指向日常应用数据。

运行器生成随机凭据和环境标识，数据库、图片和日志全部位于 `backend/target/e2e-<id>/`。测试先校验该环境的 `/api/test-environment` 标识，再允许写入；正常部署没有这个端点。结束后停止本轮启动的进程，保留可丢弃的诊断资料。直接运行写入型测试且缺少目标、凭据或环境标识时会失败，不能回退到日常服务。

纯 API 拦截的 `test:review` 仍可连接独立 preview 服务检查三种宽度；它不验证真实后端。历史浏览器脚本可能依赖已变化的页面选择器，执行结果以本次实际记录为准。

`test:learning-reader` 已加入默认浏览器检查，覆盖管理员和普通账号的揭示答案、自评保存、笔记/收藏保留、阅读偏好、面包屑、继续阅读及待复习入口，并检查 1280/390/320 宽度。历史脚本 `test-ui-content-fixes.mjs` 已随内容重整退役（泛型擦除示例的执行验证由后端真值测试与审核台账承接）。

`test:catalog` 同样加入默认入口，检查新目录的真实掌握进度、空自定义模块、知识点与领域筛选、学习路线和跳转、开始学习、偏好恢复及三种宽度。修改前端源码应在浏览器回归启动前完成，避免开发服务器热更新打断正在操作的弹窗。

`test:spring-core-reader` 加入默认入口，对 Spring 基础模块全部 59 题核对导入内容摘要，并逐题检查 1280/390/320 宽度、阅读模式、段落目录、代码和页面溢出。截图和结果位于 `frontend/test-results/spring-core/`。

`SpringCoreExamplesTest` 从生成正文中提取 3 段完整 Java 源码，通过 JDK 17 编译并执行，核对 prototype、后处理器与代理边界的结果，记录源码摘要到 `backend/target/spring-content-examples/`。另用独立 H2 连接对照默认受检异常、运行时异常和显式回滚规则；测试方法自身不包自动回滚事务。历史脚本 `test-spring-core-answers.mjs` 已随内容重整退役，覆盖核对由 `validate-explanations.mjs` 与审核台账承接。这些检查不代表 MySQL 锁行为或完整事实审核通过。

`test:spring-advanced-reader` 使用同一读取检查器的新配置，覆盖进阶模块全部 60 题的三种宽度、模式、段落目录、代码与精确导入内容。新增 `SpringAdvancedExamplesTest` 执行正文的三个 Java 程序，并以真实事务与事件适配器对照提交、回滚、无事务和两类提交后异常；历史脚本 `test-spring-advanced-answers.mjs` 已退役，发布核对由 `validate-explanations.mjs` 承接。已加入默认验证入口，详细范围见 [进阶题解记录](../reports/content/SPRING-ADVANCED-CONTENT-20261023.md)。

## MySQL 8.4

`DatabaseBasicsExamplesTest` 原样执行正文的三组会话临时表 SQL，结果及源码摘要位于 `backend/target/database-content-examples/h2/`；`node scripts/test-database-basics-answers.mjs` 核对内容与执行证据。它只验证 H2 样本的游标、条件更新和外连接语义，不作为 MySQL 计划和并发证明。`test:database-basics-reader` 已加入默认浏览器入口，覆盖全部 59 题及 SQL 代码显示，记录位于 `frontend/test-results/database-basics/`。

```powershell
.\scripts\test-mysql.ps1
```

此入口启动 `compose.test.yml` 的临时 MySQL，使用 13316 端口和内存数据目录；结束后只删除该测试 Compose 项目。测试库名必须以 `_test` 结尾，连接只允许 localhost/127.0.0.1。集成测试继承归档/恢复竞争、会话撤销、搜索定位、上传限额等回归，另验 MySQL 8.4、迁移和字符集。GitHub Actions 同样使用临时 MySQL 服务。CI 文件存在不代表它已经在远程运行。

运行器现同时执行 `DatabaseMySqlContentExamplesTest`，在真实 8.4 测试库运行同一组正文 SQL，并单独记录到 `backend/target/database-content-examples/mysql/`。缺少显式隔离配置时整类跳过，参数化方法在未展开时的跳过数可能按方法报告；不据此推断所有 SQL 已在 MySQL 通过。此检查仍不覆盖死锁、断电、复制与备份恢复实验。

本机没有 `docker` 命令时，此入口和 `verify.ps1` 的 MySQL 门禁都无法启动隔离库；不得据此声称 MySQL 已通过，也不把跳过记成验证。发布前应在具备 Docker 与本机 Chrome 的环境重新执行 `.\scripts\verify.ps1`，并记录完整验证结果。本轮整理只运行了不依赖 Docker/Maven/npm 的结构与内容门禁。

## 接口、内容与性能

```powershell
node scripts/verify-contract.mjs
node scripts/sync-content-status.mjs --check
node scripts/validate-content.mjs
node scripts/validate-explanations.mjs
# 有意修改接口契约后重新生成 JSON
node scripts/api-contract.mjs --write
# 内容发布后更新当前统计和独立审核状态；不会把待审核项标成已核验
node scripts/sync-content-status.mjs
# backend 中运行可选的搜索诊断
mvn -o -B -Dtest=SearchBenchmark -DforkCount=0 test
```

[OpenAPI](../openapi.json) 由 `scripts/api-contract.mjs` 确定性生成；检查会比对全部 Controller 路由。题目摘要和详情还有真实响应字段回归。常规列表不含完整答案、笔记或来源键，运维全量快照改走管理员接口 `/api/admin/snapshot/questions`。

[搜索诊断记录](../reports/architecture/SEARCH-BENCHMARK-20261021.json)比较实际 1,215 道题解的旧式重复清洗和新投影排序，并测量同线程分配量。它排除数据库和网络，不是生产吞吐或延迟承诺。

## 恢复控制流

```powershell
python scripts/test-restore.py G:/Git/bin/bash.exe
```

该检查使用临时目录和假 Docker，不连接真实容器；正式发布仍需在独立 MySQL 环境演练完整备份/恢复。

## 历史验收记录

以下保留当时的验证范围，不覆盖上面的当前测试入口。

## 2026-10-20 修复实际验证

- 后端完整测试 41 项通过，包括新增搜索分页/定位一致性、参考资料不污染知识检索及原文保留检查。
- 前端生产构建、类型检查和 14 项单元测试通过。
- 使用已有浏览器检查 1440、390、320 宽度的真实页面；本轮未另启 Chrome 执行整套历史浏览器脚本。修改过的脚本已通过语法检查。
- 本次正文提取的 Java 案例 14 项通过；题包结构、语义回归和原子发布保护检查通过。
- 数据快照核对：46 道预期题解更新，326 道归档题及 1 道自定义题保持，其他字段按快照逐项比对。

限制进程时，后端可用 `mvn -o -DforkCount=0 package`，前端可用 `node node_modules/vitest/vitest.mjs run tests/unit --pool=threads --maxWorkers=1 --no-file-parallelism --no-isolate`，构建与测试串行执行。

正文示例验证：脚本 `prepare-review-examples.mjs` 已退役，从 git 历史取回（`git show bf8768a:scripts/prepare-review-examples.mjs > scripts/prepare-review-examples.mjs`）后运行，再用 Java 17 执行 `backend/target/ReviewExamples20261020.java`。

发布后对快照运行 `node scripts/sync-content-status.mjs --check` 核对内容状态与审核台账。历史脚本 `verify-explanation-upgrade.mjs`、`verify-review-fixes.mjs` 已退役，需要时从 git 历史取回(`git show bf8768a:scripts/<脚本名>`)。

逐项结果见各模块整改记录（如 `docs/reports/content/SPRING-CORE-CONTENT-20261023.md`）。10 月 15 日的 37 项后端测试、9 项单元测试及恢复模拟记录属于当时验证范围，历史报告已从仓库移除，需要时从 git 历史恢复。

以上不代表真实模型供应商、生产 MySQL 或远程部署已验收。
