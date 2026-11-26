# 数据库基础题解整改 · 2026-10-23

> 文档状态：历史快照（本地链接可能失效） · 重建版（原始明细不可恢复）。原文件在 2026-10-24 文档整理事故中丢失，无版本历史可恢复。本版基于测试指南、解析规范与留存证据重建；原报告的逐题清单与验收细节不可恢复。

本轮将数据库基础模块剩余 53 道主题正文改为独立正文，50 道扩展题与 legacy/42–50 共 59 题均有题目级内容，其中 12 道深入格式。发布为 explanations-v11，源文件 [answers/database-basics-answers.mjs](../../../content/explanations/answers/database-basics-answers.mjs)。

## 留存证据

- `DatabaseBasicsExamplesTest`：原样执行正文 3 组会话临时表 SQL 并记录 H2 结果；同一组 SQL 另接入显式隔离 MySQL 8.4 门禁（`scripts/test-mysql.ps1`），未运行该门禁时不以 H2 结果代替索引或锁验证。
- `node scripts/test-database-basics-answers.mjs`：核对 59 题覆盖、53 个独立案例、12 个深入格式与执行摘要。
- `test:database-basics-reader`：59 题三种宽度与 SQL 代码显示检查，截图见 `frontend/test-results/database-basics/`（含 database-basics-15-1280（`../../../frontend/test-results/database-basics/database-basics-15-1280.png`）、database-basics-15-390（`../../../frontend/test-results/database-basics/database-basics-15-390.png`）、database-basics-24-320（`../../../frontend/test-results/database-basics/database-basics-24-320.png`）、legacy-47-1280（`../../../frontend/test-results/database-basics/legacy-47-1280.png`）、reader-audit.json（`../../../frontend/test-results/database-basics/reader-audit.json`））。
