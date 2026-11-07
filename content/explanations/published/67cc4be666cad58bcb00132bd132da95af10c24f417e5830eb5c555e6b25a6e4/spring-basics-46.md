<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [HTTP 规范 · 1](https://www.rfc-editor.org/rfc/rfc8259.html#section-6)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/time/package-summary.html)

</details>

## 参考回答

1. Java long 可超出 JavaScript Number 的安全整数范围，大 ID 宜约定为字符串；不能等前端转成 Number 后再字符串化补救。
2. 时间需明确是瞬时点、带偏移时间还是本地日期时间，并约定格式和时区含义；字段名叫 time 不会自动消除歧义。

## 参考分析

1. 超过 2^53−1 的整数可能在前端解析成 Number 时丢精度；金额还需明确十进制和舍入协议，不能套用 ID 规则。
2. LocalDateTime 不含时区，不能无条件当作 UTC 瞬时点；序列化库配置和旧客户端兼容都需契约测试。

## 案例

1. 教学场景：返回 ID 9007199254740993，前端选中行后提交了错误 ID；跨时区用户看到订单时间偏移。

2. ID 从服务端开始按字符串输出；瞬时点采用明确偏移或 UTC 的协议，纯生日日期保留日期语义。

3. 验证 JSON 往返 ID 字节不变，跨时区显示符合预期，旧客户端和夏令时边界有契约样例。

## 总结点

1. 大 ID 按字符串保持精度。
2. 时间协议先明确语义。
