<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [RFC 9110 · HTTP 语义 · 1](https://www.rfc-editor.org/rfc/rfc9110.html)
- [developer.mozilla.org · 2](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银对账单下载沙盘:用户在大文件下载中断后重新下载全量——流量翻倍、等待重头;支持 Range(206+Content-Range)后客户端可从断点续传,越界请求 416 拒绝,本机实测 100 字节区间精确返回。

1. 协议要件:请求 Range: bytes=start-end(闭区间);响应 206+Content-Range: bytes start-end/total;越界 416(带 bytes */total);不支持时忽略 Range 返回 200 全量,客户端据此降级。
2. 服务端实现:按偏移 seek 发送(transferTo 的 position/length,与零拷贝配合,见 Q26);多区间按 multipart/byteranges 或简化取第一区间;校验 ETag/If-Range 保证断点处文件版本一致——文件变了续传即内容错乱。
3. 客户端配合:记录已收字节数+ETag,重试时 If-Range: ETag+Range: bytes=n-;服务器 206 继续、200(文件已变)则重下;分片并行下载=多个 Range 区间并发(注意限流与熔断,见 Q22/47)。

## 参考分析

### 机制:If-Range 与版本一致性

断点续传的正确姿势不是裸 Range——文件在断开后被更新,续传会把新旧内容拼接;If-Range: <ETag 或日期> 让服务端先比对版本:一致返回 206,不一致返回 200 全量(自动重下);弱网大文件场景这是正确性要件,不是优化。

### 反例:Range 实现的三种事故

事故一:不校验 If-Range——账单文件日更,用户昨晚的断点今早续传,拿到拼接的错乱文件(资损级事故)。事故二:end 越界直接报错——客户端对超界区间重试风暴;正确是 416+Content-Range: bytes */total 让客户端自适应。事故三:动态生成内容支持 Range——流式导出(CSV 生成中)无法随机寻址,应该不支持(忽略 Range 返回 200)而非伪实现。

### 取舍:分片并行 vs 单流

单流+断点:实现简单,带宽利用率受单连接拥塞窗口限制;分片并行(如 4 区间):拉满带宽,服务端负载×4(限流配合),合并逻辑客户端承担。按文件大小分级:>50MB 且用户带宽高(企业对账单)分片,普通附件单流;CDN 后端分发场景分片由 CDN 承担。

## 案例

### 验证:Range 行为的实测证据

本机实测(JDK HttpServer+HttpURLConnection):
~~~
java N8Range
Range bytes=1000-1099: 206,正文 100 字节,Content-Range=bytes 1000-1099/10000
越界区间: 416(416 Range Not Satisfiable,客户端应回退全量或重算)
~~~
验证:区间请求精确返回 100 字节(闭区间语义),越界返回 416——协议要件实测确认;If-Range 版本一致性按 RFC 9110 语义推演并明示(实验未覆盖文件变更路径)。

### 追问链:断点三刀

一刀:与鉴权的配合——Range 请求同样过鉴权,分片并行时每个区间请求都要带凭据(避免只验第一个区间)。二刀:与限流的衔接——分片并行=请求数放大,限流按用户维度配额(而非按 IP,见 Q33 可信 IP),防分片绕过。三刀:与压缩的冲突——Content-Encoding 的压缩响应不支持 Range(压缩是流式的),大文件下载禁用压缩按原样发。

## 总结点

1. 206 携带 Content-Range
2. If-Range 保版本一致
3. 越界 416 给 total 自适应
