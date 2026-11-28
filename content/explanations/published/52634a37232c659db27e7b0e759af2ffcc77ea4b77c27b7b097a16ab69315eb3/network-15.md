<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [RFC 9110 · HTTP 语义 · 1](https://www.rfc-editor.org/rfc/rfc9110.html)
- [developer.mozilla.org · 2](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银静态资源沙盘:多机部署后 304 命中率从 95% 跌到 40%——ETag 用了 mtime,各节点文件时间不同;Last-Modified 只精确到秒且不感知内容——两者的限制决定了什么时候用哪个。

1. ETag 限制:生成策略决定一致性——mtime+size 在多机部署不一致(每节点 mtime 不同),强 ETag 要内容哈希(计算成本)或统一存储元数据;ETag 语法有强弱之分(强 "abc" 精确比对、弱 W/"abc" 允许字节级差异)。
2. Last-Modified 限制:秒级精度(秒内多次变更无法区分)、只反映时间不反映内容(回滚到旧版本时间变新,内容相同却被判变更)、不适用于动态生成内容——它是"乐观的时间戳",ETag 才是"内容的指纹"。
3. 配合与优先级:HTTP 允许两者并存,客户端校验时 If-None-Match 优先于 If-Modified-Since;实践:静态资源用内容哈希 ETag(或干脆指纹 URL+强缓存),动态资源可用 Last-Modified(精度足够时)避免哈希计算成本。

## 参考分析

### 第二步扩展① 机制:指纹的生成与成本

- 内容哈希 ETag:读取内容计算(SHA-1/xxHash)——精确但耗 CPU,静态文件可在构建期预计算(构建时写清单,运行期查表)。
- mtime ETag:stat 一次零计算——但分布式不一致。
- 权衡点:指纹的计算成本 vs 一致性,静态资源构建期算,动态资源用时间戳。

### 第二步扩展② 反例:指纹策略的三种事故

- 事故一:mtime ETag 多机漂移——同一 URL 不同节点返回不同 ETag,304 失效+客户端缓存混乱(本条即开场事故)。
- 事故二:秒内更新+Last-Modified——秒内第二次更新被客户端当作未变化。
- 事故三:ETag 暴露信息——用 inode/路径做 ETag 泄漏服务器结构(nginx 曾默认含 inode,已改)。

### 第二步扩展③ 取舍:ETag 的开与关

- 代理层场景:多节点 ETag 不一致时,代理缓存可能因 ETag 差异反复失效——nginx 默认对上游响应剥离 ETag(gzip 时)避免跨节点问题。
- 应用层场景:内容哈希 ETag 全局一致,可放心开。
- 决策:先问"指纹是否全局一致",不一致宁可关 ETag 只用 Last-Modified 或指纹 URL。

## 案例

### 第三步发散·验证与推演 验证:ETag 命中行为的实测证据

- 本机实测(JDK HttpServer):
~~~
java N7ConditionalGet
首请求: 200,正文 27 字节,拿到 ETag="v1",Cache-Control=max-age=60
条件请求: 304,正文 0 字节(304 不传正文,只验证新鲜度)
~~~
- 推演:实验用固定字符串 ETag(等价于内容哈希的全局一致形态)验证命中路径。
- mtime 漂移按多机部署语义推演并明示。
- 验证:304 机制与"指纹必须全局一致"的约束成立,事故一的形成链条闭合。

### 第三步发散·发散要点 追问链:指纹三刀

- **追问①**：If-None-Match 与 If-Modified-Since 并存时谁说了算——服务端实现通常优先 ETag(内容指纹比时间戳可信),RFC 建议两者都校验且任一命中即 304
- **追问②**：弱校验器 W/ 的用途——内容语义相同但字节不同(压缩/时间戳字段),弱 ETag 允许 304
- **追问③**：与指纹 URL 的关系——Content fingerprint(URL 带哈希)把校验成本归零(强缓存直接命中),ETag 是"URL 不能变"场景的次优解

## 总结点

1. mtime 多机不一致先问指纹
2. 秒级精度是硬伤
3. 静态哈希动态时间戳
