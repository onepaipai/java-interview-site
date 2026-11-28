<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Google SRE · 1](https://sre.google/sre-book/service-level-objectives/)
- [OWASP 提示注入风险 · 2](https://genai.owasp.org/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 API 沙盘:HTTP(明文)vs HTTPS(HTTP+TLS 加密+认证+完整性)——TLS 1.2 握手 2-RTT,TLS 1.3 优化为 1-RTT(第 19 题TLS 详解)。

1. HTTPS=HTTP over TLS——三问题:加密(对称加密)、身份认证(证书链到 CA)、完整性(MAC 防篡改);TLS 1.2 握手 2-RTT,TLS 1.3 优化为 1-RTT(合并+仅前向安全 ECDHE)。
2. TLS 1.2 握手:ClientHello→ServerHello+Certificate+KeyExchange→Client KeyExchange→Finished;TLS 1.3:合并握手+移除 RSA 密钥传输——更快且更安全。
3. 性能代价:握手 1-2 RTT+对称加解密 CPU(硬件 AES-NI 可忽略)+证书链校验——缓解:连接复用/会话恢复/TLS 1.3/OCSP Stapling(第 19 题)。

## 参考分析

### 第二步扩展① 机制:混合加密的分工

- 非对称(RSA/ECDHE)密钥交换(安全协商对称密钥)+对称(AES/ChaCha20)数据传输(性能高)——用非对称交换钥匙,用对称开锁。
- TLS 1.3 仅保留 ECDHE(前向安全)。

### 第二步扩展② 反例:HTTPS 两种事故

- 事故一:关闭证书校验——中间人攻击(第 19 题事故链)。
- 修复=信任库+到期监控+私有 CA。
- 事故二:TLS 版本过老(1.0/1.1)——已知漏洞。
- 修复=强制 TLS 1.2+。

### 第二步扩展③ 取舍:HTTPS 性能优化

- 会话恢复(ticket)+TLS 1.3(1-RTT)+OCSP Stapling+AES-NI 硬件加速——HTTPS 性能已不是主要瓶颈(第 19 题故障链),握手成本被复用摊薄。

## 案例

### 第三步发散·验证与推演 验证:HTTPS 握手的走查核对

- 验证:TLS 1.2 握手 2-RTT 实测(N3 实验)。
- TLS 1.3 1-RTT 对照。
- 证书链校验(leaf→intermediate→root)。
- OCSP Stapling 断言。
- 复用后延迟降低(N4 实验同构)。
- 验证:握手断言可程序化(sslscan/wireshark)。

### 第三步发散·发散要点 追问链:HTTPS 三刀

- **追问①**：ECDHE(前向安全)vs RSA 密钥传输(无前向安全)——TLS 1.3 仅 ECDHE
- **追问②**：HTTP/2 要求 HTTPS(浏览器强制);HTTP/2 多路复用减少连接数(第 17 题)
- **追问③**：证书过期→30/60 天告警+ACME 续期+OCSP 刷新(第 19 题故障链)

## 总结点

1. HTTPS=TCP+TLS(加密+认证+完整性)
2. TLS 1.3=1-RTT+前向安全
3. 性能:复用+1.3+硬件加速
