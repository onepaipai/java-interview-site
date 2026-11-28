<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [RFC 9110 · HTTP 语义 · 1](https://www.rfc-editor.org/rfc/rfc9110.html)
- [developer.mozilla.org · 2](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银前端沙盘:静态资源更新后用户仍看到旧版页面——强缓存命中时浏览器根本不发请求,更新靠指纹文件名;协商缓存每次都问服务器"变没变",304 响应省流量但要花 RTT——两级缓存的配合决定更新时效与请求量。

1. 强缓存:Cache-Control: max-age/unmutable——TTL 内浏览器直接用本地副本,零请求;协商缓存:ETag/Last-Modified+If-None-Match/If-Modified-Since——每请求问服务器,未变返回 304(无正文),变了返回 200+新内容。
2. 本机实证:首请求 200 返回 27 字节正文+ETag;带 If-None-Match 的条件请求返回 304 正文 0 字节——协商缓存省的是传输量不是请求次数;强缓存省的是请求本身。
3. 配合策略:入口 HTML 用协商缓存(每次校验保证入口新鲜),带内容指纹的静态资源(如 app.9f3c.js)用一年强缓存+immutable——内容变更=文件名变更=新 URL,强缓存自然失效;两级各司其职。

## 参考分析

### 第二步扩展① 机制:两级缓存的判定顺序

- 浏览器先查强缓存:未过期直接用(不发请求)。
- 过期后走协商:携带 If-None-Match(优先于 If-Modified-Since)问服务器。
- 服务器比对 ETag 决定 304 或 200。
- 强缓存的"失效"只是进入协商阶段——文件名指纹方案让"新版本"拥有新 URL,绕过旧缓存条目。

### 第二步扩展② 反例:缓存配置的三种事故

- 事故一:HTML 强缓存一天——发版后用户一天内打不开新版本,只能靠强制刷新。
- 事故二:静态资源无指纹+短 max-age——每次全量下载,流量翻倍。
- 事故三:ETag 用 mtime+size——多机部署 mtime 不一致,同一资源在不同节点返回不同 ETag,304 命中率暴跌(见 Q15)。

### 第二步扩展③ 取舍:max-age 长短的权衡

- 长 max-age+指纹:请求最少,依赖发布流程保证"内容变则 URL 变"。
- 短 max-age:发布即时生效,但请求量大。
- 折中:按资源变更频率分层——HTML 协商、CSS/JS/图片强缓存一年带指纹、API 响应默认 no-cache(走协商或不用缓存)。

## 案例

### 第三步发散·验证与推演 验证:协商缓存的实测证据

- 本机实测(JDK HttpServer+HttpURLConnection):
~~~
java N7ConditionalGet
首请求: 200,正文 27 字节,拿到 ETag="v1",Cache-Control=max-age=60
条件请求: 304,正文 0 字节(304 不传正文,只验证新鲜度)
~~~
- 验证:条件请求返回 304 且正文 0 字节——协商缓存省传输不省请求,强缓存省请求。
- 两级配合的收益结构实测确认。

### 第三步发散·发散要点 追问链:缓存三刀

- **追问①**：304 有多便宜——省正文传输,但请求往返(RTT+服务器校验)仍在;高 RTT 场景强缓存的价值大于协商
- **追问②**：HTML 不缓存还是协商——no-store(隐私页)与 no-cache(每次协商)语义不同,入口页常用 no-cache+ETag
- **追问③**：CDN 与浏览器缓存的关系——CDN 是共享的中间缓存,s-maxage/stale-while-revalidate 控制边缘行为,回源策略影响源站压力(见 Q16/39)

## 总结点

1. 强缓存省请求协商省传输
2. 入口协商指纹强缓存
3. mtime 多机不一致慎用
