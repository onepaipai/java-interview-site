<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-controller/ann-validation.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Spring MVC 6.2 / Jakarta Validation 教学场景：创建订单的请求体含嵌套地址和正数量，另一个接口在路径参数上直接声明 @Min。区分约束、级联入口和方法校验。

1. 先检查 Jakarta Validation 实现是否可用、是否用了正确的 jakarta 注解，以及 MVC 参数是否通过 @Valid 或 @Validated 触发对象校验；@Valid 自身不是约束。
2. 嵌套对象需要级联 @Valid，分组也必须匹配。直接声明在方法参数或返回值上的约束，涉及方法校验，不能只检查 DTO 字段。
3. Spring MVC 6.1+ 内建方法校验与类级 @Validated 的代理机制需要区分；业务服务的代理校验还会受自调用影响。入口校验也不能替代业务不变式和数据库约束。

## 参考分析

### 从入口排查：有注解但没有校验触发点

字段上的 @NotBlank 或 @Min 描述约束，不负责让所有普通 Java 方法自动校验。对 @RequestBody 等命令对象，需要合适的校验入口与校验器实现；直接在测试中 new DTO 后调用普通方法不会自然触发 MVC 校验。Boot 3 使用 jakarta.validation 包，混入旧 javax 注解或遗漏验证依赖都可能让预期与运行机制不一致。类比门上贴了请登记却没有登记本和检查人：注解（标语）、触发点（校验器入口）缺一不可。

### 嵌套和分组：只检查顶层还不够

地址对象内部的约束需要通过字段上的 @Valid 级联进入；@Valid 不会隐含 @NotNull，若地址必填仍需非空约束。使用校验分组后，要核对当前入口激活的组与字段约束的组是否一致。集合元素的约束还应按容器元素语义声明，避免只验证列表对象却漏掉列表中的内容。

### 异常类型：签名不同会走不同校验路径

Spring MVC 6.1+ 支持控制器方法内建校验，直接参数约束可能触发 HandlerMethodValidationException，单对象绑定校验常见 MethodArgumentNotValidException。若控制器保留类级 @Validated，会走 AOP 方法校验机制；要采用内建机制应按文档移除该类级标记。服务层代理校验另有边界，错误处理不能只捕获一种异常。

## 案例

### 输入矩阵：负数量、空地址和空街道

教学测试向真实 MVC 绑定入口依次发送负数量、缺地址、地址存在但街道为空和全部合法的 JSON；DTO 同时声明数量约束、地址非空及地址级联。预期前三类按协议返回字段级客户端错误，合法输入只调用服务一次。再移除地址字段的 @Valid 做对照，说明为什么只有顶层约束无法覆盖嵌套字段。

### 方法追问：路径参数与对象校验不是同一个异常

增加一个在路径 id 上直接声明 @Min(1) 的控制器方法，确认采用 Spring 6.2 的内建方法校验而不是类级代理校验；用负 id 与合法 id 请求并核对统一错误响应。服务普通单测另测业务不变式，不能通过测试里直接调用控制器方法就宣布 MVC 校验已经生效。此处给出测试矩阵，尚未把它当作任意接口的执行证据。

## 总结点

1. 贴标语还要有登记本和检查人
2. 约束声明与校验入口都要有
3. 级联、非空和分组分别核对
4. 方法签名影响校验与异常路径
