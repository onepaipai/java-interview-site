<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Google SRE · 1](https://sre.google/sre-book/addressing-cascading-failures/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银账户沙盘:Account 的 toString 包含完整卡号/CVN——日志泄露(第 44 题distributed 敏感字段的日志纪律)。脱敏设计:toString 显式排除敏感字段/掩码格式化/日志框架的脱敏转换器。

1. toString 的泄露面:默认 toString(IDE 生成)包含全部字段——卡号/CVN/密码/身份证全打;日志的传播面:日志被采集/搜索/导出(泄露面比堆大,第 31 题 distributed 数据边界)。
2. 脱敏设计:toString 手写(只含非敏感字段)、掩码格式化(卡号前 4 后 4 中间星号)、日志框架脱敏(logback 的转换器/PatternLayout 替换)、结构性方案(敏感字段用 SensitiveString 类型——toString 自动掩码,第 25 题类型边界)。
3. 与第 44 题distributed 的衔接:错误响应(对外)与日志(对内)是两个视图——toString 服务日志视图;错误响应的敏感过滤是另一道防线(独立设计)。

## 参考分析

### 机制:脱敏的层次与工具

层一,toString 设计:手写排除敏感字段(或只含 ID——不含值)。层二,掩码工具:MaskUtil.mask(cardNo, 4, 4)(前 4 后 4 星号中间)——统一掩码逻辑(第 47 题)。层三,日志框架:logback 的 MessageConverter(正则替换敏感模式)/自定义 Converter。层四,类型方案:Sensitive<T> 包装类型(toString 自动掩码——类型即脱敏,第 25 题类型边界)。四层的成本递增,覆盖面递增——按数据分级选层(第 31 题 distributed 分级降级同构)。

### 反例:toString 泄露的三种事故

事故一,IDE 默认 toString:Account@1a2b 的自动生成含 CVN——日志泄露 CVN(合规违规)。事故二,异常消息带数据:throw new Exception("用户" + id + "余额" + balance)——异常消息含金额(第 44 题 distributed)。事故三,debug 日志全量:log.debug("账户详情: {}", account)——account.toString 泄露——debug 级也要脱敏(日志级别可调高到生产)。

### 取舍:脱敏与排障的平衡

过脱敏:日志全掩码——排障困难(看不出是哪个用户的问题)。脱敏的粒度:标识字段掩码(可关联)、内容字段掩码(不可见)、关键判断字段保留(是/否)。排障的替代:traceId 关联(第 48 题)+后台详细查询(权限审批,第 33 题)——日志掩码+traceId+后台查询的三角替代全量日志。

## 案例

### 验证:脱敏的断言组

验证:toString 断言(toString 不含 CVN/完整卡号——断言排除);掩码断言(卡号掩码格式正确:****-****-****-1234);日志扫描断言(生产日志无明文卡号/CVN 的扫描——正则扫描常态化)——三组固化脱敏;敏感字段的标注清单(哪些字段脱敏)进数据分级文档。

### 追问链:脱敏三刀

一刀:"equals/hashCode 的敏感字段?"——equals 用敏感字段(卡号)——比较需要但 toString 掩码——比较与展示的分离(toString 不代表比较语义)。二刀:"序列化的脱敏?"——序列化的敏感字段(@JsonIgnore/自定义序列化器)——序列化、toString、日志三道的脱敏一致性(第 22 题)。三刀:"调试模式?"——开发环境的全量日志(调试便利)与生产的脱敏(安全)——环境差异的配置化(logback 的 profile 切换)——开发便利不突破生产边界。

## 总结点

1. toString 显式排除敏感字段
2. 掩码工具统一,类型方案治本
3. traceId 加后台查询替代全量日志
