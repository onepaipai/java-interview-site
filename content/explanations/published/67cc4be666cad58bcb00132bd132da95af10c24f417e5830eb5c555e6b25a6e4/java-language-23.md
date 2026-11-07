<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)

</details>

## 参考回答

1. 利用类初始化的线程安全语义完成发布，避免手写不正确的双重检查。
2. 单例持有的可变业务状态仍需独立同步和生命周期管理。

## 参考分析

1. 单例不是跨进程唯一。
2. 多类加载器可能各有实例，分布式唯一性须用外部协调。

## 案例

1. 场景（教学示例）：应用内只创建一个规则注册表。
2. 处理：用静态持有者创建不可变注册表，多线程并发读取并比对实例。

3. 验证：同一类加载器实例一致；重启和多节点不共享可变状态。

## 总结点

1. 单例仅限本进程。
2. 共享状态另保安全。
