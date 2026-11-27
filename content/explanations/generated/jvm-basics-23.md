<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-5.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/NoClassDefFoundError.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：同一个缺失依赖，开发环境抛 ClassNotFoundException、生产抛 NoClassDefFoundError 且带 Caused by。按"加载期 vs 链接期"区分两者成因、可恢复性与排查路径。

1. ClassNotFoundException 是加载期找不到字节码（Class.forName、loadClass 显式加载失败），是受检异常，代码可以捕获并处理。
2. NoClassDefFoundError 是链接期错误：类在编译期存在、运行期定义失败或其依赖初始化失败（静态块抛异常、Jar 缺失、版本冲突），发生在首次"主动使用"时，是 Error 不是受检异常。
3. 排查分叉：CNFE 查 classpath 与名字拼写（含包名）；NCDFE 读完整堆栈的 Caused by 与首次触发点——常见根因是静态初始化抛异常后该类进入"失败"状态，后续使用一律 NCDFE。

## 参考分析

### 第二步扩展① 机制：两条错误发生在生命周期不同段

- 加载期找不到"图纸"→ CNFE（显式问询的回答"没有"）。
- 链接/初始化期图纸有问题或通电失败 → NCDFE（机器报废报告）。
- 类比订货：仓库没这个货是 CNFE。
- 货到了但质检不过、或者第一次通电就把电路烧了，之后这台机器每次启用都报 NCDFE。

### 第二步扩展② 故障推演：静态块抛异常的连锁反应

- 类 A 的静态块读配置抛 NPE：首次主动使用时 JVM 抛 ExceptionInInitializerError（cause 为 NPE），A 标记为初始化失败。
- 之后任何线程再碰 A，一律 NCDFE 且不再给出原始原因。
- 事故现场只见 NCDFE 不见 NPE——必须翻第一次的日志找 ExceptionInInitializerError。

### 第二步扩展③ 取舍：版本冲突这类"同蔸不同版本"问题

- Maven 依赖仲裁让运行期版本与编译期不一致，缺方法时报 NoSuchMethodError（同属链接期 Error 家族）。
- 预防靠依赖树审计与 shade 隔离。
- 运行期靠 NCDFE/NSME 的堆栈定位"哪个 jar 提供了意外版本"。
- 三者（CNFE/NCDFE/NSME）一起构成"类与符号找不到"的排查坐标系。

## 案例

### 第三步发散·验证与推演 对照操作：三种错误的现场复现

- 教学验证：一，`Class.forName("com.missing.X")` 抛 CNFE。
- 二，静态块 throw 后二次访问该类，第一次 ExceptionInInitializerError、第二次 NCDFE。
- 三，编译引用高版本方法、运行替换低版本 jar 调用抛 NoSuchMethodError。
- 三组一并复跑，对照表即可背下来。

### 第三步发散·追问① 追问：为什么 NCDFE 不设计成受检异常

- 它发生在任意首次使用的瞬间，若要求显式捕获将污染几乎所有代码。
- 而且它代表"运行环境与编译假设不一致"这类程序缺陷，应让它快速失败并暴露根因，而不是逐层吞掉。
- 受检与否的分界线：可预期可恢复（CNFE）与环境性缺陷（Error）。

## 总结点

1. CNFE 没图纸，NCDFE 图纸报废
2. 首错看 Caused by，二错只余 NCDFE
3. 同蔸不同版本找 NSME
