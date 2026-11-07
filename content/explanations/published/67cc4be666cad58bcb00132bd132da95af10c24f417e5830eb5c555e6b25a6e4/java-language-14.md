<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Optional.html)

</details>

## 参考回答

1. Optional 主要表达返回结果可能缺失，不宜无差别替换所有字段和参数。
2. Optional 本身不应为 null；集合结果通常直接返回空集合，而非层层包装。
3. orElse 的参数会先求值；默认值计算昂贵或有副作用时用 orElseGet 延迟计算。

## 参考分析

1. 字段与参数是否使用 Optional 要考虑序列化、ORM 与调用契约，不能宣称语言禁止这种用法。
2. of 不接收 null，可能为空的输入用 ofNullable；不能用 get 代替缺失分支设计。
3. Optional 只表达缺失，不会自动消除并发、异常和业务合法性问题。

## 案例

1. 场景（教学示例）：已有优惠方案时，不希望再次查询数据库加载默认方案。

2. 处理：使用 optional.orElseGet(this::loadDefault)，而不是 optional.orElse(loadDefault())。

3. 验证：有值时默认加载调用数为 0；空值时为 1；加载失败按接口错误契约处理。

## 总结点

1. 缺失写进契约，默认按需计算。
2. 包装不为空，取值判缺失。
