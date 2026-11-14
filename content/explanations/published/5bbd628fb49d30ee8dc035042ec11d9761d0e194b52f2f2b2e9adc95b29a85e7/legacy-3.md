<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. String 不可变，适合共享；Builder 适合线程内动态拼接。
2. StringBuffer 单方法同步，跨多步组合仍需额外协调。
3. String 不可变支撑稳定哈希和安全共享，但其引用变量仍可重赋值。

## 参考分析

1. 高基数字符串驻留增加表维护成本。
2. 编译器可优化简单拼接，不能只凭写法判断性能。

## 案例

1. 场景（教学示例）：批量生成一万行导出文本。
2. 处理：线程内使用一个 Builder，分批写出；不对用户随机文本统一 intern。

3. 验证：输出一致且分配量可测；控制单批大小，避免巨大中间字符串。

## 总结点

1. 拼接看循环。
2. 驻留控基数。
