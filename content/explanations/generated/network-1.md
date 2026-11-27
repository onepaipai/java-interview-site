<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [RFC 9110 · HTTP 语义 · 1](https://www.rfc-editor.org/rfc/rfc9110.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/net/package-summary.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银转账沙盘:前端发出一笔转账请求到返回成功,链路经过 DNS 解析、TCP 握手、TLS 握手、HTTP 请求、代理转发、应用处理、响应回传七个阶段——每个阶段都可能失败或变慢,排查要按阶段定位。

1. 七阶段:DNS 解析(域名到 IP,缓存命中可跳过)→TCP 三次握手(建连接)→TLS 握手(证书校验+密钥协商,TLS1.3 一次往返)→HTTP 请求(经可能的代理/负载均衡)→应用处理→响应回传→连接归还复用池。
2. 每阶段有独立失败形态:DNS 失败=UnknownHost,握手失败=Connection reset/refused,握手成功但 TLS 失败=证书/协议错误,全建立后超时=应用慢——异常类型即阶段定位线索。
3. 耗时分布:跨网段时握手类占大头(1-RTT DNS+1-RTT TCP+1-2RTT TLS),长连接复用后只剩 1-RTT 请求往返——所以连接复用是性能主线,慢日志要区分首包与复用请求。

## 参考分析

### 第二步扩展① 机制:各阶段的耗时构成

- 跨网段单次冷请求=1 RTT(DNS 递归)+1 RTT(TCP 握手)+1~2 RTT(TLS)+1 RTT(请求响应)≈4 RTT+服务端处理。
- TLS1.3 的 1-RTT 握手与 TCP Fast Open、TLS 会话恢复是压缩手段。
- 长连接复用把前三次往返摊销到数百次请求——这就是 HTTP keep-alive 与连接池的收益来源。

### 第二步扩展② 反例:阶段错位的排查事故

- 把 TLS 握手失败当成应用超时:证书过期抛 SSLHandshakeException,应用侧却配了 30 秒读超时——重试十次全失败还以为是服务慢。
- 正确姿势是按异常类型分阶段定位,连接类异常不进重试退避而进告警。

### 第二步扩展③ 取舍:优化往哪个阶段投

- 握手阶段:会话复用(TLS session resumption)+长连接池。
- 传输阶段:HTTP2 多路复用。
- 应用阶段:缓存与异步。
- 优先压缩握手类往返(一次优化全局收益),再谈单请求处理——先看耗时构成再动手。

## 案例

### 第三步发散·验证与推演 验证:阶段分解的推演核对

- 推演:本机用 N3Timeouts 分阶段注入故障——连接阶段对不可路由地址 SocketTimeoutException 2019ms、读取阶段对不响应服务端 SocketTimeoutException 1505ms、端口拒绝 ConnectException 17ms。
- 验证:三类异常的形态与耗时分别对应连接/读取/拒绝三种阶段结论,异常类型即阶段判据成立。

### 第三步发散·发散要点 追问链:阶段三刀

- **追问①**：DNS 阶段的缓存层级——浏览器缓存、操作系统缓存、递归服务器缓存,层层命中层层快,但也层层放大切流延迟(见 Q2)
- **追问②**：TLS 握手为什么比 TCP 多——证书链校验与密钥协商是应用层语义,TCP 只管连通;TLS1.3 把 2-RTT 压到 1-RTT(见 Q18)
- **追问③**：代理加入后阶段怎么变——正向代理在客户端侧终结 DNS 与 TCP,反向代理(网关)终结 TLS,应用只看到内网 HTTP——XFF 头记录原始来源(见 Q33)

## 总结点

1. 四 RTT 冷请求复用省三段
2. 异常类型即阶段判据
3. 优化先压缩握手往返
