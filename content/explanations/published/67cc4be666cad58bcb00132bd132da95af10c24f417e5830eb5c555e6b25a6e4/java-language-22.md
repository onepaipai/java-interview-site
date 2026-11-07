<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 反序列化会实例化复杂对象图，历史上存在利用链风险。
2. 外部协议优先显式结构与字段校验，兼容旧协议时使用过滤和类型白名单。

## 参考分析

1. 反序列化会构造对象并触发类行为。
2. 换成 JSON 后仍须限制类型、深度和请求体体积。

## 案例

1. 场景（教学示例）：外部系统上传业务对象。
2. 处理：只接收固定 DTO，验证字段、长度与嵌套深度，拒绝任意类名。

3. 验证：非法类型在进入业务前被拒绝；旧版合法字段仍能读取。

## 总结点

1. 外部数据只入 DTO。
2. 协议边界要限量。
