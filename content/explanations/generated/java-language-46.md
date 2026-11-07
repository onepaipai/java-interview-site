<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 统一表达数据、总量与游标或页码，避免返回原始 Map 让调用方猜类型。
2. 深分页和不稳定排序时应考虑游标协议。

## 参考分析

1. 通配符限制的是安全读写能力。
2. 反射 Type 信息不能替代对反序列化元素的逐项校验。

## 案例

1. 场景（教学示例）：把整数列表复制到 Number 列表。
2. 处理：源参数用 List<? extends Number>，目标用 List<? super Number>，拒绝原始类型。

3. 验证：正常复制且错误类型在编译期失败；外部数据仍做运行期校验。

## 总结点

1. 泛型先防编译错。
2. 读 extends 写 super。
