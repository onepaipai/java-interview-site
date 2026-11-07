<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

1. TCP 提供可靠有序字节流，UDP 为数据报，不自带同等交付与顺序保证。
2. 三次握手建立双向序号和接收能力认知，并处理旧连接等场景。
3. 双方可独立半关闭，常见关闭有四次报文，部分确认可合并。

## 参考分析

1. 连接成功不说明应用能及时处理。
2. DNS 与连接缓存让切流存在旧节点窗口。
3. HTTP 复用需处理空闲连接被对端关闭。

## 案例

1. 场景（教学示例）：切流后少量请求仍访问旧地址且首次请求偶发失败。
2. 处理：记录 DNS、远端地址和连接复用状态，设计长度或分隔协议，设置受控连接生命周期。

3. 验证：可定位旧连接来源；重试遵循业务幂等，不把字节流读取次数当报文数。

## 总结点

1. 阶段分开量。
2. 字节流自行定界。
