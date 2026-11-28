# 文档导航

全部说明文档集中在 `docs/`，按用途分目录；本页是唯一入口。

```
docs/
├── README.md    本导航页
├── project.md   项目说明（原仓库根 README）
├── agents.md    仓库指南（原仓库根 AGENTS.md）
├── openapi.json 接口契约（scripts/api-contract.mjs 生成）
├── guide/       常青指南：脚本、部署、测试、AI/RAG
└── content/     内容规范：题解、审查、模板、题包
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

## 轮次报告

历史轮次报告（架构审查、UI 审查、模块内容整改等）已全部移出仓库，需要时从 git 历史恢复，例如 `git show bf8768a:docs/reports/content/SPRING-CORE-CONTENT-20261023.md`。新增轮次报告同样不入仓库：结论沉淀进常青指南（`guide/`）与代码，明细只留在提交说明与审核台账（`content/explanations/review-ledger.json`）中。
