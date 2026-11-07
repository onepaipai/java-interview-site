<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/core/beans/annotation-config/autowired-primary.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/core/beans/annotation-config/autowired-qualifiers.html)

</details>

## 参考回答

1. @Primary 在多个匹配候选中表达优先选择，适合默认实现；@Qualifier 收窄候选集合，适合在具体注入点表达业务含义。
2. 限定符不是任意实现的唯一全局名称；仍需先有类型匹配的候选。集合注入和单值注入的选择含义也不同。

## 参考分析

1. 明确的业务限定符比依赖参数名巧合更稳定；出现两个 Primary 或限定后仍有多个候选时，装配仍可能歧义失败。
2. 注入 List<PaymentPort> 通常希望取得多个候选，Primary 并不等于把列表过滤为唯一默认项。

## 案例

1. 教学场景：银行卡和钱包都实现 PaymentPort，普通下单默认用银行卡，退款服务必须指定钱包。

2. 为默认实现标 Primary，为特定注入点使用明确 Qualifier；小上下文分别获取单值默认、限定单值和候选列表。

3. 验证默认与限定实现符合预期，候选列表仍包含所需实现；删除限定或增加冲突候选时应明确失败而非随机选择。

## 总结点

1. Primary 表达默认优先。
2. Qualifier 表达候选限定。
