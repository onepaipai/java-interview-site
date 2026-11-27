<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/reflect/Type.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银接口沙盘:List<String> 与 List<Integer> 运行期是同一个 Class(擦除)——instanceof List<String> 编译不过、反射可塞 Integer 进 List<String>。用擦除实验说明泛型的编译期本质与运行期的护栏(J2 实验:同一 Class/ClassCastException)。

1. 擦除的本质:泛型信息只在编译期(类型检查+自动插桥),运行期 List<String> 就是 List——Class 对象唯一(本机实验:两个泛型列表 getClass 相同=true)。
2. 运行期的三个限制:instanceof 泛型不可(List<String> instanceof 编译错)、运行期创建泛型数组不可(new T[] 报错)、反射可绕过泛型(塞 Integer 进 List<String>——J2 实验成功,取值时 ClassCastException)。
3. 护栏正解:运行期需要类型信息的场景用显式 Class 参数( TypeToken 模式/Gson 的 TypeToken)、边界校验(外部输入入集合前校验,第 25 题)、Collections.checkedList(运行期强制类型检查的调试工具)。

## 参考分析

### 第二步扩展① 机制:擦除的编译期与运行期

- 编译期:泛型做类型检查(类型不匹配编译错)+自动桥方法(泛型类实现 Comparable<T> 的桥)+类型推断(diamond)。
- 运行期:擦除为上限(raw List/Object)——桥方法保留(运行期分派用。
- J2b 实测:javap -v 显示 compareTo(BridgeExp) 与 compareTo(Object) 两个方法,后者 flags 含 ACC_BRIDGE+ACC_SYNTHETIC,方法体强转后转发强类型版本)。
- get 后的强转(checkcast)由编译器插入——擦除后塞入错误类型,取值时才 ClassCastException(J2 实验:反射塞 42 成功,取值 cast 失败)。

### 第二步扩展② 反例:擦除误判的两种事故

- 事故一,instanceof 泛型:if (obj instanceof List<String>) 编译不过——运行期类型检查只能 instanceof List(裸)+元素逐个判——设计上避免(方法不该依赖泛型运行期类型)。
- 事故二,反射绕过后的延迟爆炸:反射塞 Integer 进 List<String>——编译期无告警,取值时 ClassCastException(爆炸点远离塞入点)——边界校验(外部数据入集合前逐个校验,第 25 题)。

### 第二步扩展③ 取舍:泛型信息的保留手段

- 手段一,显式 Class 参数:方法签名带 Class<T>(运行期可用 T 的信息——反序列化的目标类型)。
- 手段二,超类型令牌(Gson TypeToken/TypeReference:new TypeReference<List<String>>(){} 的匿名子类保留泛型签名——getGenericSuperclass 反射读取)——框架(反序列化)的标准形态。
- 手段三,checkedList:Collections.checkedList(list, String.class)——运行期插入校验(违规即时抛 ClassCastException,爆炸点前移到塞入处——J2 实验的修复形态)。

## 案例

### 第三步发散·验证与推演 验证:擦除限制的断言组

- 验证:Class 同一断言(两泛型列表 getClass 相同——J2 实测)。
- 反射绕过断言(塞 Integer 成功+取值 ClassCastException——护栏缺失的形态)。
- checkedList 断言(checkedList 下塞入即抛——爆炸点前移)——三组固化擦除语义。
- checkedList 的用法进"运行期类型护栏"指南。

### 第三步发散·追问扩展 追问链:泛型三刀

- **Q1：泛型的桥方法?**
  - 答：泛型类实现 Comparable<T> 编译器自动生成桥方法 compareTo(Object)(J2b javap -v 实测:flags 含 ACC_BRIDGE+ACC_SYNTHETIC),方法体把 Object 强转后转发强类型版本——擦除后 Object 签名的调用得以正确分派到泛型实现;桥方法是"重载变重写"混乱的根源之一。
- **Q2：泛型与重载?**
  - 答：两个方法仅泛型参数不同(erase 后同签名)——编译错("clashes with erasure")——重载设计要避开擦除冲突。
- **Q3：泛型数组?**
  - 答：new T[] 与 new List<String>[] 不可(协变写入的类型安全)——用 ArrayList<T> 或 @SuppressWarnings 显式。

## 总结点

1. 泛型是编译期护栏,运行期全擦除
2. 爆炸点前移:边界校验加 checkedList
3. 运行期类型信息用 Class 参数
