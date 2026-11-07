<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 默认生成的输出可能泄露密码、令牌和个人信息，应采用字段白名单与脱敏。
2. 同时控制日志长度，防止大对象拖慢请求。

## 参考分析

1. 对象自动展开常绕过显式脱敏。
2. 异常、链路和测试输出都可能复制敏感信息。

## 案例

1. 场景（教学示例）：支付失败日志输出整个请求对象。
2. 处理：改为交易号、错误码和掩码账户，排除令牌及完整证件。

3. 验证：样本日志能定位请求且不含原始敏感值；错误路径同样检查。

## 总结点

1. 日志先减字段。
2. 敏感默认不打印。
