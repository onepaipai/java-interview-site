// Legacy 1-110 · v2 深度标准
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

  'legacy/1': deep(
    '基本类型与包装类区别？Integer 缓存范围（-128~127）与装箱的坑',
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
      '异常体系:Throwable→Error(JVM 级,不应捕获)与 Exception;Exception 分 checked(IOException/SQLException——编译器强制 try-catch 或 throws)与 unchecked(RuntimeException 及子类——NPE/ArrayIndexOutOfBounds,不强制处理);Error 与 RuntimeException = unchecked。',
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
      block('追问链:拷贝三刀', '一刀:"Arrays.copyOf vs clone?"——Arrays.copyOf 创建新数组+复制元素(推荐);数组.clone 也是浅拷贝(二维数组只复制第一维,内层数组共享)。二刀:"序列化深拷贝的陷阱?"——对象必须实现 Serializable(嵌套对象也要)+静态字段不拷贝+transient 字段不拷贝——序列化深拷贝有安全风险(反序列化攻击,第 30 题)。三刀:"不可变对象的'拷贝'?"——不可变对象不需要拷贝(共享安全)——"拷贝"的需求来自可变性;消除可变性=消除拷贝需求(第 20 题 collections 的值安全)。'),
    ],
    ['浅拷贝共享嵌套,深拷贝独立', '优先拷贝构造器,慎用 clone', '不可变对象消除拷贝需求'], [jls17, api('java/lang/Cloneable')],
  ),
  'legacy/11': deep(
    'Java 8：Lambda、Stream、Optional 的基本用法',
    '网银数据处理沙盘:交易列表按金额排序+过滤大额+汇总——Lambda(简洁匿名函数)+Stream(声明式管道)+Optional(显式 null 处理)是 Java 8 函数式编程的三件套。',
    [
      'Lambda:函数式接口(Single Abstract Method)的简洁实现——(a,b)->a+b 替代匿名类;常用函数式接口:Function<T,R>(转换)/Predicate<T>(判断)/Consumer<T>(消费)/Supplier<T>(提供);方法引用(Class::method)进一步简洁。',
      'Stream:声明式数据管道——中间操作(filter/map/sorted/distinct——惰性,返回新 Stream)+终端操作(collect/forEach/reduce/anyMatch——触发执行);特性:不存储(数据源的视图)、不修改源(无副作用)、惰性(终端操作才执行)。',
      'Optional:显式 null 的容器——of/ofNullable(创建)/map/flatMap(转换)/orElse/orElseThrow(取值)/ifPresent(条件消费)——消除 null 检查的嵌套(if null→else→if null→else 变成 Optional 链式调用);不是替代所有 null,是替代"方法返回值可能为空"的场景。',
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

  'legacy/26': deep(
    'JVM 内存区域有哪些？各存什么',
    '网银应用沙盘:OOM 发生在哪个区域？JVM 内存分区(堆/栈/方法区/程序计数器/本地方法栈)各有用途与 OOM 形态。',
    [
      '线程私有:程序计数器(当前执行字节码行号,无 OOM)、虚拟机栈(局部变量表+操作栈,StackOverflowError/OutOfMemoryError)、本地方法栈(Native 方法);线程共享:堆(对象实例,GC 主战场)、方法区/元空间(类信息/常量/静态变量,JDK 8 后元空间用本地内存)。',
      '堆细分:新生代(Eden+Survivor From/To)与老年代(默认 1:2);对象优先在 Eden 分配,大对象直接进老年代(Humongous);TLAB(Thread Local Allocation Buffer)每个线程在 Eden 中有私有分配缓冲(无锁分配,第 5 题 JVM)。',
      'OOM 形态:java.lang.OutOfMemoryError: Java heap space(堆满)/Metaspace(元空间满)/unable to create new native thread(线程数超限)/Direct buffer memory(堆外内存,第 33 题 JVM)。',
    ],
    [
      block('机制:内存区域的生命周期', '线程私有区域随线程创建与销毁(栈帧随方法进出栈弹出);共享区域随 JVM 存活(堆 GC 管理对象,元空间按类加载/卸载增减)。类比办公楼:工位(栈)按员工分配与回收,会议室(堆)按需预订与释放,档案室(元空间)按项目存档。'),
      block('反例:内存区域的三种事故', '事故一:栈深度超限——递归无终止条件→StackOverflowError(第 32 题);修复=加终止条件或增大 -Xss。事故二:元空间泄漏——动态代理类持续生成不卸载(第 37 题 JVM);修复=排查类加载器泄漏。事故三:堆外内存泄漏——DirectByteBuffer 不释放(不受 GC 管,第 33 题);修复=NMT 监控+Cleaner 兜底。'),
      block('取舍:堆大小与区域比例的设置', '-Xms/-Xmx(堆初始/最大,生产建议相等避免动态扩容)+-XX:NewRatio(新生代:老年代)+-XX:SurvivorRatio(Eden:Survivor)+-XX:MetaspaceSize(元空间初始阈值)——参数的依据=负载画像(对象大小/存活率/分配速率,第 44 题动态年龄),不是默认值。'),
    ],
    [
      block('验证:内存区域的实测断言', '验证:本机实验(-Xlog:gc+heap=info 查看堆分代布局;NMT 查看各区域 committed/reserved;jmap -heap 查看堆配置)——实测数据与理论分区对应;OOM 各形态可通过构造场景复现(堆 OOM:无限 new;栈 SOE:无限递归;元空间 OOM:CGLIB 循环生成代理)。'),
      block('追问链:内存区域三刀', '一刀:"堆外内存是什么?"——DirectByteBuffer/NIO 分配的堆外内存(不受 GC 管,靠 Cleaner 兜底),NMT 可监控(第 33 题 JVM 实测:Internal 仅 222KB 但 direct buffer 130MB)。二刀:"元空间与永久代的区别?"——元空间用本地内存(不占堆,默认无上限但建议设 MetaspaceSize),永久代在 JDK 8 移除;类元数据在元空间,字符串常量池在堆(JDK 7 迁移,第 36 题 JVM)。三刀:"虚拟机栈的帧结构?"——每方法调用创建栈帧(局部变量表/操作数栈/动态链接/返回地址),栈帧大小编译期确定;-Xss 设栈大小(默认 512K-1M,第 11 题线程栈实测)。'),
    ],
    ['线程私有:计数器+栈,共享:堆+元空间', 'OOM 形态按区域分类排查', '堆是 GC 主战场,元空间用本地内存'], [jvms2, g1tun],
  ),
  'legacy/27': deep(
    '对象创建过程？对象在堆中的布局',
    '网银对象沙盘:new Object() 背后的五步(类加载检查→分配内存→初始化零值→设置对象头→执行构造器)与对象在堆中的三区域布局(对象头/实例数据/对齐填充)。',
    [
      '对象创建五步:一,类加载检查(类是否已加载,否则先加载);二,分配内存(TLAB 指针碰撞或空闲列表,第 26 题 JVM);三,初始化零值(字段设默认值:0/null/false);四,设置对象头(Mark Word:哈希码/GC 年龄/锁状态+Klass Pointer:类型指针);五,执行构造器(栈帧中的 <init> 方法)。',
      '对象布局:对象头(Mark Word 8 字节+Klass Pointer 4 或 8 字节)+实例数据(字段按类型分配空间)+对齐填充(补齐到 8 字节倍数);压缩指针(-XX:+UseCompressedOops)时 Klass Pointer 4 字节,否则 8 字节。',
      'JOL(Java Object Layout)工具验证对象布局:int=4 字节,引用=4 字节(压缩)/8 字节(未压缩),对象头 12 字节(压缩)+4 字节填充=16 字节(Integer 最小 16 字节,第 5 题 JVM 实测)。',
    ],
    [
      block('机制:TLAB 为什么能无锁分配', 'TLAB 是每个线程在 Eden 中预分配的一小块私有内存:线程在 TLAB 内用指针碰撞(bump-the-pointer)分配对象——只需移动指针,无需 CAS(线程私有空间);TLAB 用完再申请新 TLAB(需 CAS 一次)。类比食堂餐盘架:每人一个专用架(TLAB),从架上拿餐盘无需抢锁;架子空了再从大货架(CAS)补一批。'),
      block('反例:对象创建的两种事故', '事故一:大对象频繁分配——每次 new 大数组绕过 TLAB(直接进老年代 Humongous);修复=池化或分块。事故二:构造器中 this 逃逸——构造器中把 this 注册给外部(第 38 题并发基础),其他线程看到"半初始化"对象(final 字段可能还是零值);修复=构造完成后才发布。'),
      block('取舍:对象布局的内存优化', '字段重排:JVM 自动按类型大小排序(long/double→int/float→short/char→byte/boolean→引用)减少填充;压缩指针:堆<32GB 时开启(引用从 8 字节缩到 4 字节);继承布局:父类字段在前,子类字段在后——JOL 工具可验证实际布局,优化内存占用(第 5 题 JVM)。'),
    ],
    [
      block('验证:对象创建的走查核对', '验证:JOL 实测(第 5 题 JVM):Integer 16 字节(12 头+4 值,对齐到 16);Long 24 字节(12 头+8 值+4 填充);空对象 16 字节;JFR 的 ObjectAllocationSample 事件(分配路径可观测);TLAB 日志(-Xlog:gc+tlab=debug 可查看 TLAB 分配)。验证:对象布局与创建流程的断言可程序化(JOL)。'),
      block('追问链:对象创建三刀', '一刀:"逃逸分析对对象创建的影响?"——栈上分配/标量替换:未逃逸对象直接在栈上分配(不进堆,不 GC);同步消除:未逃逸对象的 synchronized 移除(第 80 题 JVM)。二刀:"对象的 GC 年龄?"——对象头 Mark Word 中 4 位存 GC 年龄(最大 15,MaxTenuringThreshold);每次 Minor GC 存活则年龄+1(第 44 题动态年龄)。三刀:"数组对象的布局?"——数组头额外 4 字节存长度;数组元素连续存储(基本类型直接存值,引用类型存引用——第 10 题深浅拷贝相关)。'),
    ],
    ['对象创建五步,TLAB 无锁分配', '对象头=Mark Word+Klass Pointer', 'JOL 验证布局,压缩指针省一半'], [jvms2, api('java/lang/Object')],
  ),
  'legacy/28': deep(
    '如何判断对象可回收？',
    '网银 GC 沙盘:对象什么时候会被 GC 回收？引用计数(循环引用问题)vs 可达性分析(GC Roots)——JVM 用可达性分析,不是引用计数。',
    [
      '可达性分析:从 GC Roots 出发,沿引用链遍历——能到达的对象=存活,不可达=可回收;GC Roots 包括:虚拟机栈中引用的对象、静态字段引用的对象、JNI 引用的对象、活跃线程等。',
      '引用计数的问题:循环引用(A→B→A,互相引用但都无外部引用)——引用计数永不归零,无法回收;Python 用引用计数+循环检测器,JVM 不用引用计数,用可达性分析(从根出发,循环引用不可达即回收)。',
      '四种引用的回收强度:强引用(不回收,除非置 null)>软引用(内存不足时回收,SoftReference)>弱引用(下次 GC 必回收,WeakReference)>虚引用(不影响生命周期,仅用于回收通知,PhantomReference)——第 29 题 JVM 详述四种引用。',
    ],
    [
      block('机制:GC Roots 为什么是"根"', 'GC Roots 是"确定存活"的起点:正在执行的线程栈中的变量(局部变量在用)、静态字段(类在用)、JNI 引用(Native 代码在用)——从这些起点出发沿引用链遍历,所有可达对象都存活。类比"追踪感染链":从已知感染者(GC Roots)出发追踪接触者(引用),未追踪到的(不可达)=可安全隔离(回收)。'),
      block('反例:可达性判断的两种事故', '事故一:对象被静态集合持有——业务认为"不用了"但静态 Map 还引用着→GC 无法回收(内存泄漏,第 82 题 JVM);修复=用完 remove 或用 WeakHashMap。事故二:finalize 中复活——finalize 里把 this 赋给静态字段→对象"死而复生"且 finalize 不再执行(第 11 题 JVM);修复=不用 finalize,用 Cleaner(不可复活)。'),
      block('取舍:引用类型的选择', '强引用:常规业务对象(不能被回收);软引用:缓存(内存不足时回收,第 29 题 JVM);弱引用:规范化映射(WeakHashMap——key 被回收时 entry 自动移除);虚引用:资源清理通知(DirectByteBuffer 的 Cleaner,第 33 题堆外内存)——按"回收时机的严格程度"选引用类型。'),
    ],
    [
      block('验证:可达性分析的走查核对', '验证:GC Roots 遍历断言(静态字段置 null→对象可回收;局部变量出栈→可回收);循环引用断言(A→B→A 无外部引用→两者都回收);四种引用断言(强引用不回收/软引用内存不足回收/弱引用下次 GC 回收/虚引用不影响)——四组固化可达性分析语义。'),
      block('追问链:GC Roots 三刀', '一刀:"GC Roots 有哪些具体来源?"——虚拟机栈(帧中局部变量表)、方法区(静态字段/常量)、本地方法栈(JNI 引用)、活跃线程、同步锁持有的对象——JVM 实现可能有更多,但核心=线程栈+静态+JNI。二刀:"finalize 对可达性的影响?"——finalize 执行前对象被放入 F-Queue(GC Roots 包含 F-Queue)→对象"复活"→下次 GC 不可达才真正回收——finalize 至少需要两轮 GC(第 11 题拖累回收的机制)。三刀:"如何判断内存泄漏?"——堆转储(MAT/jmap)+对比多个快照的增长(第 82 题内存泄漏的典型场景:静态集合/监听器/ThreadLocal/连接未关闭)。'),
    ],
    ['可达性分析从 GC Roots 出发', '引用计数有循环引用问题,JVM 不用', '四种引用按回收强度选'], [jvms2, g1tun],
  ),
  'legacy/29': deep(
    '四种引用类型与应用场景',
    '网银缓存沙盘:不同场景需要不同的回收强度——强引用(永不回收)、软引用(内存不足回收,适合缓存)、弱引用(下次 GC 回收,适合规范化映射)、虚引用(回收通知,适合堆外内存清理)。',
    [
      '强引用:Object o = new Object()——GC 永不回收(只要引用可达);软引用 SoftReference:内存不足时 GC 回收(Thread.holdsLock 无关,与堆余量挂钩)——适合"可丢失"的缓存;弱引用 WeakReference:下次 GC 必回收(不管内存是否充足)——适合"辅助映射"(WeakHashMap);虚引用 PhantomReference:不影响对象生命周期,仅用于回收通知(队列轮询)——适合堆外内存清理(DirectByteBuffer 的 Cleaner)。',
      '引用队列 ReferenceQueue:软/弱/虚引用可关联队列——对象被回收时引用对象入队(程序轮询队列做清理动作);Cleaner(Java 9+)内部用虚引用+队列,替代 finalize(无复活风险,第 11 题 JVM)。',
      '使用场景对照:缓存→SoftReference(内存不足自动回收,防止 OOM);规范化映射→WeakHashMap(key 是弱引用,GC 后 entry 自动移除);堆外内存→PhantomReference+Cleaner(DirectByteBuffer 的回收机制);ThreadLocal→弱引用 key(ThreadLocalMap 的 Entry 继承 WeakReference,第 72 题 ThreadLocal)。',
    ],
    [
      block('机制:回收强度是"GC 的容忍度"', '四种引用定义了 GC 的四种"容忍度":强引用=不容忍(GC 不回收);软引用=容忍内存不足时回收(有替代);弱引用=容忍下次 GC 回收(随时可丢);虚引用=完全容忍(不影响回收,只通知)。类比租约:强引用=永久租约,软引用=可短租,弱引用=随时退租,虚引用=只通知不占房。'),
      block('反例:引用类型的两种事故', '事故一:软引用做主存储——软引用缓存在高内存压力下大面积回收→缓存命中率骤降;修复=软引用只做二级缓存,主数据在 DB 或强引用缓存。事故二:虚引用的 get 永远 null——虚引用不影响对象生命周期,get() 恒 null(与软/弱不同)——用途是"回收通知"不是"延迟获取"。'),
      block('取舍:引用类型与内存策略的匹配', '缓存策略:软引用(内存不足自动回收)+LRU 淘汰(Caffeine 内部)优于纯软引用(粒度不可控);数据安全:强引用+显式 null(明确生命周期);资源清理:虚引用+Cleaner(不复活)+显式 close(确定性)——引用类型是"GC 的指令",选错=回收时机不可控。'),
    ],
    [
      block('验证:四种引用的走查核对', '验证:强引用断言(置 null 后才可回收);软引用断言(-Xmx 小堆+大量分配→软引用被回收);弱引用断言(System.gc() 后 WeakReference.get()==null);虚引用断言(reference.get()==null 但 queue.poll() 有值)——四组固化四种引用的回收时机(本机可复跑)。'),
      block('追问链:引用三刀', '一刀:"ThreadLocal 的弱引用 key?"——ThreadLocalMap 的 Entry extends WeakReference<ThreadLocal<?>>:key 是弱引用(ThreadLocal 实例回收后 key=null),value 是强引用(泄漏链,第 72 题ThreadLocal)。二刀:"WeakHashMap 的使用场景?"——key 生命周期由外部控制(key 被回收→entry 自动移除)——如"临时缓存"(key 是外部对象,外部销毁时缓存同步清理);value 不是弱引用(value 生命周期跟 entry)。三刀:"Cleaner 与 finalize 的对比?"——Cleaner:无复活风险(虚可达后 get 恒 null)+可注册多个+显式 clean;finalize:单线程队列+可复活+不可控——Cleaner 全面优于 finalize,但都是兜底不是主保障。'),
    ],
    ['强=不回收,弱=下次 GC 必回收', '软引用适合缓存,弱引用适合映射', '虚引用=回收通知,Cleaner 替代 finalize'], [jvms2, api('java/lang/ref/SoftReference')],
  ),
  'legacy/30': deep(
    '常见 GC 算法',
    '网银 GC 沙盘:标记-清除/标记-复制/标记-整理三种基础算法——各有取舍(碎片/空间浪费/暂停时间),现代回收器组合使用(新生代复制+老年代整理)。',
    [
      '标记-清除(Mark-Sweep):标记存活→清除未标记——优点:简单,不移动对象;缺点:内存碎片(清除后的空闲块不连续)+效率不稳定(标记与清除的耗时与对象数成正比);CMS 使用标记-清除(并发清除减少暂停,但碎片导致 Full GC)。',
      '标记-复制(Mark-Copy):内存分两块(From/To),存活对象从 From 复制到 To——优点:无碎片(To 区连续)+效率高(只复制存活对象,存活率低时极快);缺点:空间浪费(To 区空闲,只有一半可用);新生代使用(Eden+Survivor 的复制,存活率低所以划算)。',
      '标记-整理(Mark-Compact):标记存活→向一端移动(压缩碎片)——优点:无碎片+不浪费空间;缺点:移动对象(需要修正引用,暂停较长);老年代使用(G1 的 Mixed GC/Parallel 的 Full GC 都用标记-整理)。',
    ],
    [
      block('机制:三种算法的取舍矩阵', '标记-清除:碎片(差)+不移动(好)+空间全用(好);标记-复制:无碎片(好)+空间浪费(差)+存活率低时快(好);标记-整理:无碎片(好)+移动成本(差)+空间全用(好)——没有完美算法,现代回收器按代际特征组合:新生代存活率低→复制(划算),老年代存活率高→整理(划算,碎片不可接受)。"存活率决定算法选择"是 GC 算法的第一原理。'),
      block('反例:GC 算法的两种事故', '事故一:CMS 的碎片累积——标记-清除不做整理,碎片积累→大对象找不到连续空间→Full GC(第 15 题 CMS 术语);修复=定期 CMS 的碎片整理或换 G1。事故二:新生代用标记-整理——存活率低时整理成本>复制成本(复制只需移动少量存活);修复=新生代用复制(天然适配低存活率)。'),
      block('取舍:分代假设与算法选择', '弱分代假设:大多数对象朝生夕死(年轻代 98% 对象在第一次 GC 死亡)→复制算法划算(只复制 2% 存活);强分代假设:老年代对象存活率高→整理算法(碎片不可接受)——如果弱分代假设不成立(存活率高),复制算法的成本上升,需调整 Survivor 比例或改用其他策略(第 44 题动态年龄)。'),
    ],
    [
      block('验证:GC 算法的走查核对', '验证:标记-清除断言(碎片后大对象分配失败→Full GC);标记-复制断言(Eden→Survivor 对象移动,From/To 交换);标记-整理断言(移动后连续空间增加)——三组可通过 GC 日志(-Xlog:gc*)观测;第 15 题 JVM 的 CMS/G1 对照实验(标记-清除 vs 标记-复制的形态差异)。'),
      block('追问链:GC 算法三刀', '一刀:"三色标记与并发标记?"——白(未访问)/灰(已标记未扫完)/黑(已扫完)——并发标记的问题=漏标(黑指向白,同时灰到白的引用被删)与多标(白指向黑)——解决方案:增量更新(CMS)或 SATB(G1,第 73 题)。二刀:"写屏障是什么?"——JVM 在引用赋值处插入的钩子(记录引用变更)——SATB 用 pre-write barrier(记录旧引用),增量更新用 post-write barrier(记录新引用)——写屏障是并发标记的正确性保证,有微小性能开销。三刀:"GC 算法与分代的组合?"——G1:新生代标记-复制+老年代标记-整理(Mixed GC 选择性整理);ZGC:标记-整理+染色指针(并发整理,读屏障自愈,第 7 题 JVM)——现代回收器=基础算法+并发技术+分代策略的组合。'),
    ],
    ['标记-清除碎片,复制省但费空间', '整理无碎片但移动成本高', '存活率决定算法,分代是假设'], [g1tun, jvms2],
  ),
  'legacy/31': deep(
    '分代思想？Minor / Major / Full GC 区别',
    '网银 GC 沙盘:弱分代假设(大多数对象朝生夕死)→新生代/老年代分区;Minor GC(新生代回收)/Mixed GC(G1 老年代部分回收)/Full GC(全堆压缩,第 14 题 JVM 术语详解)。',
    [
      '弱分代假设:对象的生命周期呈二八分布(大多数对象朝生夕死,少数长寿)→把"新对象"放新生代(频繁回收,复制算法)与"长寿对象"放老年代(低频回收,整理算法)——假设成立时分代高效,不成立(大量中寿命对象)时调整 Survivor 比例或换不分代回收器(ZGC,第 75 题)。',
      'GC 类型:Minor GC(新生代回收,Eden 满→Survivor 复制,频率高速度快)/Mixed GC(G1 特有,新生代+部分老年代 region,并发标记后按回收价值选择)/Full GC(整堆压缩,STW 最长,兜底——G1 的 Full 是"失败降级"不是常规操作,第 14 题)。',
      '对象晋升:Eden→Survivor(年龄+1)→年龄达阈值或动态年龄判定→老年代;大对象直接进老年代(Humongous,超过 region 一半);动态年龄判定:Survivor 中同龄对象总大小>空间一半→该年龄及以上全部晋升(第 44 题详解)。',
    ],
    [
      block('机制:分代为什么高效', '弱分代假设下:新生代 98% 对象在 Minor GC 死亡→复制算法只移动 2% 存活(极快);老年代存活率高→标记-整理(避免碎片)。如果所有对象放同一区域:每次 GC 都要标记全堆→效率低——分代把"高频低成本"的新生代 GC 与"低频高成本"的老年代 GC 分开,总成本最优。'),
      block('反例:分代的两种事故', '事故一:Survivor 区太小——动态年龄判定频繁触发→对象过早晋升→老年代压力大;修复=调整 SurvivorRatio 或 Eden 大小(第 44 题)。事故二:大对象进新生代——Humongous 对象在 Eden 放不下→直接进老年代→碎片+回收代价高;修复=增大 region 或拆分大对象(第 45 题大对象)。'),
      block('取舍:分代参数的调优', '-Xmn(新生代大小)/-XX:NewRatio(老年代:新生代)/-XX:SurvivorRatio(Eden:Survivor)/-XX:MaxTenuringThreshold(晋升年龄上限)——参数的依据=对象存活率画像(JFR 的 ObjectAllocationSample+GC 日志,第 44 题);G1 下参数含义变化(Survivor 由 region 集合动态决定,第 44 题取舍)。'),
    ],
    [
      block('验证:分代 GC 的走查核对', '验证:本机实验(-Xlog:gc* 观察 Minor/Mixed/Full GC 的频率与耗时分布);分代假设验证(JFR ObjectAllocationSample 看对象生存期分布——大多<1 次 GC);Minor GC 触发(Eden 满→GC→Survivor 复制);Humongous 分配(大数组→直接进老年代)。验证:GC 日志的分代行为断言可程序化(第 14/15 题 JVM 的实测数据)。'),
      block('追问链:分代三刀', '一刀:"Minor GC 的触发条件?"——Eden 区满(不是 Survivor 满)→触发 Minor GC;Eden 大小影响 Minor GC 频率与每次耗时(第 44 题 Survivor 偏小→动态年龄晋升)。二刀:"G1 的 Mixed GC 什么时候来?"——并发标记完成后(IHOP 阈值)→Mixed GC 分批回收老年代 region(按回收价值=释放空间÷疏散成本排序,第 73 题 G1 原理)。三刀:"不分代的回收器?"——ZGC JDK 17 不分代(全堆并发标记,第 75 题);分代 ZGC 是 JDK 21 的 JEP 439(吞吐与内存大幅改善)——不分代的代价=大存活集时周期长。'),
    ],
    ['弱分代假设→新生代频繁低成本回收', 'Minor 快,Mixed 精准,Full 兜底', '参数依据=存活率画像'], [g1tun, jvms2],
  ),
  'legacy/32': deep(
    'StackOverflowError 与堆 OOM 的区别和常见原因',
    '网银故障沙盘:StackOverflowError(栈满,递归无终止)与 OutOfMemoryError: Java heap space(堆满,对象过多)——两种 OOM 的区域不同(栈 vs 堆),成因与排查完全不同。',
    [
      'StackOverflowError:虚拟机栈满——每方法调用创建栈帧(局部变量表+操作栈),栈深度超 -Xss 限制→SOE;常见原因:递归无终止条件、递归深度过大(如深链表)、栈帧过大(大量局部变量);排查:栈顶方法即循环调用点(stack trace 第一个重复帧)。',
      'OutOfMemoryError: Java heap space:堆满——对象总量超 -Xmx;常见原因:内存泄漏(对象不再使用但可达,第 82 题)、大对象批量分配(一次性加载全部数据)、堆太小(-Xmx 设小了);排查:heap dump(MAT 分析 dominator tree/直方图)。',
      '两者的排查路径完全不同:SOE 看线程栈(stack trace 定位递归点,jstack 采样)、Heap OOM 看堆转储(MAT 分析对象引用链,jmap -dump);配置也不同:SOE 调 -Xss,Heap OOM 调 -Xmx 或修内存泄漏。',
    ],
    [
      block('机制:栈与堆的物理位置与限制', '虚拟机栈=线程私有(每线程独立一块,大小由 -Xss 设定);堆=线程共享(全局一块,大小由 -Xmx 设定)——栈的总量=线程数×栈大小(线程多时栈空间也大,第 11 题 JVM 实测:4000/20000 线程 -Xss256k 与 8M 均 2 秒建完无 OOM——保留≠提交)。'),
      block('反例:两种 OOM 的混淆事故', '事故一:SOE 误判为堆 OOM——看到 OutOfMemoryError 就去调 -Xmx,实际是递归问题(调堆无效);修复=看错误类型(SOE vs OOM: Java heap space)+看栈顶。事故二:OOM 误判为 SOE——大量线程创建导致 OOM: unable to create new native thread(线程栈空间不足,不是堆),误调 -Xmx 无效;修复=区分 OOM 子类型(thread/native/metaspace/heap 各不同)。'),
      block('取舍:-Xss 的设置与递归深度', '-Xss 越大:单线程栈帧越深(递归越深)但总可创建线程数越少(内存=线程数×栈大小);-Xss 越小:可创建更多线程但递归深度受限(复杂递归 SOE)——默认 512K-1M 足够大多数场景;确需深递归→改迭代(显式栈)或增大 -Xss(权衡)。'),
    ],
    [
      block('验证:两种 OOM 的走查核对', '验证:SOE 复现(无限递归→StackOverflowError,stack trace 显示重复帧);Heap OOM 复现(无限 new 大对象→OOM: Java heap space,heap dump 可分析);线程 OOM 复现(大量创建线程→OOM: unable to create new native thread)——三种 OOM 的形态与排查路径完全不同;第 11 题 JVM 的线程栈实验(4000/20000 线程)可复用。'),
      block('追问链:OOM 三刀', '一刀:"OOM 的子类型有哪些?"——Java heap space/Metaspace/unable to create new native thread/Direct buffer memory/GC overhead limit exceeded——每种对应不同区域的排查路径(堆/元空间/线程/堆外)。二刀:"-Xss 的默认值?"——Linux x64 默认 1MB(Windows 也有差异);大部分业务方法栈帧<1KB→1MB 可支持 1000 层递归;深递归(解析深层 JSON/XML)可能 SOE→改迭代或增大 -Xss。三刀:"StackOverflowError 能被 catch 吗?"——可以(Throwable 的子类)——但 catch 后栈已满,再调用方法可能再次 SOE;catch SOE 通常无意义(递归 bug 应修代码而非 catch)。'),
    ],
    ['SOE=栈满看线程栈,Heap OOM=堆满看转储', '子类型不同,排查路径不同', '-Xss 管栈深,-Xmx 管堆大小'], [jvms2, g1tun],
  ),

  'legacy/51': deep(
    'TCP 与 UDP 区别？三次握手、四次挥手，为什么是三次',
    '网银连接沙盘:TCP(连接/可靠/有序)vs UDP(无连接/不可靠/低延迟)——金融交易走 TCP(可靠),行情推送可走 UDP(容忍丢失,低延迟优先);三次握手=双向可达确认+ISN 同步的最小次数。',
    [
      'TCP:连接导向(三次握手建连)——可靠(确认/重传/排序)、流量控制(滑动窗口)、拥塞控制(慢启动/拥塞避免,第 17 题拥塞控制);UDP:无连接——不可靠但低延迟(无握手/确认/重传开销),适合实时音视频/DNS/行情推送(容忍少量丢失)。',
      '三次握手:SYN→SYN+ACK→ACK——双向确认"我能发你能收"+ISN 同步;两次不够(服务端无法确认客户端可收);四次多余(SYN+ACK 可合并)——ISN 随机防旧报文混入+防序列号预测(network Q3 ISN 双目的)。',
      '四次挥手:FIN→ACK→FIN→ACK——双向数据传输完成确认;TIME_WAIT(主动关闭方 2MSL,防旧报文污染新连接,第 6 题)——挥手比握手多一次因为 TCP 全双工(每个方向独立关闭)。',
    ],
    [
      block('机制:为什么金融交易选 TCP', '交易请求必须可靠到达且有序(TCP 保证);UDP 丢一个包=交易丢失(不可接受);TCP 的重传机制确保数据到达——代价是延迟(重传/确认),但金融交易的可靠性需求高于延迟需求。行情推送可以容忍丢包(下一帧覆盖)→UDP 可选。'),
      block('反例:TCP/UDP 误用的两种事故', '事故一:UDP 做交易——丢包=交易丢失,应用层自己实现确认/重传=重新发明 TCP;修复=交易走 TCP。事故二:TCP 做实时推送——Nagle 算法+确认机制增加延迟(行情延迟敏感);修复=TCP_NODELAY 关 Nagle 或 UDP 组播(行情容忍丢失)。'),
      block('取舍:TCP 的连接管理与性能', '长连接复用(省握手,第 8 题长连接)+连接池(管理连接生命周期,第 8 题);TIME_WAIT 堆积(短连接高频,第 6 题治理);三次握手的延迟(1-RTT,HTTPS 加 TLS 再加 1-2 RTT,第 1 题链路耗时)——连接复用是性能主线。'),
    ],
    [
      block('验证:TCP/UDP 的走查核对', '验证:本机 N3 实验(connect 超时 2019ms/读取超时 1505ms/端口拒绝 17ms——三种失败形态独立);N4 实验(复用 0.29ms/req vs close 0.9ms/req——复用省握手);N2 实验(TIME_WAIT=30 随主动关闭累积/CLOSE_WAIT 随 close 消失)。验证:三次握手的状态机断言可程序化(netstat 观察状态变迁)。'),
      block('追问链:TCP 三刀', '一刀:"TCP 的拥塞控制?"——慢启动(指数增)→拥塞避免(线性增)→快重传(3 重复 ACK)→快恢复(减半,第 17 题拥塞控制四算法);CUBIC(丢包驱动)vs BBR(带宽驱动)。二刀:"TCP 粘包怎么办?"——TCP 字节流无消息边界(第 4 题分帧:长度前缀/分隔符/固定长度);应用层分帧是 TCP 的必答题。三刀:"TIME_WAIT 优化?"——连接池复用(减少挥手)+tcp_tw_reuse(出站)+端口扩容(第 6 题详细治理)。'),
    ],
    ['TCP 可靠有序,UDP 低延迟', '三次=最小充分解,四次挥手全双工', '金融交易走 TCP,行情可 UDP'], [jls17, sre],
  ),
  'legacy/52': deep(
    'HTTP 与 HTTPS 区别？HTTPS 握手过程简述',
    '网银 API 沙盘:HTTP(明文)vs HTTPS(HTTP+TLS 加密)——HTTPS 在 TCP 之上加 TLS 层(握手:证书校验+密钥协商→对称加密通信);性能代价=握手 1-2 RTT+加解密 CPU。',
    [
      'HTTPS=HTTP over TLS——TLS 解决三问题:加密(对称加密,密钥协商而来)、身份认证(证书链校验到受信 CA)、完整性(MAC 防篡改);TLS 1.2 握手 2-RTT,TLS 1.3 优化为 1-RTT(第 19 题 TLS 详解)。',
      'TLS 1.2 握手:ClientHello(随机数+密码套件)→ServerHello+Certificate+KeyExchange→Client KeyExchange+ChangeCipherSpec→Finished→服务器 Finished(2-RTT);TLS 1.3:合并握手+仅前向安全算法(ECDHE)+移除 RSA 密钥传输——更快且更安全。',
      '性能代价:握手 1-2 RTT(连接复用/会话恢复/TLS 1.3 缓解)+对称加解密 CPU(硬件加速 AES-NI 可忽略)+证书链校验(CPU,可缓存)——HTTPS 的性能代价在现代硬件上已很小(第 19 题 TLS 详解)。',
    ],
    [
      block('机制:混合加密的分工', '非对称加密(RSA/ECDHE):密钥交换(安全地协商对称密钥——公钥加密只有私钥能解);对称加密(AES/ChaCha20):数据传输(性能远高于非对称);混合=利用非对称的安全性+对称的性能性——"用非对称交换钥匙,用对称开锁"。'),
      block('反例:HTTPS 的两种事故', '事故一:关闭证书校验("临时"方案三年)——中间人攻击(第 19 题事故链);修复=信任库导入+到期监控+私有 CA(第 19 题正规通道)。事故二:TLS 版本过老(TLS 1.0/1.1)——已知漏洞(POODLE/BEAST);修复=强制 TLS 1.2+(禁用老版本)。'),
      block('取舍:HTTPS 与性能的平衡', '会话恢复(Session resumption/ticket):跳过完整握手(0-RTT/1-RTT);TLS 1.3 的 0-RTT(重连时首个请求即可携带数据——但有重放风险,只用于幂等请求);OCSP Stapling(证书状态钉在握手里,免客户端查 CA,第 20 题);硬件加速(AES-NI 指令集)——HTTPS 性能已不是主要瓶颈。'),
    ],
    [
      block('验证:HTTPS 握手的走查核对', '验证:TLS 1.2 握手断言(2-RTT 实测——网络 N3 实验);TLS 1.3 断言(1-RTT,速度提升实测);证书链校验断言(leaf→intermediate→root 逐级验签);OCSP Stapling 断言(响应内嵌);连接复用断言(HTTPS 复用后延迟显著降低,N4 实验同构)。'),
      block('追问链:HTTPS 三刀', '一刀:"HTTPS 的密钥交换算法?"——ECDHE(前向安全——私钥泄露不影响历史通信)vs RSA 密钥传输(无前向安全——私钥泄露可解历史);TLS 1.3 仅保留 ECDHE。二刀:"HTTP/2 与 HTTPS?"——HTTP/2 要求 HTTPS(浏览器强制);HTTP/2 的多路复用减少连接数(第 17 题队头阻塞仍有)。三刀:"证书过期怎么办?"——30/60 天到期告警+ACME 自动续期+OCSP 缓存刷新+重启预热(第 19 题故障链)。'),
    ],
    ['HTTPS=TCP+TLS(加密+认证+完整性)', 'TLS 1.3=1-RTT+前向安全', '性能:复用+1.3+硬件加速'], [sre, owasp],
  ),
  'legacy/53': deep(
    '常见 HTTP 状态码？GET 与 POST 区别',
    '网银 API 沙盘:2xx(成功)/3xx(重定向)/4xx(客户端错)/5xx(服务端错)——状态码是 HTTP 的"错误分类语言",GET(幂等查询)与 POST(非幂等提交)的语义区别。',
    [
      '状态码分类:2xx 成功(200 OK/201 Created/204 No Content)、3xx 重定向(301 永久/302 临时/304 缓存)、4xx 客户端错(400 参数/401 未认证/403 无权限/404 不存在/429 限流)、5xx 服务端错(500 内部/502 网关/503 不可用)——每种状态码=一种"错误类型"的信号(第 12 题状态码纪律)。',
      'GET vs POST:GET=幂等查询(参数在 URL,可缓存,可收藏);POST=非幂等提交(参数在 body,不缓存,不收藏)——语义差异:GET "获取资源",POST "提交处理";安全差异:GET 参数暴露在 URL(日志/浏览器历史可见),POST 在 body(相对安全但不加密)。',
      'RESTful 的状态码使用:200(成功返回数据)/201(创建成功+Location)/204(成功无内容)/400(参数错)/401(未认证)/403(已认证无权)/404(资源不存在)/409(冲突)/429(限流)——状态码+响应体的错误码配合(第 12 题状态码+业务码)。',
    ],
    [
      block('机制:GET 幂等与 POST 非幂等的工程含义', 'GET 幂等=多次调用结果相同(可安全重试/缓存);POST 非幂等=多次调用产生多次副作用(需幂等键保护,第 119 题)——RESTful 设计中:GET 用于查询(可缓存/可重试),PUT 用于幂等更新,DELETE 用于幂等删除,POST 用于非幂等创建——动词的幂等性决定客户端的重试策略(第 119 题)。'),
      block('反例:状态码误用的两种事故', '事故一:所有错误返回 200+错误码——前端无法用 HTTP 状态码判断成功失败(需解析 body);修复=HTTP 状态码+业务错误码双层(第 12 题)。事故二:POST 用于查询(绕过 GET 的缓存/日志审计)——搜索引擎不收录/CDN 不缓存;修复=查询用 GET(语义正确)。'),
      block('取舍:GET 的长度限制与 POST 的上传', 'GET 的 URL 长度限制(浏览器约 2KB,服务器可配到 8KB)——复杂查询条件用 POST body(规避长度限制,但失去缓存);POST 上传大小:multipart max-file-size(第 44 题安全边界)——GET 长度限制是浏览器行为,POST 无此限制但受 body 大小限制。'),
    ],
    [
      block('验证:状态码与 GET/POST 的走查核对', '验证:状态码断言(200/201/204/301/302/304/400/401/403/404/429/500 各自的行为);GET 幂等断言(多次 GET 结果一致);POST 非幂等断言(多次 POST 创建多条——需幂等键);缓存断言(GET 响应可缓存/POST 不缓存)——四组固化 HTTP 语义(第 12 题状态码+错误码的配合)。'),
      block('追问链:HTTP 三刀', '一刀:"HTTP/2 对 GET/POST 的影响?"——HTTP/2 多路复用(单连接多流)消除了 HTTP/1.1 的队头阻塞(第 17 题);GET/POST 的语义不变(只是传输层优化)。二刀:"PUT vs POST?"——PUT 幂等(完整替换,多次调用结果相同);POST 非幂等(每次调用创建新资源)——RESTful 中 PUT 用于"已知 ID 的完整替换",POST 用于"创建新资源"。三刀:"HTTP 状态码的自定义?"——HTTP 状态码是 IANA 标准(不可自定义);业务错误码在 response body 中自定义(status=200+code=ERROR_X,或 status=400+code=VALIDATION)——两层各管一段(第 12 题配合)。'),
    ],
    ['2xx 成功 3xx 重定向 4xx 客户端 5xx 服务端', 'GET 幂等可缓存,POST 非幂等', '状态码+业务码双层配合'], [sre, owasp],
  ),
  'legacy/54': deep(
    'Cookie 与 Session 区别？分布式 Session 方案',
    '网银会话沙盘:Cookie(客户端存储,自动携带)vs Session(服务端存储,依赖 Cookie 传 SessionID)——分布式部署下 Session 共享的三种方案(Session 复制/Sticky/集中存储)。',
    [
      'Cookie:客户端存储(浏览器管理)——自动携带(同域请求)、大小限制(4KB)、类型限制(字符串)、安全性低(可被篡改/窃取);分类:会话 Cookie(浏览器关闭消失)与持久 Cookie(Expires/Max-Age)。',
      'Session:服务端存储(依赖 Cookie 传 SessionID)——安全性高(数据在服务端)、可存储对象、大小不受浏览器限制——分布式部署问题:Session 在一个节点,请求路由到另一个节点→Session 丢失。',
      '分布式 Session 三方案:Session 复制(节点间同步,小集群可用)、Sticky 会话(LB 按用户路由到固定节点,节点故障丢会话)、集中存储(Redis 存 Session,所有节点读写同一 Redis——最常用,Spring Session)。'),
    ],
    [
      block('机制:Session 的本质="服务端的状态存储"', 'Cookie 与 Session 的协作:服务器创建 Session→SessionID 通过 Set-Cookie 发给客户端→客户端后续请求自动携带 Cookie(SessionID)→服务器根据 SessionID 查找 Session——Cookie 是"门票",Session 是"保险箱";Cookie 被偷=SessionID 泄露(会话劫持)。'),
      block('反例:Session 管理的两种事故', '事故一:分布式部署用本地 Session——LB 轮询到其他节点→Session 找不到→用户被踢出;修复=集中存储(Spring Session Redis)。事故二:Cookie 未设 HttpOnly——JS 可读取 SessionID(XSS 攻击窃取会话);修复=HttpOnly+Secure+SameSite(Cookie 安全三属性)。'),
      block('取舍:JWT vs Session 的选择', 'JWT:无状态(不查存储)+跨域友好+撤销难(黑名单,第 22 题);Session:有状态(查存储)+撤销即时(删服务端记录)+分布式需要集中存储——选择=撤销需求+部署架构+运维能力的综合判断(第 22 题选择框架)。'),
    ],
    [
      block('验证:Cookie/Session 的走查核对', '验证:Cookie 属性断言(HttpOnly/Secure/SameSite 设置生效);Session 共享断言(多实例部署下 Redis Session 可用);互踢断言(新登录踢旧 Session,第 129 题认证体系);Cookie 安全断言(XSS 场景 HttpOnly 防 JS 读取)。验证:四组断言可程序化(浏览器 DevTools+服务端日志)。'),
      block('追问链:会话三刀', '一刀:"Cookie 的 SameSite?"——Strict(跨站导航也不带)/Lax(导航 GET 带,POST 不带,默认推荐)/None(总是带,需 Secure)——SameSite 是 CSRF 的浏览器层防御(第 23 题 CSRF)。二刀:"Session 的超时?"——服务端 Session 超时(web.xml/配置)+Cookie 的 Max-Age(客户端 Cookie 存活)——两者独立配置,Session 超时是安全边界(第 129 题认证)。三刀:"分布式 Session 的一致性?"——Redis 集中存储:所有节点读写同一 Redis(强一致);Session 复制:节点间异步同步(最终一致)——一致性要求高选集中存储。'),
    ],
    ['Cookie=门票,Session=保险箱', '分布式 Session=集中存储最常用', 'JWT vs Session 按撤销需求选'], [owasp, sre],
  ),
  'legacy/55': deep(
    '常见设计模式：单例（手写双重检查）、工厂、代理、观察者、策略',
    '网银支付沙盘:支付渠道选择(策略模式)+支付结果通知(观察者模式)+支付网关(代理模式)+支付处理器(单例)+支付工厂(工厂模式)——设计模式在支付场景的自然映射。',
    [
      '单例(Singleton):全局唯一实例——手写双重检查锁(volatile+两次判空,第 8 题 java-language)或枚举(天然防反射防序列化);风险=全局状态(测试难,第 37 题)+并发初始化(双重检查)。替代=DI 容器单例(Spring @Component)。',
      '工厂(Factory):封装对象创建逻辑——简单工厂(一个工厂方法按参数创建)/工厂方法(每个产品一个工厂)/抽象工厂(产品族)——支付场景:PaymentFactory.create("alipay") 返回对应渠道实例;新增渠道只加工厂+产品类(开闭原则)。',
      '代理(Proxy):控制对目标对象的访问——静态代理(手写)/动态代理(JDK 接口代理/CGLIB 类代理,第 87 题);Spring AOP 就是代理模式(第 9 题代理边界);支付场景:支付代理(日志/重试/熔断包裹真实支付调用)。',
      '观察者(Observer):一对多依赖,主题变化通知所有观察者——支付成功后通知库存/通知/积分(多个观察者);Spring 事件机制(ApplicationEvent+@EventListener,第 91 题);观察者的执行顺序与异常处理(一个观察者失败不影响其他,第 91 题)。',
      '策略(Strategy):定义算法族,运行时切换——支付渠道选择(微信/支付宝/银联各一个策略);策略模式消除 if-else 分支(策略选择交给工厂或配置);与状态模式的区别(策略=客户端选择,状态=内部状态驱动切换)。',
    ],
    [
      block('机制:设计模式是"经验的命名"', '设计模式=前人总结的"可复用的解决方案模板"——不是必须使用的"规则",是描述架构决策的"共同语言"(说"策略模式"=对方立刻理解"算法族+运行时切换")。类比的沟通效率:"用观察者解耦"比"用事件通知机制解耦"更简洁。'),
      block('反例:设计模式滥用的两种事故', '事故一:为模式而模式——所有类都套单例/工厂(过度设计,第 49 题);修复=简单场景直接 new,复杂场景才用模式。事故二:模式选择错误——用单例存可变状态(线程安全风险,第 47 题);修复=状态放有作用域的 bean(prototype/session)。'),
      block('取舍:模式的应用原则', '模式=解决"已出现的问题",不是预防"可能的问题"(YAGNI);先写简单代码,出现"重复/耦合/扩展难"再重构为模式(重构有据);模式的评审要点=是否解决真实问题+是否引入额外复杂度(第 49 题过度设计判定)。'),
    ],
    [
      block('验证:设计模式的走查核对', '验证:单例断言(双重检查锁在并发下实例唯一);工厂断言(新增渠道不改调用方——开闭原则);代理断言(代理前后行为一致+代理增强了横切逻辑);观察者断言(事件触发→多观察者各自执行);策略断言(运行时切换支付渠道——策略可替换)。验证:五组断言可用单元测试覆盖(设计模式的经典教学场景)。'),
      block('追问链:模式三刀', '一刀:"Spring 中的设计模式?"——单例(默认 scope)/工厂(BeanFactory)/代理(AOP)/观察者(ApplicationEvent)/策略(Resource 加载策略)/模板方法(JdbcTemplate)——Spring 是设计模式的教科书(第 148 题架构)。二刀:"设计模式与 SOLID?"——开闭原则→策略/装饰器;单一职责→每个模式聚焦一个问题;依赖倒置→工厂+接口——模式是 SOLID 的具体实现手段。三刀:"模式的过度使用?"——三层嵌套工厂+五层代理=过度设计(第 49 题);模式的引入时机=痛点出现(重复代码/硬编码/紧耦合)再重构,不是"提前设计"。'),
    ],
    ['模式=经验的命名,不是规则', '支付场景:策略+工厂+代理+观察者', '痛点出现再重构,不为模式而模式'], [pod, sre],
  ),
  'legacy/56': deep(
    'Git：merge 与 rebase 区别？冲突如何处理',
    '网银团队沙盘:feature 分支开发完成后合入 main——merge(保留分支历史,创建合并节点)vs rebase(线性历史,变基到目标分支)——团队的选择=历史可读性 vs 安全性。',
    [
      'merge:创建合并节点(两个父节点)——保留完整分支历史("这个功能在哪个分支开发的");历史非线性(有分叉),但安全(不改变已有提交,第 49 题可回滚);适合:公共分支(main/release)的合入。',
      'rebase:将当前分支的提交"搬到"目标分支末尾(重写提交哈希)——历史线性(一条直线);危险=改变已有提交哈希(已推送的提交 rebase 后产生"重复提交");适合:个人 feature 分支(未推送的提交 rebase 到 main 上,保持线性)。',
      '冲突处理:两边修改同一行→Git 无法自动合并→标记冲突(<<<<<<< HEAD ======= >>>>>>>)→人工选择保留哪边/融合→git add 标记解决→继续 merge/rebase——冲突的预防=小步提交+频繁 rebase(减少 divergence)。',
    ],
    [
      block('机制:merge 与 rebase 的历史观差异', 'merge 保留"事实"(确实在分支上开发的);rebase 保留"整洁"(历史像一次完成的)——两种历史观各有价值:merge 的分叉历史真实反映开发过程;rebase 的线性历史更易阅读(cherry-pick/bisect 更方便)。类比历史书:编年体(线性)vs 纪事本末体(分叉)。'),
      block('反例:Git 操作的两种事故', '事故一:公共分支 rebase——rebase 改写了已推送的提交→其他人的分支出现"幽灵提交"(冲突+重复);修复=黄金法则:已推送的公共分支不 rebase。事故二:merge 时未拉取最新——merge 基于旧的 main→合并后又需再 merge;修复=merge 前先 git pull(或 rebase)。'),
      block('取舍:团队 Git 工作流的选型', 'Git Flow(master+develop+feature+release+hotfix——适合有版本发布周期)vs GitHub Flow(main+feature——适合持续部署)+Trunk Based(主干+短命分支,第 39 题灰度)——按"发布频率+团队规模+回滚需求"选;小团队持续部署:GitHub Flow 或 Trunk Based。'),
    ],
    [
      block('验证:Git 操作的走查核对', '验证:merge 断言(合并节点创建+分支历史保留);rebase 断言(提交哈希改变+线性历史);冲突断言(冲突标记生成+解决后 continue);rebase 危险断言(已推送分支 rebase 后 force push 导致协作者问题)——四组固化 Git 操作语义;Git Flow 的演练(分支创建/合并/冲突/回滚)。'),
      block('追问链:Git 三刀', '一刀:"squash merge?"——将 feature 分支的多个提交合并为一个(合入 main 时只留一个提交)——保持 main 历史整洁,丢失分支内的细粒度历史;适合"feature 分支内的 WIP 提交"。二刀:"cherry-pick?"——从其他分支摘取特定提交(不合并整个分支)——适合"只想要某个 bug fix";cherry-pick 也改变哈希。三刀:"Git hook?"——pre-commit(提交前检查)/pre-push(推送前检查)/post-merge(合并后操作)——Git hook 与 CI/CD 联动(本地检查+远端门禁,第 151 题质量闸)。'),
    ],
    ['merge 保留历史,rebase 线性整洁', '公共分支不 rebase(黄金法则)', '冲突预防=小步提交+频繁 rebase'], [pod, sre],
  ),
  'legacy/57': deep(
    '什么是大模型？token 是什么',
    '网银 AI 应用沙盘:大模型(LLM)=大规模预训练的语言模型(GPT/Claude/GLM),token=模型的文本切分单位(不是"词",是"子词")——token 是计费与上下文长度的计量单位。',
    [
      '大模型(LLM):基于 Transformer 架构的大规模预训练语言模型——参数量(十亿到万亿级)+训练数据(海量文本)+能力(文本生成/理解/推理/对话);LLM 不是数据库(不能"查询事实"),是"语言模型"(基于训练分布生成文本——第 31 题知识归 RAG)。',
      'token:模型处理文本的最小单位——中文≈1-2 字/token(取决于 tokenizer),英文≈1 词/1-3 token;token 计量=输入 token(提示词+上下文)+输出 token(生成的回答)——计费与上下文窗口都按 token 计(第 22 题预算)。',
      '上下文窗口:模型一次能处理的最大 token 数(GPT-4 128K/Claude 200K)——窗口内所有内容(系统提示+检索片段+对话历史+用户问题)共享窗口;超出窗口→截断或压缩(第 32 题)——窗口越大成本越高(KV Cache 第 33 题)。',
    ],
    [
      block('机制:LLM 的"知识"来自训练分布', 'LLM 的知识=训练数据的压缩表示(参数中的统计模式)——不是"查询"而是"生成"(基于上下文预测下一个 token);训练截止日期后的知识=不知道(幻觉风险)——RAG 解决这个问题(检索最新知识注入上下文,第 31 题职责分离)。'),
      block('反例:LLM 理解偏差的两种事故', '事故一:把 LLM 当搜索引擎——"帮我查最新利率"→LLM 用训练时的旧数据回答(过时);修复=RAG 注入最新数据。事故二:把 token 当"字"——中文字符与 token 不是 1:1(一个汉字≈1-2 token,一个英文词≈1-3 token);计费与窗口估算要按 token 而不是字符数(第 22 题)。'),
      block('取舍:模型选型的维度', '能力(通用/代码/数学/多语言)+窗口大小(4K/32K/128K/200K)+成本(输入/输出单价)+延迟(首 token/生成速度)+合规(数据出境/私有化部署,第 45 题)——模型选型=多维矩阵(第 35 题量化矩阵同构),用业务评测集实测(不按榜单选)。'),
    ],
    [
      block('验证:LLM 概念的走查核对', '验证:token 计数断言(中文/英文的 token 数与字符数不同——tokenizer 实测);上下文窗口断言(超窗口→截断或报错);知识截止断言(训练后事件→模型不知道);幻觉断言(要求模型输出不存在的事实→可能编造)。验证:概念断言可程序化(调用 API 实测);Y1 成本模型的 token 计量可复用。'),
      block('追问链:LLM 三刀', '一刀:"LLM 的 temperature?"——控制随机性:0=确定性(同输入同输出)>0=随机性(创造性任务)——温度低→稳定(适合结构化输出),温度高→多样(适合创意);temperature=0 也有微小随机(浮点精度)。二刀:"大模型 vs 小模型?"——大模型=能力强+成本高+延迟高;小模型=能力弱+成本低+延迟低——路由(第 22 题)按任务复杂度分配。三刀:"私有化部署 vs API?"——API=能力强+成本线性+数据出境;本地=能力弱+成本前置+数据不出域(第 45 题混合路由)。'),
    ],
    ['LLM=生成模型,不是搜索引擎', 'token 计量≠字符数', '知识截止→RAG 补充最新知识'], [rag, paged],
  ),
  'legacy/58': deep(
    '上下文窗口是什么？超出了怎么办',
    '网银长文档沙盘:一份 50 页制度文档(约 50K token)+系统提示+对话历史=超出 32K 窗口——处理方案=压缩(第 32 题)/检索(只送相关片段)/分批(分段处理)。',
    [
      '上下文窗口=模型一次能处理的 token 上限——窗口内的内容:系统提示+检索片段+对话历史+用户问题,共享同一窗口——窗口外的内容模型"看不到"(不是截断后可搜索,是完全消失)。',
      '超窗口的解法:检索(只送相关片段,不是全文——RAG 的核心思想)、压缩(摘要化低分证据,第 32 题)、分批(长文档分段处理,每段独立回答后汇总)、选更大窗口的模型(成本↑)。',
      '窗口预算的分配:系统提示(固定)+检索证据(按重排分数排序,第 26 题)+对话历史(第 23 题保留策略)+用户问题——各部分的预算按"对答案的贡献度"分配(第 26 题排布)。',
    ],
    [
      block('机制:窗口与 KV Cache 的关系', '窗口大小直接决定 KV Cache 的内存占用(第 33 题乘积公式:并发×上下文×层×头×维×2)——窗口越大→单请求 KV 越大→同显存支持的并发越少——窗口不仅是"能处理多少"也是"成本多少"(第 22 题预算的容量维度)。'),
      block('反例:窗口管理的两种事故', '事故一:全量塞入——把整个文档(50K)塞入窗口→KV 巨大+注意力稀释(第 26 题位置效应);修复=RAG 检索相关片段(只送 2-5K)。事故二:截断丢关键证据——按 token 截断(不是按证据边界)→关键条款被截(第 8 题结构切分的教训);修复=按证据块截断(保留完整证据)。'),
      block('取舍:窗口大小的选型', '大窗口(128K/200K):能装更多但成本高+注意力稀释(第 26 题);小窗口(4K/8K):需要精细的检索与压缩——窗口不是越大越好,按"任务需要的证据量"选(大多数问答 8K 足够);窗口=成本×质量×并发的三角权衡(第 33 题)。'),
    ],
    [
      block('验证:窗口管理的走查核对', '验证:窗口预算断言(系统提示+证据+历史+问题的 token 总和≤窗口);超窗口断言(超限时压缩或截断——不是静默丢内容);RAG 断言(检索片段的总 token<窗口的 50%——留余量给生成)。验证:token 计数的断言可程序化(tokenizer API 实测);窗口管理的验收=答案质量(第 49 题)。'),
      block('追问链:窗口三刀', '一刀:"长文档怎么处理?"——切分→逐段嵌入→检索相关片段(RAG,第 7 题)——不是"全文塞入";分段策略影响检索质量(第 8 题结构切分)。二刀:"多轮对话的窗口?"——历史累积→超出窗口→压缩或丢弃早期轮次(第 23 题保留策略);约束类信息进摘要(不丢承诺)。三刀:"窗口与模型的选型?"——窗口大小是模型选型的维度之一(第 57 题):长文档场景选大窗口,短对话场景选小窗口(成本低)——窗口=成本×质量×并发的三角。'),
    ],
    ['窗口=系统提示+证据+历史+问题,共享上限', '超窗口→检索/压缩/分批', '窗口=成本×质量×并发三角'], [lingua, middle],
  ),
  'legacy/59': deep(
    '什么是幻觉？temperature 的作用',
    '网银 AI 问答沙盘:模型自信地输出"2024 年利率为 0.5%"(实际 3.5%)——幻觉=模型生成不存在或错误的内容(但流畅且自信);temperature 控制输出的随机性(0=确定性,1=创造性)。',
    [
      '幻觉的机制:LLM 基于训练分布生成文本——当上下文不足或问题超出训练分布时,模型"编造"看似合理的答案(语言流畅但事实错误);幻觉不是 bug 而是生成模型的固有特性(概率生成≠事实正确)。',
      '幻觉的分类:事实幻觉(编造不存在的事实——虚构法条/日期/数字)、忠实度幻觉(检索内容存在但答案与内容不符——过度推断/缝合)、指令幻觉(编造引用编号,第 28 题)——每类的检测与防御不同。',
      'temperature:采样温度参数——0=贪心解码(每次选最高概率 token,确定性输出);<1=低温(更保守,倾向高概率 token);>1=高温(更多样,倾向低概率 token)——温度影响幻觉概率:高温增加幻觉风险(更多样=更多错误可能),低温减少但可能重复。',
    ],
    [
      block('机制:幻觉为什么"流畅且自信"', 'LLM 的训练目标是"预测下一个 token"(语言流畅),不是"验证事实正确"——幻觉文本的语言特征与正确文本相同(流畅/有逻辑/自信),区别只在事实层面;这就是为什么幻觉"难检测"(语言特征无法区分)——需要事实校验(检索比对)而非语言特征判断。'),
      block('反例:幻觉的两种事故', '事故一:数字幻觉——利率/金额/日期被编造(金融场景资损级);修复=RAG(检索真实数据)+断言级忠实度评估(第 24 题)+数字类人工复核(第 28 题)。事故二:引用幻觉——编造引用编号(第 28 题)或引用错误来源;修复=程序化校验(编号∈上下文清单)+引用定位(第 27 题)。'),
      block('取舍:temperature 的场景化设置', '结构化输出(JSON/代码):temperature=0(确定性,格式稳定);创意写作:temperature=0.7-1.0(多样性);金融问答:temperature=0-0.3(确定性优先,减少幻觉);temperature 的选择也是"质量门禁"的参数(第 49 题:不同温度的评测对照)。'),
    ],
    [
      block('验证:幻觉与 temperature 的走查核对', '验证:幻觉检测断言(构造"语料无答案"的问题→模型可能编造→忠实度评估拦截);temperature 对照断言(同 prompt 不同温度的输出多样性);RAG 断言(检索上下文注入后幻觉率下降——RAG 的核心价值);拒答断言(temperature=0+忠实约束→"我不知道"而非编造)。验证:幻觉率可程序化(忠实度评估+人工抽检);temperature 的对照实验可复跑。'),
      block('追问链:幻觉三刀', '一刀:"RAG 能完全消除幻觉吗?"——不能:检索到正确证据+模型仍然可能过度推断(忠实度幻觉)——RAG 减少"知识缺失型幻觉",不消除"推理型幻觉"(第 24 题)。二刀:"幻觉的检测手段?"——断言级忠实度评估(第 24 题)+人工抽检+一致性检验(多轮生成对比)——全自动检测有漏检(评估器本身也是模型)。三刀:"幻觉的业务影响分级?"——数字/日期/法规引用=高风险(资金/合规);描述性文本=低风险(可人工审核)——幻觉的业务影响决定防御强度(第 28 题复核触发器)。'),
    ],
    ['幻觉=概率生成的固有特性', 'temperature 0=确定性,高=多样', 'RAG 减少知识缺失型,不消除推理型'], [rag, judge],
  ),
  'legacy/60': deep(
    '平时用哪些 AI 工具？如何验证它生成的代码',
    '网银开发沙盘:AI 辅助编程(Copilot/ChatGPT/Claude)提升效率——但生成的代码不可盲信:验证=编译通过+逻辑审查+安全扫描+测试覆盖,四道闸缺一即漏。',
    [
      'AI 工具的用途:代码补全(Copilot——根据上下文生成代码)、代码解释(理解陌生代码)、bug 排查(描述现象→AI 给出排查方向)、文档生成(注释/README)、测试生成(单测脚手架)——每个用途的验证标准不同。',
      '验证四道闸:编译(语法正确——AI 生成可能编译不过)、逻辑(人工审查——AI 可能逻辑错误,第 42 题裁判偏差)、安全(扫描——AI 可能生成有安全漏洞的代码,OWASP 模式)、测试(单测覆盖——AI 生成的代码需要测试验证行为)。验证的纪律=AI 代码与人工代码走同样的质量闸(第 151 题四道闸),不因"AI 生成的"降低标准。',
      'AI 工具的边界:AI 擅长(样板代码/常见模式/文档/测试脚手架);AI 不擅长(业务逻辑/架构设计/安全敏感代码/需要上下文的改动)——AI 是"加速器"不是"替代者"(开发者需理解并验证 AI 产出)。',
    ],
    [
      block('机制:AI 生成的代码=不可信输入', 'AI 生成的代码与第三方开源代码同级(不可信输入,第 25 题同级思维)——需要走同等的验证流程(编译+审查+扫描+测试);AI 的训练数据可能包含过时模式(旧版 API)或不安全模式(SQL 注入)——生成≠正确。'),
      block('反例:AI 代码的两种事故', '事故一:AI 生成 SQL 注入代码——字符串拼接 SQL(OWASP 模式)未被发现直接上线;修复=静态扫描+安全审查(第 151 题)。事故二:AI 生成的依赖版本过时——使用了已废弃的 API(编译警告被忽略)→运行时异常;修复=编译验证+依赖审计。'),
      block('取舍:AI 工具的效率与风险平衡', '高效率场景:样板代码(POJO/DTO/配置——模式固定,风险低)+文档生成(人审)+测试脚手架(人工补关键场景);低效率场景:核心业务逻辑(需要业务理解)+安全敏感代码(认证/加密/权限)+架构决策(需要全局视角)——AI 工具的适用面=风险与效率的平衡(第 158 题场景评分)。'),
    ],
    [
      block('验证:AI 代码的走查核对', '验证:编译断言(AI 生成代码编译通过);审查断言(人工审查发现逻辑错误——AI 可能写出"编译通过但逻辑错"的代码);安全断言(静态扫描发现 SQL 注入/XSS);测试断言(单测覆盖 AI 生成的核心逻辑)——四道闸与人工代码同标准(第 151 题)。'),
      block('追问链:AI 工具三刀', '一刀:"AI 生成的测试怎么验?"——AI 生成的单测可能"测了个寂寞"(断言过弱——只验证不抛异常);修复=人工审查断言强度(第 151 题评审)。二刀:"AI 工具的提示词?"——好的提示词=上下文充分(项目规范/技术栈/代码风格)+约束明确(禁止什么+要求什么)——提示词工程(第 116 题)适用于编程工具。三刀:"AI 工具的安全数据?"——AI 工具可能上传代码到云端(数据出境/隐私,第 8 题发送范围);企业场景需审查 AI 工具的数据策略(本地部署 vs 云端)。'),
    ],
    ['AI 生成=不可信输入,走同等质量闸', '编译+审查+扫描+测试,四道闸', 'AI 是加速器,验证不能省'], [owasp, sre],
  ),

  'legacy/61': deep(
    'HashMap 扩容过程？链表转红黑树的条件？JDK7 头插法死循环问题',
    '网银缓存沙盘:HashMap 扩容(容量×2+rehash 迁移)+树化(链长≥8 且桶≥64)+JDK7 头插法并发死循环——collections 61 题的完整版(容量规划/树化/并发安全详见 collections 模块)。',
    [
      '扩容过程:put 时 size>容量×负载因子(默认 0.75)→resize(容量×2)→JDK 8 按 (hash & oldCap) 位拆高低链表(单桶 O(1) 迁移,不是全部重 hash)——扩容代价=全表迁移(尾延迟抖动)。',
      '树化条件:链长≥8(TREEIFY_THRESHOLD)且桶数≥64(MIN_TREEIFY_CAPACITY)——桶数<64 时优先扩容(稀释)而非树化(第 4 题 collections);退化:节点≤6(扩容拆分)或 remove 导致树过小(removeTreeNode)。',
      'JDK 7 头插法死循环:并发扩容时头插法导致链表成环(e→next→e)→get 自旋 100% CPU;JDK 8 改尾插(新节点追加到尾部)消除环——但 JDK 8 并发 put 仍有数据丢失(只是不死循环,第 2 题 collections)。',
    ],
    [
      block('机制:扩容的 rehash 迁移', 'JDK 8 的 rehash 优化:每个节点的新位置要么是原位置,要么是原位置+oldCap(hash & oldCap 决定高低位)——拆分后只需链表操作,不用重新计算 hash;JDK 7 需要对每个节点重新 hash(性能差+头插法反转链表顺序)。'),
      block('反例:HashMap 的三种事故', '事故一:并发 put 数据丢失——JDK 8 并发 put 同桶→互相覆盖(无锁);修复=ConcurrentHashMap。事故二:初始容量不足——频繁扩容(每次全表迁移);修复=按"元素数/0.75 取 2 的幂"预分配(第 1 题 collections 容量规划)。事故三:自定义键的 hashCode 不一致——equals 相等但 hashCode 不同→哈希容器中"丢失";修复=hashCode 与 equals 一致(第 2 题 collections 契约)。'),
      block('取舍:HashMap vs ConcurrentHashMap 的选型', 'HashMap:单线程/方法内局部变量/只读共享(不可变包装);ConcurrentHashMap:多线程读写共享;Collections.synchronizedMap:低并发+兼容旧 API(第 2 题 collections 的选型)——判据一句话:并发读写选 CHM,只读选不可变包装,别让 HashMap 出现在共享可变位置。'),
    ],
    [
      block('验证:HashMap 行为的走查核对', '验证:本机 C 系列实验——容量规划(C1:1000→1024 桶,768 触发扩容);树化(C4:16 桶 30 键→64 桶才树化;128 桶 12 键直接树化);并发丢失(C2:HashMap 并发 put size<预期);JDK7 死循环(标注:JDK 7 环境复现,17 上不存在)。验证:扩容/树化/并发的断言可程序化(--add-opens 反射读 table)。'),
      block('追问链:HashMap 三刀', '一刀:"负载因子为什么是 0.75?"——空间与时间的折中:负载因子高(0.9)→空间省但冲突多查询慢;低(0.5)→冲突少但内存浪费——0.75 是泊松分布的经验值(链长>8 的概率极低,第 4 题)。二刀:"树的退化条件?"——扩容拆分≤6(UNTREEIFY_THRESHOLD)+remove 导致树过小(removeTreeNode 内检查)——两条退化路径(第 4 题 collections 详解)。三刀:"HashMap 的 null key?"——允许一个 null key(hash=0,存在桶 0)——CHM 不允许 null key/value(第 18 题 collections)。'),
    ],
    ['扩容×2,高低位拆分 O(1) 迁移', '树化=链 8+桶 64 双条件', 'JDK7 死循环已修,并发仍不安全'], [jls17, api('java/util/HashMap')],
  ),
  'legacy/62': deep(
    'ConcurrentHashMap：JDK7 分段锁与 JDK8 CAS + synchronized 的区别？size 如何统计',
    '网银计数沙盘:CHM 的并发演进(JDK7 Segment 分段锁→JDK8 CAS+synchronized)+size 的弱一致(CounterCell 分散计数)——collections 15/19 题的完整版。',
    [
      'JDK 7 Segment:默认 16 段,每段一把 ReentrantLock——并发度=段数(16);JDK 8:取消 Segment,桶空=CAS 插入(casTabAt),桶非空=synchronized(锁链头 Node)——并发度=桶数(更细粒度)。',
      'size 的弱一致:CounterCell 分散计数(baseCount+多个 cell,线程绑 cell)→size=遍历求和(无锁快照)——求和瞬间 cell 可能未并入(弱一致,第 19 题 collections);精确控制用 Semaphore/AtomicLong(不是 CHM.size)。',
      '扩容:多线程协助扩容(helpTransfer——ForwardingNode 标记已迁移桶,写线程遇到则协助搬移)——扩容与读写并行(CHM 的独特能力,HashMap 扩容阻塞读写)。',
    ],
    [
      block('机制:Segment→CAS+synchronized 的演进原因', 'JDK 7 的 Segment 粒度粗(16 段,每段一把锁)——并发度上限 16;JDK 8 的桶级锁:锁粒度=单桶(不同桶并行)+空桶 CAS(无锁插入)——并发度=桶数(更细粒度且消除段结构)。演进的本质=锁粒度从"段"细化到"桶"。'),
      block('反例:CHM 的两种事故', '事故一:computeIfAbsent 函数内递归修改同 map——IllegalStateException/死锁;修复=函数内不改同 map(先 putIfAbsent 占位再异步完成,第 17 题 collections)。事故二:函数内长 IO——桶头锁被占,同桶操作全部阻塞(第 17 题 collections);修复=占位+异步完成(putIfAbsent(key, future) 模式)。'),
      block('取舍:CHM vs HashMap vs synchronizedMap', 'CHM:并发读写(读无锁+写桶锁)——读多写多首选;HashMap:单线程/局部;Collections.synchronizedMap:全表锁(串行化,第 2 题 collections)——性能:CHM 91ms vs synchronizedMap 233ms(本机 C2 实测,2.5 倍差距)——判据一句话:并发读写选 CHM。'),
    ],
    [
      block('验证:CHM 的走查核对', '验证:本机 C2 实验(8 线程 40 万 ops,CHM 91ms vs synchronizedMap 233ms);C4 实验(树化轨迹:16→32→64 才树化);弱一致(C19:size 限流穿透——105 并发请求全通过);原子 API(C15:putIfAbsent 并发只执行一次加载)。验证:并发吞吐/原子性/弱一致断言可程序化。'),
      block('追问链:CHM 三刀', '一刀:"CHM 的 null 键值?"——不允许(null 在并发下歧义:不存在还是值为 null);修复=哨兵对象或 Optional(第 18 题 collections)。二刀:"CHM 的迭代器?"——弱一致(不抛 CME,反映创建时或之后的部分更新)——遍历统计要容忍弱一致(第 19 题)。三刀:"CHM 的树化?"——同 HashMap(链 8+桶 64)——并发下的树化由桶头锁保护(第 4 题 collections 的树化追问)。'),
    ],
    ['JDK7 Segment→JDK8 桶级锁', 'size 弱一致,精确用 Semaphore', '扩容与读写并行(helpTransfer)'], [juc, api('java/util/concurrent/ConcurrentHashMap')],
  ),
  'legacy/63': deep(
    'CAS 原理？ABA 问题与 AtomicStampedReference',
    '网银无锁沙盘:CAS(compare-and-swap)=CPU 原子指令(cmpxchg)——乐观并发(失败重试不排队);ABA 问题(值从 A→B→A,CAS 无法感知中间变化)→版本戳解决。',
    [
      'CAS 的三操作数:内存位置 V/预期值 A/新值 B——V==A 则设 V=B(成功),否则失败(重试或放弃);CAS 是 CPU 原子指令(x86 lock cmpxchg,并发基础 13 题),JDK 的 Atomic 类底层依赖 Unsafe.compareAndSwap。',
      'ABA 问题:值从 A→B→A,CAS 只比较当前值(A==A 成功)——中间变化未感知;危害:引用被复用(无锁栈的节点被回收再分配)→结构损坏;解决:AtomicStampedReference(版本戳,每次修改 stamp+1——CAS 同时比较引用与戳记)。',
      'CAS vs 锁:CAS(无锁,无上下文切换,高争用下 CPU 空转)+锁(有挂起/唤醒,高争用下排队)——低争用 CAS 优于锁;高争用下 LongAdder 分片(并发基础 13 题)优于 AtomicLong 单值竞争。',
    ],
    [
      block('机制:ABA 的危害依赖"引用复用"', 'ABA 的危害=引用被回收又重新使用(对象池/手写无锁结构/离堆内存)——看似没变的引用背后结构已经变了;GC 语言的"新建不复用"就能规避(被弹出节点的内存不会被第三方重用,AtomicReference 的栈就是这么规避的,并发进阶 14 题)。'),
      block('反例:CAS 的两种事故', '事故一:高争用 AtomicLong——128 线程累加,CPU 飙升(重试空转,并发基础 13 题);修复=LongAdder 分片。事故二:自旋无退避——CAS 失败立即重试(CPU 100%);修复=退避(yield/park 短暂)或限制重试次数。'),
      block('取舍:CAS vs 锁的决策', '低争用+单变量:CAS(Atomic 类,快);高争用计数:LongAdder(分片);多变量一致性:锁(原子性);引用复用+无锁结构:AtomicStampedReference(版本戳)——"竞争强度×变量数×是否复用"三维决定。'),
    ],
    [
      block('验证:CAS 的走查核对', '验证:CAS 原子性断言(并发 incrementAndGet=精确计数);ABA 复现(AtomicReference 无法感知 A→B→A——结构损坏);StampedReference 断言(版本戳拦截 ABA);LongAdder 对照(高争用下吞吐优于 AtomicLong,并发基础 13 题对照)。验证:并发实验可程序化(线程数可控+计数断言)。'),
      block('追问链:CAS 三刀', '一刀:"CAS 的 ABA 在计数场景要担心吗?"——纯计数只关心数值不关心历史(ABA 无害);需要"中间没变过"语义(无锁栈节点复用)才需要版本戳(并发进阶 14 题边界)。二刀:"CAS 与 volatile?"——volatile 保证可见性但不保证原子性(i++ 仍不安全);CAS=volatile+原子性(底层 lock 前缀保证可见性+原子性)。三刀:"CAS 失败重试的退避?"——立即重试(CPU 空转)vs 指数退避(yield/park)——低争用立即重试,高争用退避(LongAdder 的 Cell 迁移是另一种解法)。'),
    ],
    ['CAS=CPU 原子指令,乐观并发', 'ABA 需版本戳(引用复用场景)', '低争用 CAS,高争用分片或锁'], [juc, api('java/util/concurrent/atomic/AtomicStampedReference')],
  ),
  'legacy/65': deep(
    'AQS 原理（state + CLH 队列）？ReentrantLock 与 synchronized 区别',
    '网银锁沙盘:AQS(队列同步器)=state(原子状态)+CLH 变体队列(等待线程)+模板方法(tryAcquire/tryRelease)——ReentrantLock 与 synchronized 的底层差异(AQS vs ObjectMonitor)。',
    [
      'AQS 核心:volatile int state(CAS 修改)+CLH 变体双向队列(等待线程)+模板方法(子类实现 tryAcquire/tryRelease);独占模式(ReentrantLock——tryAcquire 返回 boolean)与共享模式(Semaphore/CountDownLatch——tryAcquireShared 返回 int,并发进阶 2 题)',
      'ReentrantLock:可重入(state 计数——同线程多次 acquire 递增,release 递减)+公平/非公平(是否检查队列)+tryLock(限时获取)+lockInterruptibly(可中断)+Condition(多条件队列);synchronized:JVM 内置(ObjectMonitor)+自动释放+不可中断+无公平模式(并发基础 23 题)。',
      'CLH 队列的节点状态:waitStatus 四态(CANCELLED/SIGNAL/CONDITION/PROPAGATE)——独占流程:获取失败→shouldParkAfterFailedAcquire(前驱置 SIGNAL)→park;释放→unpark 后继(并发进阶 2 题详解)。',
    ],
    [
      block('机制:AQS 为什么是"模板方法模式"', 'AQS 定义了"队列管理+挂起唤醒+取消+超时"的骨架(不变),子类只需实现 tryAcquire/tryRelease(获取/释放的状态协议)——ReentrantLock 的 tryAcquire=state 0→1+CAS;Semaphore 的 tryAcquireShared=state>0 则减 1——一个框架承载两种模式(并发进阶 2 题的"模板方法"分析)。'),
      block('反例:锁选择的两种事故', '事故一:synchronized 无法 tryLock——锁竞争激烈时线程永久阻塞(无法限时获取);修复=ReentrantLock.tryLock(timeout)。事故二:ReentrantLock 忘记 unlock——finally 中未 unlock→锁永久占用(其他线程永久等待);修复=finally{lock.unlock()}(synchronized 自动释放的优势)。'),
      block('取舍:ReentrantLock vs synchronized 的选型', '需要高级功能(tryLock/可中断/公平/Condition)→ReentrantLock;简单互斥(synchronized 简洁+不易漏解锁)→synchronized;synchronized 的性能(JDK 6 后偏向锁/轻量级锁优化,并发基础 23 题)——大多数场景 synchronized 足够,ReentrantLock 的价值在高级功能。'),
    ],
    [
      block('验证:AQS 的走查核对', '验证:可重入断言(同线程多次 lock→holdCount 递增);公平/非公平断言(公平锁先到先得,非公平锁插队);Condition 断言(await/signal 的队列对应,第 26 题并发基础);AQS 队列断言(jstack 观察 WAITING 线程的 park 调用栈)。验证:锁行为断言可程序化(AQS 的功能覆盖测试)。'),
      block('追问链:AQS 三刀', '一刀:"AQS 的 PROPAGATE 状态?"——共享模式的"迟到的传播信号"(防止唤醒在链中间丢失,并发进阶 2 题)——共享源码最难读的一段,但理解它=理解共享模式的精髓。二刀:"Condition 与 Object.wait?"——Condition 支持"多条件队列"(notFull/notEmpty 各一个队列,精准唤醒);Object.wait 只有一条队列(notify 随机挑人,第 26 题并发基础)。三刀:"AQS 的可重入实现?"——state 计数(同线程 acquire→state+1)+owner 线程记录(ExclusiveOwnerThread)——release 时 state-1 到 0 才真正释放。'),
    ],
    ['AQS=state+CLH 队列+模板方法', 'ReentrantLock 高级功能,synchronized 简洁', 'CLH 队列 waitStatus 四态'], [juc, api('java/util/concurrent/locks/AbstractQueuedSynchronizer')],
  ),
  'legacy/66': deep(
    '公平锁与非公平锁？读写锁、StampedLock 的适用场景',
    '网银锁沙盘:非公平锁吞吐高(插队)但可能饥饿;公平锁有序但慢——读写锁读写分离(读并发写互斥);StampedLock 乐观读(无锁读,校验戳)。',
    [
      '公平 vs 非公平:公平=严格 FIFO(先到先得,防止饥饿,吞吐略低——每次获取都检查队列);非公平=新请求可插队(吞吐高但可能饥饿);ReentrantLock 默认非公平(吞吐优先),公平模式构造参数指定(true)。',
      'ReentrantReadWriteLock:读锁共享(多线程并发读)+写锁独占(写互斥)——读写分离的收益前提="读临界区足够长且真正只读"(读太短时锁簿记比临界区还贵,并发基础 25 题);写饥饿:读者源源不断→写者拿不到锁(非公平模式下)。',
      'StampedLock:乐观读(先取版本戳→读→校验戳是否变化——不加锁!)→失败则升级读锁重读;不可重入+乐观读期间不能写共享状态;性能优于 ReentrantReadWriteLock(读侧无锁),但 API 易错(并发基础 25 题)。',
    ],
    [
      block('机制:非公平锁的"插队"为什么提升吞吐', '非公平锁:释放锁后,新到的线程可直接 CAS 抢(不等队列)——省去"唤醒队列线程+上下文切换"的成本(唤醒延迟);公平锁:严格按队列顺序(每个新请求都入队等)——吞吐低但无饥饿。类比银行:VIP 客户可插队(非公平,整体吞吐高)vs 严格叫号(公平,但所有人都等)。'),
      block('反例:锁模式的两种事故', '事故一:非公平锁饥饿——写线程长期拿不到读锁(读源源不断);修复=公平模式或写优先策略。事故二:StampedLock 不可重入死锁——同线程二次获取→自锁自己;修复=不用 StampedLock(需要重入时用 ReentrantReadWriteLock)或小心设计(乐观读内不获取其他锁)。'),
      block('取舍:三种锁的适用矩阵', 'ReentrantLock:需要 tryLock/可中断/Condition 时;ReentrantReadWriteLock:读多写少+读临界区较长+需要重入;StampedLock:读极多写极少+不需要重入+性能敏感——三者按"功能需求+性能需求"选(并发基础 25 题的取舍矩阵)。'),
    ],
    [
      block('验证:锁模式的走查核对', '验证:公平/非公平断言(公平锁 FIFO,非公平锁插队——并发压测的获取顺序统计);读写锁断言(读并发/写互斥/写饥饿);StampedLock 乐观读断言(校验失败→升级读锁→重读);不可重入断言(同线程二次获取死锁)。验证:锁行为的断言可程序化(并发压测+线程转储分析)。'),
      block('追问链:锁模式三刀', '一刀:"读写锁的升级?"——读锁升级写锁(ReentrantReadWriteLock 不支持——读锁释放后重新获取写锁,中间可能被插入);降级支持(写锁降读锁——保持原子性)。二刀:"StampedLock 的 tryOptimisticRead?"——返回非零戳(无锁);validate(stamp) 校验——期间有写则校验失败→升级读锁;乐观读是"无锁的读"。三刀:"锁的公平性对性能的影响?"——公平锁吞吐低于非公平(上下文切换多,并发基础 23 题)——非公平是默认(吞吐优先),公平按"饥饿风险"决定是否开启。'),
    ],
    ['非公平吞吐高,公平防饥饿', '读写锁=读并发+写互斥', 'StampedLock 乐观读无锁但不可重入'], [juc, api('java/util/concurrent/locks/StampedLock')],
  ),
  'legacy/67': deep(
    'CountDownLatch、CyclicBarrier、Semaphore 区别与场景',
    '网银并行沙盘:等待 N 个子任务完成(CountDownLatch)、N 个线程互相等( CyclicBarrier)、限制并发数(Semaphore)——三个并发工具的语义差异与选型。',
    [
      'CountDownLatch:一次性倒计数(countDown→0 后所有 await 放行)——"等 N 个任务完成再继续"(主任务等待子任务);不可重置(用完即弃);AQS 共享模式(state=count,countDown 递减,await 等到 0)。',
      'CyclicBarrier:可循环的屏障(N 个线程互相等,全部到齐后一起继续)——"N 个线程互相等到达同一屏障点";可重置(循环使用)+回调动作(屏障打开时执行);broken(一个线程超时/中断→全部 broken)。',
      'Semaphore:信号量(permits 计数,acquire 消耗/release 释放)——"限制并发数"(N 个许可,acquire 获取 release 归还);公平/非公平模式(排队 vs 插队);一次性 vs 可重用:CountDownLatch 一次性,CyclicBarrier/Semaphore 可重用。',
    ],
    [
      block('机制:三工具的语义差异', 'CountDownLatch=倒计时门闩(等 N 件事完成);CyclicBarrier=集合点(N 个线程互相等);Semaphore=限流阀(N 个许可控制并发)——核心区别=谁是"等待的发起者":Latch=主任务等子任务;Barrier=线程互相等;Semaphore=限制进入数。'),
      block('反例:并发工具的两种事故', '事故一:CountDownLatch 计数不匹配——countDown 次数<count→await 永远阻塞;修复=计数与任务数精确匹配(或 tryAwait 带超时)。事故二:Semaphore 泄漏——acquire 后异常路径未 release(许可泄漏→可用许可减少);修复=finally{release} 或 tryAcquire+finally 模式。'),
      block('取舍:CompletableFuture vs CountDownLatch', 'CompletableFuture:异步编排(thenCompose/thenCombine 链式)+异常处理(exceptionally)+回调非阻塞;CountDownLatch:简单等待(计数到零)+阻塞式——简单等待场景 Latch 够用;复杂编排(依赖链/异常传播)用 CompletableFuture(并发进阶 29 题结构化并发)。'),
    ],
    [
      block('验证:并发工具的走查核对', '验证:CountDownLatch 断言(N 个 countDown→await 放行);CyclicBarrier 断言(N 线程到齐→屏障打开→可重用);Semaphore 断言(N permits→acquire 获取/release 释放→超限阻塞);公平断言(Semaphore 公平模式 FIFO)。验证:三工具的行为断言可程序化(并发测试)。'),
      block('追问链:工具三刀', '一刀:"Semaphore 的 acquire 与 tryAcquire?"——acquire 阻塞直到有许可;tryAcquire 立即返回(成功/失败)——限流场景用 tryAcquire(快速拒绝,不排队,第 126 题限流)。二刀:"CyclicBarrier 的回调?"——barrierAction 在屏障打开时执行(由最后到达的线程执行)——汇总/统计/日志的钩子;回调异常→barrier broken(所有等待者异常)。三刀:"Phaser?"——CyclicBarrier 的增强版(动态注册/多阶段)——比 CyclicBarrier 灵活但复杂度高;多数场景 CyclicBarrier 够用。'),
    ],
    ['Latch=等 N 件完成(一次性)', 'Barrier=N 线程互相等(可循环)', 'Semaphore=限并发(可重用)'], [juc, api('java/util/concurrent/CountDownLatch')],
  ),
  'legacy/68': deep(
    'JMM、happens-before、指令重排；volatile 如何靠内存屏障保证可见性',
    '网银并发沙盘:JMM(Java Memory Model)定义可见性规则——happens-before 是"证据链"(同步动作配对→可见性保证);volatile 靠内存屏障禁止重排(并发基础 2 题的完整版)。',
    [
      'JMM 的核心:主内存(共享)与工作内存(线程私有副本)——线程操作工作内存,写回主内存的时机不确定(可见性问题的根源);happens-before 规则定义了"哪些操作保证可见"(程序顺序/监视器锁/volatile 写读/线程 start-join/传递性)。',
      '指令重排:编译器和 CPU 为优化而重排指令顺序(单线程语义不变,多线程可见性受影响)——as-if-serial(单线程看起来按序)在多线程下不成立——重排的解决=内存屏障(volatile/synchronized/final)。',
      'volatile 的内存语义:写=StoreStore+StoreLoad 屏障(写前不能重排写,写后不能重排读);读=LoadLoad+LoadStore 屏障——volatile 保证可见性(写立即可见)+禁止重排,但不保证原子性(i++ 仍不安全,并发基础 1 题)。',
    ],
    [
      block('机制:happens-before 是"契约"不是"时间戳"', 'happens-before=A 操作的结果对 B 可见(通过同步动作配对建立)——不是"A 在时间上先于 B"(墙钟时间),是"B 能看到 A 的写入效果"(可见性承诺);并发基础 2 题的"证据链"类比:签收记录证明你拿到哪版,不证明寄件先后。'),
      block('反例:JMM 的两种事故', '事故一:测试一万次都正常就断言安全——重排是概率事件(窗口小/编译层次变化都会影响,并发基础 50 题);修复=规范推理(JMM 有同步动作)+jcstress 压力测试。事故二:volatile 代替锁——volatile 不保证复合操作原子性(i++ 仍不安全);修复=volatile 只用于"单写多读的标志位",复合操作用锁或 CAS。'),
      block('取舍:volatile vs synchronized vs Atomic', 'volatile:可见性+禁止重排(轻量,不互斥,适合标志位);synchronized:互斥+可见性(重量,适合复合操作);Atomic:原子性+可见性(CAS,适合计数/引用替换)——选择=需要什么保证(可见性/互斥/原子性),不是"哪个更强"。'),
    ],
    [
      block('验证:JMM 的走查核对', '验证:本机实验——volatile 可见性(停止标志:普通 boolean 循环不退出 vs volatile 退出,并发基础 1 题);重排推演(x=1;y=1→r1=y,r2=x 可能 r1=1,r2=0——无同步时);指令重排的 jcstress 验证(并发进边 50 题"运行一万次都正常"的陷阱)。验证:JMM 行为的断言=规范推理+压力测试(单测无法覆盖交错空间)。'),
      block('追问链:JMM 三刀', '一刀:"happens-before 的完整规则清单?"——程序顺序/监视器锁解锁先于加锁/volatile 写先于读/start 先于 run/所有动作先于 join/传递性(并发基础 2 题)+final 的安全发布(JLS 17.5)——完整清单进评测(第 49 题)。二刀:"内存屏障的种类?"——LoadLoad/StoreStore/LoadStore/StoreLoad 四种(不同处理器选择性发射,第 12 题并发进阶)——业务代码消费 happens-before 契约,不直接写屏障。三刀:"DCL 为什么需要 volatile?"——new Object() 三步(分配/初始化/赋值)可能重排(赋值先于初始化)→另一线程拿到非 null 但未初始化的对象→volatile 禁止重排(并发基础 8 题 DCL)。'),
    ],
    ['JMM=可见性规则,HB=证据链', 'volatile 禁止重排,不保证原子性', '内存屏障是 JVM 实现层,业务消费契约'], [jls17, juc],
  ),
  'legacy/69': deep(
    '线程池参数如何设置？队列怎么选？如何监控与动态调整',
    '网银线程池沙盘:corePoolSize(核心线程)/maximumPoolSize(最大)/keepAliveTime(空闲回收)/workQueue(队列)/handler(拒绝策略)——五参数+队列选型+动态调参(第 16/17/18 题并发基础的完整版)。',
    [
      '五参数:corePoolSize(常驻线程,按 CPU/IO 特性:CPU 密集=核数,IO 密集=更高)/maximumPoolSize(上限,防资源耗尽)/keepAliveTime(空闲回收,allowCoreThreadTimeOut 可回收核心线程)/workQueue(排队:有界防堆积/无界防拒绝但掩盖过载,第 17 题)/handler(拒绝策略:Abort 快速失败/CallerRuns 背压/Discard 静默丢/自定义)。',
      '队列选型:有界队列(LinkedListBlockingQueue——过载显形,推荐)/无界队列(永不拒绝但掩盖过载+内存涨,第 17 题)/SynchronousQueue(零容量,直接移交——newCachedThreadPool,第 17 题追问)/优先级队列(PriorityBlockingQueue——按优先级执行)。',
      '动态调参:setCorePoolSize/setMaximumPoolSize(运行时改——"参数改规则不改存量",第 16 题)——监控驱动(队列长度/活跃线程/拒绝数,第 42 题健康检查)+按下游容量比例调整(第 9 题排队年龄)。',
    ],
    [
      block('机制:execute 的提交决策链', '四步:线程数<corePoolSize→新建核心线程;corePoolSize 满→尝试入队(offer);队列满且线程数<maximumPoolSize→新建非核心线程;线程数达 max→拒绝——无界队列的 offer 恒成功永远停在第二步(第 17 题并发基础,饱和策略被队列绕过)。'),
      block('反例:线程池的三种事故', '事故一:无界队列——队列 10 万条+内存涨+过载不显形;修复=有界+拒绝策略。事故二:CallerRunsPolicy 在 Web 线程——提交线程(Tomcat 线程)自己执行任务→HTTP 请求挂起(第 18 题并发基础);修复=Abort+上游快速失败或自定义策略。事故三:线程池未 shutdown——应用关闭时线程泄漏(JVM 不退出);修复=优雅关闭(shutdown+awaitTermination)。'),
      block('取舍:线程池的隔离(舱壁)', '核心/非核心业务分池(独立线程池——一个慢下游不拖其他,D3 实测:共享池 967ms vs 独立 1ms)——隔离的粒度=按下游依赖分池(每个慢依赖一个池);全局池=全局故障域(第 11 题网关隔离同构)。'),
    ],
    [
      block('验证:线程池的走查核对', '验证:参数断言(corePoolSize/maxPoolSize/queueCapacity 按压测校准);拒绝策略断言(Abort 抛异常/CallerRuns 由提交线程执行/自定义记录+降级);动态调参断言(setCorePoolSize 生效——新任务按新参数);监控断言(活跃线程/队列长度/拒绝数/排队年龄)。验证:第 9 题排队年龄+第 16 题动态调参+第 17 题队列选型的实测可复用。'),
      block('追问链:线程池三刀', '一刀:"ThreadLocal 在线程池的泄漏?"——线程复用→ThreadLocal 不清理→旧任务的值泄漏给新任务(第 72 题 ThreadLocal 专项);修复=finally{threadLocal.remove()}。二刀:"线程池的优先级?"——PriorityBlockingQueue(按优先级执行)+自定义 ThreadFactory(命名线程,便于排查)——优先级反转的护栏(第 34 题批处理)。三刀:"虚拟线程(JDK 21)?"——虚拟线程把"执行槽位"与"下游容量"解耦(第 16 题并发进阶)——传统线程池的调参在很多场景直接失去意义(版本边界)。'),
    ],
    ['五参数+有界队列+拒绝策略', 'CallerRuns 在 Web 线程有风险', '动态调参=改规则不改存量'], [juc, api('java/util/concurrent/ThreadPoolExecutor')],
  ),
  'legacy/70': deep(
    'CompletableFuture 的编排与异常处理',
    '网银并行调用沙盘:并行调三个下游(订单/库存/物流)→汇总结果——CompletableFuture 的编排(supplyAsync→thenCombine→allOf)+异常处理(exceptionally/handle)+超时(orTimeout)。',
    [
      '编排模式:thenApply(转换)/thenCompose(扁平化,避免嵌套 Future)/thenCombine(合并两个结果)/allOf(等待全部)/anyOf(任意完成)——编排的"依赖图":A→B→C 串行,A→B+C 并行合并;allOf 后 get 各 Future(等待全部完成)。',
      '异常处理:exceptionally(异常时降级返回默认值)、handle(无论成功失败都处理——类似 finally)、whenComplete(观察但不改变结果)——异常传播:一个环节异常→后续环节跳过(直到 exceptionally/handle 拦截);未处理的异常在 join 时抛 CompletionException。',
      '超时控制:orTimeout(timeout, unit)(JDK 9+——超时后 exceptionally 异常)或 completeOnTimeout(default, timeout)(超时返回默认值)——每个环节设超时(第 12 题超时预算)+整体 deadline(第 12 题)。',
    ],
    [
      block('机制:CompletableFuture 的"回调地狱"与编排', 'CompletableFuture 用回调(thenApply/thenCompose)替代回调地狱(嵌套匿名类)——链式调用类似 Stream(声明式);编排的核心=依赖关系建模(哪些可并行/哪些有依赖/哪里合并)——类比电路:串联(thenCompose)与并联(thenCombine+allOf)。'),
      block('反例:CompletableFuture 的两种事故', '事故一:默认线程池 ForkJoinPool.commonPool 被占用——IO 操作用 commonPool(线程少,阻塞 IO 占满)→其他并行流也卡(第 24 题并发进阶);修复=自定义线程池(supplyAsync(supplier, executor))。事故二:异常被吞——链中某环节异常未处理→后续环节不执行→结果为 null(无报错);修复=链尾 handle 或 exceptionally(确保异常显式处理)。'),
      block('取舍:CompletableFuture vs 结构化并发(JDK 21)', 'CompletableFuture:灵活(自由编排)+复杂(手动管理取消/超时/异常);结构化并发(StructuredTaskScope,JDK 21 预览):作用域管理(子任务生命周期对齐)+取消传播(自动)+错误聚合(统一收集)——结构化并发是"框架级约束",CompletableFuture 是"自由编排"(并发进阶 29 题)。'),
    ],
    [
      block('验证:CompletableFuture 的走查核对', '验证:编排断言(并行三下游→allOf 等待→合并结果);异常处理断言(exceptionally 降级返回默认值——链不断);超时断言(orTimeout 超时触发降级);线程池断言(自定义 executor 而非 commonPool)。验证:编排+异常+超时的断言可程序化(mock 下游延迟/失败);SD1 延迟任务实验可复用。'),
      block('追问链:CF 三刀', '一刀:"thenApply vs thenCompose?"——thenApply 返回值直接包装(返回 T→CompletableFuture<T>);thenCompose 返回 CompletableFuture(扁平化,避免嵌套)——flatMap vs map 的函数式类比。二刀:"取消 CompletableFuture?"——cancel 不中断正在执行的任务(只标记为 cancelled)——真正取消需要 interrupt(第 16 题断连取消)+任务内响应中断。三刀:"CompletableFuture 与虚拟线程?"——虚拟线程(JDK 21)让"同步阻塞写法"获得"异步性能"——CompletableFuture 的异步复杂度(回调链)在虚拟线程下可用同步写法替代(第 69 题虚拟线程)。'),
    ],
    ['编排:thenApply/Compose/Combine/allOf', '异常:exceptionally/handle 显式处理', '超时:orTimeout 每环节设预算'], [juc, api('java/util/concurrent/CompletableFuture')],
  ),
  'legacy/71': deep(
    '死锁的四个条件？如何排查（jstack）与避免',
    '网银转账沙盘:A→B 与 B→A 并发转账,两个事务分别先锁 A 后锁 B 与先锁 B 后锁 A——互相等待死锁;四条件(互斥/持有并等待/不可剥夺/循环等待)破坏任意一条即可避免。',
    [
      '四条件:互斥(资源不能共享)+持有并等待(持有 A 等 B)+不可剥夺(锁不能被第三方强制释放)+循环等待(A 等 B,B 等 A)——破坏任意一条:一次性申请(破坏持有并等待)/tryLock 超时(破坏不可剥夺)/固定加锁顺序(破坏循环等待)。',
      '排查:线程转储(jstack/jcmd Thread.print)找"Found one Java-level deadlock"段——BLOCKED 线程的 waiting to lock 与持有者的 locked 串成环;Arthas thread --state BLOCKED 过滤+thread -b 定位阻塞源头(并发基础 32 题排查工具链)。',
      '避免:固定加锁顺序(按账户 ID 排序,lockInOrder 工具方法)+tryLock 带超时(拿不到就退回)+缩小锁范围(锁外不调远程,短事务)+数据库死锁(InnoDB wait-for 图自动回滚一方,重试+幂等键)。',
    ],
    [
      block('机制:死锁的成因=加锁顺序不一致', '转账场景:事务 1 先锁 A 后锁 B,事务 2 先锁 B 后锁 A→两事务互相等待;修复=所有事务按相同顺序加锁(按 ID 排序)——顺序一致则不可能成环(数学证明:有向图无环)。数据库死锁=InnoDB wait-for 图检测自动回滚一方(兜底不是设计,banking 7 题锁序)。'),
      block('反例:死锁排查的两种事故', '事故一:看到 BLOCKED 就报死锁——可能只是长事务阻塞(非死锁,可自行解除);修复=看 jstack 是否有"Found one Java-level deadlock"段。事故二:死锁后盲目重启——重启清空所有事务(排队任务丢失,第 9 题);修复=先止血(重启)后根因(锁序审计)。'),
      block('取舍:锁顺序 vs tryLock 的选择', '固定顺序:零运行时开销,默认选择(维护顺序规则);tryLock:灵活(不阻塞)但引入重试循环与退避策略;一把大锁(全局锁):消灭死锁但并发归零(低频管理操作);数据库死锁:InnoDB 自动检测+回滚+应用重试(banking 7 题)。'),
    ],
    [
      block('验证:死锁的走查核对', '验证:死锁复现(两个线程 transfer(A,B) 与 transfer(B,A) 各 sleep 10ms→jstack 报死锁);修复验证(lockInOrder 排序后同脚本零死锁);Arthas 验证(thread --state BLOCKED 过滤+thread -b 定位);数据库死锁(InnoDB 死锁日志的等待环解读,banking 7 题锁序)。验证:复现与修复的断言可程序化(并发测试+死锁检测)。'),
      block('追问链:死锁三刀', '一刀:"活锁与死锁的区别?"——死锁=停着不动(CPU 空闲);活锁=忙着让路(CPU 满转,重试-回滚循环,并发基础 33 题)——活锁靠随机退避打破对称(并发基础 33 题)。二刀:"数据库死锁与 JVM 死锁的排查?"——JVM:jstack/Arthas;DB:SHOW ENGINE INNODB STATUS(LATEST DETECTED DEADLOCK 段,第 101 题数据库死锁)——两套体系按锁层次分别查。三刀:"锁顺序的"序"用什么定?"——稳定且全局一致的字段(数据库主键/唯一 ID);任何随时间变化的序(哈希遍历/列表下标)不同时刻不同顺序=等于没定(banking 7 题锁序)。'),
    ],
    ['四条件破坏任意一条即避免', 'jstack 找死锁段,0x 地址串环', '固定加锁顺序写进代码,不靠约定'], [juc, sre],
  ),
  'legacy/72': deep(
    'ThreadLocal 在线程池中的问题，如何避免',
    '网银请求沙盘:ThreadLocal 存用户上下文,线程池复用线程——上一个请求的值残留给下一个请求(数据串号);线程池中的 ThreadLocal 必须 remove(并发进阶 28 题的完整版)。',
    [
      '泄漏机制:ThreadLocalMap 的 Entry key 是弱引用(ThreadLocal 实例被 GC 后 key=null)但 value 是强引用(仍被线程的 ThreadLocalMap 持有)——线程池线程永不死亡→value 永远可达→泄漏(value 无法被 GC 回收)。',
      '线程池的串号:线程复用前未 remove→新任务读到旧任务的值(数据串号,安全风险)——修复=任务完成后 finally{threadLocal.remove()}(确定性清理)。',
      '内存放大:每个线程一份 ThreadLocalMap——百万线程×12 个 ThreadLocal 条目×40 字节/条目=数百 MB(虚拟线程场景,并发进阶 28 题);治理:减少 ThreadLocal 使用+显式 remove+虚拟线程一次性回收(规模风险替代泄漏风险)。',
    ],
    [
      block('机制:弱引用 key 与强引用 value 的泄漏链', 'Thread → ThreadLocalMap → Entry(key=null) → value——ThreadLocal 实例被回收后 key 变 null(弱引用),但 value 仍沿强引用链可达(线程活着→map 活着→value 活着)——设计意图:key 弱引用让 map 能探测过期条目(expungeStaleEntry 清理);value 强引用是局限(map 不知道业务何时不再需要)。'),
      block('反例:ThreadLocal 的两种事故', '事故一:线程池忘记 remove——下个请求读到上个请求的用户上下文(数据串号);修复=finally remove 或拦截器统一清理(框架级:Spring 的 RequestContextHolder 已内置清理)。事故二:InheritableThreadLocal 在线程池——ITL 在线程创建时复制(不是任务提交时)→线程池中的"子线程"读到"创建线程池线程"的父值(不是提交任务的父值,并发基础 12 题)。'),
      block('取舍:ThreadLocal vs 显式传参 vs ScopedValue', 'ThreadLocal:隐式传递(改代码少)+泄漏风险+测试难;显式传参:显式(每个方法带上下文参数)+改动大但可测试;ScopedValue(JDK 21):作用域绑定+不可变+自动消失(无泄漏)——推荐:请求上下文用框架管理(Spring RequestContextHolder)或显式传参;ThreadLocal 限基础设施(事务资源句柄)。'),
    ],
    [
      block('验证:ThreadLocal 的走查核对', '验证:泄漏断言(线程池 100 个任务不 remove→堆转储中 ThreadLocalMap 的 value 可达);串号断言(任务 1 set "userA"→任务 2 不 set→读到 "userA"——串号复现);remove 断言(finally remove→任务 2 读到 null——正确清理);并发进阶 28 题的虚拟线程对照(百万线程×ThreadLocal 的内存放大)。验证:泄漏/串号/清理断言可程序化。'),
      block('追问链:ThreadLocal 三刀', '一刀:"ThreadLocalMap 的清理机制?"——expungeStaleEntry(探测式:发现 null key 条目→清理 value)+cleanSomeSlots(启发式:抽样清理)——被动清理(依赖后续 set/get/remove 触发),不可靠;主动清理(finally remove)是唯一可靠手段。二刀:"InheritableThreadLocal 的复制时机?"——Thread 创建时复制 parent 的 ITL 值(不是任务提交时)——线程池中线程已创建→ITL 值=创建线程池时刻的父值(过期);修复=TransmittableThreadLocal(TTL,阿里开源)或显式传递。三刀:"虚拟线程的 ThreadLocal?"——百万虚拟线程×ThreadLocal=内存放大(并发进阶 28 题);ScopedValue(不可变+作用域绑定+自动消失)是替代方向(JEP 446)。'),
    ],
    ['弱 key 强 value=泄漏链', '线程池必须 finally remove', '虚拟线程场景用 ScopedValue 替代'], [juc, api('java/lang/ThreadLocal')],
  ),

  'legacy/73': deep(
    'G1 原理？Region、Young GC、Mixed GC、停顿预测；与 CMS 区别',
    '网银 GC 沙盘:G1 将堆切为等大 Region(1-32MB)——Young GC(新生代复制)+Mixed GC(新生代+部分老年代 region)+停顿预测(MaxGCPauseMillis 驱动 CSet 圈选)——jvm-advanced 2/3 题的完整版。',
    [
      'Region 化:堆切成等大分区(角色 Eden/Survivor/Old/Humongous 动态分配)——回收单位从"整代"变为"region 集合"(CSet),暂停时间由 region 数量调节(可预测性的来源)。',
      'Young GC:Eden 满→存活对象复制到 Survivor/Old region→Eden 清空;Mixed GC:并发标记完成后,选择"垃圾比例高的老年代 region"加入 CSet 一起回收——G1 独有(Parallel/CMS 没有选择性回收老年代)。',
      '停顿预测:G1 记录每个 region 的回收耗时预测值→按 MaxGCPauseMillis 目标圈定 CSet(预计暂停≤目标);预测是统计中位数(非逐次承诺,第 3 题 jvm-advanced:80ms Full 完全无视 5ms 目标)。',
    ],
    [
      block('机制:G1 与 CMS 的核心区别', 'CMS:标记-清除(碎片)+连续老年代(不可预测 Full)+并发标记/清除;G1:标记-复制(新生代)+标记-整理(老年代 region,无碎片)+region 化(可预测 CSet)+失败降级 Full(第 6 题 evacuation failure)——G1 的核心创新=region 化使"选择性回收"成为可能。'),
      block('反例:G1 的两种事故', '事故一:MaxGCPauseMillis 设过小(5ms)→每次只回收少量 region→GC 频率飙升→吞吐下降(第 3 题 jvm-advanced);修复=从当前 P99 出发设温和目标。事故二:to-space exhausted→Full GC(第 6 题:855 次 exhausted→Full);修复=G1ReservePercent 提升+Humongous 治理。'),
      block('取舍:G1 vs CMS vs Parallel', 'G1:大堆(>4GB)+暂停目标可调+无碎片(推荐默认,第 14 题 JVM);CMS:老堆(4-8GB)已移除(JDK 14);Parallel:吞吐优先(批处理,暂停不敏感)——按"堆大小+暂停要求+吞吐要求"选,不是"最新=最好"。'),
    ],
    [
      block('验证:G1 的走查核对', '验证:本机 hum.log(Humongous regions 29→15→54→0)+pause.log(young 中位 3ms,Full 80ms)+evac.log(855 次 To-space exhausted→Full)——三份 GC 日志覆盖 G1 的核心场景;jvm-advanced 2/3/6 题的实测数据可复用。验证:GC 日志的断言(region 大小/暂停分布/Humongous 计数)可程序化。'),
      block('追问链:G1 三刀', '一刀:"G1 的 SATB 是什么?"——Snapshot-At-The-Beginning:并发标记开始时拍快照(标记存活对象)——并发期间新分配的对象默认存活;写屏障记录引用变更(SATB vs CMS 的增量更新)。二刀:"IHOP 是什么?"——Initiating Heap Occupancy Percent:触发并发标记的堆占用阈值(默认 45%)——IHOP 过高→Mixed GC 来不及→to-space exhausted;过低→并发标记过于频繁。三刀:"G1 的字符串去重?"——-XX:+UseStringDeduplication:GC 期间合并内容相同的 String 底层数组(第 36 题 JVM 实测:Deduplicated 98.4%)——G1 特有(ZGC 17 不支持)。'),
    ],
    ['Region 化=选择性回收+可预测', 'Young GC+Mixed GC+Full 兜底', 'MaxGCPauseMillis=统计引导非承诺'], [g1tun, jvms2],
  ),
  'legacy/74': deep(
    '类加载过程与双亲委派？如何打破',
    '网银类加载沙盘:类加载=加载→验证→准备→解析→初始化五步;双亲委派(先委托父加载器,父无法加载才自己加载)保证核心类安全;打破=自定义加载器覆写 loadClass 或 SPI(Thread.currentThread().getContextClassLoader)。',
    [
      '类加载五步:加载(读字节码→生成 Class 对象)→验证(字节码安全检查)→准备(静态变量分配内存+默认值)→解析(符号引用→直接引用,可延迟)→初始化(执行 <clinit>:静态变量赋值+static 块)——初始化触发:首次 new/访问静态成员/反射/子类初始化触发父类。',
      '双亲委派:AppClassLoader→PlatformClassLoader(扩展)→BootstrapClassLoader(核心 rt.jar)——先委托父加载器加载(父能加载就不自己加载);保证:核心类(java.lang.String)始终由 Bootstrap 加载(安全——防自定义 java.lang.String 覆盖核心类)。',
      '打破双亲委派:SPI(java.sql.Driver——接口在 Bootstrap,实现在 classpath→父加载器看不到子加载器的类→Thread.contextClassLoader);OSGi/热部署(每个模块独立加载器);Tomcat(WebappClassLoader 先自己加载再委托——Web 应用隔离)。',
    ],
    [
      block('机制:双亲委派的"安全性"', '双亲委派的核心=防止核心类被篡改:自定义 java.lang.String→委托到 Bootstrap→Bootstrap 已加载 String→返回核心类(自定义的不会被加载)——保证核心类唯一性。类加载器也是命名空间:不同加载器加载的同一个类文件=不同的 Class 对象(第 37 题 JVM 类泄漏)。'),
      block('反例:类加载的两种事故', '事故一:NoClassDefFoundError vs ClassNotFoundException——前者=编译时存在运行时缺失(依赖版本变更);后者=运行时动态加载失败;排查=类路径审计+依赖树分析。事故二:同类不同加载器——热部署环境下同一类被两个加载器加载→instanceof false→ClassCastException(第 37 题 JVM);修复=确保类只由一个加载器加载或共享父加载器。'),
      block('取舍:自定义加载器的场景', '热部署(不重启更新类——每个版本独立加载器)、隔离(插件系统——插件间类隔离)、加密(自定义类文件格式解密后加载)——自定义加载器的成本=双亲委派的复杂性(需要处理委托/缓存/类冲突),不是"随便覆写 findClass"。'),
    ],
    [
      block('验证:类加载的走查核对', '验证:双亲委派断言(String 的 classLoader=null→Bootstrap 加载);打破断言(Thread.contextClassLoader 加载 SPI 实现);初始化顺序断言(静态变量→静态块→构造器);类卸载断言(加载器被 GC→其加载的类卸载,第 37 题 JVM 代理类卸载)。验证:类加载的断言可程序化(Class.forName/getResourceAsStream)。'),
      block('追问链:类加载三刀', '一刀:"类的初始化顺序?"——父类静态→子类静态→父类构造→子类构造;静态变量赋值+静态块按源码顺序执行。二刀:"类加载器的层次?"——Bootstrap(核心)→Platform(扩展)→Application(classpath)→自定义——每层可以访问自己+父层的类,不能访问子层的。三刀:"Metaspace 泄漏与类加载器?"——类加载器被泄漏→其加载的所有类无法卸载→Metaspace 增长(第 37 题 JVM;CGLIB 代理类泄漏的场景)。'),
    ],
    ['五步:加载→验证→准备→解析→初始化', '双亲委派保核心类安全', '打破:SPI contextClassLoader'], [jvms2, javaman],
  ),
  'legacy/75': deep(
    '垃圾回收器如何选型？ZGC 有什么特点',
    '网银 GC 沙盘:Serial/Parallel/CMS(移除)/G1/ZGC/Shenandoah——选型=按堆大小+暂停要求+吞吐要求,不是"最新的最好"(第 14 题 JVM 与 75 题 JVM 的选型完整版)。',
    [
      '回收器光谱:Serial(单线程,小堆,客户端)→Parallel(多线程,吞吐优先,批处理)→G1(region 化,大堆,暂停可调,JDK 9+ 默认)→ZGC/Shenandoah(并发整理,亚毫秒暂停,超大堆)——光谱的轴=暂停时间(从百 ms 到亚 ms),代价=吞吐与内存。',
      'ZGC 的特点:染色指针(64 位指针元数据位)+读屏障(自愈)+并发整理(STW 仅根集扫描,实测 0.005-0.017ms)+TB 级堆支持;代价=读屏障 CPU 开销+堆余量要求(Allocation Stall 59ms 当堆满,第 7 题 jvm-advanced 实测)。',
      '选型决策:堆<4GB+吞吐优先→Parallel;堆 4-32GB+暂停<100ms→G1(默认);堆>16GB+暂停<10ms→ZGC(JDK 17 单代/JDK 21 分代,第 7 题 jvm-advanced 17/21 的版本边界);批处理→Parallel(暂停无所谓)。',
    ],
    [
      block('机制:ZGC 的染色指针与并发整理', 'ZGC 用 64 位指针的高位存元数据(Marked0/Marked1/Remapped/Finalizable)——读屏障检查指针颜色,过期则在读时修正(自愈);并发整理不暂停应用(代价=读屏障内联+堆余量,第 7 题 jvm-advanced 实测:暂停亚毫秒但堆满时 Allocation Stall 59ms)。'),
      block('反例:GC 选型的两种事故', '事故一:ZGC 用在小堆(256MB)——ZGC 的堆余量要求+读屏障开销在小堆上得不偿失(G1 更合适);修复=按堆大小+暂停要求选型。事故二:JDK 17 上期望分代 ZGC——JDK 17 的 ZGC 不分代(每次周期扫全堆);分代 ZGC 是 JDK 21 的 JEP 439——版本边界要先核对(第 7 题 jvm-advanced)。'),
      block('取舍:GC 选型的矩阵', '堆大小(小/中/大/超大)×暂停要求(不敏感/<100ms/<10ms)×吞吐要求(高/中/低)——三维矩阵选回收器:Parallel(吞吐优,暂停差)/G1(平衡)/ZGC(暂停优,吞吐略损)——选型后用自己的负载实测(第 147 题压测),不按理论选。'),
    ],
    [
      block('验证:GC 选型的走查核对', '验证:本机对照实验(G1 vs ZGC 同负载:g1.log young 中位 2.948ms vs zgc.log Pause 0.005-0.017ms;ZGC Allocation Stall 59.822ms)——jvm-advanced 7/8 题的实测数据;选型决策=暂停分布+吞吐+内存三维对照(不是单指标)。验证:GC 对照的断言可程序化(GC 日志分析)。'),
      block('追问链:GC 选型三刀', '一刀:"G1 到 ZGC 的迁移?"——参数变更(UseZGC)+行为差异(读屏障/不分代)+回归测试(同负载对照);第 8 题 jvm-advanced 的对照实验模板可复用。二刀:"Shenandoah 与 ZGC?"——两者都是并发整理(亚毫秒暂停);Shenandoah 用转发指针(Brooks pointer),ZGC 用染色指针;Shenandoah 由 Red Hat 维护,ZGC 由 Oracle——生态与支持的 JDK 版本不同。三刀:"GC 日志怎么读?"——-Xlog:gc*(G1)/-Xlog:gc(ZGC)→分析工具(GCEasy/GCViewer)——关键指标:暂停分布(P99/P999)/吞吐(GC 时间占比)/频率(每分钟次数)/特殊事件(Full/Exhausted/Stall)。'),
    ],
    ['Serial→Parallel→G1→ZGC:暂停递减', 'ZGC 染色指针+读屏障自愈', '选型后用自己负载实测验证'], [g1tun, hnsw],
  ),
  'legacy/76': deep(
    '常用 JVM 参数？堆大小怎么定',
    '网银运维沙盘:JVM 参数分类(内存/GC/诊断/行为)与堆大小的确定(不是拍脑袋,是按负载画像+压测校准,第 76 题 JVM 的完整版)。',
    [
      '参数分类:-X 系列(非标准:-Xms/-Xmx/-Xss)、-XX 系列(-XX:+UseG1GC/-XX:MaxGCPauseMillis)、系统属性(-D)；常用:-Xms=-Xmx(堆,生产建议相等)/-Xss(栈)/-XX:MaxMetaspaceSize(元空间)/-XX:+HeapDumpOnOutOfMemoryError(OOM 时转储)/-XX:MaxDirectMemorySize(堆外)。',
      '堆大小的确定:基线=稳态内存占用(常驻对象+缓存)+峰值波动(突发分配)+GC 余量(年轻代+GC 工作空间)——压测校准(第 147 题:压测到目标流量观测实际堆使用→1.5-2 倍余量)——不是"内存多就设大"(GC 扫描时间与堆成正比)。',
      '诊断参数:-XX:+HeapDumpOnOutOfMemoryError+-XX:HeapDumpPath(自动转储)+-Xlog:gc*(GC 日志)+-XX:NativeMemoryTracking=summary(NMT)+-XX:+UnlockDiagnosticVMOptions(诊断命令)——生产必备(出了问题没 dump=没证据)。',
    ],
    [
      block('机制:参数的"打印与验证"', '-XX:+PrintFlagsFinal(打印所有参数最终值——验证参数是否生效)/-XX:+PrintFlagsInitial(初始值)——参数的验证=PrintFlagsFinal 对照(确认 JML 参数被正确设置,而不是"以为设置了");jcmd VM.flags(运行时查看)——参数的审计=变更后 diff FlagsFinal(第 50 题升级排查的基础)。'),
      block('反例:JVM 参数的两种事故', '事故一:-Xms≠-Xmx——堆动态扩缩容(扩容=暂停+抖动);修复=生产环境 Xms=Xmx(避免动态扩容)。事故二:参数堆积不加区分——从网上复制的"调优参数"盲用(与新 JDK 版本不兼容或已移除);修复=PrintFlagsFinal 验证+按 JDK 版本核对(第 50 题升级的三层排查)。'),
      block('取舍:参数的"默认优先"原则', 'JDK 默认值经过大量测试(大多数场景够用)——不要盲目覆盖默认值(每个覆盖都引入维护成本);只调"有明确依据的参数"(压测发现瓶颈→针对性调整);参数变更=一次发布(走评测门禁,第 49 题)。'),
    ],
    [
      block('验证:JVM 参数的走查核对', '验证:PrintFlagsFinal 断言(参数生效——diff 变更前后的 FlagsFinal);堆大小断言(jcmd GC.heap_info 查看堆布局);OOM 转储断言(构造 OOM→HeapDumpPath 有 dump 文件);NMT 断言(NMT summary 的各区域能耗与理论一致,第 11 题 JVM 实测)。验证:参数验证的断言可程序化(jcmd 命令集)。'),
      block('追问链:参数三刀', '一刀:"容器环境的 JVM 参数?"——容器内存限制(cgroup)与 JVM 堆的关系(JVM 感知容器内存,JDK 10+ UseContainerSupport)——堆+元空间+栈+堆外+Code Cache < 容器 limit(第 19 题 jvm-advanced 容器 OOMKilled)。二刀:"-XX:+UseCompressedOops 的条件?"——堆<32GB 时可用(>32GB 自动关闭,引用变 8 字节→内存跳涨)——堆从 31GB 调到 33GB 可用内存反而变少(压缩指针失效)。三刀:"参数的优先级?"——命令行>环境变量>配置文件>JVM 默认——冲突时高优先级覆盖;参数的来源要可追溯(第 10 题配置审计)。'),
    ],
    ['生产:Xms=Xmx+OOM 转储+GC 日志', '堆大小=压测校准,不拍脑袋', 'PrintFlagsFinal 验证参数生效'], [jvms2, g1tun],
  ),
  'legacy/77': deep(
    'OOM 完整排查流程',
    '网银值班沙盘:OOM: Java heap space 告警→排查五步:确认 OOM 类型→获取 heap dump→分析 dominator tree→定位引用链→修复验证——jvm-advanced 77 题的完整版(内存泄漏/缓存/大对象分类排查)。',
    [
      'OOM 排查五步:一,确认 OOM 子类型(heap space/Metaspace/native thread/direct buffer——排查路径不同,第 32 题);二,获取 heap dump(-XX:+HeapDumpOnOutOfMemoryError 自动或 jmap -dump 手动);三,MAT 分析(dominator tree 找最大对象+Leak Suspects 报告);四,定位引用链(GC Roots 到泄漏对象的路径——谁持有引用);五,修复+验证(修代码→压测确认)。',
      'heap dump 的分析:MAT(Memory Analyzer Tool)的 dominator tree(按"保留大小"排序——谁持有了最多的内存);shallow heap vs retained heap(对象自身大小 vs 可释放的总大小)——泄漏=retained heap 大但业务不需要的对象。',
      '没有 dump 的情况:-XX:+HeapDumpOnOutOfMemoryError 未设置(没 dump 可分析)→jcmd GC.heap_dump(运行时获取,如果进程还活着)或重启前尽快获取(jmap 可能失败如果堆太大)。',
    ],
    [
      block('机制:OOM 的"根因分类"', '内存泄漏(对象不再使用但可达——静态集合/监听器/ThreadLocal/连接未关闭)+内存不足(数据量增长/缓存膨胀——需要扩容或优化)+大对象(一次性加载全量数据——流式处理替代)——三类根因的修复方向完全不同:泄漏→修代码、不足→扩容、大对象→改架构。'),
      block('反例:OOM 排查的两种事故', '事故一:OOM 后直接重启——没有获取 dump→证据丢失→无法定位根因→下次再发;修复=HeapDumpOnOutOfMemoryError+重启前先 jmap。事故二:MAT 分析只看大对象——大对象可能是缓存(正常),泄漏的小对象集合(百万 Entry)才是根因;修复=dominator tree 看 retained heap(不是 shallow heap)。'),
      block('取舍:dump 的时机与方式', 'OOM 时自动 dump(HeapDumpOnOutOfMemoryError——准确但可能 OOM 时 dump 失败)+运行时手动 dump(jcmd GC.heap_dump——进程存活时)+定期 dump 对比(泄漏的增量分析)——dump 的选择=进程状态(活/死)与时机(及时/事后)。'),
    ],
    [
      block('验证:OOM 排查的走查核对', '验证:OOM 复现→HeapDumpOnOutOfMemoryError 自动转储→MAT 分析→dominator tree 定位→引用链修复→压测确认——完整流程走查(第 19 题容器 OOMKilled 的 NMT 实测可复用);OOM 子类型的区分排查(heap/metaspace/native 各不同)。验证:OOM 排查的效率=从告警到根因定位的时长(演练计时)。'),
      block('追问链:OOM 三刀', '一刀:"MAT 的 Leak Suspects 准确吗?"——MAT 的 Leak Suspects=启发式分析(准确率高但有误报)——最终确认靠引用链的代码审查(不是只看 MAT 报告)。二刀:"OOM 与 GC overhead limit exceeded?"——后者=GC 时间>98% 但回收<2%(GC 空转)——通常是泄漏的前兆(快 OOM 了);排查路径同 heap OOM。三刀:"NMT 怎么辅助?"——NMT(native memory tracking)看堆外内存(元空间/线程栈/Code Cache/Direct)——heap OOM 走 dump,native OOM 走 NMT(第 19 题 JVM 实测:NMT 三种口径互不相等)。'),
    ],
    ['五步:类型→dump→MAT→引用链→修复', 'HeapDumpOnOutOfMemoryError 必配', '泄漏/不足/大对象三类根因'], [jvms2, g1tun],
  ),
  'legacy/78': deep(
    'Full GC 频繁怎么排查',
    '网银 GC 沙盘:Full GC 每小时 3 次(正常应该 0)——排查=确认 Full GC 类型(调用/碎片/promotion failed)→分析根因→修复,第 78 题 JVM 的完整版。',
    [
      'Full GC 的触发类型:一,System.gc()调用(RMI/代码显式调);二,Metaspace 满(类加载泄漏);三,晋升失败(老年代空间不足→Promotion Failed);四,碎片(标记-清除后大对象无连续空间→Compact);五,Humongous 分配失败(G1 to-space exhausted→Full)。',
      '排查流程:GC 日志分析(-Xlog:gc*→Full GC 的触发原因:System.gc/Promotion Failed/Metaspace)→堆使用画像(老年代增长速率/晋升速率→是泄漏还是不足)→内存分析(dump→MAT)→修复验证。',
      '修复方向:System.gc→禁用(-XX:+DisableExplicitGC)或 RMI 参数调;Metaspace→类加载器泄漏排查(第 37 题 JVM);晋升失败→扩老年代或降低晋升速率;碎片→G1 或 CMS 碎片整理;Humongous→增大 region 或拆分大对象(第 6 题 jvm-advanced)。',
    ],
    [
      block('机制:Full GC 的"降级"性质', 'G1 的 Full GC=evacuation failure 的降级(并发回收失败→STW 全堆压缩)——不是"常规操作"而是"兜底";Full GC 频繁=G1 的并发回收出了问题(晋升太快/Humongous 过多/碎片)——排查 Full GC 的本质=排查"为什么并发回收失败了"。'),
      block('反例:Full GC 的两种事故', '事故一:忽略 Full GC 触发原因——看到 Full GC 就调 -Xmx(如果根因是 System.gc 或 Metaspace 泄漏,调堆无效);修复=看 GC 日志的触发原因分类处置。事故二:Full GC 频繁但 P99 正常——Full GC 虽然暂停长但频率低(如每天 1 次)→业务影响有限(夜间发生);修复=监控+定期处理,不等同于紧急事故。'),
      block('取舍:Full GC 的容忍度', 'Full GC 的容忍度=暂停时长×频率对业务的影响——P999 敏感的系统(实时交易):Full GC=不可接受(必须消除);批处理系统:Full GC 暂停 2s 可接受(不在线上交易)——容忍度是业务参数不是技术参数。'),
    ],
    [
      block('验证:Full GC 的走查核对', '验证:GC 日志断言(Full GC 的触发原因分类——System.gc/Promotion Failed/To-space exhausted 各自对应);频率统计(每小时次数+每次耗时);修复验证(消除触发原因→Full GC 消失);evac.log 实验(855 次 exhausted→Full,第 6 题 jvm-advanced)。验证:Full GC 的频率与耗时断言可程序化(GC 日志分析工具)。'),
      block('追问链:Full GC 三刀', '一刀:"System.gc 是谁调的?"——RMI 的分布式 GC(定时调用,可 -XX:+DisableExplicitGC 禁用)+NIO 的 DirectByteBuffer 清理(可 -XX:+ExplicitGCInvokesConcurrent 改为并发)+业务代码——需要按调用来源区分处置。二刀:"Metaspace 导致的 Full GC?"——Metaspace 满→Full GC 卸载类→如果类加载器泄漏则卸载失败→Full GC 反复;排查=GC 日志的 Metaspace 使用+类计数(jcmd GC.class_stats)。三刀:"Full GC 频繁但是年轻代导致的?"——Young GC 晋升失败(老年代空间不足)→触发 Full GC——根因=老年代空间不足或晋升速率过高( Survivor 偏小→动态年龄晋升,第 44 题)。'),
    ],
    ['Full GC=降级不是常规操作', '触发原因分类:gc/metaspace/晋升/碎片', '容忍度=业务参数不是技术参数'], [g1tun, jvms2],
  ),
  'legacy/79': deep(
    '对象晋升老年代的条件？空间分配担保是什么',
    '网银 GC 沙盘:对象晋升老年代的四条件(年龄达阈值/动态年龄/大对象/Survivor 放不下)+空间分配担保(老年代是否装得下新生代晋升对象)——第 44 题 JVM 的完整版。',
    [
      '晋升四条件:一,年龄达 MaxTenuringThreshold(默认 15,每次 Minor GC 存活年龄+1);二,动态年龄(Survivor 中同龄对象总大小>空间一半→该年龄及以上晋升——TargetSurvivorRatio 可调,第 44 题详解);三,大对象直接进老年代(Humongous,超过 region 一半或 TLAB 放不下);四,Survivor 放不下(Minor GC 后存活对象大于 Survivor→直接进老年代)。',
      '空间分配担保(Minor GC 前):老年代连续空间>新生代所有对象总大小(极端假设全晋升)或>历次晋升平均大小→担保成功(Minor GC 安全执行);失败→Full GC(先腾老年代空间)——JDK 6+ 默认有担保(HandlePromotionFailure=true),但担保失败仍可能触发 Full GC。',
      '动态年龄的精确定义:GC 后按年龄从小到大累计Survivor 中对象大小,超过 TargetSurvivorRatio(默认 50%)×Survivor 容量的年龄成为新的晋升阈值——阈值动态计算(每轮 GC 后重算,不是固定的"50%"——第 44 题:参数是可调的不是死值)。',
    ],
    [
      block('机制:晋升与老年代压力', '晋升速率=每秒晋升到老年代的字节数——晋升过快→老年代快速填充→Mixed GC 频率增加或 Full GC;晋升过慢→Survivor 放不下(空间分配担保失败)→直接进老年代——晋升速率是 GC 调优的核心观测量(GC 日志中的 promotion rate)。'),
      block('反例:晋升的两种事故', '事故一:大对象频繁晋升——报表生成 50MB byte[]每次都直接进老年代→老年代碎片+Full GC;修复=流式处理或对象池(第 45 题 jvm-advanced 大对象)。事故二:Survivor 太小→动态年龄提前晋升——存活率高的应用(缓存预热后)Survivor 不够→过早晋升→老年代压力;修复=增大 Survivor 或调整 TargetSurvivorRatio。'),
      block('取舍:MaxTenuringThreshold 的调优', '阈值高(15):对象在 Survivor 存活更久(减少过早晋升)但 Survivor 压力大;阈值低(1):快速晋升(减少 Survivor 复制成本)但老年代压力大——阈值的选择=Survivor 容量与老年代容量的平衡(G1 下由 region 动态决定,参数含义变化,第 44 题取舍)。'),
    ],
    [
      block('验证:晋升的走查核对', '验证:晋升断言(年龄达阈值→晋升到老年代,jmap -histo:live 前后对比);动态年龄断言(Survivor 同龄对象>50%→提前晋升);大对象断言(Humongous 直接进老年代);空间担保断言(极端晋升→担保失败→Full GC)。验证:GC 日志中的晋升速率与晋升年龄可程序化(GC 日志分析,第 44 题实测:MaxTenuringThreshold=15 但对象几次就进老年代)。'),
      block('追问链:晋升三刀', '一刀:"晋升速率怎么监控?"——GC 日志的 promotion(每 GC 的晋升字节数)+趋势分析(晋升速率上升=老年代压力增加)——晋升速率是 GC 调优的核心观测量。二刀:"G1 的 Humongous 回收?"——Humongous 对象在并发标记时如果不可达→可被 Young GC 回收(部分)——但分配时的连续 region 需求→碎片风险(第 45 题)。三刀:"晋升与分代回收器的匹配?"——G1 的 Humongous 直接进老年代 region(不经过 Survivor);Serial/Parallel 的大对象也直接进老年代(Tenured);不同回收器的晋升行为有差异——按回收器文档核对。'),
    ],
    ['晋升四条件:年龄/动态/大对象/Survivor 放不下', '空间担保失败→Full GC', 'TargetSurvivorRatio 是可调参数'], [g1tun, jvms2],
  ),
  'legacy/80': deep(
    '逃逸分析、标量替换、JIT 编译分别做了什么',
    '网银 JIT 沙盘:逃逸分析(对象是否逃出方法/线程)→标量替换(未逃逸对象拆为标量,不分配)+锁消除(未逃逸的 synchronized 移除)+JIT 编译(C1/C2 分层编译)——第 80 题 JVM 的完整版。',
    [
      '逃逸分析(Escape Analysis):分析对象的作用域——未逃逸(不逃出方法/不逃出线程)→可优化;逃逸(被返回/存入静态字段/传入方法/赋给字段)→不可优化;逃逸分析是 JIT 的前置分析(决定是否做标量替换/锁消除)。',
      '标量替换(Scalar Replacement):未逃逸对象拆解为标量(基本类型局部变量)——不分配堆内存(对象不存在了,只有几个局部变量)——PrintInlining 可观测(第 80 题 JVM 实测:inline (hot) vs callee too large);锁消除(Lock Elision):未逃逸对象的 synchronized 移除(无竞争,不需要锁)。',
      'JIT 分层编译:0 解释→3 C1+profiling→4 C2 深度优化(默认路径)——C1 快速出活,C2 深度优化(内联/逃逸分析/向量化);去优化:假设失效(类型 profile 变化)→回退到解释器(第 24 题 JVM OSR);JIT 的触发=调用计数+回边计数达到阈值(第 24 题 OSR)。',
    ],
    [
      block('机制:逃逸分析→优化的决策链', '逃逸分析的结果决定后续优化:未逃逸→标量替换(不分配)+锁消除(不需要);全局逃逸→无法优化(对象在堆分配);参数逃逸→部分优化(内联后可能不逃逸)——逃逸分析本身有开销(分析阶段),JIT 只在 C2 层做(高频方法才值得分析)。'),
      block('反例:JIT 的两种事故', '事故一:基准测试不预热——JIT 未介入(解释器模式),性能低(第 25 题微基准预热);修复=JMH 预热或多轮 iteration。事故二:去优化循环——单态假设失效(新类型出现)→去优化到解释器→重新 profiling→重新编译(性能锯齿,第 27 题 JVM 去优化);修复=避免多态热点(或接受锯齿)。'),
      block('取舍:JIT 参数的调优边界', '-XX:CICompilerCount(编译线程数)/-XX:FreqInlineSize(内联阈值)/-XX:MaxInlineSize(小方法内联)——JIT 参数的调优=压测验证(第 147 题),不是理论推导;JIT 的行为随 JDK 版本变化(第 50 题升级的隐式契约——JIT 优化是版本相关的)。'),
    ],
    [
      block('验证:JIT 的走查核对', '验证:J1 实验(装箱 6ns vs 原始 1ns——JIT 内联后差距缩小);PrintInlining 实验(small inline hot/big callee too large——内联决策可观测,第 80 题 JVM 实测);JFR 的 Compilation/Deoptimization 事件(JIT 的编译与去优化全记录);OSR 断言(长循环中途切换到编译版,第 24 题 JVM)。验证:JIT 行为的断言可程序化(-Xlog:jit+compilation=info)。'),
      block('追问链:JIT 三刀', '一刀:"逃逸分析能消除所有堆分配吗?"——不能:逃逸的对象(返回/存储/传入)无法消除;分析本身有成本(只在 C2 层);标量替换有条件(对象简单/字段少)——逃逸分析是优化机会不是保证。二刀:"JIT 与反射?"——反射调用无法被 JIT 内联(间接调用);MethodHandle 可以被 JIT 优化(invokeExact 直接调用);LambdaMetafactory 生成类可被内联(第 19 题 java-language 的性能对照)。三刀:"JIT 的去优化触发?"——类型 profile 变化(单态→多态)/分支预测失效/OSR 编译假设失效——去优化不是 bug 而是"假设验证失败"的正常回退(第 27 题 JVM)。'),
    ],
    ['逃逸分析→标量替换+锁消除', 'JIT C1 快速出活,C2 深度优化', '去优化=假设验证失败的正常回退'], [jvms2, api('java/lang/invoke/MethodHandle')],
  ),
  'legacy/81': deep(
    'CPU 飙高排查',
    '网银值班沙盘:CPU 100% 告警——排查=top 找进程→top -Hp 找线程→printf 转 16 进制→jstack 定位线程栈→分析热点(业务/GC/JIT/锁)。',
    [
      '排查五步:一,top 找高 CPU 进程(PID);二,top -Hp PID 找高 CPU 线程(TID);三,printf "%x" TID 转 16 进制(nid);四,jstack PID | grep nid=0xXX -A 30(定位线程栈);五,分析栈(业务代码/GC 线程/JIT 编译线程/锁竞争)。',
      'CPU 高的常见分类:业务代码(死循环/正则回溯/大量序列化)、GC(GC 线程 CPU 高——内存不足/GC 风暴)、JIT(C2 编译线程,启动期)、锁竞争(自旋/CAS 空转,第 13 题并发基础)——分类决定处置方向(业务/内存/等待/代码)。',
      '火焰图(Async-profiler/Arthas profiler):CPU 采样的可视化——宽度=CPU 占比,高度=调用深度——比 jstack 单次采样更准确(多次采样聚合);火焰图的判读=从顶向下找宽块(热点函数)。',
    ],
    [
      block('机制:CPU 高的"消耗模型"', 'CPU=用户态+内核态:用户态高=业务代码在计算(死循环/序列化);内核态高=系统调用密集(IO/锁/内存分配)——用户态与内核态的比例缩小排查范围(用户态→应用层,内核态→IO/锁/GC)。'),
      block('反例:CPU 排查的两种事故', '事故一:jstack 一次采样定位——线程可能在采样间隙切换了(非热点线程被抓到);修复=多次采样取交集(3 次以上,栈顶一致的线程=真热点)。事故二:CPU 高就重启——重启后 CPU 正常(内存也清了)→根因未定位(下次复发);修复=先采集证据(jstack/火焰图/JFR)再重启。'),
      block('取舍:CPU 排查的工具选择', 'jstack:轻量(线程快照)但单次(可能错过);Arthas:在线无侵入(trace/watch/profiler);Async-profiler:火焰图(采样精确,需要安装);JFR:持续 profiling(低开销,事后回看)——按"问题的偶发性"选工具(偶发用 JFR,持续用 Arthas)。'),
    ],
    [
      block('验证:CPU 排查的走查核对', '验证:注入 CPU 高(死循环/正则回溯/GC 风暴)→五步排查走查(top→top -Hp→printf→jstack→分析)——每步的输出可验证(top 确认进程/jstack 确认线程栈);火焰图对照(热点函数占比);GC 线程 CPU 高的区分(jstack 中 GC 线程名含 GC)。验证:排查流程的效率=从告警到定位的时长(演练计时)。'),
      block('追问链:CPU 三刀', '一刀:"CPU 高与 Load 高的区别?"——CPU=实际计算;Load=等待队列长度(含 IO 等待)——Load 高 CPU 低=IO 瓶颈(不是 CPU 问题,第 81 题 JVM 的 CPU/Load 区分)。二刀:"容器 CPU throttling?"——容器 CPU limit 被 cgroup 限制(throttling 指标单独看)——CPU limit 内的 CPU 高=正常(限流≠故障,第 81 题 JVM 容器)。三刀:"CPU 高的自动化处理?"——确定性故障(死循环)→自动化摘实例+取证;非确定性(偶发慢)→告警人工排查——自动化按确定性分级(第 145 题止损动作分级)。'),
    ],
    ['top→top -Hp→printf→jstack→分析', '多次采样取交集,单次不可靠', '火焰图比 jstack 更精确'], [sre, jvms2],
  ),
  'legacy/82': deep(
    '内存泄漏的典型场景',
    '网银内存沙盘:堆持续增长,Full GC 后不回落——内存泄漏的六类典型场景(静态集合/监听器/ThreadLocal/连接/缓存/内部类)与排查(jmap 对比+MAT)。',
    [
      '六类典型泄漏:一,静态集合(static Map/List——put 后不 remove,第 28 题可达性);二,监听器未注销(注册了 listener 但没有 remove——事件源持有 listener 引用);三,ThreadLocal 不 remove(线程池线程的 ThreadLocalMap 中 value 可达,第 72 题);四,连接未关闭(数据库/HTTP/文件句柄——连接池泄漏);五,缓存无淘汰策略(只加不删→无限增长);六,内部类持有外部引用(非静态内部类隐式持有外部 this)。',
      '排查流程:监控发现(堆持续增长+Full GC 后不回落)→jmap dump(两个时点对比)→MAT 分析(对比直方图的增量对象+dominator tree 的引用链)→定位泄漏源(代码中的引用链)→修复(remove/close/WeakReference)+验证(堆增长平稳)。',
      '预防:代码评审(关注 static 集合的生命周期/监听器的注销/ThreadLocal 的清理)、静态扫描(SonarQube 的泄漏检测规则)、运行时监控(堆增长趋势告警,第 42 题健康检查)——预防优于排查。'),
    ],
    [
      block('机制:泄漏的"可达性"本质', '内存泄漏=对象不再使用但仍然可达(GC 无法回收)——可达性分析从 GC Roots 出发:静态集合/活跃线程(线程池)/加载器/JNI 是可达的"根"——泄漏=业务逻辑断了引用,但 GC Roots 的链没断。修复=断开 GC Roots 的引用链(remove/close/null)。'),
      block('反例:泄漏排查的两种事故', '事故一:堆增长就判断泄漏——可能只是缓存增长(正常行为,有上限)或数据量增长(业务需要);修复=对比 Full GC 后的堆使用(泄漏=Full GC 后不回落;正常=Full GC 后回落到基线)。事故二:MAT 只看大对象——泄漏的对象集合可能每个对象很小(百万个小 Entry)但总量大;修复=按类分组看实例数(instance count 增长)。'),
      block('取舍:泄漏检测的自动化程度', '手动排查(MAT 分析):准确但耗时;自动化(堆增长告警+自动 dump 对比):及时发现但可能有误报(正常增长被误判);生产推荐:堆增长趋势告警(基线偏离)+定期自动 dump 对比+人工确认——自动发现+人工确认。'),
    ],
    [
      block('验证:内存泄漏的走查核对', '验证:六类泄漏场景各构造一个复现——静态 Map 不断 put→堆增长→Full GC 后不回落;ThreadLocal 不 remove→线程池中泄漏;监听器不注销→事件源持有→泄漏;MAT 对比两个 dump 的增量(泄漏类 instance count 增长)——每个场景的复现与排查流程固化;第 19 题 JVM 的容器 OOM 实测可复用。'),
      block('追问链:泄漏三刀', '一刀:"内存泄漏与内存溢出的关系?"——泄漏→持续增长→最终 OOM(泄漏是因,溢出是果);溢出也可能无泄漏(数据量增长/堆太小)——OOM 不一定是泄漏,泄漏不一定立即 OOM。二刀:"堆外内存的泄漏?"——DirectByteBuffer 不受 GC 直接管理(Cleaner 兜底)+NMT 监控(第 33 题 JVM)——堆外泄漏的排查=Netty ByteBuf/DirectByteBuffer 的引用计数。三刀:"泄漏的修复验证?"——修复后压测(同负载运行 24h)→堆增长平稳(不泄漏)→确认修复;修复的验证需要时间(短时间看不出)。'),
    ],
    ['六类场景:静态/监听/ThreadLocal/连接/缓存/内部类', 'Full GC 后不回落=泄漏信号', '预防(评审+扫描+监控)优于排查'], [jvms2, g1tun],
  ),

  'legacy/83': deep(
    'Bean 完整生命周期？BeanPostProcessor 的作用',
    '网银框架沙盘:Bean 生命周期=实例化→属性注入→Aware→BPP.before→初始化(@PostConstruct→afterPropertiesSet→init-method)→BPP.after(代理化)→销毁——spring-basics 6 题的完整版(BPP 的作用=每个 bean 创建过程中插入自定义逻辑)。',
    [
      '生命周期十一步:实例化(构造器)→属性注入(@Autowired/@Value)→Aware 回调(BeanNameAware→BeanFactoryAware→ApplicationContextAware)→BeanPostProcessor.before→@PostConstruct→InitializingBean.afterPropertiesSet→自定义 init-method→BeanPostProcessor.after(代理化)→就绪→@PreDestroy/DisposableBean.destroy/自定义 destroy-method。',
      'BeanPostProcessor 的作用:在每个 bean 的初始化前后插入自定义逻辑——before:修改 bean(属性注入增强);after:代理化(AbstractAutoProxyCreator 的 postProcessAfterInitialization 包裹 @Transactional/@Async 的代理,第 87 题)——BPP 是 Spring 扩展的核心接口(AOP/校验/注入全靠它)。',
      'Aware 接口:BeanNameAware( bean 名)/BeanFactoryAware(容器引用)/ApplicationContextAware(上下文)——由 ApplicationContextAwareProcessor(BPP) 在 before 阶段统一调用(第 6 题 spring-basics 的 Aware 驱动)。',
    ],
    [
      block('机制:BPP 是 Spring 的"插件系统"', 'BPP=每个 bean 创建时的钩子(before/after)——Spring 的核心功能(AOP 代理/Autowired 注入/校验)全部通过 BPP 实现:AutowiredAnnotationBeanPostProcessor(注入)、AbstractAutoProxyCreator(代理)、CommonAnnotationBeanPostProcessor(@PostConstruct/@Resource)——BPP 是 Spring 的"微内核"(第 7 题 spring-basics)。'),
      block('反例:BPP 的两种事故', '事故一:@PostConstruct 捕获 this——代理在 after 阶段才生成,PostConstruct 拿到的是裸对象(事务/缓存失效,第 28 题 spring-advanced);修复=ObjectProvider 延迟取代理。事故二:BPP 影响所有 bean——BPP 不筛选类型→对每个 bean 都调用(性能成本=BPP 数×bean 数,第 7 题 spring-basics);修复=限类型或限 scope。'),
      block('取舍:BPP 与 BeanFactoryPostProcessor 的边界', 'BPP=实例级(每个 bean 创建后修改实例);BFPP=定义级(所有 definition 加载后修改 BeanDefinition,不涉及实例)——BFPP 在 BPP 之前(定义先于实例);BeanDefinitionRegistryPostProcessor(可注册新 definition)先于普通 BFPP(第 7 题 spring-basics 的 refresh 阶段)。'),
    ],
    [
      block('验证:生命周期的走查核对', '验证:时序断言(构造→注入→Aware→BPP.before→@PostConstruct→afterPropertiesSet→init-method→BPP.after→就绪,日志顺序断言);BPP 断言(AbstractAutoProxyCreator 的代理生成——类名含 CGLIB/$Proxy);Aware 断言(ApplicationContextAware 拿到上下文)。验证:本机 BeanPhasesExample 真值(spring-basics Q7:definition:instance);本机 Q28 PostConstruct 捕获=裸类。'),
      block('追问链:生命周期三刀', '一刀:"@PostConstruct 与 afterPropertiesSet 的顺序?"——@PostConstruct 先(JSR-250 注解,CommonAnnotationBeanPostProcessor 处理)→afterPropertiesSet 后(InitializingBean 接口)→init-method 最后——三者同"初始化阶段"但顺序固定(spring-basics 6 题)。二刀:"循环依赖的代理提前?"——正常路径=after 阶段代理化;循环引用路径=getEarlyBeanReference 提前代理化(三级缓存第 8 题 spring-basics);@PostConstruct 时"是否已代理"取决于是否有循环依赖。三刀:"销毁的顺序?"——与创建相反:@PreDestroy→DisposableBean.destroy→destroy-method——销毁顺序=创建顺序的逆序(第 38 题 spring-advanced)。'),
    ],
    ['十一步生命周期,BPP 贯穿', 'BPP.after=代理化(事务/AOP)', '@PostConstruct 先于代理化'], [sre, pod],
  ),
  'legacy/84': deep(
    '循环依赖如何解决？三级缓存分别存什么？为什么需要三级',
    '网银框架沙盘:A 依赖 B,B 依赖 A(属性注入)——三级缓存解决:一级(singletonObjects 成品)/二级(earlySingletonObjects 半成品)/三级(singletonFactories ObjectFactory 工厂)——spring-basics 8 题的完整版。',
    [
      '三级缓存:一级 singletonObjects(完整 bean——初始化完成);二级 earlySingletonObjects(提前暴露的半成品——实例化完成但未初始化);三级 singletonFactories(ObjectFactory——可生成早期引用的工厂,调用 getEarlyBeanReference)。',
      '解决流程:A 实例化→三级缓存放 A 的工厂→A 注入 B→B 实例化→B 注入 A(从三级缓存拿 A 的早期引用,升级到二级)→B 初始化完成→A 完成注入→A 初始化完成——A/B 各自完成(三级缓存的工厂在"第一次被需要"时调用并升级到二级)。',
      '为什么需要三级:二级缓存只能存"一种形态"的早期引用(裸对象或代理);三级缓存存 ObjectFactory(延迟决定"是否代理"——只有 AOP 需要时才生成代理)——"不知道是否需要代理"→存工厂(延迟决策,第 8 题 spring-basics 的延迟决策)。'),
    ],
    [
      block('机制:构造器循环为什么无法解决', '构造器循环:A 构造需要 B,B 构造需要 A——两者都没完成实例化(无半成品可暴露)→三级缓存的工厂无法调用(工厂需要实例化后的对象);属性注入循环=A 实例化(构造完成)→三级缓存暴露→注入 B 可获取早期引用——构造器循环=无解(鸡生蛋蛋生鸡),属性注入=可解。'),
      block('反例:循环依赖的两种事故', '事故一:Boot 3 默认禁止循环——升级后存量循环集中暴露(BeanCurrentlyInCreationException);修复=重构解循环(抽公共依赖/事件解耦,不是 allowCircularReferences=true)。事故二:AOP+循环依赖——代理在 getEarlyBeanReference 中提前创建(可能不同于最终代理——微妙行为高发区,第 31 题 spring-advanced);修复=避免 AOP+循环依赖的组合(重构优先)。'),
      block('取舍:allowCircularReferences 的取舍', '默认 true(spring-basics/spring-framework 传统):容忍设计债;Boot 3 默认 false:启动期暴露循环(强制修复);设 true=掩盖设计问题(第 37 题)——判据:循环依赖=职责边界模糊(第 2 题 distributed),解循环=架构治理。'),
    ],
    [
      block('验证:三级缓存的走查核对', '验证:spring-advanced 31 题实验——属性注入循环默认自解=true;构造器注入循环拒绝(BeanCurrentlyInCreationException);三级缓存的断言(工厂调用后升级到二级缓存);AOP 代理断言(有 AOP 时三级缓存工厂生成代理而非裸对象——getEarlyBeanReference)。验证:循环依赖的断言可程序化(启动成功/异常对照)。'),
      block('追问链:三级缓存三刀', '一刀:"二级缓存为什么不够?"——二级存早期引用(一种形态);三级存工厂(延迟决定代理或裸)——如果只有二级:所有 bean 提前代理(改变生命周期)或循环场景拿到裸对象(与最终类型不一致)。二刀:"三级缓存的清空?"——bean 完成后:三级移除(工厂已调用)+二级移除(升级到一级成品)——最终只有一级有完整 bean。三刀:"循环依赖与性能?"——循环依赖的解析过程=多次从缓存获取+工厂调用(启动性能略降)——大量循环依赖=启动性能+设计质量双重问题。'),
    ],
    ['一级成品+二级半成品+三级工厂', '工厂延迟决定是否代理', '构造器循环无解,属性注入可解'], [sre, pod],
  ),
  'legacy/85': deep(
    '事务传播行为',
    '网银事务沙盘:@Transactional 的 7 种传播行为(REQUIRED/REQUIRES_NEW/NESTED/SUPPORTS/NOT_SUPPORTED/MANDATORY/NEVER)——最常用的三种(REQUIRED/REQUIRES_NEW/NESTED)与连接占用差异(spring-advanced 2/3 题)。',
    [
      'REQUIRED(默认):有事务则加入,无则新建——最常用(大部分操作都在同一事务);REQUIRES_NEW:挂起当前事务,新建独立事务(两连接,外层等内层完成)——审计/通知"无论主事务成败都留痕";NESTED:保存点(内层回滚不影响外层,同一连接)——"部分回滚"(批量导入的单行失败,第 3 题 spring-advanced)。',
      '其他四种:SUPPORTS(有则加入无则非事务运行)/NOT_SUPPORTED(挂起当前,非事务运行)/MANDATORY(必须有事务否则异常)/NEVER(必须无事务否则异常)——低频使用(边界控制)。',
      '连接占用:REQUIRED=1 连接(内外共用);REQUIRES_NEW=2 连接(外层+内层各持一连接——池容量=并发×2);NESTED=1 连接(保存点,不额外占池)——REQUIRES_NEW 的连接翻倍是池耗尽的常见原因(spring-advanced 2 题实测:REQUIRED=1,REQUIRES_NEW=2)。',
    ],
    [
      block('机制:REQUIRES_NEW 的挂起模型', '挂起=把外层的 ConnectionHolder 从 ThreadLocal 解绑(连接仍被外层持有,不归还池)→从池取新连接给内层→内层独立提交/回滚→解绑内层→恢复外层(重新绑定)——挂起的代价=连接翻倍+外层锁持有时间被内层放大(spring-advanced 2 题的精确化)。'),
      block('反例:传播行为的两种事故', '事故一:REQUIRES_NEW 的连接互等死锁——外层锁了行 A,内层(REQUIRES_NEW)也要更新行 A→外层持锁等内层,内层等外层释放行 A→死锁(spring-advanced 2 题的"自己等自己");修复=内层不访问外层已锁定的行。事故二:rollback-only 异常——内层(REQUIRED)标记 rollback-only,外层提交时 UnexpectedRollbackException(内层吞了异常但标记了回滚);修复=内层异常要么传播要么 catch 后不标 rollback-only。'),
      block('取舍:传播行为的选型', '默认 REQUIRED(大多数场景);审计/通知→REQUIRES_NEW 或 AFTER_COMMIT 事件(第 91 题);批量导入部分回滚→NESTED(保存点);边界控制→MANDATORY/NEVER(强制约束);Spring Data Repository 的查询→SUPPORTS(可事务可不事务)。'),
    ],
    [
      block('验证:传播行为的走查核对', '验证:spring-advanced 2 题实验(计数 DataSource:REQUIRED=1,REQUIRES_NEW=2)+3 题实验(NESTED 保存点:[1]:[2] 外层保住)+4 题实验(rollback-only:true:0 双行全回滚)——三组实测固化传播行为;第 19 题 spring-advanced 安全上下文(DelegatingSecurityContextCallable)。验证:传播行为断言可程序化(事务边界日志)。'),
      block('追问链:传播三刀', '一刀:"REQUIRES_NEW 内层访问外层未提交数据?"——另一个连接看不到未提交数据(隔离级别)→读到旧值或锁等待——"看不到自己刚写的数"是 REQUIRES_NEW 的常见坑(spring-advanced 2 题)。二刀:"NESTED 与保存点?"——DataSourceTransactionManager 支持 JDBC 保存点;JPATransactionManager 不支持(用 REQUIRES_NEW 替代)——事务管理器的实现决定 NESTED 是否可用。三刀:"传播与代理?"——传播行为由 TransactionInterceptor 根据注解读取并传给 PlatformTransactionManager——自调用绕过代理(第 87 题)→传播行为也不生效。'),
    ],
    ['REQUIRED 默认,REQUIRES_NEW 独立', 'NESTED 保存点,连接不翻倍', 'REQUIRES_NEW 连接×2,池耗尽常见原因'], [sre, pod],
  ),
  'legacy/86': deep(
    '事务失效的场景',
    '网银交易沙盘:@Transactional 不生效——自调用绕过代理/方法非 public/类被 new 出来/异常被捕获不回滚/传播行为误配/多数据源管理器错配——spring-basics/advanced 的完整汇总版。',
    [
      '六大失效场景:一,自调用(this.pay() 绕过代理,事务生效=0——spring-advanced 1 题实测);二,方法非 public(Spring 6 的 AbstractFallbackTransactionAttributeSource 不读非 public 注解);三,类不是 bean(new OrderService()——无代理);四,异常被捕获且未 rethrow(默认只回滚 RuntimeException/Error,checked 不回滚);五,传播行为误配(NOT_SUPPORTED 挂起事务);六,事务管理器绑错数据源(事务"存在"但管错了库)。',
      '排查顺序:打印 getClass().getName()(含 CGLIB/$Proxy=代理路径)→查方法可见性(public)→查 bean 来源(容器交付还是 new)→查异常处理(是否捕获)→查传播行为与事务管理器绑定(spring-advanced 6 题的排查顺序)。',
      '最佳实践:@Transactional 方法 public+由容器交付(不 new)+不自调用(拆 bean 或 ObjectProvider)+事务方法只做 DB 操作(不夹 RPC,第 10 题分布式事务)+rollbackFor 显式声明(不依赖默认规则的记忆)。',
    ],
    [
      block('机制:事务是 AOP 代理实现的', '@Transactional 的生效=TransactionInterceptor 拦截(调用必须经过代理)——自调用 this.pay() 不经过代理(拦截器不在调用链上)→事务开关没执行;new 出来的对象没有经过容器的 BPP→无代理→注解是摆设——"注解本身永远没错,错在调用路径"(spring-advanced 6 题)。'),
      block('反例:事务失效的两种事故', '事故一:同类内调用@Transactional 方法——事务不生效(自调用绕过代理,spring-advanced 1 题实测=0);修复=拆 bean/ObjectProvider/self-injection/AopContext。事故二:catch 后不标 rollback——内层 catch 异常不传播→外层不知道该回滚→部分提交(脏数据);修复=catch 后 setRollbackOnly 或重新 throw。'),
      block('取舍:事务边界的设计', '事务方法薄(只做 DB 操作)+业务逻辑下沉(无注解的内部方法)+远程调用移出事务(第 39 题事务长度)——事务边界的设计=缩小事务范围(短事务,连接占用少,锁持有短,banking 7 题锁序)。事务不是"加个注解"就完了,是"边界设计"的一部分。'),
    ],
    [
      block('验证:事务失效的走查核对', '验证:spring-advanced 1 题实测(自调用事务生效=0,代理调用=1)+28 题(PostConstruct 捕获=裸类)+6 题(排查入口 this.getClass().getName());验证:每个失效场景的断言可程序化(事务标志=TransactionSynchronizationManager.isActualTransactionActive)。'),
      block('追问链:失效三刀', '一刀:"@Transactional 加在类上?"——类级对全部 public 方法生效;方法级覆盖类级;接口上的注解在 CGLIB 模式不生效(代理不是接口实现)——注解放实现类。二刀:"Spring 6 对非 public 的 warn?"——启动日志有 warn(非 public 方法的事务注解被忽略)——很多团队日志级别看不到 warn;静态检查(ArchUnit)更可靠。三刀:"事务管理器选错?"——事务"正常开关"但管的是另一个数据源——最难排查的形态(多数据源必须显式绑定 TransactionManager,spring-advanced 7 题)。'),
    ],
    ['六大场景:自调用/non-public/new/捕获/传播/管理器', '排查=代理身份+可见性+来源+管理器', '事务方法薄,远程调用移出'], [sre, pod],
  ),
  'legacy/87': deep(
    'JDK 动态代理与 CGLIB 区别？为什么自调用时 AOP 不生效',
    '网银代理沙盘:JDK 代理(实现接口,Proxy.newProxyInstance)vs CGLIB(继承目标类,Enhancer+Objenesis)——自调用(this.method())绕过代理因为 this 是目标不是代理(spring-basics 9/10 题的完整版)。',
    [
      'JDK 动态代理:实现目标接口(代理=接口的实现)——可代理方法=接口声明的方法;目标必须实现接口;Proxy.newProxyInstance(类加载器,接口列表,InvocationHandler)——代理对象≠目标对象(字段在 target,代理的字段全 null,第 19 题 spring-advanced)。',
      'CGLIB:继承目标类(代理=目标子类)——可代理=非 final 非 private 非 static 方法;无需接口;Enhancer.setSuperclass+MethodInterceptor;Objenesis 跳过父类构造器(第 10 题 spring-basics 修正版)。',
      '自调用不生效的机制:代理的拦截发生在"外部调用经代理对象"时;自调用 this.method() 是在目标对象内部直接调用(this 是目标不是代理)——拦截器链不在调用路径上;两种代理的自调用都绕过(JDK 代理的 this=目标,CGLIB 的 this=代理子类但内部方法调用不走拦截器链)。',
    ],
    [
      block('机制:代理的两层对象', 'Spring 容器返回的是代理对象(内部持有 target 引用)——外部调用=经过代理(拦截器先执行再调 target);自调用=在 target 内部直接调 this.method()(this=target,不经代理)——两层对象(代理+目标)是理解自调用失效的关键;AopContext.currentProxy()(exposeProxy=true)可获取代理引用解决。'),
      block('反例:代理的两种事故', '事故一:@Transactional 方法自调用——事务失效(spring-advanced 1 题实测:生效=0);修复=拆 bean/注入自身代理/AopContext.currentProxy/TransactionTemplate。事故二:CGLIB 代理读字段——代理对象的字段全 null(字段在 target);修复=经 target 读字段(不在代理上读)。'),
      block('取舍:代理方式的选型', 'JDK 代理:有接口+性能略优(反射调用);CGLIB:无接口或 proxyTargetClass=true(统一代理方式)+final 方法失效;Boot 默认 CGLIB(spring.aop.proxy-target-class=true)——统一代理方式避免"有接口和没接口的行为差异"(第 10 题 spring-basics)。'),
    ],
    [
      block('验证:代理的走查核对', '验证:spring-basics 9 题真值(ProxyBoundaryExample:proxy.run() intercepted=1,target.run() intercepted=0,累计 1:2);spring-advanced 1 题(自调用事务生效=0,代理调用=1);spring-advanced 19 题(代理字段全 null,经 target 读正确);类名断言(getClass 含 CGLIB/$Proxy)。验证:代理的断言可程序化(真值测试持续执行)。'),
      block('追问链:代理三刀', '一刀:"CGLIB 的 final 方法?"——CGLIB 无法覆写 final 方法→@Transactional 标在 final 方法→事务失效(静默,无报错);修复=final 方法不加事务注解或去掉 final(spring-basics 10 题)。二刀:"Spring 的代理创建时机?"——AbstractAutoProxyCreator 在初始化后(postProcessAfterInitialization)包裹;循环引用时 getEarlyBeanReference 提前创建(第 8 题 spring-basics 三级缓存)。三刀:"代理与序列化?"——CGLIB 代理不可序列化(含合成字段)——返回 DTO 而非代理实体(spring-basics 10 题)。'),
    ],
    ['自调用=this 是目标不是代理', 'JDK 限接口,CGLIB 限非 final', 'Boot 默认 CGLIB 统一代理'], [sre, pod],
  ),
  'legacy/88': deep(
    'Spring Boot 自动装配原理',
    '网银框架沙盘:引入 spring-boot-starter-web 无需配置即可启动 Web 服务——自动装配=@EnableAutoConfiguration→spring.factories/AutoConfiguration.imports→条件注解(@ConditionalOnClass/@ConditionalOnMissingBean)筛选→注册 BeanDefinition。',
    [
      '自动装配的三步:一,@SpringBootApplication 包含 @EnableAutoConfiguration;二,EnableAutoConfigurationImportSelector 读取 META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports(JDK 17/Spring Boot 3 的文件路径);三,条件注解筛选(@ConditionalOnClass 类在 classpath→@ConditionalOnMissingBean 未有自定义 bean→满足条件的配置类注册 BeanDefinition)。',
      '条件注解族:@ConditionalOnClass(classpath 有此类才装配)+@ConditionalOnMissingBean(用户未自定义才装配——用户优先)+@ConditionalOnProperty(配置属性匹配)+@ConditionalOnWebApplication(Web 环境才装配)——条件的组合=精细的装配控制。',
      '自定义 starter:一,自动配置类(@Configuration+@Bean+条件注解);二,META-INF/spring/...AutoConfiguration.imports(注册配置类);三,可选属性类(@ConfigurationProperties——绑定配置);四,打包为 jar→其他项目引入即生效(第 92 题详述)。',
    ],
    [
      block('机制:自动装配的"约定优于配置"', 'Spring Boot 的核心理念=classpath 有什么→自动装配什么(有 spring-web→配 DispatcherServlet;有数据源驱动→配 DataSource)——"约定优于配置"的实现=条件注解(探测 classpath/已有 bean/配置属性)+starter 聚合依赖(一个 starter 带来一组依赖+一组自动配置)。'),
      block('反例:自动装配的两种事故', '事故一:自动配置与用户配置冲突——用户定义了 DataSource 但自动配置也注册了一个→冲突(@ConditionalOnMissingBean 保证用户优先——用户定义了就跳过自动配置);修复=理解"用户优先"的机制(第 88 题排序)。事故二:自动装配不可控——不需要的功能也装配了(多余 bean);修复=排除(@SpringBootApplication(exclude=...))+--debug 条件评估报告(第 49 题诊断)。'),
      block('取舍:starter 的粒度', '粗粒度 starter(一个 starter 包含全部相关依赖):使用简单但可能引入不需要的依赖;细粒度 starter(按功能拆分):精确控制但 starter 数量多——按"依赖的聚合力"定(同一功能域的依赖打包在一起)。'),
    ],
    [
      block('验证:自动装配的走查核对', '验证:条件评估断言(--debug 输出每个自动配置的匹配/不匹配——第 49 题诊断);@ConditionalOnMissingBean 断言(用户定义 DataSource→自动配置跳过);starter 断言(引入 starter→相关 bean 自动注册);排除断言(exclude→不装配)。验证:自动装配的断言可程序化(Spring Boot 测试切片:@WebMvcTest/@DataJpaTest 的条件装配)。'),
      block('追问链:装配三刀', '一刀:"自动装配的顺序?"——用户 bean 先注册→自动配置评估(@ConditionalOnMissingBean 看用户是否有)→自动配置的 bean 注册——用户优先=配置顺序的关键(第 88 题排序)。二刀:"Spring Boot 3 的变化?"——spring.factories→AutoConfiguration.imports(文件路径变化)+Jakarta EE( javax→jakarta)+GraalVM Native 支持——升级时注意自动配置文件路径变化。三刀:"自动装配的调试?"——--debug(条件评估报告)+actuator/beans(所有 bean 列表)+actuator/conditions(条件报告)——排障的三把钥匙(第 49 题诊断)。'),
    ],
    ['@EnableAutoConfiguration→imports 文件→条件筛选', '@ConditionalOnMissingBean=用户优先', 'starter=依赖聚合+自动配置'], [sre, pod],
  ),
  'legacy/89': deep(
    '拦截器与过滤器的区别？执行顺序',
    '网银 Web 沙盘:Filter(Servlet 规范,所有请求)vs HandlerInterceptor(Spring MVC,仅 Controller)——执行顺序=Filter 前置→Servlet→Interceptor 前置→Controller→Interceptor 后置→Filter 后置(洋葱模型)。',
    [
      'Filter(Servlet 层):所有请求(包括静态资源)——不依赖 Spring MVC(纯 Servlet 规范);由容器(Tomcat)管理;HandlerInterceptor(MVC 层):只拦截 Controller(不拦截静态资源);依赖 Spring 上下文(可注入 bean)。',
      '执行顺序(洋葱):Filter.before→[Servlet→Interceptor.before→Controller→Interceptor.after(视图渲染前)]→Interceptor.afterCompletion(渲染完成后)→Filter.after——Filter 包裹整个请求,Interceptor 包裹 Controller 处理。',
      '选择:横切所有请求(编码/CORS/安全)→Filter;仅拦截 MVC 处理(登录/权限/日志)→Interceptor;Filter 拿不到 Handler 信息(Interceptor 可以——preHandle 拿到 HandlerMethod),Interceptor 的异常进 ControllerAdvice(第 18 题 spring-basics),Filter 的异常不进(需独立处理)。',
    ],
    [
      block('机制:洋葱模型的两层包裹', 'Filter 与 Interceptor 是"两层洋葱":Filter(外层,包裹整个请求含静态资源)→DispatcherServlet→Interceptor(内层,包裹 Controller)→Controller——请求从外到内穿,响应从内到外穿;Filter 的 doFilter(request,response,chain) 中 chain.doFilter() 前后是"前置与后置"的分界。'),
      block('反例:Filter/Interceptor 的两种事故', '事故一:Filter 中抛异常不处理——Filter 异常不进 ControllerAdvice(错误格式不一致,第 18 题 spring-basics);修复=Filter 异常自行处理(catch+统一格式输出)。事故二:Interceptor 做 Filter 的事(如编码)——编码应在 Filter(更早,所有请求含静态资源);修复=按"拦截范围"选层(第 18 题选择依据)。'),
      block('取舍:Filter 与 Interceptor 的选择', '需要 Handler 信息(哪个 Controller/方法)→Interceptor(preHandle 拿到 HandlerMethod);需要操作原始请求/响应(包装 request)→Filter;需要 Spring 上下文(注入 bean)→Interceptor(Filter 中注入 bean 需要 DelegatingFilterProxy);纯 Servlet 规范(不依赖 Spring)→Filter。'),
    ],
    [
      block('验证:执行顺序的走查核对', '验证:顺序断言(Filter.before→Interceptor.preHandle→Controller→Interceptor.postHandle→Filter.after,日志顺序);异常路由断言(Filter 异常不进 Advice/Controller 异常进 Advice);静态资源断言(Filter 拦截静态资源/Interceptor 不拦截)。验证:顺序断言可程序化(日志顺序+mock 请求);洋葱模型的时间线可视化。'),
      block('追问链:Filter 三刀', '一刀:"Filter 的顺序?"——@Order 注解或 FilterRegistrationBean.setOrder(数值小先执行)——安全 Filter(Security)通常最先(第 17 题 spring-basics 的 Filter 链)。二刀:"Filter 的异步?"——Servlet 3.0 异步(startAsync)→Filter 的 after 在 async 完成后执行(不是 doFilter 返回后)——异步请求的 Filter 生命周期变化。三刀:"OncePerRequestFilter?"——保证每次请求只执行一次(转发/include 不重复执行)——需要"严格一次"语义的 Filter 继承 OncePerRequestFilter。'),
    ],
    ['Filter=Servlet 层全部请求', 'Interceptor=MVC 层仅 Controller', '洋葱模型:Filter 包 Interceptor 包 Controller'], [sre, pod],
  ),
  'legacy/90': deep(
    'MyBatis 执行流程？一二级缓存？延迟加载',
    '网银 ORM 沙盘:MyBatis 的执行流程(SqlSession→Executor→StatementHandler→ResultSetHandler)+一级缓存(SqlSession 级)+二级缓存(Namespace 级)+延迟加载(代理+按需加载关联)。',
    [
      '执行流程:SqlSessionFactory→SqlSession→Executor(执行器:Simple/Reuse/Batch)→StatementHandler(创建 Statement+参数设置)→数据库→ResultSetHandler(结果映射→Java 对象)——Mapper 接口通过动态代理(JDK Proxy)将方法调用转为 SqlSession 的操作(MapperProxy)。',
      '一级缓存:SqlSession 级(默认开启,同一 SqlSession 的相同查询命中缓存)——作用域小(一次数据库会话);Spring 整合后每请求新 SqlSession→一级缓存几乎无效(每次新会话);清空条件:增删改/close/clearCache。',
      '二级缓存:Namespace 级(跨 SqlSession,默认关闭,需 <cache> 开启)——序列化存储(对象要实现 Serializable);风险:多表查询时脏读(A 表更新不会清 B 表的 Namespace 缓存)——推荐关闭二级缓存,用 Redis 等外部缓存替代(可控性更好)。',
      '延迟加载:关联对象(association/collection)在首次访问时才加载(代理+CGLIB/Javassist)——aggressiveLazyLoading(默认 false,调用任何方法即触发加载)vs 按需加载(访问关联属性才触发)——延迟加载的 N+1 问题(循环触发 N 次查询,第 29 题 MyBatis 延迟加载)。'),
    ],
    [
      block('机制:一级缓存的"会话级"设计', '一级缓存的 key=statement ID+参数+分页+SQL——同一 SqlSession 的相同查询命中缓存(避免重复查 DB);Spring 整合后 SqlSession 的生命周期=请求(每次请求新建)→一级缓存只在"同一请求内的相同查询"生效;增删改清空缓存(防止脏读)。'),
      block('反例:MyBatis 缓存的两种事故', '事故一:二级缓存的脏读——Namespace A 的缓存被 Namespace B 的更新污染(多表 JOIN 的缓存失效问题);修复=关闭二级缓存或确保单表操作。事故二:N+1 查询——延迟加载的关联在循环中逐个触发查询(100 条记录×每次关联查询=N+1 次);修复=JOIN 一次查询或 BatchExecutor(第 29 题 MyBatis)。'),
      block('取舍:MyBatis vs JPA 的选型', 'MyBatis:SQL 可控(手写 SQL)+动态 SQL 灵活(<if>/<foreach>)+学习成本低——适合复杂查询/报表/SQL 优化;JPA:对象关系映射自动化+数据库无关——适合简单 CRUD+对象模型清晰;混合使用:复杂查询用 MyBatis,简单 CRUD 用 Spring Data JPA(共存可行)。'),
    ],
    [
      block('验证:MyBatis 的走查核对', '验证:执行流程断言(MapperProxy 动态代理→SqlSession→Executor→DB);一级缓存断言(同 SqlSession 相同查询只执行一次 SQL);二级缓存风险断言(多表更新后缓存脏读);延迟加载断言(未访问关联属性→不触发 SQL;访问后触发)。验证:MyBatis 的断言可程序化(SQL 日志计数+缓存命中统计)。'),
      block('追问链:MyBatis 三刀', '一刀:"#{} 与 ${} 的区别?"——#{}=PreparedStatement 参数(防 SQL 注入);${}=字符串替换(有 SQL 注入风险——仅用于表名/列名等非值场景,且白名单校验,第 48 题数据库)。二刀:"Mapper 接口的原理?"——MapperProxy(JDK 动态代理)将接口方法映射为 SQL(MapperMethod 解析注解/XML)→SqlSession 执行——接口无需实现类(代理实现)。三刀:"批量操作?"——ExecutorType.BATCH(批量提交,减少网络往返)+foreach 标签(SQL 拼接,注意 SQL 长度限制)——批量插入的两种方式与性能对照(第 39 题批处理)。'),
    ],
    ['SqlSession→Executor→Statement→ResultSet', '一级缓存会话级,二级 Namespace 级', '延迟加载防 N+1,批量查询替代'], [sre, pod],
  ),
  'legacy/91': deep(
    'Spring 事件机制；@Async 原理与线程池配置',
    '网银事件沙盘:支付成功→发布事件→库存/通知/积分各自监听——Spring 事件(ApplicationEvent+@EventListener)+@Async 异步监听(AFTER_COMMIT 事务事件,第 91 题 spring-advanced 的完整版)。',
    [
      'Spring 事件:ApplicationEventPublisher.publishEvent(event)→@EventListener 方法接收——同步(默认,同线程执行)与异步(@Async+@EventListener=异步监听);事务事件:@TransactionalEventListener(phase=AFTER_COMMIT)——事务提交后才执行(默认 BEFORE_COMMIT)。',
      '@Async 原理:代理拦截(AsyncAnnotationAdvisor)→提交到线程池(AsyncTaskExecutor)→方法在新线程执行——调用方立即返回(Future/void);@Async 需要 @EnableAsync 开启;默认线程池=SimpleAsyncTaskExecutor(每次新建线程,无上限)→必须自定义 ThreadPoolTaskExecutor(第 35 题 spring-basics)。',
      'AFTER_COMMIT 的坑:事务提交后执行——事务内修改的数据此时可见(对外可见);AFTER_COMMIT 中不能再操作同一事务(事务已结束——需新事务 REQUIRES_NEW 或 @Async);afterCommit 不触发(如果事务回滚了——Transactional 测试的盲区,第 42 题 spring-basics)。',
    ],
    [
      block('机制:同步事件与异步事件的选择', '同步事件(默认):同线程执行(事务上下文共享,异常可传播到发布者)——适合"紧耦合的后续处理"(同事务);异步事件(@Async):新线程执行(事务上下文丢失,异常不传播)——适合"解耦的后续处理"(通知/审计,不需要同事务);AFTER_COMMIT:事务成功后执行——适合"事务成功后的副作用"(发通知/更新缓存)。'),
      block('反例:事件机制的两种事故', '事故一:同步事件阻塞主流程——事件监听器执行 3 秒→调用方等 3 秒(事件本意是解耦但实际阻塞);修复=@Async 异步监听(解耦)。事故二:AFTER_COMMIT 中访问事务内数据——事务已提交,数据对外可见,但 AFTER_COMMIT 中修改的数据不在原事务内(需要新事务);修复=AFTER_COMMIT 中只读不写或用 @Async(REQUIRES_NEW)。'),
      block('取舍:事件 vs 直接调用的选择', '事件:解耦(发布者不感知观察者)+可扩展(新增观察者不改发布者)+单向(发布者不知道结果);直接调用:可控(返回值/异常)+事务一致(同事务)——核心业务用直接调用(需要结果),后续处理用事件(解耦)——"是否需要结果"决定用事件还是调用。'),
    ],
    [
      block('验证:事件机制的走查核对', '验证:同步事件断言(发布→监听器同线程执行);异步事件断言(@Async 监听器在新线程执行);AFTER_COMMIT 断言(事务提交后才触发——事务内不触发);Transactional 测试盲区断言(AFTER_COMMIT 在自动回滚测试中不触发——第 42 题盲区)。验证:事件时序断言可程序化(日志顺序+线程名)。'),
      block('追问链:事件三刀', '一刀:"事件的有序执行?"——@EventListener 的 order 属性(数值小先执行)或 SmartApplicationListener(支持泛型+排序)——多观察者的执行顺序可控制。二刀:"事件的异步线程池?"——@Async 的线程池=AsyncConfigurer.getAsyncExecutor(全局配置)或 @Async("beanName")(指定池)——不同事件用不同池(隔离,第 11 题)。三刀:"事件的事务传播?"——@TransactionalEventListener(phase=AFTER_COMMIT, propagation=REQUIRES_NEW)——AFTER_COMMIT 中默认 REQUIRES_NEW(新事务,否则无事务上下文)。'),
    ],
    ['同步=同线程,异步=新线程', 'AFTER_COMMIT=事务成功后执行', '@Async 必须自定义线程池'], [sre, pod],
  ),
  'legacy/92': deep(
    '如何自定义一个 starter',
    '网银框架沙盘:团队有通用的"审计日志"能力(每个项目都要接)——自定义 starter=打包"依赖+自动配置+属性类"为独立 jar,引入即用(约定优于配置,第 88 题)。',
    [
      'starter 的三件套:一,autoconfigure 模块(@Configuration+@ConditionalOnClass/@ConditionalOnMissingBean+@ConfigurationProperties 属性类);二,starter 模块(聚合依赖——autoconfigure+实际依赖,无代码);三,注册文件(META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports——Spring Boot 3 路径)。',
      '命名约定:官方 starter=spring-boot-starter-XXX;自定义=XXX-spring-boot-starter(如 audit-spring-boot-starter)——区分官方与第三方;属性前缀=@ConfigurationProperties(prefix="audit")——配置项 audit.enabled/audit.format 等。',
      '条件注解的使用:@ConditionalOnClass(AuditService.class)(classpath 有审计类才装配)+@ConditionalOnMissingBean(AuditService.class)(用户未自定义才装配——用户优先)+@ConditionalOnProperty(name="audit.enabled", havingValue="true")(配置开关)——三条件组合=精细控制(第 88 题条件注解族)。',
    ],
    [
      block('机制:starter 的"封装即复用"', 'starter=把"依赖+配置+自动装配"打包为可复用单元:使用者引入 starter+配置属性即可(无需理解内部实现);starter 的价值=消除"每个项目重复配置"的劳动(约定优于配置的实践)。类比工具箱:starter=工具箱(打开即用),内部工具(autoconfigure)自动组装。'),
      block('反例:starter 的两种事故', '事故一:starter 缺条件注解——无条件注册 bean(与其他 starter 冲突或覆盖用户配置);修复=@ConditionalOnMissingBean(用户优先)+@ConditionalOnClass(依赖存在才装配)。事故二:starter 的属性无默认值——使用者必须配置所有属性才能启动;修复=@ConfigurationProperties 的默认值(合理默认,减少配置负担)。'),
      block('取舍:starter 的内部复杂度', '简单的 starter(一个配置类+一个 bean):够用就好;复杂的 starter(多个配置类+条件组合+生命周期管理):按需求递增——starter 的复杂度=使用者"少配置"与开发者"多实现"的交换;starter 的文档(README:配置项/条件/示例)是使用者的第一入口。'),
    ],
    [
      block('验证:starter 的走查核对', '验证:引入 starter 断言(bean 自动注册——actuator/beans 可查);条件断言(缺依赖→不装配+条件评估报告说明);属性绑定断言(配置项正确绑定到 @ConfigurationProperties);用户优先断言(用户自定义 bean→starter 不覆盖)。验证:starter 的断言可程序化(Spring Boot 测试:ApplicationContextRunner 模拟不同条件)。'),
      block('追问链:starter 三刀', '一刀:"autoconfigure 与 starter 分开?"——autoconfigure(代码)与 starter(依赖聚合)分两个模块——使用者引 starter(包含 autoconfigure+依赖);开发者只依赖 autoconfigure(测试)。二刀:"starter 的版本管理?"——starter 与 autoconfigure 版本独立(自动配置变更→autoconfigure 版本升;依赖变更→starter 版本升)——版本解耦。三刀:"starter 的测试?"——ApplicationContextRunner(模拟不同条件:有/无依赖/有/无用户 bean/不同属性值)——starter 的自动化测试(Spring Boot 官方测试工具)。'),
    ],
    ['三件套:autoconfigure+starter+imports', '@ConditionalOnMissingBean=用户优先', '属性默认值,减少配置负担'], [sre, pod],
  ),

  'legacy/94': deep(
    '联合索引的最左前缀？覆盖索引？索引下推',
    '网银查询沙盘:联合索引 (a,b,c)——查询 WHERE a=? AND b=? 走索引;WHERE b=? 不走(缺最左前缀);SELECT a,b,c 覆盖索引(不回表);ICP 索引下推(存储引擎层先过滤,减少回表)。database-advanced 2/6 题的完整版。',
    [
      '最左前缀:联合索引按 (a,b,c) 排序——查询条件必须从最左列开始连续匹配(a=?/a=? AND b=?/a=? AND b=? AND c=? 均可;a=? AND c=? 部分使用;仅 b=? 或 c=? 不走)——范围条件(>,<,BETWEEN)后的列不再参与索引定位(但可参与 ICP 过滤)。',
      '覆盖索引:查询的所有列都在索引中(SELECT a,b,c,索引 (a,b,c) 覆盖)→无需回表(EXPLAIN Extra=Using index)——覆盖索引避免回表的随机 IO,性能提升显著;设计:将高频查询列加入索引(空间换时间)。',
      '索引下推(ICP):MySQL 5.6+——查询条件部分列在索引中→存储引擎层先过滤(减少回表次数)→EXPLAIN Extra=Using index condition;ICP 只对二级索引生效(聚簇索引即整行,无需下推)——条件列必须在索引列中(第 6 题 database-advanced)。',
    ],
    [
      block('机制:索引的 B+ 树结构与最左前缀', '联合索引 (a,b,c) 的 B+ 树按 a→b→c 排序:先按 a 排,a 相同按 b 排,b 相同按 c 排——跳过 a 直接查 b=树的排列不对(无法二分)→不走索引;类比字典:按"姓→名"排序,跳过姓查名=要遍历全字典。'),
      block('反例:索引使用的两种事故', '事故一:范围条件后索引失效——WHERE a=1 AND b>5 AND c=3——b 范围后 c 无法精确定位(但 ICP 可过滤);修复=调整索引列顺序(把等值条件放前,范围放后)。事故二:隐式类型转换——varchar 列接数字字面量→类型转换→索引失效(EXPLAIN type=ALL);修复=统一类型(database-advanced 2 题)。'),
      block('取舍:索引的设计权衡', '索引越多→写入越慢(每个索引都要维护)+空间越大;索引越少→查询慢——按"查询频率×查询模式"设计索引(高频查询的组合条件→联合索引);冗余索引(单列索引被联合索引前缀覆盖)清理(第 50 题数据库索引优化)。'),
    ],
    [
      block('验证:索引的走查核对', '验证:EXPLAIN 走查——type(ref/range/index/ALL)+key(使用的索引)+Extra(Using index condition/Using index/Using filesort);四场景断言(最左前缀匹配/覆盖索引不回表/ICP 减少回表/范围后失效)——database-advanced 2/6 题的实测可复用;EXPLAIN ANALYZE 的 actual rows 对照(第 11 题数据库)。'),
      block('追问链:索引三刀', '一刀:"索引列顺序的影响?"——等值列在前,范围列在后(等值可精确定位,范围后失效);排序列跟随(GROUP BY/ORDER BY 列加入索引避免 filesort)。二刀:"前缀索引?"——长字符串列(如 URL)用前缀索引(col(20))节省空间——但前缀索引无法覆盖索引(不包含完整列值);选择性(不同前缀值的区分度)决定前缀长度。三刀:"索引的维护成本?"——每个索引增加 INSERT/UPDATE/DELETE 的开销(维护 B+ 树)——索引不是免费的,按查询频率设计(第 50 题数据库)。'),
    ],
    ['最左前缀,跳过左列不走索引', '覆盖索引不回表,ICP 引擎层过滤', '索引设计=查询频率×维护成本'], [r.explain, pod],
  ),
  'legacy/96': deep(
    '间隙锁、临键锁？幻读如何解决',
    '网银事务沙盘:RR 隔离级别下 SELECT FOR UPDATE 对范围查询加 next-key 锁(记录锁+间隙锁)——防止幻读(其他事务插入范围内新行);RC 下无间隙锁但有幻读。database-basics 22 题的完整版。',
    [
      '三种锁:记录锁(Record Lock,锁单条索引记录)、间隙锁(Gap Lock,锁索引记录之间的间隙——防插入,不锁记录本身)、临键锁(Next-Key Lock=记录锁+间隙锁,左开右闭区间)——RR 下默认 next-key;RC 下只有记录锁(无间隙锁→有幻读)。',
      '幻读的解决:RR 下快照读靠 MVCC 消除幻读(Read View 一次建立);当前读(SELECT FOR UPDATE/UPDATE/DELETE)靠 next-key 锁消除(间隙锁防止插入)——两种读用不同机制消除幻读(database-basics 17 题);写偏差(Wide Skew)在 RR 下仍可能(第 25 题 database-advanced)。',
      '唯一索引的退化:等值命中唯一索引已有记录→退化为纯记录锁(不需要间隙锁——记录存在,无间隙可插入);等值未命中→间隙锁(防止插入相同值)——database-basics 22 题的区间形状与退化规则。',
    ],
    [
      block('机制:间隙锁的"防插入"语义', '间隙锁锁的不是记录而是"间隙"(索引中相邻记录之间的空隙)——防止其他事务在间隙中插入新行(防幻读);间隙锁之间不冲突(两个事务可同时持有同一间隙的间隙锁——都只防插入不防读取);间隙锁与插入意向锁冲突(插入意向锁等待间隙锁释放)。'),
      block('反例:间隙锁的两种事故', '事故一:不必要的间隙锁——RC 级别够用的场景用 RR→间隙锁增加死锁风险与锁范围;修复=按业务一致性需求选隔离级别(第 103 题转账隔离)。事故二:间隙锁导致的死锁——两个事务都持间隙锁→都尝试插入→互相等待(间隙锁不冲突但插入意向锁冲突)→死锁;修复=统一插入顺序或改 RC。'),
      block('取舍:RR vs RC 的选择', 'RR:间隙锁防幻读+一致性读(快照稳定)——但锁范围大(间隙锁)+死锁风险高;RC:无间隙锁(锁范围小,并发好)+有幻读——大多数互联网公司用 RC(阿里规范);金融核心用 RR(一致性优先,第 103 题)——选择=一致性要求vs并发吞吐的权衡。'),
    ],
    [
      block('验证:间隙锁的走查核对', '验证:database-basics 22 题——键 10/20/30,RR 下 FOR UPDATE 锁定范围;另一连接尝试插入 15(阻塞)/25(阻塞)/35(取决于边界);RC 下同样操作(不阻塞——无间隙锁);SHOW ENGINE INNODB STATUS 查看 LOCK WAIT 结构;performance_schema.data_locks 查看锁详情。验证:锁范围断言与幻读行为断言可程序化(MySQL 实测)。'),
      block('追问链:锁三刀', '一刀:"next-key 的区间怎么定?"——(负无穷,10],(10,20],(20,30],(30,+无穷)——"记录及其前方间隙"合为一体;等值命中的退化规则(唯一命中→记录锁;未命中→间隙锁;普通索引→next-key+下一区间间隙,第 22 题 database-basics)。二刀:"插入意向锁?"——INSERT 前获取的间隙锁类型(与间隙锁冲突→等待);多个插入意向锁之间不冲突(同一间隙可多事务等待插入)。三刀:"锁的监控?"——performance_schema.data_locks/data_lock_waits(当前锁与等待)+SHOW ENGINE INNODB STATUS(LATEST DETECTED DEADLOCK,第 101 题数据库死锁排查)。'),
    ],
    ['记录锁+间隙锁=next-key(左开右闭)', 'RR 快照读 MVCC,当前读 next-key', 'RC 无间隙锁,有幻读但并发好'], [r.lock, r.isolation],
  ),
  'legacy/97': deep(
    'redo log、undo log、binlog 各自作用？两阶段提交',
    '网银日志沙盘:redo(InnoDB 崩溃恢复,物理日志,循环写)、undo(回滚+MVCC,逻辑日志)、binlog(Server 层,复制+时间点恢复)——两阶段提交(redo prepare→binlog→redo commit)保证 redo 与 binlog 一致。database-basics 28 题的完整版。',
    [
      'redo log:InnoDB 引擎层,物理日志(页的修改)——WAL(Write-Ahead Logging,先写日志再写数据页)保证持久性;循环写(ib_logfile0/1 固定大小,checkpoints 推进);崩溃恢复:重启后重放 redo(已提交未刷盘的恢复)。',
      'undo log:InnoDB 引擎层,逻辑日志(反向操作)——事务回滚(撤销修改)+MVCC(历史版本链,第 19 题数据库);insert 的 undo=删除标记,update 的 undo=旧值;purge 线程清理(长事务阻止清理,第 20 题数据库)。',
      'binlog:Server 层,逻辑日志(变更事件)——复制(主→从)+时间点恢复(PITR)+审计;三种格式:statement(SQL 语句)/row(行变更)/mixed(自动选择)——两阶段提交:redo prepare→写 binlog→redo commit(崩溃恢复按 redo 状态+binlog 完整性决定)。',
    ],
    [
      block('机制:两阶段提交的一致性保证', '崩溃场景:redo prepare 后崩溃——如果 binlog 完整→提交(复制需要这条)→否则回滚——"redo 与 binlog 要么都写要么都不写"(一致性保证);如果只用 redo 不用两阶段:redo 提交但 binlog 缺失→从库缺数据(不一致)。类比快递:包裹打包(redo prepare)→快递单生成(binlog)→发货(redo commit)——缺快递单=收件方不知道收到了什么。'),
      block('反例:日志的两种事故', '事故一:innodb_flush_log_at_trx_commit=0——每秒刷盘(而非每事务)→断电丢 1 秒数据;修复=1(每事务刷盘)+sync_binlog=1(binlog 也刷盘)——性能与持久性的权衡(第 29 题数据库)。事故二:undo 长事务阻止清理——长事务持有旧 Read View→purge 无法清理历史版本→undo 膨胀;修复=监控长事务(information_schema.innodb_trx)+拆分长事务(第 20 题数据库)。'),
      block('取舍:binlog 格式的选择', 'statement:日志量小但非确定性函数(NOW/UUID)主从不一致;row:日志量大但精确(行变更);mixed:自动选择(默认 statement,不安全时切 row)——金融场景推荐 row(精确+可审计)+binlog_row_image=FULL(全列)或 MINIMAL(变更列,省空间)。'),
    ],
    [
      block('验证:三种日志的走查核对', '验证:redo 断言(崩溃后重启→redo 重放恢复——理论推演,未实际断电);undo 断言(回滚事务→数据还原);binlog 断言(binlog 格式与事件内容——mysqlbinlog 工具查看);两阶段提交断言(崩溃恢复按 redo 状态+binlog 判断——database-basics 28 题的内部两阶段提交)。验证:日志断言可程序化(MySQL 实测+崩溃模拟)。'),
      block('追问链:日志三刀', '一刀:"redo 的 WAL 为什么快?"——WAL 先写日志(redo,顺序写)再写数据页(随机写)——顺序写比随机写快数倍;数据页延迟刷盘(合并多次修改)——WAL=将随机写转化为顺序写。二刀:"binlog 与 redo 的区别?"——binlog=Server 层,逻辑日志(所有引擎共用),追加写;redo=InnoDB 层,物理日志(仅 InnoDB),循环写——分工:redo 管崩溃恢复,binlog 管复制与 PITR。三刀:"undo 的 MVCC 链?"——每行隐藏列 trx_id+roll_pointer→undo log 的历史版本链→Read View 沿链判断可见性(第 19 题数据库 MVCC 版本链与可见性判定)。'),
    ],
    ['redo 恢复,undo 回滚+MVCC,binlog 复制', '两阶段提交保证 redo-binlog 一致', 'WAL=顺序写替代随机写'], [r.redo, r.binlog],
  ),
  'legacy/98': deep(
    '慢 SQL 排查流程？explain 关键字段',
    '网银 DBA 沙盘:慢查询日志(slow_query_log)捕获慢 SQL→EXPLAIN 分析执行计划(type/key/rows/Extra)→优化(索引/改写/架构)→验证(执行时间对比)——database-advanced 2/11 题的完整版。',
    [
      '慢 SQL 排查五步:一,开启慢查询日志(long_query_time=1s+log_queries_not_using_indexes)→捕获慢 SQL;二,EXPLAIN 分析(type=ALL 全表扫/key=NULL 未走索引/rows 扫描行数/Extra=Using filesort/temporary);三,优化(加索引/改写 SQL/调整结构);四,验证(EXPLAIN 对照+执行时间);五,监控(slow log 持续+性能趋势)。',
      'EXPLAIN 关键字段:type(访问类型:const>eq_ref>ref>range>index>ALL——ALL=全表扫)、key(实际使用的索引)、rows(预估扫描行数——与 actual rows 对照,第 11 题)、Extra(Using index 覆盖/Using filesort 排序/Using temporary 临时表/Using index condition ICP)。',
      '优化方向:加索引(联合索引按最左前缀,第 94 题)/SQL 改写(子查询→JOIN/OR→UNION,第 2 题数据库)/分页优化(游标替代 OFFSET,第 14 题 database-advanced)/架构(读写分离/缓存,第 137 题)——每步优化后 EXPLAIN 验证(不是"加了索引就行")。',
    ],
    [
      block('机制:EXPLAIN 的"成本估算"与"实际执行"', 'EXPLAIN=优化器的成本估算(type/rows/key——基于统计信息,可能不准);EXPLAIN ANALYZE=实际执行(MySQL 8.0.18+,actual rows/actual time/loops)——估算与实际的偏差=统计信息失真的信号(ANALYZE TABLE 更新统计);database-basics 11 题详解 TREE 输出。'),
      block('反例:慢 SQL 的两种事故', '事故一:只加索引不改 SQL——SQL 写法导致索引失效(隐式转换/函数操作列/前导通配,第 2 题数据库)——索引加了但没用上;修复=改写 SQL(让条件可走索引)。事故二:索引加了但优化器不走——统计信息过时(表数据变化后未 ANALYZE)→优化器误判成本;修复=ANALYZE TABLE 更新统计或 force index(最后手段,第 2 题数据库取舍)。'),
      block('取舍:SQL 优化与应用层的分工', 'SQL 层优化:索引/改写/参数(数据库层面);应用层优化:缓存(第 20 题缓存)/异步(第 39 题)/批量(第 125 题批处理)/分页(游标)——SQL 优化有上限(数据量太大SQL 也慢),应用层优化无上限——按"优化成本与收益"分层。'),
    ],
    [
      block('验证:慢 SQL 的走查核对', '验证:慢查询日志断言(long_query_time=1 捕获>1s 的 SQL);EXPLAIN 断言(type/key/rows/Extra 各字段解读);EXPLAIN ANALYZE 断言(actual rows vs 估算 rows——偏差=统计失真);优化验证断言(加索引后 type 从 ALL→ref+rows 减少+执行时间下降)。验证:database-advanced 2/11 题的实测可复用(EXPLAIN ANALYZE 对照)。'),
      block('追问链:SQL 三刀', '一刀:"慢 SQL 的根因分类?"——索引缺失(全表扫)/索引失效(写法导致不走)/数据量(单表太大)/锁等待(第 101 题死锁)/服务器资源(CPU/IO)——分类决定优化方向(加索引/改 SQL/分库/调参)。二刀:"EXPLAIN 的 Extra 详解?"——Using index(覆盖)/Using where(服务器过滤)/Using index condition(ICP)/Using filesort(额外排序)/Using temporary(临时表)——每种 Extra 对应不同的优化方向。三刀:"慢 SQL 的预防?"——SQL 审计上线前(第 151 题代码评审的 SQL 检查)+慢查询日志持续监控+性能基线(EXPLAIN ANALYZE 基线,第 49 题)——预防优于排查。'),
    ],
    ['慢 SQL 五步:日志→EXPLAIN→优化→验证→监控', 'type=ALL 全表扫,Extra 看细节', '每步优化后 EXPLAIN 验证'], [r.explain, sre],
  ),
  'legacy/99': deep(
    '深分页如何优化',
    '网银报表沙盘:LIMIT 1000000, 20——MySQL 需扫描前 1000020 行丢弃前 1000000 行(OFFSET 越深越慢);优化=游标分页(WHERE id > last_id LIMIT 20)或覆盖索引子查询。database-advanced 14 题的完整版。',
    [
      '深分页的问题:LIMIT offset, size→MySQL 扫描 offset+size 行→丢弃 offset 行→返回 size 行——OFFSET=1000000→扫描 1000020 行(绝大多数被丢弃);耗时随 offset 线性增长(第 14 题 database-advanced 的"数数vs坐标"类比)。',
      '游标分页(推荐):WHERE id > last_seen_id ORDER BY id LIMIT 20——从上次位置继续(索引定位精确,不扫描丢弃行)——条件=id 单调递增(自增主键/时间+id 复合游标);不支持跳页(只支持"下一页/上一页")。',
      '覆盖索引子查询:SELECT * FROM t INNER JOIN (SELECT id FROM t WHERE 条件 ORDER BY id LIMIT 1000000,20) AS tmp ON t.id=tmp.id——子查询走覆盖索引(不回表,只扫 ID)→外层按 ID 精确查找——支持跳页,但 OFFSET 依然随页深增加。'),
    ],
    [
      block('机制:OFFSET 的成本为什么随页深线性增长', 'LIMIT 1000000,20=扫描前 1000020 行→丢前 1000000 行→返回 20 行——扫描量=offset+size,offset 越大扫描越多;游标分页=索引定位到 last_id→扫描 20 行(常数成本)——OFFSET 的成本是"从第一行开始数数",游标是"从书签开始读"(database-advanced 14 题的类比)。'),
      block('反例:深分页的两种事故', '事故一:OFFSET 1000000→30 秒超时(运营报表翻到深页);修复=游标分页或覆盖索引子查询。事故二:游标分页的游标失效——游标参数(last_id)由客户端伪造(跳到非授权数据);修复=游标参数由服务端下发(客户端透传)+游标绑定查询条件(第 10 题database-advanced)。'),
      block('取舍:游标 vs OFFSET 的产品边界', '游标:成本恒定但不支持跳页(产品允许时优先);OFFSET:支持跳页但深页慢(限最大页深);搜索引擎(Elasticsearch):search_after(游标)或 scroll(快照)——产品与技术的协同:产品侧限制深翻页(导出替代)。'),
    ],
    [
      block('验证:深分页的走查核对', '验证:OFFSET 对照(LIMIT 1000000,20 vs LIMIT 0,20 的耗时——前者显著慢);游标断言(WHERE id>last_id LIMIT 20 的耗时恒定);覆盖索引断言(子查询走索引不回表);database-advanced 14 题的实测(同秒 100 条的漏读+游标修复)。验证:耗时对照可程序化(同环境不同方案计时)。'),
      block('追问链:分页三刀', '一刀:"排序键的选择?"——游标排序键必须唯一且有序(created_at,id 复合——同秒并列由 id 补齐);不唯一的排序键=漏读或重读。二刀:"总页数怎么显示?"——游标分页不支持总页数(需要 COUNT 全表——成本高);产品侧"下一页/上一页"替代页码跳转(第 14 题 database-advanced)。三刀:"ES 的深分页?"——from+size 也有限制(默认 10000);search_after(游标)+PIT(时间点快照)——ES 与 MySQL 的深分页策略同构。'),
    ],
    ['OFFSET 扫描丢弃,成本随页深线性', '游标分页恒定成本,不支持跳页', '覆盖索引子查询是折中方案'], [r.select, pod],
  ),
  'legacy/100': deep(
    '主从复制原理？主从延迟的原因与处理',
    '网银高可用沙盘:主库 binlog→从库 I/O 线程接收→relay log→SQL 线程回放——主从延迟=网络+回放耗时(大事务/从库压力/单线程回放);处理=并行复制/拆大事务/关键读走主库(第 137 题读写分离的完整版)。',
    [
      '复制三线程:主库 binlog dump thread(发送 binlog)→从库 I/O thread(接收写 relay log)→从库 SQL thread(回放 relay log)——复制是异步的(主库不等从库,提交即返回);延迟=从库回放跟不上主库写入。',
      '延迟的原因:大事务(一个事务回放需要与执行等长时间——主库 10s 的事务从库也要 10s)、从库压力大(从库还承担读查询)、单线程回放(MySQL 5.6 前 SQL 线程单线程——MySQL 5.7+ 并行复制按库/事务并行)。',
      '处理:并行复制(MYSQL 5.7+: slave_parallel_type=LOGICAL_CLOCK——基于组提交的并行回放)/拆大事务(批量更新拆小批)/关键读走主库(写后读一致性,第 137 题)/监控(Seconds_Behind_Master+pt-heartbeat 更精确)。',
    ],
    [
      block('机制:为什么主从延迟"不可避免"', '异步复制=主库不等从库(性能优先,不做 2PC)——延迟=主库提交速度-从库回放速度的差值累积;半同步复制(至少一个从库确认)减少丢失风险但仍不等所有从库;组复制(MGR)多数派确认(更强但更慢)——复制模式的选择=RPO 与写延迟的权衡(第 137 题)。'),
      block('反例:主从延迟的两种事故', '事故一:改密码后从库读——读到旧密码→登录失败(写后立读走主库,第 137 题);修复=会话粘滞或关键读走主。事故二:延迟 30 秒无告警——从库延迟飙升无人知(报表数据全错);修复=延迟监控告警(阈值=业务可接受窗口)+pt-heartbeat(比 Seconds_Behind_Master 更准确)。'),
      block('取舍:延迟的容忍度与业务分档', '容忍延迟的场景:报表/分析/搜索(分钟级延迟可接受);不容忍:交易确认/登录验证(写后立读)——按查询场景分档(第 26 题一致性分档同构)——分档的结果决定路由策略(关键读走主,展示读走从)。'),
    ],
    [
      block('验证:主从延迟的走查核对', '验证:延迟测量(主库写入时间戳→从库读到时间戳的差值);Seconds_Behind_Master 对照(pt-heartbeat 更准确——SBM 只测量 SQL 线程的滞后);并行复制对照(开启 slave_parallel_workers 后延迟下降);写后读一致性断言(交易确认走主库)。验证:延迟的断言可程序化(MySQL 实测,第 137 题声明本机未运行 MySQL)。'),
      block('追问链:延迟三刀', '一刀:"binlog 格式对延迟的影响?"——row 格式日志量大(I/O+网络开销增)但精确;statement 日志量小但非确定性函数不一致(第 97 题 binlog 格式)——row 是当前主流(准确性优先)。二刀:"从库还能怎么用?"——报表/分析(从库专用)/备份(从库做备份不影响主)/延迟从库(特意延迟 N 小时的从库,防误操作恢复)——从库的角色不只是"读分流"。三刀:"GTID?"——全局事务标识(自动定位复制位点——替代手动 file+position);GTID 简化主从切换与故障恢复(自动找位点)。'),
    ],
    ['异步复制=延迟不可避免', '大事务=回放等长时间', '关键读走主,展示读走从'], [sre, pod],
  ),
  'legacy/101': deep(
    '死锁如何产生、如何排查',
    '网银事务沙盘:事务 A 锁行 1 等行 2,事务 B 锁行 2 等行 1——InnoDB wait-for 图检测→回滚代价小的一方→应用重试;排查=SHOW ENGINE INNODB STATUS 的 LATEST DETECTED DEADLOCK 段(第 101 题数据库死锁的完整版)。',
    [
      '死锁的产生:加锁顺序不一致(事务 A 按行 1→2,事务 B 按行 2→1)+并发(两个事务同时执行)→循环等待;InnoDB 的检测=wait-for 图(是否有环)→选择回滚代价小的事务(undo 量少的一方)。',
      '排查:SHOW ENGINE INNODB STATUS→LATEST DETECTED DEADLOCK 段列出两个事务的 SQL/持有锁(HOLDS THE LOCK(S))/等待锁(WAITING FOR THIS LOCK TO BE GRANTED)/锁模式(S/X/记录/间隙)——两段对照=还原"谁先拿的谁在等"(第 101 题 database-basics 详解)。'),
      '避免:统一加锁顺序(按 ID 排序)+缩小事务范围(短事务)+索引优化(减少锁范围)+失败重试(捕获 deadlock/lock-wait 错误→退避重试,第 119 题幂等键)。'),
    ],
    [
      block('机制:死锁检测的代价', 'wait-for 图检测:每次锁等待时检查是否有环(锁等待频繁时检测开销增加);innodb_deadlock_detect=ON(默认)可关闭(高并发如热点行更新时关闭死锁检测+依赖锁等待超时 innodb_lock_wait_timeout)——关闭检测的代价=死锁不会被自动回滚(靠超时解锁)——热点行更新场景的取舍(第 122 题热点账户)。'),
      block('反例:死锁的两种事故', '事故一:死锁重试无幂等——回滚的事务重试时重复执行副作用(第 119 题幂等键缺失);修复=重试携带幂等键。事故二:死锁频率高但被忽略——偶发死锁被"系统繁忙"掩盖(未审计);修复=死锁日志监控(频率告警)+锁序审计(第 101 题 database-basics 的锁序审计)。'),
      block('取舍:死锁检测开与关的权衡', '开启(默认):自动回滚死锁(应用需处理重试);关闭(热点行场景):减少检测开销,死锁靠锁等待超时解锁——innodb_lock_wait_timeout 默认 50s(太长,热点行场景建议调短如 3-5s)——关闭检测的前提=有超时兜底+应用处理超时重试。'),
    ],
    [
      block('验证:死锁的走查核对', '验证:死锁复现(两个事务反向锁定→InnoDB 检测回滚一方);日志解读断言(LATEST DETECTED DEADLOCK 段的两事务对照);重试断言(捕获 1213 ER_LOCK_DEADLOCK→退避重试→成功);锁序修复断言(统一顺序后零死锁)。验证:database-basics 26 题的锁报告解读+banking 7 题锁序实验可复用。'),
      block('追问链:死锁三刀', '一刀:"死锁与锁等待超时的区别?"——死锁=循环等待(InnoDB 检测回滚);锁等待超时=等待时间超 innodb_lock_wait_timeout(不一定死锁,可能只是慢)——两种失败的重试策略不同(死锁重试,超时需先诊断)。二刀:"间隙锁死锁?"——两个事务都持间隙锁→都尝试插入→插入意向锁冲突→死锁(间隙锁不冲突但插入冲突,第 96 题间隙锁);修复=RC 或统一插入顺序。三刀:"热点行更新的死锁?"——热点行(秒杀库存)大量并发更新→锁排队(非死锁但吞吐低,第 122 题)+死锁(不同顺序触达多行)——热点行的解法=Redis 预扣/影子账户/排队(第 122 题)。'),
    ],
    ['InnoDB wait-for 图自动检测回滚', 'LATEST DETECTED DEADLOCK 两事务对照', '锁序统一+幂等重试=死锁防线'], [r.deadlock, sre],
  ),
  'legacy/102': deep(
    '大表 DDL、加索引如何不影响线上',
    '网银 DBA 沙盘:2 亿行大表加索引——MySQL 8.0 Online DDL(ALGORITHM=INPLACE, LOCK=NONE)+gh-ost(触发器替代,可控暂停)+pt-online-schema-change——三种方案的选择与风险。',
    [
      'Online DDL(MySQL 8.0):INPLACE(不重建表,索引直接在原表上构建)+LOCK=NONE(允许并发 DML)——大多数 ADD INDEX/ADD COLUMN 支持 INPLACE;例外:改列类型/缩短列长度=需要 COPY(锁表)——先查 ALGORITHM 支持矩阵。',
      'gh-ost:Ghost(影子表+binlog 同步+原子切换)——不使用触发器(pt-osc 用触发器有性能开销)→解析 binlog 同步变更;可暂停/限速/切换控制——大表(亿级)推荐 gh-ost(可控性最好)。',
      'pt-online-schema-change:触发器同步(原表触发器→影子表)+rename 原子切换——触发器开销(每行写两份)+锁风险;gh-ost 的优势=无触发器(用 binlog)+可限速(保护主库)。'),
    ],
    [
      block('机制:Online DDL 的"并行"原理', 'ADD INDEX 的 INPLACE:构建临时索引文件→同时应用 DML 变更(online log)→合并(重建索引末尾应用 DML log)——DML 与 DDL 并行(InnoDB 的 online log 保证不丢);MDL 锁(Metadata Lock)在 DDL 开始与结束时短暂获取(如果长事务持 MDL→DDL 等待→后续所有查询阻塞——DDL 前查长事务)。'),
      block('反例:DDL 的两种事故', '事故一:长事务阻塞 DDL——DDL 需要 MDL 排他锁→长事务持有 MDL 共享锁→DDL 等待→后续所有查询排在 DDL 后面(全库阻塞);修复=DDL 前检查长事务(information_schema.innodb_trx)+设 lock_wait_timeout(超时放弃)。事故二:DDL 大事务产生的 binlog 回放慢——从库回放 DDL 的时间=主库执行时间(大表 DDL 从库延迟飙升,第 100 题);修复=gh-ost 的可控限速+从库延迟监控。'),
      block('取舍:三种方案的选择', 'Online DDL:MySQL 原生+简单(DDL 语句直接跑)+风险=MDL 锁+不可暂停;gh-ost:可控(暂停/限速/切换)+无触发器+风险=额外存储+延迟(通过 binlog 同步);pt-osc:成熟工具+触发器开销+大表性能差——按表大小(千万以下 Online DDL,亿级 gh-ost)+可控性需求选。'),
    ],
    [
      block('验证:DDL 的走查核对', '验证:Online DDL 断言(ALGORITHM=INPLACE 成功+DML 并行执行不阻塞);gh-ost 断言(限速生效/暂停/切换原子);MDL 风险断言(长事务+DDL→后续查询阻塞——复现并预防);从库延迟断言(DDL 期间从库延迟+gh-ost 限速后缓解)。验证:DDL 的断言可在测试环境复现(生产 DBA 评审执行)。'),
      block('追问链:DDL 三刀', '一刀:"DDL 的 ALGORITHM 有哪些?"——COPY(重建表,锁表)/INPLACE(原表修改,不锁)/INSTANT(仅元数据,秒级——ADD COLUMN MySQL 8.0.12+)——优先 INSTANT>INPLACE>COPY(ALGORITHM=INPLACE 显式声明,不支持则报错不静默降级)。二刀:"列类型变更的风险?"——改列类型可能需要 COPY(锁表)+数据截断风险(长度缩小)+索引重建——类型变更=最高风险 DDL,需 DBA 评审+备份+回滚方案。三刀:"DDL 的回滚?"——Online DDL 的回滚=执行反向 DDL(加的索引删掉)+耗时(与正向相同);gh-ost 的回滚=切回原表(秒级)——gh-ost 的回滚更可控(大表场景)。'),
    ],
    ['Online DDL:INPLACE+LOCK=NONE', 'gh-ost=无触发器+可控暂停+限速', 'DDL 前查长事务,防 MDL 阻塞'], [sre, pod],
  ),
  'legacy/103': deep(
    '转账场景下事务隔离级别怎么选？SELECT ... FOR UPDATE 如何使用',
    '网银核心沙盘:转账的隔离级别=REPEATABLE READ(InnoDB 默认)+SELECT FOR UPDATE(悲观锁锁定账户行)——隔离级别的选择=一致性与并发吞吐的权衡(banking 场景的一致性优先)。',
    [
      '转账的隔离级别:REPEATABLE READ(InnoDB 默认)——快照读(MVCC)+当前读(FOR UPDATE 的 next-key 锁)防幻读;READ COMMITTED:并发更好(无间隙锁)但不可重复读(两次读可能不同)——转账的一致性要求=RR(余额不变式:扣款与入账在同一事务的同一快照)。',
      'SELECT FOR UPDATE:悲观锁(锁定 SELECT 的行,其他事务阻塞)——用法:BEGIN→SELECT FOR UPDATE(锁定账户行)→检查余额→UPDATE→COMMIT——FOR UPDATE 必须在事务内(否则锁立即释放无意义);条件=WHERE id=?(精确匹配,不走索引则锁全表)。',
      'FOR UPDATE 的替代:条件 UPDATE(UPDATE SET balance=balance-? WHERE id=? AND balance>=?——检查与扣减合一,原子,不需要先 SELECT);乐观锁(版本号条件 UPDATE,冲突重试,第 122 题)——FOR UPDATE 适合"需要读取并判断后再更新"(先查余额再决定金额),条件 UPDATE 适合"直接扣减"(无需先查)。',
    ],
    [
      block('机制:FOR UPDATE 与条件 UPDATE 的选择', 'FOR UPDATE=先读后写(需要读取数据做业务判断——如检查账户状态/风控规则);条件 UPDATE=直接写(扣减逻辑简单——余额足够即扣)——条件 UPDATE 更高效(单条语句原子,无额外锁持有时间);FOR UPDATE 更灵活(读取后复杂判断)——按"业务逻辑的复杂度"选。'),
      block('反例:转账事务的两种事故', '事故一:FOR UPDATE 不走索引——WHERE 无索引列→锁全表扫描的所有行(锁升级为表级效果);修复=WHERE 条件走索引(主键/唯一索引)。事故二:事务中夹远程调用——FOR UPDATE 锁住账户行→调用外部接口(2s)→锁持有 2s→并发排队雪崩(第 10 题分布式事务的阻塞窗口);修复=远程调用移出事务。'),
      block('取舍:RR vs RC 在转账场景的选择', 'RR(默认):一致性读稳定+next-key 锁防幻读——但间隙锁增加死锁风险(第 96 题);RC:并发好(无间隙锁)但不可重复读——转账场景的一致性要求=RR(余额在同一事务内不变);互联网公司用 RC(阿里规范)+条件 UPDATE(避免 FOR UPDATE 的间隙锁)——选择=一致性等级(金融 RR)vs并发(RC)。'),
    ],
    [
      block('验证:转账事务的走查核对', '验证:FOR UPDATE 断言(锁定后其他事务 SELECT 阻塞→UPDATE 提交后释放);条件 UPDATE 断言(余额不足→受影响行数=0);隔离级别断言(RR 下两次读一致/RC 下可读新值);并发扣减断言(500 并发→条件 UPDATE 零超卖,第 122 题实测)。验证:database-basics 22/26 题的锁行为+banking 7 题锁序实验可复用。'),
      block('追问链:转账三刀', '一刀:"转账的幂等?"——唯一流水号+唯一索引(第 119 题)+状态机(处理中→成功/失败——条件迁移)——幂等是转账的底线(重复请求不重复扣款)。二刀:"跨行转账的一致性?"——跨行=外部系统(人行/银联)→无法用数据库事务(第 120 题)——本地事务(扣款)+outbox+渠道确认+对账(第 120/123 题)——跨行一致性=最终一致+对账兜底。三刀:"转账的风控?"——实时限额(第 126 题规则引擎)+行为风控(新收款人+大额→增强验证)+延时到账(大额 24h 可撤销,第 159 题转账系统)。'),
    ],
    ['转账=RR+FOR UPDATE 或条件 UPDATE', 'FOR UPDATE 必须在事务内+走索引', '远程调用移出事务,不持锁等待'], [r.lock, r.isolation],
  ),
  'legacy/104': deep(
    'Redis 数据类型与应用场景？为什么快',
    '网银缓存沙盘:Redis 五大数据类型(String/Hash/List/Set/ZSet)+特殊类型(Bitmap/HyperLogLog/Stream/Geo)——快的原因=内存存储+单线程无锁+IO 多路复用+高效数据结构。',
    [
      '五大数据类型:String(缓存/计数器/分布式锁——SETNX/INCR/SET EX)、Hash(对象缓存/购物车——HSET user:name field value)、List(消息队列 LPUSH/BRPOP/时间线)、Set(去重/共同好友 SINTER/抽奖 SRANDMEMBER)、ZSet(排行榜/延迟队列 ZADD/ZRANGEBYSCORE)。',
      '特殊类型:Bitmap(签到/在线状态——SETBIT/BITCOUNT,百万用户仅 125KB)、HyperLogLog(基数统计——UV 估算,0.81% 误差,12KB 固定内存)、Stream(消息队列——XADD/XREADGROUP,消费者组)、Geo(地理位置——GEOADD/GEOSEARCH)。',
      'Redis 为什么快:一,内存存储(内存访问 vs 磁盘 IO);二,单线程无锁竞争(命令队列,无上下文切换——6.0 IO 多线程但命令仍单线程);三,IO 多路复用(epoll——单线程处理数万连接);四,高效数据结构(SDS 动态字符串/跳表 ZSet/压缩列表 ziplist→listpack)。'),
    ],
    [
      block('机制:每种类型的底层数据结构', 'String=SDS(简单动态字符串——预分配+惰性释放,二进制安全);Hash=ziplist(小哈希,紧凑)或 hashtable(大哈希);List=quicklist(双向链表+ziplist 节点);Set=intset(整数集合)或 hashtable;ZSet=ziplist 或 skiplist+hashtable(跳表+哈希双结构)——编码转换由元素数与值大小自动决定(小数据省内存,大数据保性能)。'),
      block('反例:Redis 使用的两种事故', '事故一:大 key(第 142 题热 key/大 key)——100MB JSON→GET 卡 Redis 2 秒;修复=拆分(Hash field)或压缩。事故二:无过期时间的缓存——缓存只加不删→内存耗尽→淘汰策略触发(误删其他 key);修复=SET EX(带 TTL)+maxmemory-policy(allkeys-lru)。'),
      block('取舍:Redis vs Memcached vs 本地缓存', 'Redis:丰富数据结构+持久化+主从+集群——功能最全;Memcached:纯 KV+多线程(高并发简单 KV)——无持久化/无丰富结构;本地缓存(Caffeine):最快(无网络)+不一致(多实例各自缓存)——多级缓存(L1 本地+L2 Redis)是常见组合(第 142 题热 key)。'),
    ],
    [
      block('验证:Redis 的走查核对', '验证:五类型断言(String SET/GET/INCR;Hash HSET/HGETALL;List LPUSH/BRPOP;Set SADD/SINTER;ZSet ZADD/ZRANGE);性能断言(benchmark:Redis 10 万 QPS vs DB 5000 QPS);特殊类型断言(Bitmap BITCOUNT/HyperLogLog PF COUNT 误差);本机 cache-messaging 批次的 Redis 实验可复用。'),
      block('追问链:Redis 三刀', '一刀:"Redis 的持久化?"——RDB(快照,恢复快但丢数据)+AOF(追加,丢数据少但文件大)——混合持久化(aof-use-rdb-preamble:RDB 头+AOF 尾,第 107 题 Redis 详解)。二刀:"Redis 的分布式锁?"——SET NX PX+Lua 解锁+看门狗续约(第 108 题Redis 分布式锁详解)。三刀:"Redis 的热 key/大 key?"——热 key=本地缓存+加盐分片(第 142 题);大 key=拆分+UNLINK(异步删除)——发现是治理的前提(--hotkeys/rdb-tools)。'),
    ],
    ['内存+单线程+epoll+高效结构=快', '五类型+特殊类型按场景选', '持久化+过期+淘汰是运维三件套'], [sre, pod],
  ),
  'legacy/105': deep(
    '缓存穿透、击穿、雪崩的区别与解决',
    '网银缓存沙盘:穿透(查不存在的数据→缓存永远 miss→DB 被打)、击穿(热点 key 过期→瞬间大量请求打到 DB)、雪崩(大量 key 同时过期或 Redis 宕机→DB 崩溃)——cache-messaging 批次的专项详解(第 15/33 题)。',
    [
      '穿透(查不存在):请求的数据在缓存和 DB 都不存在→每次都打到 DB(缓存永远 miss);解决:布隆过滤器(快速判断"肯定不存在",第 30 题 collections)+缓存空值(不存在的数据也缓存短 TTL)+参数校验(入口拦截非法 ID)。',
      '击穿(热点 key 过期):热点 key 过期瞬间→大量并发同时 miss→同时打 DB(singleflight 场景);解决:互斥锁(单线程重建缓存,其他等待——分布式 D6:200 并发合并后 1 次)+逻辑过期(物理不过期,值内含过期时间——过期后异步更新)+永不过期(热点数据)。',
      '雪崩(大量 key 同时过期/Redis 宕机):多个 key 同时过期(同批设置相同 TTL)→DB 瞬间被打;Redis 宕机→全量请求打到 DB;解决:过期时间加随机(TTL±随机偏移)+Redis 高可用(哨兵/集群)+多级缓存(L1 本地+L2 Redis)+限流兜底(第 45 题)。',
    ],
    [
      block('机制:三种场景的"缓存失效"模式', '穿透=缓存"永远 miss"(数据不存在);击穿=热点 key "瞬间 miss"(过期);雪崩=大量 key "同时 miss"(批量过期/宕机)——三者的根因不同(不存在/过期/宕机),解法也不同(布隆过滤器/互斥锁/高可用+随机 TTL)——统一的目标=保护 DB(缓存是 DB 的挡箭牌,箭牌碎了 DB 就暴露)。'),
      block('反例:缓存防护的两种事故', '事故一:布隆过滤器不更新——删除数据后布隆过滤器仍判"可能存在"→缓存空值占内存;修复=定期重建或计数布隆(第 30 题 collections)。事故二:互斥锁无超时——锁等待超过 DB 恢复时间→请求堆积;修复=锁超时+降级(等待超时→返回默认值或旧缓存)。'),
      block('取舍:防护的投入与收益', '穿透防护(布隆过滤器):内存成本(布隆过滤器)+误判率(1%);击穿防护(互斥锁/逻辑过期):复杂度增加;雪崩防护(高可用+随机 TTL):运维成本——按"DB 的承受力"决定防护等级(DB 能扛 1000 QPS→穿透 500 QPS 需要防护)。'),
    ],
    [
      block('验证:三场景的走查核对', '验证:穿透断言(查不存在 ID 100 次→DB 查询 100 次→加布隆过滤器后 0 次);击穿断言(热点 key 过期→200 并发同时 miss→加互斥锁后 DB 只查 1 次);雪崩断言(1000 key 同 TTL 同过期→DB 突增→加随机 TTL 后平滑);cache-messaging D6 实验(200 并发同键合并后 1 次)。验证:三种场景的 DB 压力断言可程序化(计数器)。'),
      block('追问链:缓存三刀', '一刀:"缓存预热?"——上线前主动加载热点数据到缓存(避免上线瞬间穿透);预热的数据源=历史热点+业务预测——预热也是"主动填缓存"(不是等用户触发)。二刀:"多级缓存的一致性?"——L1 本地(应用内存)+L2 Redis:更新时先失效 L2 再失效 L1(广播/版本号)——多级缓存的一致性窗口更大(第 24 题)。三刀:"缓存的监控?"——命中率(hit rate)/ miss 率/DB 回源 QPS/缓存大小——命中率下降=缓存失效问题(穿透/击穿/雪崩的前兆);命中率是缓存的核心指标。'),
    ],
    ['穿透=布隆,击穿=互斥,雪崩=高可用+随机 TTL', '统一目标=保护 DB', '命中率是缓存的核心指标'], [sre, owasp],
  ),
  'legacy/106': deep(
    '缓存与数据库一致性方案',
    '网银缓存沙盘:DB 更新后缓存未同步→读到旧值——方案对比:先更新 DB 再删缓存(Cache-Aside 推荐)/延迟双删/订阅 binlog(Canal)/版本号比对——每种方案的一致性窗口与复杂度不同。',
    [
      'Cache-Aside(旁路缓存,推荐):读=缓存 miss→查 DB→回填缓存;写=更新 DB→删除缓存(不是更新缓存)——"先更新 DB 再删缓存"(主流方案,一致性窗口=删除到下次读的间隔);"先删缓存再更新 DB"=并发读回填旧值(SD5 实验:旧值驻留到 TTL)。'),
      '延迟双删:先删缓存→更新 DB→延迟 N ms 后再删一次(删除"并发读回填的旧值")——延迟时间=业务读耗时+缓冲(经验值 500ms-1s);复杂度增加但一致性窗口缩小(SD5 实验的 C 场景:延迟双删后脏窗口收敛到毫秒级)。',
      '订阅 binlog(Canal/Debezium):DB 变更→binlog→Canal 解析→更新/删除缓存——解耦(应用不感知缓存更新)+可靠(binlog 是 DB 的事实源)+延迟(binlog 传输+解析=秒级);适合"缓存更新逻辑统一收口"的场景(多服务写同一 DB)。'),
    ],
    [
      block('机制:为什么"更新缓存"不如"删除缓存"', '更新缓存=并发写时两个写线程交叉(缓存值取决于写入顺序——可能旧值覆盖新值);删除缓存=下次读时回填最新值(天然一致);"更新缓存"还有"更新了但 DB 更新失败"(缓存有值 DB 无值=脏缓存)的风险——删除比更新更安全(lazy 加载语义)。'),
      block('反例:一致性的两种事故', '事故一:删除缓存失败——DB 更新成功但缓存删除失败(网络/Redis 故障)→脏缓存直到 TTL;修复=重试队列(删除失败→MQ 重试)+TTL 兜底+订阅 binlog(第 106 题 Canal 最终一致)。事故二:并发写+读——写线程 1 更新 DB(A)→写线程 2 更新 DB(B)→删缓存(线程 2)→线程 1 删缓存(顺序反了——缓存=B 但 DB=A?);修复=版本号/分布式锁(强一致场景)或接受短暂不一致(最终一致+TTL)。'),
      block('取舍:一致性等级的选择', '强一致:分布式锁(写串行)+版本号(读校验)——性能差;最终一致:先更 DB 再删缓存+TTL 兜底+binlog 订阅——秒级窗口(大多数场景可接受);按业务容忍度选(资金=强一致/展示=最终一致,第 26 题分档)。'),
    ],
    [
      block('验证:一致性方案的走查核对', '验证:SD5 实验(先删后更=旧值驻留/先更后删=一致/残余窗口+延迟双删=收敛)——三方案的对照实测;Canal 断言(binlog 订阅→缓存更新——延迟与可靠性);版本号断言(缓存带版本→版本不匹配则回源)。验证:一致性窗口的断言可程序化(写入时间戳与缓存时间戳的差值分布)。'),
      block('追问链:一致性三刀', '一刀:"读写分离+缓存的一致性?"——缓存+从库(双重延迟:缓存 TTL+主从延迟)→不一致窗口更大;关键读走主库+缓存(第 137 题)。二刀:"多级缓存的一致性?"——L1 本地+L2 Redis:更新时先失效 L2 再广播失效 L1(MQ/版本号)——L1 的失效需要跨实例通知(第 24 题)。三刀:"缓存的 TTL 策略?"——TTL=兜底(最终一致的保证)+随机偏移(防雪崩)+关键数据短 TTL(减少脏窗口)+非关键长 TTL(减少回源)——TTL 是"一致性与性能"的旋钮。'),
    ],
    ['先更新 DB 再删缓存(推荐)', '延迟双删缩小脏窗口', 'binlog 订阅=统一收口最终一致'], [sre, pod],
  ),
  'legacy/107': deep(
    'Redis 持久化 RDB 与 AOF？过期与淘汰策略',
    '网银运维沙盘:RDB(快照,恢复快但丢数据)+AOF(追加命令,丢数据少但文件大)→混合持久化(aof-use-rdb-preamble);过期(惰性+定期)+淘汰(maxmemory-policy 8 种)。',
    [
      'RDB:定期快照(save 阻塞/bgsave fork 子进程)——恢复快(直接加载二进制)+文件小;丢数据(最后一次快照后的变更丢失);fork 的代价=bgrewriteaof 时的内存复制(COW)——大实例 fork 耗时(秒级,主线程暂停)。',
      'AOF:追加写命令(appendonly yes)——丢数据少(everysec 最多丢 1 秒/always 不丢但性能差/no 由 OS 决定)+文件大(AOF 重写 bgrewriteaof 压缩);AOF 重写=根据当前数据生成最小命令集(替代历史命令堆积)。',
      '混合持久化(aof-use-rdb-preamble=yes,4.0+默认):AOF 文件=RDB 快照头+AOF 增量尾——恢复时先加载 RDB(快)再重放 AOF 增量(丢数据少)——兼得两者优点(Redis 4.0+)。',
      '过期策略:惰性(访问时检查,过期则删)+定期(周期抽样过期 key 删除——每 100ms 抽样);淘汰策略(maxmemory 达到后):noeviction(默认,拒绝写)/allkeys-lru/allkeys-lfu/allkeys-random/volatile-lru/lfu/random/ttl(仅有过期 key 的子集)。',
    ],
    [
      block('机制:RDB 的 fork 与 COW', 'bgsave 时 fork 子进程(共享父进程内存页——写时复制 COW);父进程修改数据→COW 复制修改的页(子进程看到的是快照);fork 的耗时=页表复制(内存越大越慢,100GB≈秒级)——大实例的 fork 是 RDB 的主要风险(主线程暂停)。'),
      block('反例:持久化的两种事故', '事故一:AOF everysec 丢 1 秒——金融场景不可接受(交易数据);修复=always(每命令 fsync,性能降 10 倍)或 Redis 只做缓存+DB 做主存储(数据不丢)。事故二:混合持久化未开启——AOF 文件巨大(重写慢)+恢复慢(逐命令重放);修复=开启混合(RDB 头+AOF 尾)。'),
      block('取舍:持久化策略的选择', '纯缓存(可丢失):RDB 或不持久化(重启从 DB 加载);持久存储(Redis 当主存):AOF always+主从+哨兵(数据安全);混合(缓存+部分持久):混合持久化+everysec——按"Redis 中数据的可丢失程度"选持久化策略(第 104 题Redis 的角色)。'),
    ],
    [
      block('验证:持久化的走查核对', '验证:RDB 断言(bgsave→dump.rdb 生成→重启后数据恢复);AOF 断言(appendonly yes→命令追加→重启重放);混合断言(AOF 文件头=RDB 格式→恢复速度快);过期断言(TTL 到期→惰性/定期删除);淘汰断言(maxmemory→allkeys-lru→LRU key 被逐出)。验证:持久化与过期的断言可程序化(Redis CLI+配置)。'),
      block('追问链:持久化三刀', '一刀:"AOF 重写的触发?"——auto-aof-rewrite-percentage(100%,文件翻倍时)+auto-aof-rewrite-min-size(64MB 最小值)——重写时 fork(同 RDB 的 COW);重写期间新命令写新旧两个 AOF 缓冲。二刀:"Redis 集群的持久化?"——每个节点独立持久化(RDB/AOF)——节点故障=该节点数据可能丢失(从节点接管,但异步复制可能丢);持久化策略按"节点角色"调整(主节点 AOF everysec,从节点可 RDB)。三刀:"主从+哨兵+持久化的组合?"——哨兵(自动故障转移)+主从(数据冗余)+持久化(重启恢复)——三层高可用:哨兵管切换、主从管冗余、持久化管恢复(第 141 题高可用)。'),
    ],
    ['RDB 快照+AOF 追加+混合持久化', 'fork COW=大实例的风险', '淘汰策略=内存满时的行为选择'], [sre, owasp],
  ),
  'legacy/108': deep(
    'Redis 分布式锁：实现、过期时间、误删、Redisson 看门狗',
    '网银分布式锁沙盘:SET key value NX PX ttl(原子加锁)+Lua 比对 value 删除(原子解锁)+看门狗续约(防业务超时锁过期)+Redlock(多节点,第 108 题Redis 分布式锁的完整版)。',
    [
      '基本实现:加锁=SET lock:key uniqueValue NX PX 30000(NX=不存在才设/PX=过期时间);解锁=Lua 脚本(GET 比对 value→相等则 DEL——原子,防误删他人锁);value=持有者标识(UUID+线程 ID——防实例 A 删实例 B 的锁)。',
      '过期时间的困境:TTL 太短→业务未完成锁过期→另一实例获锁→双持锁(互斥失效);TTL 太长→持有者崩溃后锁长期占用(其他实例等);解决=看门狗(定期续约 TTL——业务完成前锁不过期)——Redisson 的 watchdog 默认 30s,每 10s 续约。',
      'Redisson:RLock(可重入锁)+watchdog(自动续约)+RLock.tryLock(waitTime, leaseTime)(限时+自动续约)——Redisson 封装了 Lua 解锁/续约/可重入等细节;Redlock=向 N 个独立 Redis 实例同时加锁(过半成功)——解决单点主从切换丢锁(但有争议,第 14 题缓存消息)。',
    ],
    [
      block('机制:主从切换时锁丢失的问题', 'Redis 主从是异步复制:主库 SET NX 成功→未同步到从库→主库宕机→从库晋升→新主库无此锁→另一实例获锁→双持锁——Redis 锁的"不安全窗口"=主从切换瞬间;Redlock(多节点过半)缓解但不能完全解决(Kleppmann 的批评:时钟假设+假死窗口,第 14 题)——结论:Redis 锁做效率层(挡 99%)+资源端 fencing 做正确层(挡最后 1%)。'),
      block('反例:Redis 锁的三种事故', '事故一:解锁不比对 value——直接 DEL(删了别人的锁);修复=Lua 脚本比对+删除原子操作。事故二:无看门狗——TTL 30s 但任务 60s→30s 后锁过期→双跑;修复=Redisson watchdog 或手动续约(定时延长 TTL)。事故三:锁内调用 RPC 超时——锁在 TTL 内但 RPC 5s 超时→看门狗续约→锁一直持有→其他实例永久等待;修复=RPC 超时预算+锁的 TTL 上限(续约次数限制)。'),
      block('取舍:Redis 锁 vs ZK 锁 vs 数据库锁', 'Redis:吞吐高(AP,主从切换可能丢锁)+看门狗续约;ZK:可靠(CP,会话断开自动释放)+吞吐低;数据库:SELECT FOR UPDATE+事务释放(最简单+性能最差)——定时任务互斥→Redis 锁(吞吐够+偶发双跑可容忍→幂等兜底);强互斥(资金)→ZK 或数据库锁(可靠性优先)。'),
    ],
    [
      block('验证:Redis 锁的走查核对', '验证:加锁断言(SET NX 成功/重复加锁失败);解锁断言(Lua 比对 value→只删自己的锁);看门狗断言(TTL 自动续约→业务完成前锁不过期);误删断言(实例 A 的锁过期→实例 B 获锁→A DEL→B 的锁不受影响);双持锁推演(主从切换窗口——标注推演,第 14 题)。验证:锁的断言可程序化(Redis CLI+Lua 脚本);D15 租约/栅栏实验(旧 token 写入被拒)。'),
      block('追问链:锁三刀', '一刀:"Redisson 的 watchdog 细节?"——默认 lockWatchdogTimeout=30s;每 lockWatchdogTimeout/3=10s 续约一次;业务完成后 cancel watchdog+释放锁——看门狗的前提=Redisson 客户端活着(进程崩溃=看门狗停止=锁过期)。二刀:"锁的粒度?"——按资源粒度(lock:order:12345)+按操作类型(lock:order:12345:update)——粒度过粗(全局锁)=不必要的阻塞;过细(每字段一锁)=锁爆炸。三刀:"锁与幂等的关系?"——锁=互斥(同一时刻一个);幂等=重复执行安全(多次执行结果相同)——锁失效时幂等兜底(纵深防线,第 119 题幂等+第 38 题查单先行);锁是优化,幂等是防线。'),
    ],
    ['SET NX PX+Lua 解锁+看门狗续约', '主从切换可能丢锁→fencing 兜底', '锁是优化,幂等是防线'], [owasp, sre],
  ),
  'legacy/109': deep(
    'MQ 如何保证消息不丢失、不重复、有序',
    '网银消息沙盘:消息不丢失(生产者确认+broker 持久化+消费者 ACK)+不重复(幂等消费)+有序(分区单线程)——三个问题的责任在"全链路"而不是单点。',
    [
      '消息不丢失的三段:生产端(确认机制——confirm/acks=all,失败重试)、broker 端(持久化——durable queue+persistent message+副本),消费端(手动 ACK——处理完成才确认,未确认重投)——三段中任何一段丢失=消息丢失;acks=all+min.insync.replicas≥2+手动 ACK=标准配置(cache-messaging 21 题的 Kafka 详解)。',
      '消息不重复:MQ 的投递语义=at-least-once(至少一次——不丢但可能重)→消费者幂等(业务键去重表/唯一索引/状态机,第 22 题+第 119 题)——exactly-once(精确一次)=事务消息+幂等消费的组合(不是 MQ 单方面保证)。',
      '消息有序:分区内有序(Kafka 的 partition 内有序)——需要有序的消息发送到同一 partition(按业务 key 分区)→单分区单消费者(或内存队列排序)——全局有序=单分区(牺牲吞吐);局部有序=按 key 分区(同 key 有序,跨 key 无序)——"有序"的定义=业务需要的有序范围。',
    ],
    [
      block('机制:不丢失的"三段论"', '消息丢失的三个阶段=生产(发送失败)→存储(broker 宕机)→消费(处理失败但已 ACK)——每阶段有对应的防线:生产=确认机制(同步等待 broker 确认+失败重试);存储=持久化+副本(acks=all 写入 ISR);消费=手动 ACK(处理完成后确认)——三段全保障=不丢;任何一段缺失=丢失风险。'),
      block('反例:消息可靠性的两种事故', '事故一:自动 ACK——消费者收到消息立即 ACK(处理失败也 ACK)→消息丢失;修复=手动 ACK(处理成功才确认)。事故二:重试无幂等——消费失败重试→重复消费→业务重复(第 119 题);修复=幂等键(去重表)。'),
      block('取舍:性能与可靠性的权衡', 'acks=all+手动 ACK:最可靠但延迟高(等待确认);acks=1:性能好但可能丢(leader 挂未复制);acks=0:最快但可能丢(不等确认)——按"消息的业务价值"分级(交易消息=可靠,日志消息=性能)——分级配置,不是全局一刀切。'),
    ],
    [
      block('验证:消息可靠性的走查核对', '验证:不丢失断言(生产确认+broker 持久化+消费手动 ACK→kill broker→消息恢复);重复断言(重投→幂等消费→零副作用);有序断言(同 key 消息按序消费);cache-messaging D11 实验(outbox 9955 条原子落库+relay 投递=9955,分叉 0)。验证:三段可靠性的断言可程序化(每段注入故障)。'),
      block('追问链:MQ 三刀', '一刀:"事务消息(RocketMQ)?"——半消息(先发半消息→执行本地事务→commit/rollback 半消息)——本地事务与消息发送的原子性(outbox 的 MQ 版);RocketMQ 的事务回查(broker 查询生产者事务状态)。二刀:"消息的 TTL 与死信?"——消息超时未消费→死信队列(DLQ)→人工处理或延迟重投——死信是"兜底"不是"垃圾桶"(死信也要处理,第 22 题死信)。三刀:"顺序消费的实现?"——Kafka 同 partition+单消费者线程(分区内有序);RocketMQ MessageQueueSelector(按业务 key 选 queue);消费端单线程或内存队列排序(分区并行但分区内串行)。'),
    ],
    ['不丢=生产确认+broker 持久化+消费 ACK', '不重=消费者幂等', '有序=分区+单消费者'], [sre, pod],
  ),
  'legacy/110': deep(
    '消息积压如何处理？Kafka 与 RocketMQ 区别',
    '网银消息沙盘:消费速度<生产速度→消息积压(MQ 堆积百万条)——处理=扩容消费者+跳过/降级+源头限流;Kafka vs RocketMQ 的差异=存储模型/事务/延迟消息/生态。',
    [
      '积压的根因:消费速度不足(消费者故障/处理慢/并发不足)或生产暴增(上游突发)——定位=消费 lag(积压量=生产 offset-消费 offset)增长速率+消费者健康(线程/异常/慢日志)。',
      '处理:一,扩容消费者(增加实例——Kafka consumer group 自动 rebalance,注意 partition 数≥consumer 数);二,批量消费(一次拉取多条批量处理——提高单次吞吐);三,跳过(非关键消息丢弃或降级——batch 消费标记+后续补偿);四,新 topic 分流(积压的旧消息转到新 topic 用更多消费者处理)。',
      'Kafka vs RocketMQ:Kafka(高吞吐日志流/分区+消费组/无延迟消息(需扩展)/生态丰富——大数据领域标配)/RocketMQ(事务消息/延迟消息/消息轨迹/Java 生态——电商金融场景)——选型=吞吐要求+功能需求(事务/延迟)+运维能力(第 109 题 MQ 可靠性)。'),
    ],
    [
      block('机制:积压的"水位管理"', '积压=队列水位上升(生产>消费的差值累积)——水位管理=控制生产(源头限流)+增加消费(扩容)+溢出处理(跳过/分流)——类比水库:上游来水(生产)>下游放水(消费)→水位上升→开闸泄洪(扩容)+上游限流+溢洪道(跳过)。'),
      block('反例:积压处理的两种事故', '事故一:盲目扩容消费者——partition 数=4 但 consumer=8→4 个 consumer 空闲(Kafka 消费者数≤partition 数);修复=先增 partition 再增 consumer(或减少 consumer)。事故二:跳过消息无记录——跳过的消息没有存档(数据丢失无法追溯);修复=跳过的消息存到"跳过 topic"或文件(后续补偿)。'),
      block('取舍:积压预防 vs 积压处理', '预防:生产限流(上游限流,第 134 题)+消费监控(lag 告警)+弹性扩容(自动扩 consumer,第 34 题动态批处理);处理:积压发生后的应急(扩容/跳过/分流)——预防优于处理(积压的处置成本>预防成本);监控 lag 告警(阈值=SLA 窗口×消费速率)是预防的核心。'),
    ],
    [
      block('验证:积压处理的走查核对', '验证:积压复现(生产速率>消费速率→lag 增长);扩容验证(增加 consumer→lag 下降);跳过验证(非关键消息跳过→lag 清理+存档);partition 扩容验证(Kafka partition 4→8+consumer 4→8→吞吐翻倍)。验证:lag 曲线的断言可程序化(监控 lag 随时间的变化)。'),
      block('追问链:MQ 三刀', '一刀:"Kafka 的 rebalance?"——consumer 加入/退出→partition 重新分配(rebalance)→rebalance 期间消费暂停(STW)——频繁 rebalance=消费不稳定(心跳超时/处理超时导致)→参数调优(session.timeout/max.poll.interval)。二刀:"RocketMQ 的延迟消息?"——内置延迟级别(1s/5s/10s...2h)或任意延迟(5.0+ 定时消息)——延迟队列的实现(Redis ZSet/时间轮/RocketMQ 延迟消息,第 67 题延迟队列场景)。三刀:"MQ 的选型?"——Kafka(高吞吐日志流+大数据生态)/RocketMQ(事务消息+延迟消息+金融场景)/RabbitMQ(路由灵活+低吞吐)/Pulsar(存算分离+多租户)——按"吞吐+功能+运维+生态"四维选型(第 147 题容量评估)。'),
    ],
    ['积压=生产>消费的差值累积', '扩容/跳过/分流,三选组合', 'Kafka 吞吐,RocketMQ 功能'], [sre, pod],
  ),

};
