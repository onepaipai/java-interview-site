# scripts/

Two kinds of files live here. When adding one, put it in the right group.

## 校验/发布管线（verify.ps1 与 CI 按清单调用，勿随意删除）

- `verify.ps1` — 完整验证入口（格式、契约、内容、MySQL、浏览器 e2e）。
- `verify.ps1:18` 清单内的校验脚本：`check-deployment-config.mjs`、`verify-contract.mjs`、
  `sync-content-status.mjs`、`validate-content.mjs`、`validate-explanations.mjs`、
  `test-database-basics-answers.mjs`、`test-explanation-publication.mjs`、`test-deep-answers.mjs`。历史批次的一次性验收脚本(如 `test-spring-core-answers`)已随内容重整退役,需要时从 git 历史恢复。
- `api-contract.mjs` — 被 `verify-contract.mjs` 引用。
- `build-manifest.mjs` — 发布哈希门禁记录（`verify.ps1:23`）。
- `package-release.ps1` / `verify-staged-release.mjs` — 发布打包与 staged 目录哈希比对。
- `start-local.ps1` / `stop-local.ps1` — 本地开发启动/停止（`-Rebuild` 强制全量构建）。
- `test-e2e.ps1` / `test-mysql.ps1` — 一次性环境跑浏览器 e2e / 隔离 MySQL 测试。
- `snapshot-question-bank.ps1` / `clean-logs.ps1` / `test-restore.py` — 运维辅助。

## 共享库（被管线脚本 import，同样勿动）

- `question-contents.mjs`、`explanation-content.mjs`、`explanation-deep.mjs`、
  `explanation-markdown.mjs`、`explanation-references.mjs` — 题面/题解加载、校验与渲染，
  被 `validate-explanations.mjs`、`sync-content-status.mjs`、`test-*-answers.mjs` 等 import。
- `publish-explanations.mjs` — 被 `test-explanation-publication.mjs` import。

## 退役脚本

历史一次性内容生成/审查工具（`review-*-facts.mjs`、`build-explanations.mjs`、`prepare-*.mjs`、
`verify-explanation-*.ps1/.mjs`、`verify-reviewed-examples.ps1`、`verify-review-fixes.mjs`）
已于 2026-11-07 删除，不参与任何管线；如需追溯，从 git 历史取回：
`git show bf8768a:scripts/<脚本名>`。

如需确认哪些脚本仍在门禁中，以 `verify.ps1` 与 `.github/workflows/verify.yml` 的调用清单为准。
