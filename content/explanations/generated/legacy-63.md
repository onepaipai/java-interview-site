<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

1. CAS 仅在当前值等于预期时替换，失败方需重新读取决策。
2. ABA 是值回到原样但期间历史已变，是否有害取决于业务协议。
3. 版本与状态一起比较，使用 stamped reference 或不可复用身份，限制竞争重试。

## 参考分析

1. 访问模式必须满足发布读取链。
2. 高竞争重试要设上限、退避或改为合并。
3. 不能用 LongAdder 做严格扣额。

## 案例

1. 场景（教学示例）：库存状态从开放更新为关闭，并防旧版本覆盖。
2. 处理：把版本和状态封装成不可变对象，通过 AtomicReference 比较替换。

3. 验证：旧版本更新失败且可重试；压力下同时统计失败率和最慢线程。

## 总结点

1. 无锁不等于无等待。
2. 版本状态一起换。
