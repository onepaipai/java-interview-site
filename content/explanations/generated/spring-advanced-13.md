<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/integration/cache/annotations.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/core/aop/proxying.html)

</details>

## 参考回答

1. 默认代理模式下，目标对象内调用自身缓存方法通常绕过缓存拦截器，可能重复查询，也可能绕过本应执行的清除或更新。
2. 把需要增强的操作放到另一受管 Bean，或采用明确的缓存 API；切换类代理本身不会修复自调用。

## 参考分析

1. 外部调用命中缓存不代表内部调用也命中，需分别统计真实加载次数和键，而非只测返回值相同。
2. 缓存正确性还取决于租户、参数及版本维度和失效时点，代理修复不能掩盖错误键设计。

## 案例

1. 教学场景：外部调用 find 两次只查库一次，batch 内 this.find 两次却每次查询。

2. 固定数据和缓存状态分别测试两条路径，再拆出查询 Bean 从代理调用。

3. 验证加载次数符合契约，同时测试不同租户与缓存失效；不能靠手写计数替身替代真实缓存拦截器。

## 总结点

1. 自调用也会绕过缓存增强。
2. 用真实加载次数验证命中。
