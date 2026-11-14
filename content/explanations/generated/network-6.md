<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [HTTP 规范 · 1](https://www.rfc-editor.org/rfc/rfc793.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/net/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银压测沙盘:压测端大量短连接,netstat 里 TIME_WAIT 堆到上万——有人想"把它们强制关掉",但 TIME_WAIT 是主动关闭方留在内核的状态,没有应用句柄可关,只能等 2MSL 计时自然衰减。

1. 来源与语义:谁先发 FIN 谁主动关闭,主动方进 TIME_WAIT 停留 2MSL——作用有二:确保最后的 ACK 若丢失可重传 FIN 场景下对端能重发(可靠关闭);让旧连接的延迟报文在网络中自然消亡,不污染复用四元组的新连接。
2. 本机实测:客户端主动关闭 30 个连接,快照 TIME_WAIT=30;服务端随后 close 后快照 TIME_WAIT=31(继续累积)——代码层面无任何手段消除,只能等计时衰减(Windows 默认约 30-120 秒,Linux 60 秒)。
3. 治理方向不是"关掉"而是"少制造":连接复用(长连接池,见 Q8)、让对端先关(服务端承担 TIME_WAIT,服务端量大时用端口段扩容)、内核参数 tcp_tw_reuse 仅对出站连接安全(配合时间戳防序号回绕)。

## 参考分析

### 机制:2MSL 的两个保护

保护一:四次挥手最后 ACK 丢失时,被动方重发 FIN,主动方若已消失会回 RST,被动方无法干净关闭;TIME_WAIT 期间的主动方还能重 ACK。保护二:延迟报文的存活上限由 MSL 界定,2MSL 后四元组才可安全复用——两个保护都在防"旧报文污染新连接"。

### 反例:强关 TIME_WAIT 的三种尝试

尝试一:kill 进程——TIME_WAIT 在内核不在进程,进程死状态还在。尝试二:tcp_tw_recycle——NAT 环境下按源地址丢包,已从内核移除,踩过的人都知道是事故源。尝试三:tcp_tw_reuse 滥用——无时间戳支持时序号可能回绕,新连接收到旧连接的延迟数据(数据串包,资金类系统不可接受)。

### 取舍:谁承担 TIME_WAIT

客户端短连接:客户端堆 TIME_WAIT,量大时耗尽临时端口;服务端主动关(如 HTTP keep-alive 超时由服务端发起):服务端堆 TIME_WAIT——服务端端口固定,靠四元组复用问题不大;最佳实践还是连接池长连接,把挥手次数压到最低。

## 案例

### 验证:状态滞留的实测证据

本机实测(JDK 17.0.17+netstat):
~~~
java N2ConnStates
快照1:TIME_WAIT=30(主动关闭方停留 2MSL)
快照1:CLOSE_WAIT=1(被动方=服务端应用没调 close)
快照2(服务端 close 后):CLOSE_WAIT=0(应用关了立即消失)
快照2:TIME_WAIT=31(只能等计时衰减,代码跳不过)
~~~
验证:TIME_WAIT 数量随主动关闭累积且 close 后依旧存在(31),CLOSE_WAIT 随应用 close 立即归零——两类状态的可控性差异实证。

### 追问链:TIME_WAIT 三刀

一刀:为什么是 2MSL 而不是 1——一个 MSL 报文最远存活,主动方回 ACK 后对端重发 FIN 的最坏路径往返=2MSL,工程上保守取双倍。二刀:端口耗尽怎么算——临时端口约 16K 级(net.ipv4.ip_local_port_range),每连接占一个约 60 秒,理论上限约每秒数百新连接,压测脚本的常见瓶颈;耗尽形态=connect 抛 Cannot assign requested address(EADDRNOTAVAIL),确认看 ss -s 的 TIME_WAIT 计数与端口范围配置,应急=扩大 ip_local_port_range+开 tcp_tw_reuse(仅出站安全)+连接池根治。三刀:HTTP/2 多路复用为什么显著缓解——单连接承载多流,挥手频率骤降(见 Q17)。

## 总结点

1. TIME_WAIT 在内核关不掉
2. 防旧报文污染新连接
3. 治理靠复用不靠强关
