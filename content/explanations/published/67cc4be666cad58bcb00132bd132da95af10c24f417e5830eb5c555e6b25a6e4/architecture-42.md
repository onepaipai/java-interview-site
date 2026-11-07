<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 库减少网络但增加版本分发耦合，服务便于集中治理却增加运行依赖。
2. 结合变更频率、状态管理和团队所有权选择。

## 参考分析

1. 公共库增加版本协调，公共服务增加网络和运维成本。
2. 把密钥打进产物会在日志、镜像与分发链复制。

## 案例

1. 场景（教学示例）：公共 SDK 升级导致多个业务不能同时发布。
2. 处理：缩小公开接口，按兼容版本演进，提供旧客户端回归；密钥外置且不进入测试快照。

3. 验证：消费方可渐进升级，产物扫描不含凭证；故障能回退受影响版本。

## 总结点

1. 公共能力要可升级。
2. 密钥不进入产物。
