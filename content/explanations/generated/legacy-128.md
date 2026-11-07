<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 字段最小化保存，按敏感程度加密并分离密钥权限。
2. 展示、日志、导出和备份分别控制脱敏与访问。
3. 脱敏不等于匿名化；密钥轮换与恢复流程必须演练。

## 参考分析

1. 签名只证明受信密钥下的完整性，仍需防重放。
2. 日志、备份和分析副本也属于敏感数据范围。

## 案例

1. 场景（教学示例）：攻击者重放已用验证码并替换收款账号。
2. 处理：验证码绑定交易摘要，原子消费 nonce，限制失败次数；证书新旧版本短窗并存且可回退。

3. 验证：重放和改要素都被拒绝；轮换不中断合法请求，原始敏感值不进入普通日志。

## 总结点

1. 认证绑定交易要素。
2. 加密脱敏各司其职。
