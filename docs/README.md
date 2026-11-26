# 文档导航

全部说明文档集中在 `docs/`，按用途分目录；本页是唯一入口。

```
docs/
├── README.md    本导航页
├── project.md   项目说明（原仓库根 README）
├── agents.md    仓库指南（原仓库根 AGENTS.md）
├── openapi.json 接口契约（scripts/api-contract.mjs 生成）
├── guide/       常青指南：脚本、部署、测试、AI/RAG
├── content/     内容规范：题解、审查、模板、题包
└── reports/     轮次报告：architecture / ui / content 三类
```

代码、数据、配置目录中不再放置说明文档；`content/` 与 `deploy/` 只保留数据、脚本和配置。

## 项目入口

| 文档 | 用途 |
| --- | --- |
| [项目说明](project.md) | 功能范围、本地运行、数据位置 |
| [仓库指南](agents.md) | 目录结构、构建测试与提交约定 |

## 常青指南（docs/guide/）

长期有效的操作指南，不带日期。

| 文档 | 用途 |
| --- | --- |
| [脚本说明](guide/scripts.md) | 脚本分组、verify 清单与 archive 归档说明 |
| [部署目录说明](guide/deploy-directory.md) | `deploy/` 目录内的脚本与配置清单 |
| [测试指南](guide/testing.md) | 可复现测试命令、隔离要求与历轮验证范围 |
| [部署说明](guide/deployment.md) | 部署、备份、恢复、上线验收与运行诊断 |
| [AI 与 RAG](guide/ai-rag.md) | 模型配置、检索机制、数据发送范围和运行限制 |

## 内容规范（docs/content/）

题解编写、审查与题包相关的说明。

| 文档 | 用途 |
| --- | --- |
| [解析规范](content/explanations.md) | 内容结构、版本发布保护与审核台账（由 `sync-content-status.mjs` 维护） |
| [回答审查标准](content/review-standard.md) | 题解回答的审查要求 |
| [写作模板](content/template.md) | 题解写作样板 |
| [高级题包](content/senior-questions.md) | 题目来源和增量导入 |

## 接口契约

| 文档 | 用途 |
| --- | --- |
| [OpenAPI 契约](openapi.json) | 55 个接口操作、会话/CSRF、摘要/详情与错误语义 |

## 轮次报告（docs/reports/）

报告按主题分目录：`reports/architecture/`（架构与工程）、`reports/ui/`（界面与交互）、`reports/content/`(题解内容)。主要报告：

| 报告 | 用途 |
| --- | --- |
| [架构整改与验收](reports/architecture/ARCHITECTURE-IMPLEMENTED-20261021.md) | 10 项工程改动、独立测试、性能记录及生产验证范围 |
| [架构与代码审查（基线）](reports/architecture/ARCHITECTURE-REVIEW-20261021.md) | 整改前的架构判断、修改优先级与源码证据 |
| [GitHub 案例对照审查](reports/architecture/GITHUB-PROJECT-REVIEW-20261023.md) | 综合项目审查建议（统计口径已过时，见文内标注） |
| [搜索诊断记录](reports/architecture/SEARCH-BENCHMARK-20261021.json) | 搜索投影与全量清洗的单机排序基准数据 |
| [Spring 核心题解整改](reports/content/SPRING-CORE-CONTENT-20261023.md) | 59 题独立正文、15 道深入题解与验收 |
| [Spring 进阶题解整改](reports/content/SPRING-ADVANCED-CONTENT-20261023.md) | 60 题独立正文、12 道深入题解与验收 |
| [数据库基础题解整改](reports/content/DATABASE-BASICS-CONTENT-20261023.md) | 59 题独立正文、12 道深入题解与验收 |
| [文档交互与并发题解整改](reports/content/DOCS-UX-CONCURRENCY-20261024.md) | 文档重组、阅读/编辑/深色模式与并发基础 50 题 v12 |

标注「重建版」的报告（ARCHITECTURE-IMPLEMENTED、GITHUB-PROJECT-REVIEW、GITHUB-REFERENCE-REDESIGN、三份 20261023 内容整改与三份 20261023 UI 审查）是 2026-10-24 整理事故后基于留存证据的重建，原始逐项明细不可恢复，详见 [20261024 轮次报告](reports/content/DOCS-UX-CONCURRENCY-20261024.md) 第六节。

## 报告归档约定

新增轮次报告放入 `reports/` 对应主题子目录（`architecture/`、`ui/`、`content/`），文件名用「大写英文短名-日期」格式（如 `DOCS-UX-CONCURRENCY-20261024.md`），中文标题写在文内首行，顶部用一段引用说明状态与适用范围。历史轮次的报告不留在仓库内（需要时从 git 历史恢复），常青指南放入 `guide/`。
