<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.6)
- [Java 17 规范与 API · 2](https://docs.oracle.com/javase/tutorial/java/generics/erasure.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 教学示例：外部接口返回一组对象，业务希望把它当作 List<String> 使用。需要区分编译期约束、对象运行期类型和反射可读到的声明信息，避免把强制转换当成元素验证。

1. 泛型参数通常被擦除为上界或 Object，List<String> 和 List<Integer> 的实例不因此具有不同的运行期 Class；普通 instanceof 不能验证完整元素参数。
2. List<?> 可以做实例类型检查，但不能据此证明每个元素都是 String。原始类型和未检查转换会把错误推迟到读取元素时。
3. 反射可能读到字段或父类声明中的泛型信息，这与对象携带全部实参不是一回事。反序列化边界需要明确目标类型并验证实际元素。

## 参考分析

### 擦除后保留什么：类身份与编译器插入的转换

编译器在类型检查之后进行擦除，必要时在使用点插入类型转换；类型变量的擦除与其上界有关，不总是 Object。两个相同实现类的列表，不会因为元素类型不同而产生两个 Class。因此通过 getClass 比较实例不能验证元素约束，未检查转换也不会逐项遍历容器。类比快递面单只写一箱书而不写书目：运行期只知道是个箱子（List），箱里每件是什么要看发货清单（编译期检查）。

### 可具体化类型：检查容器不等于检查参数

List<?> 的元素类型未知，它可以用于 instanceof 的运行期容器检查；List<String> 一般不能用于该检查，new T() 和直接创建非可具体化元素类型的泛型数组也受到限制。通配符的读写能力是编译期规则，与运行期能否识别完整实参是两个问题，不应拿 PECS 的复制案例代替本题。

### 反射边界：声明信息与真实数据分别验证

字段若声明为 List<String>，反射可能取得该声明的 ParameterizedType；对象被以原始类型污染后，该声明不会自动改变，也不能保证数据合规。框架的类型令牌帮助描述反序列化目标，但外部不可信数据的大小、空值及元素约束仍需校验。错误应在边界报告，而不是等到后面的业务读取才暴露。

## 案例

### 可执行对照：错误为什么到读取时才出现

以下 Java 17 完整程序比较相同实现类，再通过原始类型污染列表。预期先输出 true，随后在取出第二个元素并赋给 String 时捕获 ClassCastException；这说明编译期声明没有变成逐元素运行期验证。编译时的 unchecked 警告应保留并修复，不应作为消除错误的方法。
```java
import java.util.ArrayList;
import java.util.List;
public class GenericErasureReview {
  public static void main(String[] args) {
    List<String> words = new ArrayList<>();
    List<Integer> numbers = new ArrayList<>();
    System.out.println(words.getClass() == numbers.getClass());
    words.add("ok");
    List raw = words;
    raw.add(42);
    try {
      String value = words.get(1);
      System.out.println(value);
    } catch (ClassCastException expected) {
      System.out.println("element cast failed");
    }
  }
}
```

### 边界追问：如何接收外部列表

把入口参数视为未知数据，先验证是所需容器，再逐项检查元素类型、空值及数量约束，构造新的受控列表后交给领域逻辑。教学测试分别输入字符串列表、混入数字的列表、空列表和非列表。预期合法数据成功，混合元素在入口给出明确错误；不能只做一次 List<String> 强制转换就声明验证完成。

## 总结点

1. 面单只写一箱书，书目看清单
2. 擦除不产生每种实参的独立 Class
3. 检查容器不能证明元素类型
4. 声明类型信息不能替代数据校验
