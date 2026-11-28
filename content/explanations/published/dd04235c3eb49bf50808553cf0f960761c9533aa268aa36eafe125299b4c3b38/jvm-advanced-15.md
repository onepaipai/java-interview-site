<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-5.html)
- [Java 17 规范与 API · 2](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jcmd.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银批处理沙盘:同一天两个服务分别抛出 Metaspace OOM 与 Java heap space,值班同学用同一套"扩内存"思路处理,一个生效一个继续炸。解释两类 OOM 的机制差异与各自的处置清单。

1. 堆 OOM 是对象账本爆了:处置看对象画像(直方图/支配树),方向是查泄漏或扩堆。
2. 元空间 OOM 是类账本爆了:处置看类与加载器画像(类直方图差量),方向是查动态类生成与加载器泄漏,扩 MaxMetaspaceSize 常只是推迟。
3. 两者日志形态不同:堆 OOM 带 Java heap space 与对象统计建议(-XX:+HeapDumpOnOutOfMemoryError),元空间 OOM 明示 Metaspace,先分清再动手。

## 参考分析

### 第二步扩展① 机制:两本账本的计量口径

- 堆按对象字节计,受 -Xmx 约束,GC 全程参与管理。
- 元空间按类元数据计(方法字节码、常量池、注解),在本地内存,受 -XX:MaxMetaspaceSize(默认无限,受物理内存约束)控制,按需提交。
- 实测 NMT 口径:Metaspace reserved 65546KB、committed 522KB(空闲 JVM),说明保留与提交是两回事——OOM 在提交触顶时发生。
- 堆 OOM 有 GC 前的挣扎记录,元空间 OOM 与 GC 关系弱,因为元数据不参与普通 GC 的对象回收。

### 第二步扩展② 反例:扩内存救不了的元空间 OOM

- 热部署插件服务每次更新净增 5000 个类,MaxMetaspaceSize 从 256m 提到 512m 只是让第 40 次更新才炸。
- 真正处置是找类生成源(动态代理、脚本引擎、Groovy/SpEL 每次编译新类)与加载器泄漏链。
- 对照堆 OOM:若直方图显示无界缓存占 70%,扩堆配合上限治理能稳定运行——同一动作,一个治标一个治本,差别在账本性质。

### 第二步扩展③ 取舍:处置清单分开维护

- 堆 OOM 清单:确认 HeapDump 落盘、直方图定类型、支配树定持有者、查缓存与批处理窗口、再评估堆容量。
- 元空间 OOM 清单:类直方图差量定位生成源、检查动态代理与脚本引擎的类复用、检查热部署卸载链、评估类生成是否可池化。
- 两份清单的告警阈值也应分开:堆用占用率,元空间用类数量增速。

## 案例

### 第三步发散·验证与推演 推演:两类 OOM 的日志特征判别

- 堆 OOM 判据(可用本机复现):ArrayList 净增长程序在 512m 堆抛 java.lang.OutOfMemoryError: Java heap space(实测见过此错误形态,见 pause 组实验的程序结局)。
- 元空间 OOM 形态:OutOfMemoryError: Metaspace,发生在类装载时。
- 本机可验证的相邻证据:NMT 显示 Metaspace committed 522KB、reserved 64MB(空闲态),即元空间是独立的本地内存账本。
- 验证方式:两类程序各跑一次并保留日志,值班手册按日志关键字分流。

### 第三步发散·追问扩展 追问链:两类 OOM 三刀

- **Q1：元空间会参与 GC 吗?**
  - 答：类元数据随类卸载由 GC 顺带回收,但它不是堆 GC 的对象;卸载不发生,元空间只进不出。
- **Q2：CompressedClassSpace 是什么?**
  - 答：压缩类指针的专用空间(-XX:CompressedClassSpaceSize,默认 1G),大量类时可能先于 MaxMetaspaceSize 触顶,日志会区分。
- **Q3：怎么预防?**
  - 答：把类数量纳入监控(jcmd GC.class_histogram 的 Class 行),热部署环境设类数量告警;堆则监控 Full GC 频率与老年代基线,两套水位两套动作。

## 总结点

1. 堆看对象,元空间看类
2. 扩堆可能治本,扩元空间常推迟
3. 日志先分流,清单不通用
