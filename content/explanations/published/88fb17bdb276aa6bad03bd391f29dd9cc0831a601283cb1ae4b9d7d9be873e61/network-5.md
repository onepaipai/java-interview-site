<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [HTTP 规范 · 1](https://www.rfc-editor.org/rfc/rfc793.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/net/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银网关沙盘:大促瞬间网关 accept 线程被慢处理拖住,客户端连接超时但服务端 CPU 空闲——半连接队列正常而全连接队列打满,SYN 进不来还是完成的连接没人取,两种队列两种病因。

1. 两个队列:半连接队列(SYN_RCVD,收到 SYN 等第三次 ACK)与全连接队列(ESTABLISHED,握手完成等 accept 取走)——前者防 SYN 洪水,后者缓冲应用处理与网络速度差。
2. 观察差异:半连接打满=丢 SYN/syncookies 兜底,表现为大量连接超时;全连接打满=丢最后 ACK 或回 RST,表现为连接"成功"后立刻 reset——异常形态不同,处置也不同(前者扩容/限流,后者查 accept 线程)。
3. 参数:半连接队列由 syn_backlog 控制,全连接由 backlog(应用 listen 传入,受 somaxconn 上限)控制;netstat 的 SYN_RCVD 计数与 listen 的 Recv-Q(未 accept 数)是分别观察两个队列的窗口。

## 参考分析

### 第二步扩展① 机制:两条队列的生命周期

- SYN 到达→半连接队列(分配 cookie 或表项)→ACK 到达→校验通过移入全连接队列→accept() 取走。
- 全连接队列打满的行为取决于 tcp_abort_on_overflow:关(默认)静默丢 ACK 客户端重传、开(1)回 RST——前者表现为"连接建立了但第一笔请求丢失重试",更难排查。

### 第二步扩展② 反例:只看一个队列的误判

- 误判一:只看 CPU 与线程池——全连接打满时 CPU 空闲、线程池有空位,但 accept 线程阻塞在慢任务上没人取连接,加机器无效。
- 误判二:把 syncookies 触发当攻击——偶发 SYN 突发触发 cookie 模式,性能下降被误报为 DDoS。
- 两条的正解:两个队列分别监控(SYN_RCVD 计数/Recv-Q/溢出计数)。

### 第二步扩展③ 取舍:队列长度的权衡与排查

- backlog 调大:抗瞬时突发,但掩盖 accept 线程慢的问题且内存占用增。
- 调小:快速暴露应用瓶颈但突发丢连接。
- 经验:backlog 与 accept 线程吞吐匹配(突发峰值×平均 accept 延迟),同时监控溢出计数。
- 排查按三步走:一看 ss -lnt 的 Recv-Q/Send-Q(水位),二查 netstat -s 的溢出计数(历史证据),三查 syn_backlog/somaxconn 上限——队列是缓冲不是解药,accept 速度才是。

## 案例

### 第三步发散·验证与推演 验证:队列异常形态的推演核对

- 推演:本机 N2 实验验证了连接状态机(TIME_WAIT=30/CLOSE_WAIT=1)与 netstat 观察路径。
- 队列维度按 RFC 793 与内核行为推演——半连接打满丢 SYN 表现为 connect 超时(N3 的 2019ms 形态),全连接打满丢 ACK 表现为首请求 reset。
- 验证:两种失败形态可由异常类型与 netstat 计数区分,处置方向不同成立。

### 第三步发散·发散要点 追问链:队列三刀

- **追问①**：syncookies 的代价——无状态防洪水,但牺牲 TCP 选项(窗口缩放等),触发即降级,要监控触发率
- **追问②**：accept 与 epoll 的关系——accept 也是事件,Reactor 模型里由事件循环统一调度,accept 慢同样拖垮 IO 线程(见 Q28)
- **追问③**：容器化下的观察陷阱——宿主机 netstat 看到的是所有容器,namespace 隔离后要在容器内观察,且 backlog 参数随容器 net namespace 各自生效

## 总结点

1. 半连接防洪水全连接缓冲
2. 超时与 reset 形态不同
3. 队列是缓冲不是解药
