<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银 API 沙盘:LocalDateTime 序列化为数组 Jackson 默认而非字符串前端不兼容;Long 超过 JS Number MAX_SAFE_INTEGER 精度丢失——JSON 序列化的兼容风险时间大整数枚举。

1. 时间的兼容 LocalDateTime 默认序列化为数组——前端期望字符串——配置 Jackson 的 JavaTimeModule 加 WRITE_DATES_AS_TIMESTAMPS false。大整数 Long 超过 JS 的安全整数上限精度丢失尾数被截断——序列化为 String 大 ID 的标准做法。
2. 枚举序列化为 name 字符串前端按字符串判断枚举的新增值前端 switch 漏分支——枚举序列化的版本兼容。
3. 统一配置 Jackson2ObjectMapperBuilder 全局配置时间格式大整数策略枚举序列化——序列化的全局一致性避免逐字段配置。

## 参考分析

### 机制:JSON 序列化的兼容风险

时间 LocalDateTime 默认序列化为数组——前端期望字符串——配置 JavaTimeModule 加 WRITE_DATES_AS_TIMESTAMPS false。大整数 Long 超过 JS 安全整数上限精度丢失尾数被截断——序列化为 String。枚举 序列化为 name 字符串新增值的兼容。统一配置 Jackson2ObjectMapperBuilder 全局配置。

### 反例:序列化兼容的三种事故

事故一 时间数组 前端不兼容。事故二 大整数精度丢失 Long 超过安全整数上限。事故三 枚举新增值前端 switch 漏分支。修复 时间格式化字符串加大整数序列化为 String 加枚举兼容测试。

### 取舍:序列化配置的粒度

全局 Jackson2ObjectMapperBuilder 统一配置。字段级 JsonFormat pattern。混合 全局打底字段覆盖。配置的全局一致性避免逐字段配置。

## 案例

### 验证:JSON 兼容的断言组

验证:时间断言(LocalDateTime 序列化为字符串格式 ISO 8601 非数组);大整数断言(Long 序列化为 String 精度保持);枚举断言(枚举序列化为 name 字符串新增枚举值的兼容)——三组固化 JSON 兼容。

### 追问链:JSON 三刀

一刀:Jackson 的定制 JsonFormat pattern 字段级 Jackson2ObjectMapperBuilder 全局自定义 Serializer 特殊类型定制的粒度分层。二刀:Jackson 的安全反序列化的多态风险 enableDefaultTyping 的漏洞多态反序列化的类型注入 Jackson 的反序列化安全禁用 default typing 或用 JsonTypeInfo 显式。三刀:与前端的对齐 API 文档 OpenAPI 类型格式描述加契约测试前后端一致性 JSON 序列化的一致性靠契约。

## 总结点

1. 时间为字符串大整数为字符串
2. 枚举为 name 新增值要兼容
3. 全局配置统一逐字段补充
