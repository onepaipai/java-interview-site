<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 常见保留源含无界缓存、静态集合、未注销监听器与线程上下文。
2. 连接等资源泄漏与堆对象泄漏分别诊断。
3. 看多轮 GC 后增长及 GC Roots 路径，修生命周期和容量上限。

## 参考分析

1. 类直方图显示数量而非所有权。
2. 动态代理类增加可能正常，也可能被长期加载器引用。
3. 不能仅凭一次大对象认定泄漏。

## 案例

1. 场景（教学示例）：热部署几次后元空间持续增长。
2. 处理：对比各轮加载器数量、类数量和引用路径，关闭插件线程并清理注册表。

3. 验证：旧加载器可回收且增长收敛；修复验证覆盖多轮卸载。

## 总结点

1. 数量异常只是线索。
2. 沿保留路径找所有者。
