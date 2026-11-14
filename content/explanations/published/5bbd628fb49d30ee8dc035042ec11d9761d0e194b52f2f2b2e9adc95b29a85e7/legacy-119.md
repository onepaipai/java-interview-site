<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 稳定业务流水号与参数摘要标识同一转账意图。
2. 唯一约束及业务结果在同一事务提交，同键不同内容拒绝。
3. 重复点击、重试和消费返回原状态；未知结果先查询，不新建另一笔。

## 参考分析

1. 创建新单会改变意图并可能重复扣款。
2. 去重记录与业务分开提交会留下故障窗口。

## 案例

1. 场景（教学示例）：转账请求超时，客户用同一流水号重发。
2. 处理：先核对原请求摘要和状态，处理中返回可追踪结果；唯一约束保护并发首次请求。

```sql
CREATE UNIQUE INDEX uk_request ON business_result(request_id);
-- 同键重试先核对参数，再返回已提交结果。
```

3. 验证：只产生一笔账务；同号改金额被拒绝，未知状态不会直接新建交易。

## 总结点

1. 同键必须同意图。
2. 重试沿用原业务号。
