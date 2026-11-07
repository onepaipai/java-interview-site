<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ref/Cleaner.html.html)
- [OpenJDK 设计说明 · 2](https://openjdk.org/jeps/421)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学场景：评审一个资源类的设计，作者主张"有 Cleaner 兜底就不需要 close"。从确定性、职责与失败模式三方面论证 close 的不可替代性，并给出 Cleaner 的正确用法。

1. 不能替代。close 是确定性释放：调用即释放，失败可见（异常）；Cleaner 依赖 GC 时机，"何时清理"不可承诺。
2. 职责不同：close 是使用方必须履行的契约；Cleaner 是"使用方忘记 close"时的保险丝，二者是主备关系不是二选一。
3. Cleaner 的失败模式更隐蔽：回调不执行只有资源泄漏没有报错，且回调若捕获宿主引用将永远不触发，评审时最容易漏。

## 参考分析

### 机制：确定性与兜底的分工

try-with-resources 在编译期生成确定性关闭路径，异常也覆盖；Cleaner 在对象虚可达后由引用线程调度，时机介于"下一个 GC"到"永远"之间。类比安全带与气囊：安全带（close）每次上车都要系，气囊（Cleaner）只在事故且触发条件满足时弹出——有气囊不系安全带就是拿确定性赌运气。

### 反例：捕获 this 导致永不清理

Cleaner 注册时写 `this::cleanup`，方法引用隐式持有宿主对象，宿主永远虚不可达，回调永不执行，资源泄漏得无声无息。正确写法是把需要的状态复制进独立的清理对象（静态嵌套类或不捕获 lambda）。这类错误在评审里比"忘写 close"更难发现。

### 取舍：什么时候值得写 Cleaner

资源昂贵且调用方不可控（公共库）、或资源嵌在第三方对象里无法 close 时，Cleaner 兜底收益高；内部工具类、调用路径可控的资源，显式 close 就够，加了反而多一层心智负担。DirectByteBuffer 是标准范例：allocateDirect 依赖使用方管理，Cleaner 只回收堆外内存兜底（见第 33 题）。

## 案例

### 对照操作：忘 close 时的两种表现

教学验证：资源类 A 仅 Cleaner 兜底、B 用 try-with-resources，各循环打开 10 万次不显式关闭 A。预期：B 句柄峰值稳定；A 堆内积压待清理对象，句柄占用波动攀升。再修复 A 的调用方加 close，积压消失。实验可复跑，量化"兜底不等于保障"。

### 追问：Cleaner 回调里能做什么

只做与宿主无关的本地释放（关句柄、还堆外内存、删临时文件）。不能抛异常给使用方（没人接）、不能拿锁、不能引用宿主。把回调当"最小善后"而不是"业务收尾"，是 Cleaner 评审的核心检查点；业务收尾永远属于显式关闭路径。

## 总结点

1. close 是契约，Cleaner 是气囊
2. 回调别碰 this，否则永不清理
3. 库要兜底，调用方要负责
