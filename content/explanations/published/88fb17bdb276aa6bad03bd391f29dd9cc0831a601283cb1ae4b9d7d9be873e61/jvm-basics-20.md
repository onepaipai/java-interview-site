<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-5.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ClassLoader.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：热部署后日志出现 `com.example.User cannot be cast to com.example.User`。用"类的身份 = 加载器 + 全限定名"解释同名类互转失败，给出排查与预防手段。

1. JVM 里类的唯一身份由（定义类加载器，全限定名）共同决定：两个加载器加载的同名类是两个不同的运行时类型。
2. cast 失败的现场：对象 A 由加载器 1 创建，引用经共享路径（静态字段、单例注册表、序列化缓存）传到加载器 2 的代码里强转，JVM 按身份判定不是同一个类。
3. 预防靠边界：跨加载器只传不可变的值对象或显式转换层；热部署时丢弃旧加载器持有的缓存引用；共享类交给父加载器统一加载。

## 参考分析

### 第二步扩展① 机制：类型身份在加载时钉死

- 同一个 .class 文件被两个加载器各加载一次，得到两份独立的类元数据与 Class 对象，instanceof 与 cast 都按身份比较。
- 类比两个分公司各自注册了同名商标：货同名但法律主体不同，A 公司的货进 B 公司的仓库会被"拒收"。
- Web 容器重载、OSGi、微内核插件架构都会自然出现这个现象。

### 第二步扩展② 故障推演：热部署三步走出异常

- 旧加载器创建 User 实例存进静态缓存 → 热部署换新加载器重载 User → 新代码从缓存取出旧实例强转，ClassCastException。
- 定位：打印 `obj.getClass().getClassLoader()` 与当前类加载器对比。
- 两个不同的加载器实例就是铁证。
- 修复：重载时清空缓存，或把 User 上移到父加载器共享。

### 第二步扩展③ 取舍：隔离与互操作的平衡

- 完全共享（全交父加载器）失去热部署与依赖隔离。
- 完全隔离（各加载器独立）则跨边界协作处处是雷。
- 工程折中：接口与共享模型放父链，实现类按需隔离。
- 跨边界通信用 DTO/映射层，绝不让"实现对象"跨加载器旅行。

## 案例

### 第三步发散·验证与推演 对照操作：两加载器同名类的复现

- 教学验证：自定义两个 URLClassLoader 各加载同一 class 文件，反射各建实例，互相赋值。
- 预期：ClassCastException，且 `getClass().getName()` 相同而 `getClassLoader()` 不同——同名不同型的最小复现，代码可复跑。

### 第三步发散·追问① 追问：instanceof 和 == 比较 Class 有区别吗

- 语义一致：instanceof 与 cast 都按类身份判定，`a.getClass() == b.getClass()` 同样比较身份。
- 所以"名字一样"的调试输出毫无意义，必须比较 getClassLoader()。
- 把这条写进热部署排查手册的第一行。

## 总结点

1. 身份 = 加载器 + 全限定名
2. 同名不同主，互转必被拒
3. 跨加载器只传值，不传实现
