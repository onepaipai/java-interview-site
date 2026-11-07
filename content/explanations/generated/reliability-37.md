<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 证书有可预测期限，应监控有效期与自动续期结果，并验证客户端信任链。
2. 轮换要有演练与回退，不能只依赖到期告警。

## 参考分析

1. 同机房、账号或控制面可能是共同故障域。
2. 证书与密钥失效也能让健康实例不可用。
3. 备份文件存在不证明可恢复。

## 案例

1. 场景（教学示例）：数据库恢复成功但图片和签名密钥缺失。
2. 处理：隔离恢复全套资源，校验引用与业务不变量，切断旧主写权限，检查证书到期与轮换。

3. 验证：实际业务可用且恢复点可证明；演练时长包含切换、核对和放流。

## 总结点

1. 恢复以业务验收。
2. 旧主必须被隔离。
