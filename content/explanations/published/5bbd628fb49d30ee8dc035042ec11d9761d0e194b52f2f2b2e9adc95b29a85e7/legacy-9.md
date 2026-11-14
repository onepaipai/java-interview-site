<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 反射在运行期读取类型、字段及方法并动态调用。
2. 适合框架绑定、插件与序列化，须限制不可信类型入口。
3. 开销依赖 JDK 和调用形态；缓存元数据并用实际基准评估。

## 参考分析

1. 动态访问可能受模块封装限制。
2. 缓存查找结果能减少重复解析，但不能承诺固定性能倍数。

## 案例

1. 场景（教学示例）：按插件类型调用导出器。
2. 处理：启动期发现并校验实现，缓存受控调用入口，遇到未知插件拒绝执行。

3. 验证：启动即发现缺方法或权限问题；热路径不重复扫描所有类。

## 总结点

1. 发现与调用分开。
2. 动态入口先校验。
