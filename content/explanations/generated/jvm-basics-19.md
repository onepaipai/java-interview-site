<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-5.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ClassLoader.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：业务代码自定义了一个 java.lang.String 并尝试加载，结果被安全拦截。用双亲委派的委派链解释核心类的保护机制，并说明哪些机制刻意"破坏"它及其正当理由。

1. 委派顺序：应用类加载器先请平台加载器、再请 Bootstrap 处理；核心类（java.*）永远由最顶层加载，用户侧伪造的 java.lang.String 根本没有机会生效。
2. 同源同型：一个类只能由一条委派链上的同一加载器加载一次，保证 `java.lang.Object` 全进程唯一，跨包赋值不会类型错乱。
3. 刻意破坏委派的场景都有正当理由：SPI 用线程上下文加载器让 Bootstrap 加载的服务找到实现类；Web 容器/热部署反向委派实现应用隔离与重载。

## 参考分析

### 第二步扩展① 机制：先问长辈，避免"辈分错乱"

- 类比家族企业：任何新业务先问最高管理层"这个岗位有人吗"，有人就不另招——防止业务部门私自雇一个假"董事长"。
- Java 9 后的链是 App → Platform → Bootstrap。
- 安全拦截（如定义 java.* 包的 SecurityException）再加一层硬约束，双保险。

### 第二步扩展② 边界：委派不等于"谁先加载谁说了算"

- 委派解决"请求顺序"，不解决"加载器数量"：两个互不为父子的加载器各自加载同名类，会得到两个独立类型（见第 20 题）。
- 因此隔离容器（Tomcat 每应用一加载器）天然产生同名类并存——这是特性不是缺陷，问题只出在跨加载器传递对象时。

### 第二步扩展③ 取舍：什么时候应该破坏委派

- 当"父加载器加载的服务要回调子加载器的实现"时只能反向委派（JDBC 驱动、JNDI）。
- 当应用需要互相隔离与独立重载时必须子优先（Web 容器）。
- 破坏是能力不是罪，前提是明白放弃了哪层保护：核心类仍受 SecurityException 与平台加载器保护，业务类则按你的隔离设计来。

## 案例

### 第三步发散·验证与推演 对照操作：伪造核心类被拦截

- 教学验证：在自己包里定义 `java.lang.String`（或定义 `java.lang` 包的类）并加载。预期：抛 SecurityException（Prohibited package name）或加载到的仍是 Bootstrap 的 String（instanceof 校验通过）。再用 `Class.forName` 打印三个加载器加载链，实验可复跑。

### 第三步发散·追问① 追问：Platform 加载器与扩展机制的变化

- Java 9 移除扩展类加载器，改为 Platform 加载器承载不再随核心分发的平台库（如部分 java.* 模块的实现依赖）。
- 讨论双亲委派时用 Java 17 的三层链表述，不要再画"Ext 加载器"——术语过时是面试里的常见减分项。

## 总结点

1. 先问长辈，核心类没人能冒名
2. 同链同型，跨链同名不同类
3. 破坏委派是能力，隔离要付代价
