<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. Instant 表达时间线上的点，LocalDateTime 不自带时区，业务日用 LocalDate。
2. 跨地区计算需显式 ZoneId，避免依赖服务器默认时区。

## 参考分析

1. 夏令时使某些当地时间不存在或重复。
2. 固定加 24 小时不总等于当地下一日。

## 案例

1. 场景（教学示例）：跨时区日账单遇到年末与夏令时切换。
2. 处理：用指定时区计算日边界，采用半开区间，并测试跨年格式。

3. 验证：每笔交易只进入一个账期；重复时刻和缺失时刻有明确策略。

## 总结点

1. 时间点与日历分开。
2. 账期必须带时区。
