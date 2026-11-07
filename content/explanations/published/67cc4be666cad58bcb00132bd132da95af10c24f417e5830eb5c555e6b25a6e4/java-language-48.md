<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 幂等是多次执行后的业务效果性质，方法名不能提供保证。
2. 需要稳定业务键、状态约束和重复结果语义，并测试超时重试。

## 参考分析

1. 方法名不能约束服务端执行次数。
2. 可测试性来自可替换时间、网络等不确定依赖。

## 案例

1. 场景（教学示例）：支付 SDK 超时后调用方重试。
2. 处理：注入渠道适配器，用稳定请求号执行并保存结果，区分处理中与失败。

3. 验证：重试返回同一交易结果；未知状态不创建第二笔扣款。

## 总结点

1. 幂等靠协议。
2. 依赖留替换口。
