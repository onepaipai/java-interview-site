<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/time/Instant.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银账期沙盘:Instant(时间点)/ZonedDateTime(带时区)/LocalDateTime(无时区)——混用导致账期错位(banking 19 题:对账需要明确时区)。三类的建模边界与转换纪律。

1. 三类的语义:Instant=绝对时间点(UTC 时间戳——"什么时候",无地点语义);ZonedDateTime=时间点+时区(带地点语义的完整时间);LocalDateTime=墙钟时间(无时区——"墙上显示几点的日期时间")。
2. 建模纪律:数据库存 UTC(Instant/timestamp with time zone);业务日切/账期用 ZonedDateTime(带时区的日切,第 19 题);展示层用用户时区的 ZonedDateTime;LocalDateTime 仅用于"无时区语义的墙钟"(本地闹钟设置)。
3. 转换纪律:Instant→ZonedDateTime 需要 atZone(zone)(显式时区);LocalDateTime→Instant 需要 atZone(隐含时区的显式声明)——转换必带时区参数(隐式系统时区是事故源,第 19 题)。

## 参考分析

### 机制:三类时间的语义与转换

Instant:时间线上的一个点(等价于 Unix timestamp 的纳秒版)——时区无关。ZonedDateTime:Instant+ZoneId(规则:某时区的墙钟表示)——DST 切换时同一 Instant 两个 ZonedDateTime 表达。LocalDateTime:无时区的墙钟(不对应唯一 Instant——不同时区不同 Instant)。转换:atZone(时区)→ZonedDateTime;toInstant()→Instant——每种转换都要显式时区或上下文。

### 反例:混用的三种事故

事故一,LocalDateTime 存库:交易时间存 LocalDateTime(无时区)——多机房部署(第 38 题distributed)的时区不同→同一笔交易在不同机房的"时间"不同——对账(第 19 题)错位。事故二,系统默认时区:LocalDateTime.now() 用系统默认时区——容器时区变更(第 20 题)导致时间跳变。事故三,日切时区遗漏:账期的日切(第 19 题)未显式声明时区——默认 UTC/系统——与渠道日切(第 19 题)错位。三条的正解:UTC 存储+显式时区转换+LocalDateTime 只用于无时区语义。

### 取舍:时间库的选择

java.time(JSR-310):设计良好(不可变/清晰分层)——标准选择。旧 API(Date/Calendar):可变+月份从 0 起+时区混乱——遗留迁移(新代码禁用旧 API)。第三方(Joda-Time):java.time 的前身——迁移到 java.time(Joda 作者建议)。规范:import java.time.* 禁 java.util.Date——静态检查(第 25 题类型边界的规范)。

## 案例

### 验证:时间建模的断言组

验证:转换断言(Instant→ZonedDateTime→Instant 的往返无损);日切断言(不同时区的日切边界正确——banking 19 题的双标);DST 断言(DST 切换的歧义时刻处理[第 34 题专论])——三组固化时间建模;LocalDateTime 的禁用清单(哪些场景禁用)进规范。

### 追问链:时间建模三刀

一刀:"数据库的时间类型?"——timestamp with time zone(推荐——UTC 存储)vs timestamp without time zone(危险——无时区语义)——DB 列类型的选择影响时间建模(第 19 题)。二刀:"序列化格式?"——ISO 8601(2026-01-01T00:00:00Z——带时区偏移)——序列化的时间格式统一(禁自定义格式,第 49 题)。三刀:"时间的比较?"——Instant 的比较(时间线序,与时区无关)vs LocalDateTime 的比较(墙钟序,时区歧义)——比较用 Instant(时间线的绝对序)。

## 总结点

1. 数据库存 UTC,展示带时区
2. LocalDateTime 仅用于无时区语义
3. 转换必带时区,禁系统默认
