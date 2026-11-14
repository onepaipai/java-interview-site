<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银表单沙盘:@NotBlank 标在字段上但校验没触发——原因:缺 @Validated/@Valid(注解需要触发器)、方法级校验需 @Validated(类级)+@NotBlank(参数级)、嵌套对象需 @Valid(级联)。

1. 不生效三因:一是 Controller 类没加 @Validated(方法参数校验的触发器);二是对象参数没加 @Valid(级联校验的触发器——嵌套对象的字段校验需要);三是自定义校验器未注册(Validator 的实现类未加入校验工厂)。
2. 校验体系:JSR 380 注解(@NotBlank/@Size)+Hibernate Validator 实现+Spring 自动装配;@RequestBody 参数由 @Valid 触发 resolver 内校验,@RequestParam/方法级校验由类级 @Validated 触发——注解位置决定触发时机。
3. 校验失败的异常:MethodArgumentNotInvalidException(@RequestBody 校验失败)→ControllerAdvice 处理;ConstraintViolationException(@Validated 方法级校验失败)→不同的异常类型(第 19 题:统一异常处理覆盖两种)。

## 参考分析

### 机制:校验的触发链

@Validated 类级→方法参数校验;@Valid 对象级→级联校验——触发器缺失=校验静默跳过。排查入口:先确认触发器存在,再看校验器实现与消息解析——触发链三环缺一即静默。

### 反例:校验不生效的三因

缺 @Validated(方法参数校验不触发)/缺 @Valid(嵌套不触发)/自定义校验器未注册——三因逐个排查。纪律:校验用例必须包含"注解在但校验未触发"的反向用例,进回归集防静默失效。

### 取舍:校验的分层

入口校验(Controller 注解)+服务校验(业务规则)+DB 约束(唯一非空)——三层校验互补。边界:入口校验挡格式,服务校验挡业务规则,DB 约束兜底并发写入——三者不可互替。

## 案例

### 验证:校验触发的断言组

验证:触发断言(@Validated 类级+@NotBlank 参数级→校验触发);级联断言(@Valid 嵌套对象的字段校验触发);异常类型断言(MethodArgumentNotInvalidException 与 ConstraintViolationException 的区分)——三组固化校验触发链。

### 追问链:校验三刀

一刀:"自定义校验器?"——@Constraint(validatedBy = X.class)——自定义注解+Validator 实现——注册到 LocalValidatorFactoryBean(Boot 自动)——自定义校验的可测试性(直接调 isValid)。二刀:"分组校验?"——@Validated(Create.class)——分组校验(创建时校验 A 组字段/更新时校验 B 组)——分组的接口标记(groups = {Create.class})。三刀:"校验的顺序?"——JSR 380 的组序列(@GroupSequence)——校验顺序的控制(先校验基础字段再校验联动)——顺序错误导致级联 NPE。

## 总结点

1. @Validated 类级触发方法校验
2. @Valid 级联触发嵌套校验
3. 两种校验失败的异常类型不同
