<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 常见随机 UUID 具有离散分布，不保证时间有序，可能增加索引页分裂。
2. 选型需同时考虑碰撞、时钟、信息暴露和存储布局。

## 参考分析

1. UUID 随机分布可能降低聚簇写入局部性。
2. 时间有序 ID 仍需处理时钟和节点分配。

## 案例

1. 场景（教学示例）：订单主键同时用于公开查询链接。
2. 处理：内部分配稳定 ID，外部链接额外做鉴权；安全令牌用 SecureRandom。

3. 验证：并发无碰撞测试通过，猜中编号也不能读取他人订单。

## 总结点

1. 唯一不等于安全。
2. 排序另定规则。
