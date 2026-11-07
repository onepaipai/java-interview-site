<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 每组前 N 用 partition by 加稳定排序，明确并列名次规则。
2. 行转列可用条件聚合；连续登录先按用户日期去重，再按日期差分组。
3. 边界覆盖缺失日、重复日和跨时区账期，统计粒度先于 SQL 写法。

## 参考分析

1. 窗口 rank、dense_rank、row_number 对并列结果不同。
2. 调度完成与失败都要释放占用，否则系统停滞。

## 案例

1. 场景（教学示例）：任务上限 2，某任务抛异常；SQL 每组取前两笔订单。
2. 处理：用小样本暴力结果做对照，断言最大并发不越界；SQL 先按组分区再以唯一排序编号。

3. 验证：失败后其他任务能推进；每组数量与并列规则一致，空输入也有确定返回。

## 总结点

1. 测试边界加对照。
2. 完成失败都释放。
