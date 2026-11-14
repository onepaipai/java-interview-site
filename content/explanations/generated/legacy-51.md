<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/table-of-contents/)
- [Raft 论文 · 2](https://raft.github.io/raft.pdf)
- [HTTP 语义规范 · 3](https://www.rfc-editor.org/rfc/rfc9110.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银连接沙盘:TCP(连接/可靠/有序)vs UDP(无连接/不可靠/低延迟)——金融交易走 TCP(可靠),行情推送可走 UDP(容忍丢失);三次握手=双向确认+ISN 同步的最小次数。

1. TCP:连接导向(三次握手)——可靠(确认/重传/排序)+流量控制(滑动窗口)+拥塞控制(慢启动/拥塞避免);UDP:无连接——不可靠但低延迟(无握手/确认/重传开销),适合实时音视频/DNS/行情推送。
2. 三次握手:SYN→SYN+ACK→ACK——双向确认+ISN 同步;两次不够(服务端无法确认客户端可收);四次多余(SYN+ACK 可合并)——ISN 随机防旧报文+防序列号预测(network Q3 ISN 双目的)。
3. 四次挥手:FIN→ACK→FIN→ACK——TCP 全双工(每个方向独立关闭);TIME_WAIT(主动关闭方 2MSL,防旧报文污染新连接,第 6 题)。

## 参考分析

### 机制:金融交易选 TCP 的理由

交易必须可靠到达且有序(TCP 保证);UDP 丢包=交易丢失(不可接受);TCP 重传确保到达——代价=延迟,但金融可靠性>延迟。行情推送容忍丢包→UDP 可选。

### 反例:TCP/UDP 误用两种事故

事故一:UDP 做交易——丢包=交易丢失,应用层重传=重新发明 TCP;修复=交易走 TCP。事故二:TCP 做实时推送——Nagle+确认增加延迟;修复=TCP_NODELAY 或 UDP 组播。

### 取舍:连接管理

长连接复用(省握手,第 8 题)+连接池;TIME_WAIT 堆积(短连接高频,第 6 题);三次握手延迟(1-RTT,HTTPS 加 TLS 再加 1-2 RTT,第 1 题)——连接复用是性能主线。

## 案例

### 验证:TCP/UDP 的走查核对

验证:N3 实验(超时/拒绝/读取三形态);N4 实验(复用 0.29ms vs close 0.9ms);N2 实验(TIME_WAIT=30/CLOSE_WAIT 随 close 消失)——network 批次实验可复用。验证:握手状态机断言可程序化(netstat)。

### 追问链:TCP 三刀

一刀:拥塞控制=慢启动→拥塞避免→快重传→快恢复(第 17 题)。二刀:TCP 粘包=应用层分帧(长度前缀/分隔符,第 4 题)。三刀:TIME_WAIT 优化=连接池+tcp_tw_reuse(第 6 题)。

## 总结点

1. TCP 可靠有序,UDP 低延迟
2. 三次=最小充分解
3. 金融交易走 TCP,行情可 UDP
