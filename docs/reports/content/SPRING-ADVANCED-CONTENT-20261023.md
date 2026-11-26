# Spring 进阶题解整改 · 2026-10-23

> 文档状态：历史快照（本地链接可能失效） · 重建版（原始明细不可恢复）。原文件在 2026-10-24 文档整理事故中丢失，无版本历史可恢复。本版基于测试指南、解析规范与留存证据重建；原报告的逐题清单与验收细节不可恢复。

本轮为 Spring 进阶模块新增 54 道题目级修订，其中 12 道深入格式（覆盖保存点与独立事务、UnexpectedRollbackException、多数据源、异步事务边界、提交后失败、同步缓存加载、失效竞态、多条安全链、线程池身份传播、WebFlux 与 JDBC、配置快照和事务事件验证），模块 60 题均有独立正文。发布为 explanations-v10，源文件 [answers/spring-advanced-answers.mjs](../../../content/explanations/answers/spring-advanced-answers.mjs)。

## 留存证据

- `SpringAdvancedExamplesTest`：执行正文 3 段程序与 2 项真实事务事件对照（提交、回滚、无事务与两类提交后异常）。
- `node scripts/test-spring-advanced-answers.mjs`：校验 60 题覆盖、54 个新案例、12 个深入格式、发布正文与执行证据。
- `test:spring-advanced-reader`：60 题三种宽度与阅读检查，截图见 `frontend/test-results/spring-advanced/`（含 spring-advanced-3-1280（`../../../frontend/test-results/spring-advanced/spring-advanced-3-1280.png`）、spring-advanced-10-390（`../../../frontend/test-results/spring-advanced/spring-advanced-10-390.png`）、legacy-90-320（`../../../frontend/test-results/spring-advanced/legacy-90-320.png`）、reader-audit.json（`../../../frontend/test-results/spring-advanced/reader-audit.json`））。
