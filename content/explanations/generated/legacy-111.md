<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 哈希表定位节点，双链表维护访问顺序，平均读写淘汰 O(1)。
2. 命中移到最近端，超容量从最旧端移除并同步删除键表。
3. 容量零、更新已有键和线程安全覆盖组合操作。

## 参考分析

1. 命中更新与淘汰是组合操作，线程安全要覆盖整体。
2. TTL 清理不能无限阻塞请求，零容量和容量缩小需定义。

## 案例

1. 场景（教学示例）：容量 2，依次放 A、B，读 A，再放 C。
2. 处理：逐步画链表与键表，断言 B 被淘汰；LFU 用同频次最旧规则，过期用可控时钟。

3. 验证：每步数量不越界；空缓存、重复键、过期和并发访问均满足约定。

## 总结点

1. 键表负责定位。
2. 顺序结构负责淘汰。
