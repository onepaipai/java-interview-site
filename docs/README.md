# 文档导航

文档按类型存放，各类别的位置固定如下：

| 类型 | 位置 | 说明 |
| --- | --- | --- |
| 项目说明 | 根 `README.md` | 功能范围、本地运行、数据位置 |
| 接口契约 | `docs/openapi.json` | 由 `scripts/api-contract.mjs` 生成 |
| 常青指南 | `docs/` 根（如 `TESTING.md`） | 长期有效的操作指南，不带日期 |
| 轮次报告 | `docs/reports/<主题>/*.md` | 一轮改动的审查、实施与验收记录，按 architecture / ui / content 分目录 |
| 历史归档 | `docs/history/` | 已过时的实现与验收记录，加历史横幅 |
| 内容包文档 | `content/explanations/`、`content/senior/` | 与题解数据同址的写作规范与模板 |
| 部署运维 | `deploy/`（README、AI-RAG 与脚本） | 部署、备份、恢复与 AI/RAG 配置 |

当前说明以本页为唯一入口；轮次报告记录各轮改动与验收；历史归档记录已过时的实现状态，不作为当前功能承诺。

## 概览

| 文档 | 用途 |
| --- | --- |
| [项目说明](../README.md) | 功能范围、本地运行、数据位置 |

## 架构与接口

| 文档 | 用途 |
| --- | --- |
| [OpenAPI 契约](openapi.json) | 55 个接口操作、会话/CSRF、摘要/详情与错误语义 |
| [架构整改与验收](reports/architecture/ARCHITECTURE-IMPLEMENTED-20261021.md) | 10 项工程改动、独立测试、性能记录及生产验证范围 |
| [架构与代码审查（基线）](reports/architecture/ARCHITECTURE-REVIEW-20261021.md) | 整改前的架构判断、修改优先级与源码证据 |
| [GitHub 案例对照审查](reports/architecture/GITHUB-PROJECT-REVIEW-20261023.md) | 综合项目审查建议（统计口径已过时，见文内标注） |
| [搜索诊断记录](reports/architecture/SEARCH-BENCHMARK-20261021.json) | 搜索投影与全量清洗的单机排序基准数据 |

## 部署与运维

| 文档 | 用途 |
| --- | --- |
| [部署说明](../deploy/README.md) | 部署、备份、恢复、上线验收与运行诊断 |
| [AI 与 RAG](../deploy/AI-RAG.md) | 模型配置、检索机制、数据发送范围和运行限制 |

## 测试与验证

| 文档 | 用途 |
| --- | --- |
| [测试指南](TESTING.md) | 可复现测试命令、隔离要求与历轮验证范围 |

## 内容与题解

| 文档 | 用途 |
| --- | --- |
| [解析规范](../content/explanations/README.md) | 内容结构、版本发布保护与审核台账 |
| [高级题包](../content/senior/README.md) | 题目来源和增量导入 |
| [Spring 核心题解整改](reports/content/SPRING-CORE-CONTENT-20261023.md) | 59 题独立正文、15 道深入题解与验收 |
| [Spring 进阶题解整改](reports/content/SPRING-ADVANCED-CONTENT-20261023.md) | 60 题独立正文、12 道深入题解与验收 |
| [数据库基础题解整改](reports/content/DATABASE-BASICS-CONTENT-20261023.md) | 59 题独立正文、12 道深入题解与验收 |
| [文档交互与并发题解整改](reports/content/DOCS-UX-CONCURRENCY-20261024.md) | 文档重组、阅读/编辑/深色模式与并发基础 50 题 v12 |

## 近期轮次报告

报告按主题分目录：`reports/architecture/`（架构与工程）、`reports/ui/`（界面与交互）、`reports/content/`(题解内容)。上面各功能分类已收录对应报告，此处不再重复列表。

标注「重建版」的报告（ARCHITECTURE-IMPLEMENTED、GITHUB-PROJECT-REVIEW、GITHUB-REFERENCE-REDESIGN、三份 20261023 内容整改与三份 20261023 UI 审查）是 2026-10-24 整理事故后基于留存证据的重建，原始逐项明细不可恢复，详见 [20261024 轮次报告](reports/content/DOCS-UX-CONCURRENCY-20261024.md) 第六节的完整记录。

## 报告归档约定

新增轮次报告放入 `reports/` 对应主题子目录（`architecture/`、`ui/`、`content/`），文件名用「大写英文短名-日期」格式（如 `DOCS-UX-CONCURRENCY-20261024.md`），中文标题写在文内首行，顶部用一段引用说明状态与适用范围；后续轮次取代其结论时，把文件移入 `history/` 并按历史横幅格式改写开头。

## 历史归档

以下文档描述当时的实现与验收，不代表当前功能或测试结果。

- [ANSWER-FIX-20261015](history/ANSWER-FIX-20261015.md)（配套数据 [ANSWER-FIX-20261015.json](history/ANSWER-FIX-20261015.json)）
- [ANSWER-QUALITY-20261015](history/ANSWER-QUALITY-20261015.md)
- [CHANGES-20261014](history/CHANGES-20261014.md)
- [CONTENT-DEPTH-20261021](history/CONTENT-DEPTH-20261021.md)
- [CORE](history/CORE.md)
- [DEEP-REVIEW-20261019](history/DEEP-REVIEW-20261019.md)
- [EXPLANATIONS-20261015](history/EXPLANATIONS-20261015.md)
- [FIXES-20261020](history/FIXES-20261020.md)
- [INTERACTIONS](history/INTERACTIONS.md)
- [KNOWLEDGE-POLISH-20261015](history/KNOWLEDGE-POLISH-20261015.md)
- [MARKDOWN-UI](history/MARKDOWN-UI.md)
- [MODULE-MANAGEMENT](history/MODULE-MANAGEMENT.md)
- [READER-POLISH-20261015](history/READER-POLISH-20261015.md)
- [REDESIGN](history/REDESIGN.md)
- [REVIEW-20261015](history/REVIEW-20261015.md)
- [REVIEW-BASELINE-20261015](history/REVIEW-BASELINE-20261015.md)（配套数据 [REVIEW-SECOND-20261015.json](history/REVIEW-SECOND-20261015.json)）
- [REVIEW-SECOND-20261015](history/REVIEW-SECOND-20261015.md)
- [SELF-REVIEW-20261015](history/SELF-REVIEW-20261015.md)
- [UI-REVIEW-20261015](history/UI-REVIEW-20261015.md)
- [UX-REVIEW](history/UX-REVIEW.md)
- [VALIDATION](history/VALIDATION.md)
- [WORKBENCH](history/WORKBENCH.md)
