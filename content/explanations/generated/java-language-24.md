<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 浅拷贝只复制引用，嵌套集合仍共享状态。
2. 根据边界选择显式映射或不可变结构，避免把序列化当成无成本的通用深拷贝。

## 参考分析

1. Java 传递的是引用值的副本，修改对象仍影响共享实例。
2. 集合只读包装不能隔离原集合的写入。

## 案例

1. 场景（教学示例）：订单 DTO 保存外部传入的可变明细列表。
2. 处理：构造时复制列表及可变元素，访问时只返回不可变视图或副本。

3. 验证：修改调用方列表不影响 DTO；修改嵌套元素也不越过边界。

## 总结点

1. final 不等于深不可变。
2. 复制到共享边界。
