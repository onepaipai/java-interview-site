<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)

</details>

## 参考回答

1. 加载后链接含验证、准备、解析，初始化执行类初始化逻辑。
2. 父优先委派避免重复定义，但类身份还包含定义加载器。
3. SPI 可用上下文类加载器，插件可用受控子优先；核心类型与公共接口保持统一。

## 参考分析

1. 主动使用可能触发初始化，常量读取不一定触发。
2. 初始化失败后的错误与找不到类要分别排查。

## 案例

1. 场景（教学示例）：插件类型名字相同却无法强制转换。
2. 处理：比对两端类加载器及依赖版本，公共接口交由同一上层加载器加载。

3. 验证：转换成功且插件卸载后加载器不被静态引用保留；启动阻塞从初始化栈定位。

## 总结点

1. 类名相同未必同类。
2. 初始化异常找首因。
