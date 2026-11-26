# Spring 核心题解整改 · 2026-10-23

> 文档状态：历史快照（本地链接可能失效） · 重建版（原始明细不可恢复）。原文件在 2026-10-24 文档整理事故中丢失，无版本历史可恢复。本版基于测试指南、解析规范与留存证据重建；原报告的逐题清单与验收细节不可恢复。

本轮把 Spring 基础模块剩余 54 道主题正文改为逐题独立正文，该模块 50 道扩展题与 9 道原始题共 59 题均有独立内容，其中 15 道采用深入格式。发布为 explanations-v9，源文件 [answers/spring-core-answers.mjs](../../../content/explanations/answers/spring-core-answers.mjs)。

## 留存证据

- `SpringCoreExamplesTest`：从生成正文提取 3 段完整 Java 源码，JDK 17 编译执行，核对 prototype、后处理器与代理边界；另以独立 H2 连接对照事务回滚规则。
- `node scripts/test-spring-core-answers.mjs`：核对 59 题覆盖、独立案例、已发布内容与执行证据。
- `test:spring-core-reader`：全部 59 题的 1280/390/320 三种宽度、阅读模式、段落目录、代码与溢出检查，截图见 `frontend/test-results/spring-core/`（含 spring-basics-4-1280（`../../../frontend/test-results/spring-core/spring-basics-4-1280.png`）、spring-basics-4-390（`../../../frontend/test-results/spring-core/spring-basics-4-390.png`）、legacy-41-320（`../../../frontend/test-results/spring-core/legacy-41-320.png`）、reader-audit.json（`../../../frontend/test-results/spring-core/reader-audit.json`））。
