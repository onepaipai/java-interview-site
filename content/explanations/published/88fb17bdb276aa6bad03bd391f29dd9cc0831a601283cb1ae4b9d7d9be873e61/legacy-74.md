<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/manage/introduction.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银类加载沙盘:类加载=加载→验证→准备→解析→初始化五步;双亲委派(先委托父加载器,父无法加载才自己加载)保证核心类安全;打破=自定义加载器覆写 loadClass 或 SPI(Thread.currentThread().getContextClassLoader)。

1. 类加载五步:加载(读字节码→生成 Class 对象)→验证(字节码安全检查)→准备(静态变量分配内存+默认值)→解析(符号引用→直接引用,可延迟)→初始化(执行 <clinit>:静态变量赋值+static 块)——初始化触发:首次 new/访问静态成员/反射/子类初始化触发父类。
2. 双亲委派:AppClassLoader→PlatformClassLoader(扩展)→BootstrapClassLoader(核心 rt.jar)——先委托父加载器加载(父能加载就不自己加载);保证:核心类(java.lang.String)始终由 Bootstrap 加载(安全——防自定义 java.lang.String 覆盖核心类)。
3. 打破双亲委派:SPI(java.sql.Driver——接口在 Bootstrap,实现在 classpath→父加载器看不到子加载器的类→Thread.contextClassLoader);OSGi/热部署(每个模块独立加载器);Tomcat(WebappClassLoader 先自己加载再委托——Web 应用隔离)。

## 参考分析

### 第二步扩展① 机制:双亲委派的"安全性"

- 双亲委派的核心=防止核心类被篡改:自定义 java.lang.String→委托到 Bootstrap→Bootstrap 已加载 String→返回核心类(自定义的不会被加载)——保证核心类唯一性。
- 类加载器也是命名空间:不同加载器加载的同一个类文件=不同的 Class 对象(第 37 题 JVM 类泄漏)。

### 第二步扩展② 反例:类加载的两种事故

- 事故一:NoClassDefFoundError vs ClassNotFoundException——前者=编译时存在运行时缺失(依赖版本变更)。
- 后者=运行时动态加载失败。
- 排查=类路径审计+依赖树分析。
- 事故二:同类不同加载器——热部署环境下同一类被两个加载器加载→instanceof false→ClassCastException(第 37 题 JVM)。
- 修复=确保类只由一个加载器加载或共享父加载器。

### 第二步扩展③ 取舍:自定义加载器的场景

- 热部署(不重启更新类——每个版本独立加载器)、隔离(插件系统——插件间类隔离)、加密(自定义类文件格式解密后加载)——自定义加载器的成本=双亲委派的复杂性(需要处理委托/缓存/类冲突),不是"随便覆写 findClass"。

## 案例

### 第三步发散·验证与推演 验证:类加载的走查核对

- 验证:双亲委派断言(String 的 classLoader=null→Bootstrap 加载)。
- 打破断言(Thread.contextClassLoader 加载 SPI 实现)。
- 初始化顺序断言(静态变量→静态块→构造器)。
- 类卸载断言(加载器被 GC→其加载的类卸载,第 37 题 JVM 代理类卸载)。
- 验证:类加载的断言可程序化(Class.forName/getResourceAsStream)。

### 第三步发散·追问扩展 追问链:类加载三刀

- **Q1：类的初始化顺序?**
  - 答：父类静态→子类静态→父类构造→子类构造;静态变量赋值+静态块按源码顺序执行。
- **Q2：类加载器的层次?**
  - 答：Bootstrap(核心)→Platform(扩展)→Application(classpath)→自定义——每层可以访问自己+父层的类,不能访问子层的。
- **Q3：Metaspace 泄漏与类加载器?**
  - 答：类加载器被泄漏→其加载的所有类无法卸载→Metaspace 增长(第 37 题 JVM;CGLIB 代理类泄漏的场景)。

## 总结点

1. 五步:加载→验证→准备→解析→初始化
2. 双亲委派保核心类安全
3. 打破:SPI contextClassLoader
