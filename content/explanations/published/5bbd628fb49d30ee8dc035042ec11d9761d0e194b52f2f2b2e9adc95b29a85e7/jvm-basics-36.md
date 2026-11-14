<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-5.html)
- [Java 17 GC 指南 · 2](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：新人以为"字符串常量池在方法区（元空间）里"。梳理常量池的迁移史（JDK 7 移入堆）、intern 的行为、StringTable 大小与去重选项，把这块讲成可验证的版本事实。

1. 版本事实：JDK 7 起字符串常量池（StringTable）从永久代移入 Java 堆，intern 的字符串就是堆上的普通对象引用；元空间里存的是类文件常量池的符号引用等类元数据，两者不是一回事。
2. 字面量自动入池；intern() 把堆上首次出现的串登记进 StringTable（已存在则返回池内引用）。因此 `"a".intern() == "a"` 恒真，而 `new String("a").intern()` 的相等性要看池内是否已有 "a"。
3. StringTable 是哈希表，默认桶数 65536（-XX:StringTableSize 可调）；G1 还提供 -XX:+UseStringDeduplication 对内容重复的长字符串去重（底层 char/byte 数组共享），与 intern 是两套机制。

## 参考分析

### 机制：StringTable 是堆里的登记簿

常量池类比前台的访客登记簿：字面量来客自动登记，intern() 相当于"请把这位也登记一下，以后都发同一张工牌"。登记簿本身在堆里（JDK 7+），随 GC 与堆参数伸缩——这解释了"大量 intern 可撑爆堆"而不是撑爆元空间。

### 边界：intern 的成本与收益

收益：高度重复的长串（如相同 URL、枚举名）intern 后共享一份，配合 StringTable 缓存命中等值比较更快。成本：登记占表、共享后对象不可独立回收（表活着就可达），且 intern 调用本身有哈希与锁成本。用 `jcmd VM.stringtable`（需诊断选项）与 GC 前后统计验证收益，不要凭感觉 intern。

### 取舍：去重选项与 intern 的分工

UseStringDeduplication 在 GC 期间自动把内容相同的 String 底层数组指向同一份（对象壳各自保留，业务无感知），适合"读多写少、重复内容多"的大堆服务；intern 适合"代码里显式复用少量键"。两者都不是免费的：去重要扫描与迁移，intern 要登记。

### 展开：Compact Strings——String 底层存储的版本事实

JDK 9(JEP 254)起 String 内部存储从 char[](每字符 2 字节)改为 byte[] 加 coder 标志：coder=LATIN1 表示纯 Latin-1 内容(每字符 1 字节,内存减半)，coder=UTF16 表示含非 Latin-1 字符(每字符 2 字节)。纯 ASCII 的业务串(URL、编码、JSON 键)普遍吃满减半红利——回答"String 内部用什么存"的版本事实。与 intern、UseStringDeduplication 合起来是字符串内存的三个优化维度：存储密度(JEP 254)、引用共享(intern)、数组去重(去重选项)；排查字符串内存按这三层分别看，不笼统说"字符串优化"。

## 案例

### 对照操作：intern 与去重的可观察证据

教学验证：生成 100 万个内容相同的 long 字符串，一组 intern、一组开 UseStringDeduplication 跑几轮 GC。预期：intern 组堆内 String 对象数骤减（堆转储或 stringtable 统计），去重组的 char/byte 数组占用下降而对象壳数量不变。实验可复跑，把版本事实变成数据。

### 追问：为什么 JDK 7 要把常量池移进堆

永久代有固定上限且 GC 策略笨重，大量 intern（历史代码大量用 intern 优化）易把永久代顶爆。移进堆后常量池与对象同池共管，随 GC 伸缩，也顺手为"永久代退役、元空间接班"铺路——讲版本史时把因果链带上，比背结论有说服力。

## 总结点

1. 常量池七年起住堆里
2. 字面量自动登记，intern 按需入册
3. 去重共享数组，intern 共享引用
