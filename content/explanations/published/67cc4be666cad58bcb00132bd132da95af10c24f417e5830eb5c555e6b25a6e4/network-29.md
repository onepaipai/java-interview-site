<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Netty ByteBuf API · 1](https://netty.io/4.1/api/io/netty/buffer/ByteBuf.html)

</details>

## 参考回答

1. 部分缓冲区需要显式释放，漏释放会导致直接内存增长，重复释放也可能出错。
2. 明确跨异步边界的所有权与保留规则。

## 参考分析

1. 引用计数定义缓冲区生命周期，跨异步边界必须明确所有权。
2. 过早 release 会造成释放后访问，漏 release 会保留直接内存。

## 案例

1. 场景（教学示例）：ByteBuf 交给异步任务后，入口立即释放。

2. 处理：按 Netty 契约 retain 后转交，消费方 finally release；异常和拒绝路径也释放相应引用。

3. 验证：引用数归零时才回收；泄漏检测与失败用例均无遗漏，不多减一次。

## 总结点

1. 跨边界先明确所有权。
2. 每次持有对应一次释放。
