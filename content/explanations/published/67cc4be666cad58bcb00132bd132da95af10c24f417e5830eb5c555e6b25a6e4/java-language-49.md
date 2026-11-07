<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 检查空值分支、副作用、异常边界和调试可见性，而非只看代码行数。
2. 关键业务阶段使用命名中间结果，降低理解和变更成本。

## 参考分析

1. 缺少终止操作就不会处理数据。
2. 捕获变量有效 final 不代表其指向对象线程安全。

## 案例

1. 场景（教学示例）：按订单号聚合导入记录，存在重复版本。
2. 处理：先校验数据，再用明确的合并函数保留最高业务版本，输出稳定顺序。

3. 验证：重复输入得到确定结果；空集合和缺失值走明确分支。

## 总结点

1. 流水线少副作用。
2. 重复键先定规则。
