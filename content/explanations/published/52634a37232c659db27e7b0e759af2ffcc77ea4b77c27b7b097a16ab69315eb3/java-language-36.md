<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/nio/charset/Charset.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银文件网关沙盘:new String(bytes)(用系统默认编码)——Windows GBK/Linux UTF-8 的默认编码差异→同一文件跨平台乱码;显式 Charset 是唯一正解。

1. 乱码的根源:编码与解码的 charset 不一致——new String(bytes) 用系统默认编码(Windows GBK/Linux/macOS UTF-8——跨平台不同)——同一字节序列在不同平台解码结果不同。
2. 显式 Charset:每个 new String/getBytes/InputStreamReader/Writer 都显式传 StandardCharsets.UTF_8——显式 vs 隐式(默认)是乱码的生死线。JDK 18 起 file.encoding 默认 UTF-8(JEP 400)——但 JDK 17 及前默认随平台(不可依赖默认)。
3. UTF-8 的理由:全字符覆盖+向后兼容 ASCII+互联网标准——内部数据的统一编码(存储/传输/日志全 UTF-8)——编码统一收敛到 UTF-8 一处(第 47 题)。

## 参考分析

### 第二步扩展① 机制:编码解码的对称性

- 编码:字符串→字节(getBytes(charset))。
- 解码:字节→字符串(new String(bytes, charset))——编码与解码的 charset 必须一致(不对称=乱码)。
- 乱码的不可逆:GBK 编码的字节用 UTF-8 解码→替换字符(U+FFFD)或乱码串(信息丢失——不可逆还原)。
- 显式的覆盖面:new String/getBytes/InputStreamReader/OutputStreamWriter/Files.newBufferedReader/Scanner——所有 IO 入口都要显式。

### 第二步扩展② 反例:默认编码的三种事故

- 事故一,跨平台乱码:文件在 Windows(GBK 写入)到 Linux(UTF-8 读取)——乱码(中文变问号)。
- 事故二,容器编码:容器的 LANG 未设(POSIX/C locale)——Java 的 file.encoding=ANSI_X3.4-1968(ASCII)——中文全变问号(第 20 题 distributed 容器)。
- 事故三,邮件/HTTP 的编码遗漏:Content-Type 缺 charset——接收方猜编码——猜错即乱码。
- 三条的正解:显式 UTF-8 全覆盖+环境检查(file.encoding 进启动日志)+HTTP 的 Content-Type 显式。

### 第二步扩展③ 取舍:UTF-8 统一的迁移

- 迁移:存量 GBK 数据的转码(GBK→UTF-8 的批量转换——先确认源编码[不可猜])——转码是不可逆(UTF-8→GBK 可能丢字符:GBK 有 UTF-8 没有的生僻字)——转码前备份+校验(第 45 题distributed)。
- JDK 18 的 file.encoding=UTF-8(JEP 400):默认已 UTF-8——JDK 17 及前的系统默认仍需显式——升级 JDK 18 是根治之一(但有行为变更风险,第 49 题回归)。

## 案例

### 第三步发散·验证与推演 验证:显式编码的断言组

- 验证:跨平台断言(同文件 GBK 与 UTF-8 的读取对照——乱码复现与显式修复)。
- 显式扫描断言(new String(bytes) 无 charset 的调用扫描为零)。
- 环境断言(启动日志打印 file.encoding——环境检查)——三组固化编码纪律。
- UTF-8 统一的迁移用例(存量数据转码的验证)

### 第三步发散·追问扩展 追问链:Charset 三刀

- **Q1：Charset 的不可变?**
  - 答：Charset 不可变(charset.forName 缓存单例)——Charset 对象可安全共享(第 8 题)。
- **Q2：invalid 字节的处理?**
  - 答：CodingErrorAction(REPLACE/REPORT/IGNORE)——解码的容错策略(REPORT 严格/REPLACE 宽容)——按数据的不可妥协性选(资金文件 REPORT,日志 REPLACE)。
- **Q3：BOM 的处理?**
  - 答：UTF-8 BOM(EF BB BF,Windows 记事本添加)——UTF-8 不需要 BOM 但 Windows 工具常加——BOM 的剥离(读取时跳过)——BOM 不剥离=文件头出现 U+FEFF 字符(解析故障)。

## 总结点

1. 默认编码随平台,显式 Charset 是正解
2. UTF-8 统一收敛
3. BOM 剥离,CodingErrorAction 显式
