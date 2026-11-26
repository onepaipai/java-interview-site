# deploy/

部署与运维脚本目录，操作指南已集中到文档区：

- 部署、备份、恢复、上线验收：[deployment.md](deployment.md)
- 模型与 RAG 配置：[ai-rag.md](ai-rag.md)

本目录文件：`nginx-host.conf`（宿主机 nginx 反代示例，含 `/api/health` 短超时探针，避免健康请求等待 130 秒的 AI 超时）、`backup.sh` / `restore.sh`（备份与恢复）、`check.sh`（上线自检，调用 `/api/health`）。
