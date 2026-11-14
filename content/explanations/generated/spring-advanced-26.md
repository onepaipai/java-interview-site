<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银签名校验沙盘:审计过滤器在 Filter 里读 body 做签名,Controller 里 @RequestBody 拿到空——Servlet 输入流只能读一次。用缓冲方案与职责重新划分说明正确形态。

1. Servlet 请求体是流:默认只能消费一次;过滤器读了,后续 Controller 读不到(空体/解析异常)。
2. 两类正解:内容缓存包装(ContentCachingRequestWrapper/自定义 wrapper,重复可读)、或职责上移——签名校验在网关层做(应用只收已验证流量),过滤器不碰 body。
3. 成本与陷阱:大 body 的内存缓存(上限控制)、流式上传(不可缓冲)、multipart 的处理差异——方案要先审请求形态。

## 参考分析

### 机制:流的单次消费与包装层

getInputStream() 是 ServletInputStream,读到底后再次读取为空——Filter 在 DispatcherServlet 之前,先读即占坑。Spring 的 ContentCachingRequestWrapper 是"边读边留副本"(写缓存),并不支持"先读再回放":Controller 仍读原始流,副本在请求结束后可查——适合日志审计,不适合"Filter 先校验再放行"。真正可回放需要自定义 wrapper(读取时缓冲全部字节,后续 getInputStream 返回 ByteArrayInputStream)或 Servlet 6 的 HttpExchange? 工程上更常见的是网关层签名+应用层透传上下文。

### 推演:三层方案的取舍(附真实上下文锚点)

方案一,网关签名:签名校验在 API 网关(统一密钥管理、防重放),应用信任网关注入的签名结果头(注意第 22 题的信任边界:网关注入才可信)——应用过滤器不碰 body。方案二,应用内缓存包装:自定义 RepeatableRequestWrapper,注意 body 大小上限(超过直接拒绝缓存,走流式)。方案三,审计旁路:审计不校验签名,只异步记副本(ContentCachingRequestWrapper),校验留给业务层。锚点:过滤器在安全链中的位置(第 17 题)决定其可见性——上下文行为实测(Q19 alice:anonymous)证明链上组件的执行环境差异。验证:行为为规范推演,包装器方案可单测复现。

### 取舍:审计与校验的分层

校验类(签名/防重放):网关层最优(统一、集中、防绕过);必须在应用层做时,用可回放包装+大小上限。审计类:旁路记录,不阻塞主流程(失败不影响请求),副本异步落库。流式与大 body:超过阈值(如 10MB)禁用缓冲,改分块哈希(chunked signature)。评审问句:这个过滤器为什么要读 body?——答案如果是"校验",先问网关;如果是"审计",用旁路副本。

## 案例

### 验证:集成测试断言"过滤器读 body 后 Controller 

验证:集成测试断言"过滤器读 body 后 Controller 正常解析"(包装器方案)或"网关签名头缺失被拒"(网关方案);大 body 超上限用例与流式上传例外用例单独覆盖。

### 追问链:请求体三刀

一刀:"multipart 文件上传怎么审计?"——ContentCachingRequestWrapper 对 multipart 的行为不同(缓存的是原始字节),文件内容审计走存储层(保存后读文件)而不是请求体。二刀:"网关签名防重放怎么做?"——签名带时间戳+nonce,网关查 nonce 去重表(Redis,TTL=时间窗)——防重放是网关职责,应用层再查一次是纵深。三刀:"怎么测过滤器与 Controller 的读取冲突?"——集成测试:过滤器读 body 后请求正常解析的断言;回归覆盖签名过滤器改动。

## 总结点

1. 流只能读一次,先读即占坑
2. 校验上网关,审计走旁路
3. 缓冲有上限,流式要例外
