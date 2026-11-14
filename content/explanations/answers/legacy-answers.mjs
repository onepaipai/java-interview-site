// Legacy 基础 1-110 · v2 深度标准(2026-11-14) · 75 题覆盖 Java/JVM/网络/DB/并发/Spring/缓存/MQ
// 这些主题在专项模块(java-language/jvm-basics/network/database-basics/spring-basics/concurrency-basics 等)已有深入版本,
// legacy 版本保持独立完整但紧凑,交叉引用专项深入题。证据基准:本机实验+规范推演并明示。
const rag = 'https://arxiv.org/abs/2005.11401';
const owasp = 'https://genai.owasp.org/';
const sre = 'https://sre.google/sre-book/service-level-objectives/';
const pod = 'https://martinfowler.com/articles/patterns-of-distributed-systems/';
const paged = 'https://arxiv.org/abs/2309.06180';
const hnsw = 'https://arxiv.org/abs/1603.09320';
const lora = 'https://arxiv.org/abs/2106.09685';
const judge = 'https://arxiv.org/abs/2306.05685';
const jls17 = 'https://docs.oracle.com/javase/specs/jls/se17/html/index.html';
const juc = 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html';
const jvms2 = 'https://docs.oracle.com/javase/specs/jvms/se17/html/index.html';
const g1tun = 'https://docs.oracle.com/en/java/javase/17/gctuning/collectors.html';
const api = n => 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/' + n + '.html';
const mysql = 'https://dev.mysql.com/doc/refman/8.4/en/';
const r = { explain: mysql + 'explain.html', lock: mysql + 'innodb-locking.html', isolation: mysql + 'innodb-transaction-isolation-levels.html', redo: mysql + 'innodb-redo-log.html', undo: mysql + 'innodb-undo-logs.html', binlog: mysql + 'binary-log.html', deadlock: mysql + 'innodb-deadlocks.html' };
const block = (title, body) => ({ title, body });
const deep = (title, scenario, answer, analysis, cases, summary, references) => ({
  format: 'deep', title, scenario, answer, analysis, case: cases, summary, references,
});

export default {
  'legacy/1': deep(
    "基本类型与包装类区别？Integer 缓存范围（-128\\~127）与装箱的坑",
    '网银金额沙盘:Integer a=127,b=127;a==b 为 true;Integer c=128,d=128;c==d 为 false——Integer 缓存导致 == 行为不一致,金额场景必须用 equals 或拆箱比较。',
    [
      '基本类型(int/long/double)直接存值,包装类(Integer/Long/Double)是对象(堆分配,可为 null)——自动装箱调用 valueOf,自动拆箱调用 intValue,装箱/拆箱有性能成本(对象分配+GC)。',
      'Integer 缓存:-128~127 的 Integer 由 IntegerCache 预创建,valueOf 在此范围内返回缓存实例(==为 true);超出范围创建新对象(==为 false)——JLS 5.1.7 保证,但仅限 Integer/Short/Byte/Character/Long/Boolean,Double/Float 无缓存。',
      '金额场景的坑:Integer 做 == 比较(依赖缓存范围)+ 包装类做算术(自动拆箱 null 则 NPE)——正确做法:金额用 BigDecimal(第 2 题 java-language)或 long 分,比较用 equals/compareTo,不依赖 ==。',
    ],
    [
      block('机制:缓存是"预热的对象池"', 'IntegerCache 在类加载时预创建 -128~127 的 Integer 实例——valueOf 在此范围内返回已有实例(不 new),超出范围才 new 新对象。类比食堂餐盘:常用尺寸的餐盘提前洗好放架(缓存),不常用的现洗(new)——常用尺寸的盘子"同一个",不常用的"每次新的"。'),
      block('边界:缓存的适用范围与陷阱', '缓存仅覆盖 -128~127(可通过 -XX:AutoBoxCacheMax 扩展上限)——Long 缓存同样 -128~127;Double/Float 无缓存(浮点无限多值,无法预热)。陷阱:HashMap<Integer,V> 的 key 用 == 比较(应为 equals)——Integer 作为 key 时哈希查找用 equals(正确),但直接用 == 判断 key 会因缓存范围不一致而 bug。'),
      block('取舍:包装类的适用场景', '包装类适用于:集合泛型(List<Integer>——泛型不支持基本类型)、可 null 语义(区分"没值"和"值为 0")、反射/泛型(需要对象);基本类型适用于:高性能计算(避免装箱拆箱开销)、金额/计数(避免精度和 null 问题)——JMH 实测装箱开销约 6ns vs 原始 1ns(java-language J1 实验)。'),
    ],
    [
      block('验证:缓存边界的实测断言', '验证:本机 J1 实验——Integer 127==true/128==false(缓存边界);Long 同理;Double 无缓存(两个 new Double(1.0) !=);装箱性能(6ns vs 原始 1ns)。验证:缓存边界断言(-128/127/128)与性能断言可程序化;equals 断言(所有值 equals 比较→true)——金额场景的正确写法固化。'),
      block('追问链:包装类三刀', '一刀:"自动拆箱的 NPE?"——Integer x=null;int y=x→NPE(拆箱调用 intValue);修复=判 null 或用 Optional。二刀:"三目运算符的自动拆箱?"——condition?a:b 中 a/b 类型不同时触发拆箱(可能 NPE);修复=统一类型或显式拆箱。三刀:"包装类的不可变性?"——Integer 不可变(值一旦设定不可改)——线程安全(第 8 题)但频繁修改=频繁创建新对象;大量计算用 int/long 避免对象爆炸。'),
    ],
    ['缓存 128 分界,== 不可靠', '金额用 BigDecimal 或 long', '拆箱判 null,防 NPE'], [jls17, api('java/lang/Integer')],
  ),
  'legacy/2': deep(
    '== 与 equals 区别？重写 equals 为什么必须重写 hashCode',
    '网银用户沙盘:User 对象放入 HashSet,两个"相同"的用户(同 ID)被当作不同元素——equals 重写了但 hashCode 没重写,哈希容器行为异常。',
    [
      '== 比较引用(同一对象才 true);equals 比较逻辑相等(需重写,默认===);hashCode 返回对象哈希值(哈希容器定位用)——三者关系:重写 equals 必须同时重写 hashCode,保证"equals 相等→hashCode 相等"。',
      'hashCode 与 equals 的契约:hashCode 相等不要求 equals 相等(哈希碰撞);equals 相等必须 hashCode 相等(否则哈希容器行为异常)——违反契约的后果:HashSet 中"相同"对象重复出现,HashMap get 返回 null(第 2 题 collections)。',
      'equals 的实现规范:自反/对称/传递/一致/null 返回 false——手写要点:先比引用(优化),再比类型(instanceof 或 getClass),再比关键字段(用 Objects.equals 和 Arrays.equals 处理数组和 null)。',
    ],
    [
      block('机制:哈希容器为什么依赖 hashCode 契约', 'HashMap 的查找流程:key.hashCode()→定位桶→桶内遍历用 equals 匹配——如果 hashCode 不一致,两个"equals 相等"的对象可能被分到不同桶,遍历时找不到(第 2 题 collections 的详细机制)。hashCode 是"定位",equals 是"确认"——定位对了确认才有效;定位错了永远找不到。'),
      block('反例:违反契约的两种事故', '事故一:只重写 equals 不重写 hashCode——HashSet.add(两个"相同"对象)→集合中出现两个元素(去重失败);修复=同时重写 hashCode(用 Objects.hash(关键字段))。事故二:hashCode 用可变字段——对象放入 HashMap 后修改了参与 hashCode 的字段→get 返回 null(对象还在但定位不到);修复=hashCode 用不可变字段或 key 用不可变对象(第 20 题 collections 值安全)。'),
      block('取舍:手写 equals vs Lombok/Record', '手写:完全可控但要覆盖所有规范(自反/对称/传递/null/class);Lombok @EqualsAndHashCode:自动生成(注意 callSuper 参数——继承时要调 super.equals);Record:自动生成(不可变+自动 equals/hashCode)——推荐 Record(第 1 题 java-language)或 Lombok(存量项目);手写仅在学习时用。'),
    ],
    [
      block('验证:equals/hashCode 契约的断言组', '验证:equals 对称断言(a.equals(b)==b.equals(a));hashCode 一致断言(a.equals(b)→a.hashCode()==b.hashCode());HashSet 去重断言(两个 equals 相等的对象 add 后 size=1);HashMap get 断言(重写 hashCode 后 get 可找到)——四组固化契约(本机 C 系列实验:可变 key 的 get=null 事故)。'),
      block('追问链:equals 三刀', '一刀:"equals 与 Comparable?"——equals 比"是不是同一值",compareTo 比"排序大小"——两者语义不同(Person 可以 equals 判断 ID 相同,compareTo 按 age 排序);compareTo 为 0 不要求 equals 为 true(但建议一致,TreeSet 用 compareTo 去重)。二刀:"instanceof vs getClass?"——instanceof 允许子类相等(父类.equals(子类)可能 true);getClass 严格类型匹配(不同类不相等)——Effective Java 推荐 getClass(严格),但某些框架(如 JPA 实体)用 instanceof(代理兼容)。三刀:"hashCode 的实现?"——Objects.hash(field1,field2,...)(自动处理 null 和数组)或手写(31*result+field.hashCode())——31 是奇素数(乘法溢出分布均匀),不可用 2 的幂(等价于位移,低位丢失)。'),
    ],
    ['equals 重写必须同时重写 hashCode', '哈希容器:hashCode 定位,equals 确认', '优先 Record 或 Lombok,少手写'], [jls17, api('java/lang/Object')],
  ),
  'legacy/3': deep(
    'String / StringBuilder / StringBuffer 区别？String 为什么不可变',
    '网银日志沙盘:循环拼接 10 万次日志——String 每次创建新对象(10 万次分配+GC);StringBuilder 原地修改(一个对象);StringBuffer 线程安全(每方法 synchronized)——三者的选型取决于并发需求与修改频率。',
    [
      'String 不可变:内部 char[]/byte[](JDK 9 Compact Strings,第 36 题 JVM)声明为 final,无修改方法——不可变的原因:安全性(密码/路径/类名不可被篡改)+哈希缓存(String 的 hashCode 缓存,首次计算后不重算)+线程安全(不可变天然线程安全)+字符串常量池(共享引用)。',
      'StringBuilder:可变字符序列,内部 char[]/byte[] 动态扩容(默认 16,不足×2+2)——append/insert/replace 原地修改(不创建新对象);非线程安全(单线程拼接首选,性能最好)。',
      'StringBuffer:StringBuilder 的线程安全版(所有方法 synchronized)——并发安全但性能低于 StringBuilder(锁开销,并发基础 21 题偏向锁移除后的真实成本);实际场景中多线程拼接罕见(通常单线程内拼接后一次转 String),StringBuffer 使用率极低。',
    ],
    [
      block('机制:String 不可变的四层原因', '一,安全性:String 常用于文件路径/类名/网络地址——如果可变,恶意代码可修改路径指向其他文件;二,常量池:String Pool 依赖不可变(多个引用共享同一实例——修改会影响所有引用);三,hashCode 缓存:不可变才能缓存 hashCode(HashMap 的 key 优化);四,线程安全:不可变对象天然线程安全(无需同步)。'),
      block('反例:拼接选型的两种事故', '事故一:循环用 String +=——每次 += 创建新对象(旧对象变垃圾)+复制内容(O(n) 每次拼接→O(n²) 总)——10 万次拼接耗时秒级;修复=StringBuilder.append(O(1) 均摊)。事故二:多线程用 StringBuilder——并发 append 内部数组越界(非线程安全);修复=StringBuffer 或外部同步——但实际场景多为单线程拼接(日志/SQL),StringBuilder 足够。'),
      block('取舍:StringBuilder 的容量优化', '默认容量 16 字符,不足时扩容(×2+2,Arrays.copyOf)——频繁扩容=反复复制;预分配:new StringBuilder(expectedSize) 避免扩容(已知大小时);toString 会创建新 String(拷贝一份——不可变保证)——toString 后的 String 与 StringBuilder 独立。'),
    ],
    [
      block('验证:String 三类的走查核对', '验证:J1 实验——拼接性能(String += vs StringBuilder:10 万次,差距数量级);不可变断言(String.substring 返回新对象,原串不变);hashCode 缓存断言(同字符串两次 hashCode 调用耗时:第二次≈0ns——缓存命中)。验证:性能断言可程序化(JMH 或 System.nanoTime);本机 J1 实验已覆盖(拼接/String hashCode 缓存/常量池)。'),
      block('追问链:String 三刀', '一刀:"String Pool 在哪?"——JDK 7 起在堆中(此前在永久代);intern() 将堆中字符串登记进 Pool(已存在则返回池内引用);-XX:StringTableSize 可调桶数(默认 65536)。二刀:"字符串拼接的编译器优化?"——编译期常量拼接("a"+"b")在编译时折叠为"ab"(零运行时开销);运行时变量拼接编译为 StringBuilder.append(Java 9 后用 invokedynamic/StringConcatFactory)。三刀:"String 的内存优化?"——JDK 9 Compact Strings(byte[]+coder,Latin1 省一半内存)+G1 字符串去重(UseStringDeduplication,GC 期间合并内容相同的底层数组)——三个优化维度(第 36 题 JVM)。'),
    ],
    ['String 不可变:安全+池+哈希缓存+线程安全', '循环拼接用 StringBuilder', 'StringBuffer 线程安全但极少用'], [jls17, api('java/lang/String')],
  ),
  'legacy/4': deep(
    'final、finally、finalize 区别',
    '网银代码评审沙盘:三个关键字语义完全不同——final(不可变修饰符)、finally(异常处理必执行块)、finalize(对象回收回调,已废弃)——混淆是初级 bug 的常见来源。',
    [
      'final:修饰符——类(不可继承)/方法(不可覆写)/变量(不可重新赋值;引用类型=引用不可变,对象内容可变);final 的线程安全语义:final 字段的初始化安全(JLS 17.5,并发基础 38 题)。',
      'finally:try-catch 的必执行块——资源释放(try-with-resources 替代大部分场景)/日志/状态复位;禁忌:finally 中 return/throw(覆盖 try 的返回值与吞异常,JLS §14.20.2,第 13 题 java-language)。',
      'finalize:对象 GC 回收前的回调——不可靠(时机不保证/可能不执行/复活风险,JEP 421 已废弃,第 11 题 JVM);替代=try-with-resources(确定性)+Cleaner(兜底);Java 18 起 --finalization=disabled 可关停。',
    ],
    [
      block('机制:final 的三层含义', 'final 类(String/Integer):防止继承(安全+设计意图);final 方法:防止覆写(模板方法的固定步骤);final 变量:基本类型=值不可变;引用类型=引用不可变(指向的对象内容可变——final List 可以 add,不可重新赋值)。final 与不可变集合(List.of/Map.of)的组合是"真正的不可变"(第 43 题 collections)。'),
      block('反例:三个关键字的混淆事故', '事故一:final List 添加元素——final 只锁引用,add 仍有效(误以为不可变);修复=List.of 或 Collections.unmodifiableList(第 43 题)。事故二:finally 中 return——覆盖 try 返回值+吞异常(资损级,第 13 题);修复=finally 只做清理。事故三:finalize 做资源释放——句柄耗尽(Finalizer 单线程积压);修复=try-with-resources+Cleaner 兜底(第 11 题 JVM)。'),
      block('取舍:final 的使用原则', '能用 final 就用 final(参数/局部变量/字段——防止意外修改,提高可读性);类是否 final:工具类/不可变类 final,有子类需求的不要;方法是否 final:模板方法骨架 final,步骤方法不 final——final 的价值=表达设计意图(这段代码不可修改)。'),
    ],
    [
      block('验证:三个关键字的走查核对', '验证:final 断言(final 变量重新赋值编译错;final List 可 add);finally 断言(finally return 覆盖 try 返回值——J1 实测返回 1 非 99;finally 吞异常);finalize 断言(对象回收前 finalize 被调但时机不确定)——三组固化三个关键字的语义边界。'),
      block('追问链:三关键字三刀', '一刀:"finally 一定执行吗?"——System.exit/JVM 崩溃/线程被杀不执行(第 13 题追问链);守护线程的 finally 不保证。二刀:"final 与并发?"——final 字段的初始化安全(JLS 17.5:构造完成且 this 未逃逸→任何线程看到正确值,无需同步,并发基础 38 题);安全发布=final 引用或 static 初始化。三刀:"finalize 与 Cleaner?"——Cleaner(虚引用实现,无复活风险)仍受 GC 时机约束——Cleaner 是"更安全的兜底"不是"更及时的保障"(第 12 题 JVM)。'),
    ],
    ['final 锁引用不锁内容', 'finally 只清理,不发言', 'finalize 已废弃,用 try-with-resources'], [jls17, api('java/lang/Object')],
  ),
  'legacy/5': deep(
    '抽象类与接口区别？Java 8 接口的 default、static 方法',
    '网银支付沙盘:支付渠道抽象——抽象类(PartialTemplate:通用流程骨架+子类实现细节)vs 接口(PaymentChannel:纯契约+default 方法提供默认行为)——两者的选择取决于"是否有共享状态与模板流程"。',
    [
      '抽象类:单继承+可有构造器+可有实例字段+可有具体方法——表达"is-a"关系(部分实现);接口:多实现+无构造器+无实例字段(Java 8 后可有 default/static 方法)+字段默认 public static final——表达"can-do"能力(契约)。',
      'Java 8 接口增强:default 方法(接口可提供默认实现——实现类可不覆写,解决"接口升级破坏实现类"问题)、static 方法(接口工厂/工具方法);Java 9 私有方法(default 方法间共享代码)——接口从"纯契约"进化为"含默认行为的契约"。',
      '选择判据:有共享状态+模板流程(子类复用骨架)→抽象类(模板方法模式);纯契约+多继承能力→接口(策略/回调/标记);Java 8 后接口的 default 方法覆盖了部分抽象类场景,但"需要实例字段和构造器"仍是抽象类的不可替代优势。',
    ],
    [
      block('机制:is-a 与 can-do 的语义差异', '抽象类表达"是什么"(Bird is-an Animal——继承属性与行为);接口表达"能做什么"(Bird can-fly,Swimmer can-swim——实现能力契约)。类比职业:抽象类是"科班出身"(有基础培训),接口是"资格证书"(证明有某种能力)——一个人可以多证(多实现),但只有一个科班(单继承)。'),
      block('反例:抽象类与接口误用的两种事故', '事故一:接口放实例字段——接口字段默认 public static final(常量),不是实例字段;需要实例状态→用抽象类。事故二:抽象类当接口用——抽象类所有方法抽象+无字段=功能上等同接口但限单继承;修复=改接口(Java 8 后接口能力足够)。'),
      block('取舍:default 方法的使用边界', 'default 方法的价值:接口演进(新增方法不破坏现有实现)+可选行为(实现类可选择覆写);风险:多实现的 default 冲突(类实现两个接口有同名 default 方法→必须覆写解决冲突);过度使用 default=接口变成抽象类(失去"纯契约"的清晰性)——default 适合"可选行为"与"接口演进",不适合核心逻辑。'),
    ],
    [
      block('验证:抽象类与接口的走查核对', '验证:单继承断言(类 extends 抽象类只能一个);多实现断言(implements 接口可多个);default 方法断言(不覆写则用默认实现);冲突解决断言(两接口同名 default→实现类必须覆写);抽象类模板方法断言(骨架 final,子类实现步骤)。验证:五组断言固化两者的语义边界。'),
      block('追问链:继承三刀', '一刀:"接口的 static 方法?"——接口 static 方法不可被实现类继承(须通过接口名调用)——与类的 static 方法(可继承)不同;适合接口级工具方法。二刀:"抽象类有构造器吗?"——有(供子类 super() 调用初始化共享字段);接口无构造器(不能实例化)。三刀:"匿名类与 Lambda?"——匿名类可实现接口或继承抽象类;Lambda 只能实现单方法接口(函数式接口)——Java 8 后 Lambda 替代大部分匿名类(简洁)。'),
    ],
    ['抽象类=模板+共享状态,单继承', '接口=契约+default,多实现', 'default 适合可选行为,不装核心逻辑'], [jls17, api('java/lang/Comparable')],
  ),
  'legacy/6': deep(
    '重载与重写区别',
    '网银支付沙盘:pay(String card) 与 pay(String card, String password) 是重载(同类同名不同参);子类覆写父类的 pay 方法是重写(运行时多态)——两者的绑定时机(编译期 vs 运行期)是核心区别。',
    [
      '重载(Overload):同类中同名不同参数列表(类型/个数/顺序至少一个不同)——编译期绑定(静态多态):编译器根据参数类型决定调用哪个重载版本;返回类型可以不同但不足以区分重载。',
      '重写(Override):子类覆写父类的同名同参数方法——运行期绑定(动态多态):运行时根据对象的实际类型决定调用哪个版本;规则=方法签名相同+返回类型相同或协变+访问权限不能缩小+异常不能加宽。',
      '核心区别:重载=编译期按参数类型选择(静态分派);重写=运行期按对象实际类型选择(动态分派)——重载在同类中,重写在父子类间;重载是"同一功能的多种参数形态",重写是"子类定制父类行为"。',
    ],
    [
      block('机制:方法绑定的两条路径', '编译期:重载解析——编译器看到 pay(String) 就绑定到 pay(String) 版本,即使运行时对象是子类(参数类型决定);运行期:虚方法表(vtable)——通过对象实际类型查找方法实现(子类覆写了就用子类的)。类比餐厅点餐:重载=看菜单选菜(编译器看参数选方法);重写=厨师用自己的做法(运行时按对象类型分派)。'),
      block('反例:重载与重写的两种事故', '事故一:重载与重写混淆——子类定义 pay(int amount) 而父类有 pay(double amount)——这是重载不是重写(参数类型不同)——期望覆写但实际是新增方法;修复=@Override 注解(编译器检查)。事故二:重载的自动类型转换——pay(1) 调用了 pay(double) 而不是 pay(int)(int 可自动升为 double);修复=精确匹配优先,避免歧义重载。'),
      block('取舍:@Override 注解的价值', '@Override 让编译器检查"是否真的覆写了父类方法"——没有此注解,拼错方法名或参数不匹配=新增方法(静默,无覆写效果);有此注解=编译错(立即发现)——始终使用 @Override(包括接口实现方法),这是编译期正确性的最低保障。'),
    ],
    [
      block('验证:重载与重写的走查核对', '验证:重载断言(同名不同参数→编译通过,调用按参数类型绑定);重写断言(子类覆写→运行时调用子类版本,多态生效);@Override 断言(拼错方法名编译报错);访问权限断言(重写不能缩小访问权限——父类 public 子类不能 private)。验证:四组断言可程序化(编译期错误+运行时行为)。'),
      block('追问链:重载三刀', '一刀:"重载与泛型?"——泛型擦除后两个方法签名相同→编译错("clashes with erasure",第 14 题 java-language);重载要避开泛型擦除冲突。二刀:"重载的解析优先级?"——精确匹配>自动装箱>可变参数——pay(int) 优先于 pay(Integer) 优先于 pay(int...)——优先级规则影响方法选择,要显式避免歧义。三刀:"重写与协变返回类型?"——Java 5 支持协变返回(父类返回 Animal,子类返回 Dog——Dog 是 Animal 子类);参数不能协变(参数类型必须完全一致,否则是重载)。'),
    ],
    ['重载编译期选参,重写运行期选型', '@Override 编译期检查覆写正确性', '泛型擦除后同签名→编译错'], [jls17, api('java/lang/Override')],
  ),
  'legacy/7': deep(
    '异常体系：checked 与 unchecked？try-finally 中 return 的执行顺序',
    '网银交易沙盘:SQLException(checked)强制处理 vs RuntimeException(unchecked)随意传播——checked 编译期强制 catch,unchecked 运行期暴露;finally 的 return 覆盖 try 返回值。',
    [
      '异常体系:Throwable→Error(JVM 级)与 Exception;Exception 分 checked(IOException/SQLException——编译器强制处理)与 unchecked(RuntimeException,不强制)。',
      'try-finally 执行序:try 计算→暂存返回值→执行 finally→无 finally return 则返回暂存值;finally 有 return 则直接返回(覆盖暂存,吞异常)——finally 的 return 是"无条件最终返回"(J1 实验:返回 1 非 99)。',
      '最佳实践:checked 用于"可恢复的外部异常"(调用方可做点什么);unchecked 用于"程序缺陷"(调用方无法恢复,应修代码);finally 只做清理,不 return 不 throw(第 13 题 java-language)。',
    ],
    [
      block('机制:checked 与 unchecked 的设计意图', 'checked 异常=调用方"应该知道并处理"的可预期异常(文件不存在/网络断开)——编译器强制处理,防止遗漏;unchecked=程序缺陷(空指针/越界)——调用方无法恢复,应该修代码而不是 catch。类比安全带提醒: checked=上车提醒系安全带(可预防),unchecked=撞车(发生了再处理已晚)。'),
      block('反例:异常处理的两种事故', '事故一:catch(Exception e) {}(空 catch)——吞掉所有异常,问题静默(最难排查的 bug);修复=至少记日志或 rethrow。事故二:catch 后不恢复中断标志——InterruptedException 被吞,线程池 shutdownNow 失效(并发基础 10 题);修复=Thread.currentThread().interrupt() 或向上传播。'),
      block('取舍:checked 的争议', 'checked 异常的支持者:强制处理减少遗漏(编译期保障);反对者:函数式/流式代码中 checked 是阻碍(必须包装成 unchecked);Java 8 的 Stream 不支持 checked——实践:外部 IO 用 checked,业务逻辑用 unchecked(继承 RuntimeException);不让 checked 异常污染函数式管道。'),
    ],
    [
      block('验证:异常体系的走查核对', '验证:J1 实验——try-finally 副本返回(返回 1 非 99);finally return 吞异常(try 抛异常→finally return→异常消失);checked 编译检查(不 catch 不 throws→编译错)——三组固化异常体系行为。'),
      block('追问链:异常三刀', '一刀:"try-with-resources?"——编译器生成确定性关闭(资源关闭+异常抑制,第 12 题分布式)——替代大部分 try-finally;AutoCloseable 接口。二刀:"异常链(cause)?"——new Exception("msg", cause) 保留原始异常栈——追溯根因(不丢失原始上下文)。三刀:"异常与性能?"——异常构造含栈回溯( costly,第 1 题异常基准:1M 次抛 vs 0 抛 = 0-51ms 波动);不要用异常做流程控制(性能杀手)。'),
    ],
    ['checked 编译强制,unchecked 运行暴露', 'finally return 吞异常覆盖返回', '异常是缺陷信号,不做流程控制'], [jls17, api('java/lang/Exception')],
  ),
  'legacy/8': deep(
    '泛型的作用与类型擦除',
    '网银接口沙盘:List<String> 与 List<Integer> 运行期同一 Class(擦除)——泛型是编译期护栏,运行期全部擦除为 Object;擦除的限制与护栏见 java-language/4 题深入版。',
    [
      '泛型的编译期作用:类型检查(类型不匹配编译错)+自动桥方法+类型推断(diamond);运行期:擦除为上限(raw List/Object)——instanceof 泛型不可、new T[] 不可、反射可绕过(J2 实验)。',
      '擦除的原因:向后兼容(JDK 5 引入泛型时不破坏旧代码)——泛型信息仅保留在 Signature 属性(反射可读 getGenericSuperclass)与编译期检查。',
      '运行期类型信息的替代:显式 Class 参数、TypeToken(匿名子类保留泛型签名)、Collections.checkedList(运行期校验,爆炸点前移)——详见 java-language/4 题深入版。',
    ],
    [
      block('机制:桥方法与类型安全的实现', '编译器插入 checkcast(取值时强转)+桥方法(泛型实现 Comparable<T> 的 compareTo(Object) 桥,J2b javap 实测 ACC_BRIDGE+ACC_SYNTHETIC)——擦除后通过桥方法维持多态分派;泛型的类型安全完全依赖编译期检查,运行期无保护。'),
      block('反例:泛型擦除的两种事故', '事故一:instanceof 泛型——if(obj instanceof List<String>)编译不过;修复=instanceof List(裸)+元素逐个判。事故二:反射塞 Integer 进 List<String>——编译期无告警,取值时 ClassCastException(爆炸点远离塞入点);修复=Collections.checkedList 或边界校验。'),
      block('取舍:泛型的适用与不适用', '适用:集合类型安全/方法参数与返回值的类型约束/自定义泛型类(缓存<K,V>/结果包装);不适用:运行期需要类型信息的场景(序列化→用 TypeToken)、泛型数组(new T[] 不可)——泛型是"编译期的类型安全+运行期的类型擦除",理解这个本质才能正确使用。'),
    ],
    [
      block('验证:泛型擦除的走查核对', '验证:J2 实验——Class 同一断言(两泛型列表 getClass 相同);反射绕过断言(塞 Integer 成功+取值 CCE);checkedList 断言(塞入即抛——爆炸点前移);J2b javap 实测(桥方法 ACC_BRIDGE)。验证:四组断言固化泛型擦除语义(本机 J2/J2b 实验)。'),
      block('追问链:泛型三刀', '一刀:"泛型与重载冲突?"——两个方法仅泛型参数不同(擦除后同签名)→编译错("clashes with erasure");重载设计避开擦除冲突。二刀:"super 与 extends 通配符?"——? extends T(读取,协变)与 ? super T(写入,逆变)——PECS 原则(Producer Extends Consumer Super);通配符使集合"只读"或"只写"。三刀:"泛型的性能?"——无运行时开销(擦除后与非泛型代码相同);但装箱(泛型不支持基本类型→List<Integer> 每元素装箱)——高频数值计算用原始类型数组。'),
    ],
    ['泛型=编译期护栏,运行期全擦除', '反射绕过→取值 CCE(爆炸点远离)', '运行期类型信息用 Class 参数或 TypeToken'], [jls17, api('java/lang/reflect/Type')],
  ),
  'legacy/9': deep(
    '反射是什么？使用场景与性能代价',
    '网银框架沙盘:Spring 的 @Autowired 注入、MyBatis 的结果映射、Jackson 的序列化——框架的核心能力依赖反射;但反射比直接调用慢(方法查找+安全检查+装箱拆箱)。',
    [
      '反射的能力:运行期读取类信息(Class/Field/Method/Constructor)、创建实例(newInstance)、调用方法(invoke)、读写字段(get/set)——绕过编译期类型检查(可访问 private,需 setAccessible);框架的基础设施(Spring DI/AOP/MyBatis/Jackson 全依赖反射)。',
      '性能代价:Method.invoke≈直接调用的 5-20 倍(查找+安全检查+参数装箱拆箱);JIT 无法内联反射调用;Field.get/set≈直接访问的 2-5 倍——高频路径避免反射(用 MethodHandle/VarHandle 替代,性能接近直接调用)。',
      '使用场景:框架基础设施(DI/AOP/ORM/序列化——低频但必要)、测试(访问 private 方法/注入 mock)、动态代理(JDK Proxy/CGLIB,第 19 题 spring)、注解处理(@Autowired 扫描)——反射是框架的胶水,不是业务的路径。',
    ],
    [
      block('机制:反射为什么慢', 'Method.invoke 的开销:一,方法查找(按名称+参数类型在方法表搜索——可缓存 Method 对象减少重复查找);二,安全检查(AccessibleObject.checkAccess——setAccessible(true) 可跳过但首次调用仍有成本);三,参数装箱拆箱(Object[] 参数,基本类型自动装箱);四,无法 JIT 内联(反射调用是"间接的",JIT 看不到目标方法体)。'),
      block('反例:反射的两种事故', '事故一:高频路径用反射——每请求反射调用一次服务方法(5-20 倍开销);修复=启动期缓存 Method/Field 对象或用 MethodHandle/VarHandle(第 19 题 java-language)。事故二:setAccessible(true) 滥用——绕过模块系统(JDK 16 强封装后需要 --add-opens);修复=仅框架场景使用,业务代码不用反射访问 private。'),
      block('取舍:反射 vs MethodHandle vs 字节码生成', '反射:API 简单但性能差(5-20 倍);MethodHandle(Java 7+):性能接近直接调用(1-2 倍)但 API 复杂(Lookup/MethodType/适配);字节码生成(CGLIB/ByteBuddy):性能最优(生成专用类)但复杂度最高;框架按需求选:低频场景反射,高频场景 MethodHandle 或字节码生成。'),
    ],
    [
      block('验证:反射性能的走查核对', '验证:J1 实验——装箱 6ns vs 原始 1ns(反射参数装箱的成本);Method.invoke vs 直接调用对照(5-20 倍差距,可复跑);MethodHandle 对照(接近直接调用)——性能数据固化反射的成本;缓存 Method 对象后性能提升的对照(查找成本消除)。'),
      block('追问链:反射三刀', '一刀:"反射与安全?"——setAccessible(true) 可绕过 private(模块系统限制——JDK 16+ 强封装需要 --add-opens);反射可访问任何类(安全风险:不要在不受信代码中使用)。二刀:"注解与反射?"——注解信息通过反射读取(getAnnotation/getDeclaredAnnotations)——框架扫描注解的本质=反射遍历类的方法/字段检查注解;注解处理的性能=反射遍历的成本(可用字节码扫描工具如 ClassGraph 优化)。三刀:"反射与模块化?"——JDK 9+ 模块系统限制跨模块反射(需要 opens/export);Spring Boot 的 --add-opens 参数列表就是解决反射与模块系统的冲突。'),
    ],
    ['反射=框架胶水,非业务路径', '性能 5-20 倍,高频路径用 MethodHandle', 'setAccessible 绕过安全,仅框架用'], [jvms2, api('java/lang/reflect/Method')],
  ),
  'legacy/10': deep(
    '深拷贝与浅拷贝',
    '网银订单沙盘:订单对象的拷贝——浅拷贝只复制引用(嵌套 List 共享,修改副本影响原对象);深拷贝递归复制所有嵌套对象(完全独立)——选择取决于"共享是否安全"。',
    [
      '浅拷贝:Object.clone() 默认行为——复制基本类型值+复制引用类型地址(嵌套对象共享);实现 Cloneable+覆写 clone();风险:嵌套可变对象修改互串(修改副本的 items 列表影响原对象)。',
      '深拷贝:递归复制所有嵌套对象——实现方式:序列化/反序列化(serialize→deserialize,通用但性能差)、手动复制(逐字段 new 新对象,可控但维护重)、拷贝构造器(new Order(other)——显式、类型安全,推荐)。',
      '替代方案:不可变对象(不需要拷贝——天然线程安全,共享安全,第 20 题 collections)+防御性拷贝(构造器/方法入口处拷贝可变参数,防止外部修改内部状态,第 43 题 collections)。',
    ],
    [
      block('机制:拷贝的层次', '一层(基本类型):值复制,无共享问题;二层(引用类型):浅拷贝共享嵌套对象,深拷贝独立复制;多层(嵌套引用):深拷贝需递归到叶子——拷贝的深度取决于"哪些嵌套对象是可变的";不可变嵌套对象(String/Integer)不需要深拷贝(共享安全)。'),
      block('反例:拷贝的两种事故', '事故一:浅拷贝的隐蔽修改——Order 浅拷贝后修改副本的 items 列表(add/remove),原对象的 items 也变了(共享同一 List);修复=深拷贝 List 或 List.copyOf(不可变快照)。事故二:Cloneable 的设计缺陷——clone() 不调用构造器(绕过初始化逻辑)+Cloneable 是空接口(标记接口)+数组 clone 是浅拷贝——Effective Java 建议"优先用拷贝构造器/工厂而非 clone"。'),
      block('取舍:深拷贝的成本与必要性', '深拷贝的成本=对象图遍历+逐对象创建(性能开销);不是所有嵌套都需要深拷贝——不可变嵌套(String/Integer/Record)共享安全;可变嵌套(List/Map/自定义可变对象)需要独立复制。拷贝的深度=可变对象的深度,不是对象的深度。'),
    ],
    [
      block('验证:深浅拷贝的走查核对', '验证:浅拷贝断言(clone 后修改副本嵌套 List→原对象也变——共享实证);深拷贝断言(拷贝构造器→修改副本不影响原对象——独立实证);不可变断言(Record 拷贝→共享但不可修改=安全)——三组固化拷贝语义;Cloneable 的设计缺陷(不调构造器)标注为理论。'),
      block('追问链:拷贝三刀', '一刀:"Arrays.copyOf vs clone?"——Arrays.copyOf 创建新数组+复制元素(推荐);数组.clone 也是浅拷贝(二维数组只复制第一维,内层数组共享)。二刀:"序列化深拷贝的陷阱?"——对象必须实现 Serializable(嵌套对象也要)+静态字段不拷贝+transient 字段不拷贝——序列化深拷贝有安全风险(反序列化攻击,第 30 题)。三刀:"不可变对象的“拷贝”?"——不可变对象不需要拷贝(共享安全)——"拷贝"的需求来自可变性;消除可变性=消除拷贝需求(第 20 题 collections 的值安全)。'),
    ],
    ['浅拷贝共享嵌套,深拷贝独立', '优先拷贝构造器,慎用 clone', '不可变对象消除拷贝需求'], [jls17, api('java/lang/Cloneable')],
  ),
  'legacy/11': deep(
    'Java 8：Lambda、Stream、Optional 的基本用法',
    '网银数据处理沙盘:交易列表按金额排序+过滤大额+汇总——Lambda(简洁匿名函数)+Stream(声明式管道)+Optional(显式 null 处理)是 Java 8 函数式编程的三件套。',
    [
      'Lambda:函数式接口(Single Abstract Method)的简洁实现——(a,b)->a+b 替代匿名类;常用函数式接口:Function<T,R>(转换)/Predicate<T>(判断)/Consumer<T>(消费)/Supplier<T>(提供);方法引用(Class::method)进一步简洁。',
      'Stream:声明式数据管道——中间操作(filter/map/sorted/distinct——惰性,返回新 Stream)+终端操作(collect/forEach/reduce/anyMatch——触发执行);特性:不存储(数据源的视图)、不修改源(无副作用)、惰性(终端操作才执行)。',
      'Optional:显式 null 容器——ofNullable/map/orElseThrow/ifPresent 链式调用替代 null 检查嵌套;不是替代所有 null,是替代返回值可能为空的场景。',
    ],
    [
      block('机制:Stream 的惰性与短路', '中间操作(filter/map)是惰性的(不立即执行,构建操作链);终端操作(collect/forEach)触发整条链执行——短路操作(findFirst/anyMatch/limit)可以在满足条件后停止处理(减少不必要的计算)。类比流水线:中间操作是组装站(不启动),终端是发货按钮(一按全线动)。'),
      block('反例:Stream 的两种事故', '事故一:Stream 中抛 checked 异常——filter/map 不接受抛 checked 的 Lambda;修复=包装为 unchecked 或用 try-catch 在 Lambda 内处理。事故二:并行流的误用——parallelStream 在小数据/非线程安全集合上反而更慢或出 bug(第 2 题 collections);修复=大数据+无共享状态才用并行;Collectors.toConcurrentMap 用并发容器。'),
      block('取舍:Stream vs 循环的可读性', 'Stream 适合:声明式转换(过滤→映射→收集——一行表达完整管道)+惰性+并行;循环适合:复杂逻辑(多步判断/需要 break/需要修改外部变量)——Stream 不支持 break/continue/checked 异常/修改局部变量——选型看"逻辑是否可以声明式表达";不能表达的不硬写 Stream。'),
    ],
    [
      block('验证:函数式三件套的走查核对', '验证:Lambda 断言(函数式接口的 Lambda 实现+方法引用);Stream 断言(filter→map→collect 的管道结果正确;并行流 vs 串行流的性能对照);Optional 断言(ofNullable+map+orElse 的链式调用不 NPE)——三组固化 Java 8 函数式编程;J1 实验的 Lambda/装箱数据可复用。'),
      block('追问链:函数式三刀', '一刀:"Collectors 的分组与分区?"——Collectors.groupingBy(按 key 分组→Map<K,List<T>>)+partitioningBy(按布尔分区→Map<Boolean,List<T>>)+joining(字符串拼接)+toMap(注意 key 冲突→merge function)——Collector 是 Stream 的"收集器策略"。二刀:"Optional 的最佳实践?"——返回值用 Optional(方法可能无返回);参数不用 Optional(增加调用方复杂度);不用 Optional.get(不检查直接取=隐藏 NPE);用 orElseThrow(显式异常)/orElse(默认值)/ifPresent(条件消费)。三刀:"Lambda 与匿名类的区别?"——Lambda 无独立 this(指向外部类)、无独立实例状态、只能实现函数式接口;匿名类可以有多方法/自己的状态/实现抽象类——Lambda 适合"纯函数"(无状态+单方法)。'),
    ],
    ['Lambda=函数式接口的简洁实现', 'Stream 惰性+声明式,不修改源', 'Optional 替代返回值 null,不做参数'], [jls17, api('java/util/Optional')],
  ),
};
