<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/time/format/DateTimeFormatter.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银对账沙盘:对账文件用 YYYY-MM-dd 格式化日期——2025-12-29(2025 年最后一周)被格式化为 2026-12-29(week-year 归 2026)——对账文件日期错位,渠道按 2026 处理。YYYY(week-year)与 yyyy(calendar-year)的实测对照(J2 教科书证据)。

1. 实测证据(J2 实验):LocalDate.of(2025,12,29) 用 yyyy 格式化=2025-12-29(正确);用 YYYY 格式化=**2026-12-29**(week-year:该周属于 2026 的第 1 周)——日期凭空跳了一年。
2. YYYY 的语义:周年(week-based-year——用于周报/周计划的场景)——不是"年"的简写;yyyy=日历年(calendar-year)——日常日期用 yyyy。
3. 事故的形态:跨年周(12 月末/1 月初)的日期被 YYYY 格式化到错误的年份——对账文件(第 19 题)日期错位→渠道处理错账期→资金差错(banking 17 题)。J2 实测:2025-12-29 的 YYYY 输出=2026-12-29(跳了一年)。

## 参考分析

### 机制:week-year 与日历年的分野

week-year:ISO 8601 的周历系统(周从周一开始,每年的第一周=含第一个周四的周)——12 月末的几天可能属于下一年的第 1 周(week-year=下一年)——YYYY 格式化输出下一年。yyyy:日历年(calendar-year)——日常日期。两者的分歧窗口:每年 12 月末 3-4 天+1 月初 1-3 天——YYYY 在这个窗口"跳年"。

### 反例:YYYY 的三种事故

事故一,对账文件:对账日期用 YYYY——跨年周的对账文件日期=2026(渠道按 2026 对账)——账期错位(banking 19 题)。事故二,日志时间戳:日志 pattern 的日期用 YYYY(周报系统的遗留)——跨年周的日志归到错误年份(第 39 题distributed 时序)。事故三,文件名:归档文件名用 YYYY(第 45 题)——归档目录错位。三条的正解:全局搜索 YYYY(静态扫描——除非是周报,一律改 yyyy)+YYYY 的合法场景注释(周报才用)——静态扫描进 CI。

### 取舍:周历的正确用法

周历的合法场景:周报/周计划的周编号(YYYY-ww)——YYYY 与 ww 配对使用(week-year 与 week-of-year——两者同体系);与 yyyy-MM-dd 混用=事故。周历的配置:Locale 的周首日(ISO=周一)与 firstWeekOfYear 的定义——Locale 影响 week-year 的计算(跨 Locale 的周历差异)。规范:日期格式串的 YYYY 与 ww 必须成对出现(静态检查的规则)。

## 案例

### 验证:YYYY 陷阱的断言组

验证:跨年断言(J2 实测:2025-12-29 的 YYYY 输出=2026——跳年实证);窗口断言(12 月 28-31 日的 YYYY 输出——全部跳年的窗口验证);扫描断言(YYYY 在代码中的出现清单——逐个确认是否周报场景)——三组固化 YYYY 纪律;YYYY→yyyy 的替换用例(修复验证)。

### 追问链:YYYY 三刀

一刀:"Locale 的影响?"——Locale.US 与 Locale.CHINA 的 week-year 可能不同(周首日与第一周定义差异)——格式化的 Locale 参数显式(禁 Locale.getDefault 的隐式,第 33 题)。二刀:"SimpleDateFormat 的遗留?"——SimpleDateFormat 的 YYYY 同样陷阱(且线程不安全,第 47 题)——java.time 的 DateTimeFormatter 替代(不可变+线程安全,第 8 题)。三刀:"日期格式串的审计?"——全代码的日期格式串审计(YYYY/yyyy/DD/dd 的大小写审计)——DD(day-of-year)与 dd(day-of-month)的混用同类事故——格式串的大小写规范进 checklist。

## 总结点

1. YYYY 跳年,yyyy 才是年
2. 跨年周的实测跳一年
3. 静态扫描 YYYY,只留周报场景
