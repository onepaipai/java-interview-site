<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-controller/ann-validation.html)

</details>

## 参考回答

1. 新增必填、范围或枚举限制可能拒绝旧客户端输入，应先明确兼容窗口和风险，再选择版本化、宽读或分批收紧。
2. 区分不可妥协的安全及业务不变式与可迁移格式，提供稳定错误码；校验分组不自动构成版本兼容协议。

## 参考分析

1. 只看最新前端无法覆盖其他客户端，可用脱敏统计和契约样例识别实际输入。
2. 默认值不能偷偷改变用户意图，新增限制应能观察拒绝率并有兼容回退路径。

## 案例

1. 教学场景：旧客户端省略可选备注，升级 NotBlank 后全部旧请求失败。

2. 保留旧协议或定义明确新版本，建立旧、新、边界和非法输入样例，分批观察。

3. 验证旧契约按窗口可用，新要求明确生效，金额和权限等核心约束始终存在。

## 总结点

1. 校验变更属于契约变更。
2. 兼容窗口与核心约束分清。
