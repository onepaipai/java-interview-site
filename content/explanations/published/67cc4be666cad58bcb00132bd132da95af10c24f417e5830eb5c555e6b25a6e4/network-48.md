<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [RFC 9110 · HTTP 语义 · 1](https://www.rfc-editor.org/rfc/rfc9110.html)
- [Google SRE · 2](https://sre.google/sre-book/handling-overload/)

</details>

## 参考回答

1. 在代理与应用层设置长度、解压后大小及并发限制，尽量流式处理。
2. 不能只限制 Content-Length，因为传输方式与压缩可能绕过直觉。

## 参考分析

1. 请求体会消耗带宽、解析 CPU、堆和临时磁盘，字段校验不等于传输上限。
2. 压缩解包和嵌套深度也要计量。

## 案例

1. 场景（教学示例）：JSON 字段合法但请求体巨大，多个客户端并发上传。

2. 处理：代理与应用设大小、耗时和并发上限，边读边限量；解析器限制深度与展开后大小。

3. 验证：超限在大规模分配前被拒绝；正常上传可完成，内存峰值受控。

## 总结点

1. 字段合法不等于体积安全。
2. 边读取边执行上限。
