<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 无限用户或请求标签会产生大量时序，消耗采集和查询资源。
2. 指标使用有限业务维度，个体细节进入受控日志或追踪。

## 参考分析

1. 删除仍被进程打开的文件不一定立即释放空间。
2. 监控自身需要独立探测，不能只依赖同一故障域自报健康。

## 案例

1. 场景（教学示例）：错误日志洪峰占满磁盘，监控也停止写入。
2. 处理：抑制重复日志并保留采样证据，按保留策略清理已确认文件；外部探测核对告警链路。

3. 验证：空间恢复且关键审计不丢；监控故障本身能被独立发现。

## 总结点

1. 日志不能反噬服务。
2. 监控也需被监控。
