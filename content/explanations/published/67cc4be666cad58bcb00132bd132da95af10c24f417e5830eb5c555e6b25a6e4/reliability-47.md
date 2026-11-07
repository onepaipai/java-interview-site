<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. 工作状态与领取租约需持久化，重启后识别可重试项并幂等执行。
2. 不能把内存队列和线程存在当可靠进度记录。

## 参考分析

1. 进程被强杀不会执行 finally。
2. 只能靠持久事务和可重试协议恢复，不可依赖内存标志。

## 案例

1. 场景（教学示例）：任务完成外部发送后、写完成标记前被强杀。
2. 处理：恢复按原动作号查询或幂等重发，分批领取并限制恢复并发，未决项进入处置。

3. 验证：不会重复付费或通知；恢复洪峰受控且待办可计量。

## 总结点

1. 强杀不会走清理。
2. 恢复先查未知结果。
