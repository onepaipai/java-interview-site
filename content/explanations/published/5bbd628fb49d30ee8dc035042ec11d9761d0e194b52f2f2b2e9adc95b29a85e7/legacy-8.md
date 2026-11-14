<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 泛型让编译器约束参数化类型，减少强制转换。
2. 类型擦除后不能直接测试 List<String> 或创建泛型类型参数数组。
3. 生产者 extends，消费者 super；反序列化仍需运行期元素校验。

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
