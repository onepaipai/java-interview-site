<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

MySQL 8.4 / InnoDB；演示库不替代目标数据库的锁与恢复验证。

- [MySQL 8.4 参考 · 1](https://dev.mysql.com/doc/refman/8.4/en/char.html)
- [MySQL 8.4 参考 · 2](https://dev.mysql.com/doc/refman/8.4/en/precision-math.html)

</details>

## 参考回答

1. CHAR 与 VARCHAR 在长度和填充、尾空格等行为上不同，需结合字符集、排序规则与 SQL 模式，不简单用定长快变长慢选择。
2. 金额可用受控精度尺度的 DECIMAL 或约定最小单位整数，避免二进制浮点近似；还需币种、舍入、范围与溢出规则。

## 参考分析

1. 字符串字符数不等于字节数，尾空格比较和取值语义需按目标定义验证。
2. 应用用 BigDecimal 时从精确文本构造并明确舍入，最小货币单位也不对所有币种固定为百分之一。

## 案例

1. 教学场景：金额用 double 累计出现小数误差，多币种接口又把所有单位称作分。

2. 定义币种与单位，数据库和应用保持精确值，测试舍入边界、大额溢出和跨端序列化。

3. 验证往返不丢精度，非法尺度按协议拒绝或显式舍入，字符字段尾空格符合实际业务比较。

## 总结点

1. 字符类型结合比较与长度规则。
2. 金额精确值配套单位和舍入。
