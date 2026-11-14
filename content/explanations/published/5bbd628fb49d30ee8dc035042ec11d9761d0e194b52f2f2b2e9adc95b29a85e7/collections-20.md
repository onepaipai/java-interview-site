<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银会话沙盘:CHM<String, UserSession> 线程安全,但 UserSession 对象可变(两线程拿到同一引用各自 set 字段)——容器原子≠元素安全:容器保护的是"结构操作",元素的内部状态自己负责。

1. 安全边界:CHM 保证 put/get/remove 的原子(结构层面);value 是共享引用——元素的并发修改(字段 set)不在容器保护范围——值对象的可变字段=新的共享可变状态(第 47 题 banking 全局可变同构)。
2. value 安全的三选:值不可变化(record/不可变 bean——"修改"=替换整个 value,CHM 原子替换)、值自身线程安全(内部锁/CAS)、访问值时外部同步(按值加锁——锁逸散,慎用)。
3. 复合陷阱:CHM 的 compute(key, (k, v) -> v.update()) 原子执行"读改写 value"——但 update 内部若再修改其他共享状态,原子性只覆盖 map 这一层——compute 的原子=对 map 的原子,不是对世界的原子。

## 参考分析

### 机制:容器原子与元素共享

容器的保护面:结构操作(插/删/换 value 引用)原子——两线程 put 同 key:后者覆盖(引用替换,原子);get 拿到的是某一刻的引用(不会半对象)。元素的保护面:引用指向的对象内部状态——多线程持有同一 UserSession 引用,各自 set status——竞态(容器无法感知)。record 不可变值:修改=compute 替换新 record(旧引用仍读到旧状态——不可变的天然一致性)——"替换优于修改"是并发值对象的核心纪律。

### 反例:值不安全的两种事故

事故一,会话字段竞态:CHM 的 UserSession.lastAccessTime 双线程 set——更新丢失(审计/超时判定失准)。事故二,值内集合泄漏:UserSession 内含 ArrayList 属性——外部 session.getItems() 拿到引用直接 add(绕过容器与值的全部设计,第 43 题返回内部集合同题)。修复:值不可变化(record + with 方法生成新实例)+防御性返回。

### 取舍:可变值与不可变值的取舍

不可变值(record):并发安全免费/修改=替换(原子)/GC 压力(频繁修改多对象)——读写比适中的会话/配置。可变值+同步:修改原对象(无新分配)/并发正确性靠值内锁或外部锁(锁粒度设计难)——高频修改大对象。判据:值的修改频率与大小——小值高频改用不可变替换(分配便宜),大值低频改可变+同步(拷贝贵)。compute 的正确用法:值不可变时 compute((k,v) -> v.withStatus(新态))——原子替换。

## 案例

### 验证:值安全的断言组

验证:竞态复现断言(可变 value 双线程 set 字段,断言更新丢失——可变值的坑实证);不可变断言(record value 的 compute 替换,断言各线程读到完整状态无撕裂);防御返回断言(getItems() 返回拷贝,外部 add 不影响内部)——三组固化"容器安全≠值安全"。

### 追问链:值安全三刀

一刀:"深层可变?"——value 含 List 字段(record 的 List 字段是引用)——List 也要不可变(List.copyOf)——不可变要递归到底(第 13 题 unmodifiable 深浅同题)。二刀:"compute 的原子边界?"——compute 函数在桶锁内执行(对 map 的读改写原子)——函数内访问其他共享状态(另一 map/静态字段)不在原子内——原子的范围=锁的范围。三刀:"value 的生命周期?"——过期 value 的清理(第 47 题 banking 缓存归属):容器不管 value 内部的时效——value 持有的资源(连接/锁)要自清理(值对象的资源纪律)。

## 总结点

1. 容器保护结构,元素自己负责
2. 不可变值替换,优于可变值修改
3. compute 原子只到 map 层
