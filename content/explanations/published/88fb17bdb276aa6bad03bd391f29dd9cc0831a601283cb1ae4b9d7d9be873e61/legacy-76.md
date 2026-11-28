<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/index.html)
- [Java 17 GC 指南 · 2](https://docs.oracle.com/en/java/javase/17/gctuning/collectors.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银运维沙盘:JVM 参数分类(内存/GC/诊断/行为)与堆大小的确定(不是拍脑袋,是按负载画像+压测校准,第 76 题 JVM 的完整版)。

1. 参数分类:-X 系列(-Xms/-Xmx/-Xss)、-XX 系列(-XX:+UseG1GC 等)、系统属性(-D);常用:-Xms=-Xmx(生产相等)/-Xss/-XX:MaxMetaspaceSize/-XX:+HeapDumpOnOutOfMemoryError(OOM 转储)/-XX:MaxDirectMemorySize(堆外)。
2. 堆大小的确定:基线=稳态内存占用(常驻对象+缓存)+峰值波动(突发分配)+GC 余量(年轻代+GC 工作空间)——压测校准(第 147 题:压测到目标流量观测实际堆使用→1.5-2 倍余量)——不是"内存多就设大"(GC 扫描时间与堆成正比)。
3. 诊断参数:-XX:+HeapDumpOnOutOfMemoryError+-XX:HeapDumpPath(自动转储)+-Xlog:gc*(GC 日志)+-XX:NativeMemoryTracking=summary(NMT)+-XX:+UnlockDiagnosticVMOptions(诊断命令)——生产必备(出了问题没 dump=没证据)。

## 参考分析

### 第二步扩展① 机制:参数的"打印与验证"

- -XX:+PrintFlagsFinal(打印所有参数最终值——验证参数是否生效)/-XX:+PrintFlagsInitial(初始值)——参数的验证=PrintFlagsFinal 对照(确认 JML 参数被正确设置,而不是"以为设置了")。
- jcmd VM.flags(运行时查看)——参数的审计=变更后 diff FlagsFinal(第 50 题升级排查的基础)。

### 第二步扩展② 反例:JVM 参数的两种事故

- 事故一:-Xms≠-Xmx——堆动态扩缩容(扩容=暂停+抖动)。
- 修复=生产环境 Xms=Xmx(避免动态扩容)。
- 事故二:参数堆积不加区分——从网上复制的"调优参数"盲用(与新 JDK 版本不兼容或已移除)。
- 修复=PrintFlagsFinal 验证+按 JDK 版本核对(第 50 题升级的三层排查)。

### 第二步扩展③ 取舍:参数的"默认优先"原则

- JDK 默认值经过大量测试(大多数场景够用)——不要盲目覆盖默认值(每个覆盖都引入维护成本)。
- 只调"有明确依据的参数"(压测发现瓶颈→针对性调整)。
- 参数变更=一次发布(走评测门禁,第 49 题)。

## 案例

### 第三步发散·验证与推演 验证:JVM 参数的走查核对

- 验证:PrintFlagsFinal 断言(参数生效——diff 变更前后的 FlagsFinal)。
- 堆大小断言(jcmd GC.heap_info 查看堆布局)。
- OOM 转储断言(构造 OOM→HeapDumpPath 有 dump 文件)。
- NMT 断言(NMT summary 的各区域能耗与理论一致,第 11 题 JVM 实测)。
- 验证:参数验证的断言可程序化(jcmd 命令集)。

### 第三步发散·追问扩展 追问链:参数三刀

- **Q1：容器环境的 JVM 参数?**
  - 答：容器内存限制(cgroup)与 JVM 堆的关系(JVM 感知容器内存,JDK 10+ UseContainerSupport)——堆+元空间+栈+堆外+Code Cache < 容器 limit(第 19 题 jvm-advanced 容器 OOMKilled)。
- **Q2：-XX:+UseCompressedOops 的条件?**
  - 答：堆<32GB 时可用(>32GB 自动关闭,引用变 8 字节→内存跳涨)——堆从 31GB 调到 33GB 可用内存反而变少(压缩指针失效)。
- **Q3：参数的优先级?**
  - 答：命令行>环境变量>配置文件>JVM 默认——冲突时高优先级覆盖;参数的来源要可追溯(第 10 题配置审计)。

## 总结点

1. 生产:Xms=Xmx+OOM 转储+GC 日志
2. 堆大小=压测校准,不拍脑袋
3. PrintFlagsFinal 验证参数生效
