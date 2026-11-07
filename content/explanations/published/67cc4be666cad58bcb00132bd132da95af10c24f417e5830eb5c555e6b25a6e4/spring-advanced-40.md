<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/6.2/testing/testcontext-framework/ctx-management/caching.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-boot/3.5/reference/testing/spring-boot-applications.html)

</details>

## 参考回答

1. 按风险选择普通单测、切片和完整上下文，复用等价配置，减少无必要的 DirtiesContext 与配置差异。
2. 保留事务、认证和真实网络等关键边界验证，不能为了快把被测行为全部 mock。

## 参考分析

1. 上下文缓存依赖配置键，动态属性、替身和 profile 差异可能增加新上下文；跨进程不能默认复用同一内存缓存。
2. 复用时仍要清理数据和可变单例，不用测试间依赖换速度；先测启动数与耗时再优化。

## 案例

1. 教学场景：几十个测试只改无关配置就各启动一次应用，运行时间增加。

2. 整理相同边界的共享配置，将纯业务分支移到无容器测试，记录上下文数和耗时变化。

3. 验证固定与随机顺序均正确，关键全链路仍保留，不预先承诺固定加速比例。

## 总结点

1. 减少无意义的配置分叉。
2. 上下文复用仍保持测试独立。
