<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [RFC 9110 · HTTP 语义 · 1](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9111 · HTTP 缓存 · 2](https://www.rfc-editor.org/rfc/rfc9111.html)

</details>

## 参考回答

1. ETag 可表达内容版本，修改时间受精度和生成规则影响。
2. 验证器必须匹配所表示的资源，压缩与多节点部署时尤需一致。

## 参考分析

1. Last-Modified 受时间粒度与来源可靠性限制。
2. ETag 标识所选表示，强弱验证器不能在所有用途上互换。

## 案例

1. 场景（教学示例）：同一秒修改两次文档，时间戳没有足够区分度。

2. 处理：用与表示内容版本对应的 ETag，条件 GET 核对标签；范围恢复另检查强验证器要求。

3. 验证：内容改变则旧标签不再得到 304；弱标签不被误用为字节完全一致证明。

## 总结点

1. 时间验证有粒度。
2. 标签对应所选表示。
