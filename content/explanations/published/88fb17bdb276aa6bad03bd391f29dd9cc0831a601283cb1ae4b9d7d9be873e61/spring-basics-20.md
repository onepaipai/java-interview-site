<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银接口沙盘:返回体加自定义 Header(X-Request-Id)、设置非默认状态码(201 Created/304 Not Modified)、Location 头(重定向)——ResponseEntity 的适用:需要控制状态码+Headers+Body 三元组的场景;默认@ResponseBody 已够用的场景不需要。

1. ResponseEntity 的三元组:status(状态码——201/204/304/422 等)、headers(自定义头:Location/X-Request-Id/Link[分页])、body(响应体——可为空[204])——三者全控制时用 ResponseEntity;只控制 body 时 @ResponseBody 更简。
2. 适用场景:RESTful 语义(201 Created+Location 头——资源创建的标准响应)、条件请求(304 Not Modified——ETag 匹配)、分页 Link 头(RFC 5988 的 Link header)、文件下载(Content-Type/Content-Disposition)。
3. 不适用:统一 JSON 响应(错误码体系,第 45 题——@ExceptionHandler 返回统一体)——ResponseEntity 与 @ControllerAdvice 的统一响应可能冲突(两层都控制响应——职责分清:正常流 Controller 返回、异常流 Advice 返回)。

## 参考分析

### 第二步扩展① 机制:ResponseEntity 的三元组

- status+headers+body 全控制——RESTful 语义(201+Location/304+ETag)的载体。
- 用例:创建返回 201 加 Location,缓存协商返回 304 加 ETag,限流返回 429 加 Retry-After。

### 第二步扩展② 反例:默认响应的不足

- @ResponseBody 只控 body——需要自定义 Header 或状态码时不足——ResponseEntity 补充。
- 判据:只要响应需要状态码语义或自定义头,@ResponseBody 就不够用,升级为 ResponseEntity。

### 第二步扩展③ 取舍:ResponseEntity 的粒度

- 全控制(需 Headers 或状态码)vs @ResponseBody(只控 body)——按响应需求选。
- 纪律:同接口内两种风格混用会造成响应契约漂移,统一按需选型并写进接口文档。

## 案例

### 第三步发散·验证与推演 验证:ResponseEntity 的断言组

- 验证:状态码断言(201 Created+Location 头——RESTful 语义)。
- 条件请求断言(ETag 匹配→304——If-None-Match 的处理)。
- Header 断言(X-Request-Id 头的透传)——三组固化 ResponseEntity 的适用场景。

### 第三步发散·追问扩展 追问链:ResponseEntity 三刀

- **Q1：ResponseEntity 的 Builder?**
  - 答：ResponseEntity.status(...).header(...).body(...)——链式构建(可读性优于构造器);ResponseEntityBuilder 的语义。
- **Q2：与 @ResponseStatus?**
  - 答：@ResponseStatus(HttpStatus.CREATED) 注解(方法级状态码)——比 ResponseEntity 简洁但不能设 Headers——注解管状态,ResponseEntity 管全部。
- **Q3：与 HttpEntity?**
  - 答：HttpEntity(Headers+Body,无状态码)——ResponseEntity 继承 HttpEntity(加状态码)——HttpEntity 用于内部(非 HTTP 层)。

## 总结点

1. 状态码+Headers+Body 三元组全控制
2. 201+Location 是 RESTful 标配
3. 正常流 Controller,异常流 Advice
