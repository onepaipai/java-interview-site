<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)

</details>

## 参考回答

1. 死锁条件是互斥、持有并等待、不可抢占与环形等待。
2. 多次线程转储结合锁所有者建立等待图，不把普通 WAITING 直接判死锁。
3. 统一锁顺序、缩小持锁范围，必要时限时失败并恢复一致状态。

## 参考分析

1. 没有复现不代表证明正确。
2. 吞吐提高可能来自丢更新或遗漏工作。
3. 事故根因需串联触发、资源与业务影响。

## 案例

1. 场景（教学示例）：比较锁计数器和无锁计数器。
2. 处理：用屏障同步启动并校验最终总数，再测竞争梯度与尾延迟。

3. 验证：禁止结果出现即否决；报告可复现参数和仍未覆盖的边界。

## 总结点

1. 先验正确再测快。
2. 无复现不是证明。
