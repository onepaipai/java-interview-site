// java-language 50 题 · v2 深度标准(2026-11-08)· 50 题全量
// 证据基准:JDK 17.0.17 本机实测(F:\tmp-jl-exp);未实测写明"推演"。
const pod = 'https://martinfowler.com/articles/patterns-of-distributed-systems/';
const sre = 'https://sre.google/sre-book/addressing-cascading-failures/';
const api = n => 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/' + (n.endsWith('.html') ? n : n + '.html');
const block = (title, body) => ({ title, body });
const deep = (title, scenario, answer, analysis, cases, summary, references) => ({
  format: 'deep', title, scenario, answer, analysis, case: cases, summary, references,
});

export default {
  'java-language/1': deep(
    'equals 与 hashCode 的契约为何会影响领域对象设计？',
    '网银账户沙盘:Account 重写 equals 不重写 hashCode——HashSet<Account> 里同一账户出现两次(哈希不同桶),HashMap 查不到已存对象。用 collections 8 题的判等分野实验说明契约的三条规则与领域建模的落点。',
    [
      '契约三规则:equals 相等则 hashCode 必相等(否则哈希容器丢元素);hashCode 相等不要求 equals 相等(允许碰撞);equals 的字段集⊆hashCode 的字段集(一致性,第 8 题collections compare 同源)。',
      '实测锚点(collections C1):可变 key 修改后 get=null、containsKey=false——hashCode 随状态变化的键在容器中"消失";equals 与 hashCode 用不同字段集=TreeSet/HashMap 判等分野的隐患(collections 8 题)。',
      '领域落点:值对象(账户 ID+类型)用 record(自动 equals/hashCode/toString,字段集天然一致);实体(有生命周期)按业务键 equals(ID)+hashCode(ID)——两类对象的判等策略显式分开。',
    ],
    [
      block('机制:哈希容器的判等链', 'HashMap 定位:hash(键)→桶→equals 比对——hashCode 决定去哪个桶,equals 决定是不是同一个——两步任一不一致即"找不到"。契约违约的三种表现:重写 equals 不重写 hashCode(同对象两桶,Set 出现"重复");hashCode 用可变字段(键改状态后消失,C1 实验);equals 用可变字段(容器外的相等判断漂移)。record 的价值:编译器生成三件套且字段集一致——值对象的契约免维护。'),
      block('反例:契约违约的三种事故', '事故一,Set 重复:同账户两次 add 都成功(哈希不同)——去重失效(对账口径乱)。事故二,键消失:可变键改字段后 get=null(C1 实测:containsKey=false)——缓存丢失(第 47 题 banking 缓存归属同题)。事故三,跨容器不一致:HashMap 两份、TreeSet 一份(collections 8 题:compare/equals 分野)——同一数据不同容器结果不同。三条的正解:值对象 record 化+可变对象按业务键判等+键不可变化。'),
      block('取舍:实体与值对象的判等策略', '值对象(record):全字段 equals——内容相同即相等(金额+币种的 Money)。实体(ID 实体):按业务键 equals(ID 相等即同一账户——生命周期内状态可变,ID 不变)——实体的 hashCode 只用 ID(稳定)。JPA 实体的特殊面:ID 未生成时(新实体)equals 退化为引用相等——混合判等的边界要显式(状态机判等)。'),
    ],
    [
      block('验证:契约的断言组', '验证:三规则断言(equals→hashCode 相等;hashCode 字段集⊆equals;record 三件套一致——属性测试风格随机对象对);容器行为断言(可变键消失[C1 实测]、record 键稳定);实体/值对象双策略的对照用例——三组进领域模型的单测模板。'),
      block('追问链:契约三刀', '一刀:"hashCode 能缓存吗?"——String 缓存 hash(本机 J1:1ns,不可变前提)——可变对象缓存 hash=修改后哈希不更新(违约)——不可变才有缓存资格。二刀:"equals 的对称/传递违约?"——equals 与 compareTo/继承的对称问题(父类 equals 与子类——getClass vs instanceof 之争)——值对象用 record/getClass 终结。三刀:"第三方键类?"——用第三方类做键(不控 equals/hashCode)——包装(自己的键类包一层)或文档依赖(信任第三方契约)——键的契约责任要明确归属。'),
    ],
    ['equals 相等则哈希必相等', '可变键会消失,record 免维护', '实体按 ID,值对象按内容'], [api('java/lang/Object')],
  ),
  'java-language/2': deep(
    'BigDecimal 在金额计算中有哪些常见陷阱？',
    '网银计息沙盘:new BigDecimal(0.1) 的精度陷阱(二进制浮点入参)、除法不指定 scale 抛 ArithmeticException、equals 与 compareTo 的差异(1.0 vs 1.00)——金额计算的四个陷阱与正确姿势(banking 20 题的 API 面)。',
    [
      '陷阱一,new BigDecimal(double):0.1 的二进制表示带入——必须字符串构造或 valueOf。陷阱二,除法不设 scale:1/3 无限小数——ArithmeticException("Non-terminating decimal expansion")——divide 必须带 scale+RoundingMode。',
      '陷阱三,equals 与 compareTo:1.0 equals 1.00 = false(scale 不同),compareTo=0——数值比较用 compareTo,混用即"看不见的重复"。陷阱四,setScale 的舍入模式遗漏:RoundingMode 必须显式(HALF_UP/银行家按业务,第 20 题banking 统一)。',
      '本机锚点(banking B1):double 累加 0.1×1000=99.9999999999986,BigDecimal 精确 100.0——BigDecimal 的价值在"精确的十进制语义",前提是避开四个陷阱。',
    ],
    [
      block('机制:scale、precision 与 RoundingMode', 'scale=小数位数,precision=总有效位——multiply 的 scale=两操作数 scale 之和(0.01×0.01=0.0001);add/subtract 的 scale=两操作数 scale 的最大值——金额累加的 scale 一致性靠这条规则,中间结果 scale 漂移时需统一 setScale;divide 默认"精确否则异常"。RoundingMode 八种(HALF_UP 四舍五入/HALF_EVEN 银家/UP/DOWN/CEILING/FLOOR/UNNECESSARY)——UNNECESSARY(不需要舍入时用,需要则抛异常=显式防错)。金额的 scale 契约:入账 2 位(币种 scale,第 22 题汇率)、计息中间 10 位(第 20 题banking)——scale 策略全司统一(第 47 题)。'),
      block('反例:四陷阱的事故形态', '事故一,double 入参:new BigDecimal(0.1) 的脏精度传播到分录——金额与凭证差亿分之几(对账差异)。事故二,除法异常:费率计算 1/3 未设 scale——线上 ArithmeticException(接口 500)。事故三,equals 判等:1.0 与 1.00 判不等——去重失败/状态判断失效。事故四,舍入遗漏:setScale(2) 无模式——编译可过但同类问题必现。四条的正解:字符串构造+显式 scale/RoundingMode+compareTo 判等——BigDecimal 的使用规范进 checklist(第 24 题)。'),
      block('取舍:BigDecimal vs long 分', 'BigDecimal:可读(scale/precision 语义)、任意精度、性能较慢(对象+分配)。long 分:最快、无精度陷阱(整数运算)、scale 语义手工维护(除法时分转元)。选择:账务核心高频路径 long 分(第 20 题banking 的热点方案),配置/展示/低频 BigDecimal——两者并存时转换函数统一(分↔元),转换边界是精度事故的高发区。'),
    ],
    [
      block('验证:四陷阱的断言组', '验证:入参断言(new BigDecimal(0.1) 的实际值展示 vs valueOf);除法断言(无 scale 抛异常/带 scale 正常);equals 断言(1.0 vs 1.00 的 equals false、compareTo 0);舍入断言(HALF_UP 与 HALF_EVEN 的 0.005 对照)——四组陷阱用例进金额工具类的单测(每陷阱一条,防回归)。'),
      block('追问链:BigDecimal 三刀', '一刀:"stripTrailingZeros 的坑?"——new BigDecimal("600.0").stripTrailingZeros() 的 toString=6E+2(科学计数法)——toPlainString(禁止科学计数法进展示,第 44 题)。二刀:"setScale vs rounding?"——运算时的舍入(MathContext)与展示时(setScale)分离——计算链的中间精度策略(第 20 题banking 三段控制)。三刀:"BigDecimal 的线程安全?"——不可变(线程安全,第 8 题)——共享常量(BD_ZERO)可复用——不可变性让金额对象可放心进并发容器(第 20 题 distributed 值不可变替换)。'),
    ],
    ['字符串构造,除法必设 scale', '判等用 compareTo,展示禁科学计数', '中间高精度,最终一次舍入'], [api('java/math/BigDecimal')],
  ),
  'java-language/3': deep(
    '为什么不建议用 double 直接保存订单金额？',
    '网银订单沙盘:订单金额用 double 存储(9.99+0.01≠10.0 的精度损失)——累加/比较/舍入三层的误差积累,与 BigDecimal/long 分的对照(banking B1 实验:double 累加 0.1×1000=99.9999999999986)。',
    [
      'double 的二进制本质:IEEE 754 双精度(二进制小数)——0.1 无法精确表示(0.1=循环二进制)——十进制的金额语义在二进制浮点上必然失真:实测累加 1000 个 0.1 偏差 1.4E-12(单笔无感,累加可见)。',
      '三层的误差积累:存储(9.99 的近似表示)、运算(累加/乘除的误差传播)、比较(==判等的假阴性)——每层都放大上一层;金额的"分"级误差在万笔聚合后变成"分"级资损(第 20 题舍入积累)。',
      '正解:long 分(整数运算,零浮点误差)+BigDecimal(十进制语义,展示与低频计算)——double 只允许出现在"非资金的展示估算"(利息预估的 UI)——红线:资金路径零 double(banking 20 题纪律)。',
    ],
    [
      block('机制:二进制浮点与十进制语义的错位', '错位的来源:0.1 十进制=二进制循环小数(0.000110011...)——double 存 64 位近似(相对误差 1E-16 量级);单次运算的误差微小(不可见),累加/乘除的传播使误差到可见量级(1000 次 0.1 累加的 1.4E-12,万笔交易的分级差异)。比较的陷阱:0.1+0.2==0.3 为 false(0.30000000000000004)——金额相等判断必须用 compareTo 或长整型 ==。'),
      block('反例:double 金额的三层事故', '事故一,聚合差异:日报表合计与逐笔之和差几分(舍入方向漂移,第 20 题积累)——对账差异单。事故二,比较失效:优惠判断(amount==0)失败(0.0000001 的残留)——业务逻辑错误。事故三,传输放大:double 序列化到前端(JS Number 精度)——显示金额与后端不一致。三条的正解:存储与运算 long 分/BigDecimal、展示格式化、传输字符串或分。'),
      block('取舍:迁移 double 存量的路径', '存量 double 字段的迁移:数据库列类型(decimal)通常已对——代码层的 double 使用逐路径替换(读→BigDecimal.valueOf[不走 new BigDecimal(double)]→运算→存 long/BigDecimal);渐进按资金路径优先(第 25 题 distributed 类型边界的风险优先)。红线检查:静态扫描 double 类型的金额字段(命名含 amount/fee/balance)——扫描器进 CI。'),
    ],
    [
      block('验证:精度误差的断言组', '验证:累加断言(B1 实测:1000 次 0.1 的偏差 1.4E-12——BigDecimal 零偏差对照);比较断言(0.1+0.2==0.3 false 的展示);红线扫描断言(金额字段 double 的扫描器拦截)——三组固化 double 红线;long 分与 BigDecimal 的换算用例(往返无损)。'),
      block('追问链:double 红线三刀', '一刀:"float 呢?"——更差(32 位)——float 金额同红线;科学计算(非资金)可用。二刀:"Math.round 的陷阱?"——Math.round(2.5)=3(四舍五入)但负数 Math.round(-2.5)=-2(向上取整)——舍入的负数语义与 BigDecimal 的 HALF_UP 不同——统一用 BigDecimal 或显式定义。三刀:"double 的合法用途?"——展示估算(利息预估的 UI 提示)、科学参数(利率模型内部)——进入"资金落地路径"(分录/余额)前必须转换(边界转换函数收口)。'),
    ],
    ['二进制浮点错位十进制语义', '累加比较舍入,三层误差积累', '资金路径零 double,红线进扫描器'], [api('java/lang/Double')],
  ),
  'java-language/4': deep(
    '泛型擦除给运行期类型检查带来哪些限制？',
    '网银接口沙盘:List<String> 与 List<Integer> 运行期是同一个 Class(擦除)——instanceof List<String> 编译不过、反射可塞 Integer 进 List<String>。用擦除实验说明泛型的编译期本质与运行期的护栏(J2 实验:同一 Class/ClassCastException)。',
    [
      '擦除的本质:泛型信息只在编译期(类型检查+自动插桥),运行期 List<String> 就是 List——Class 对象唯一(本机实验:两个泛型列表 getClass 相同=true)。',
      '运行期的三个限制:instanceof 泛型不可(List<String> instanceof 编译错)、运行期创建泛型数组不可(new T[] 报错)、反射可绕过泛型(塞 Integer 进 List<String>——J2 实验成功,取值时 ClassCastException)。',
      '护栏正解:运行期需要类型信息的场景用显式 Class 参数( TypeToken 模式/Gson 的 TypeToken)、边界校验(外部输入入集合前校验,第 25 题)、Collections.checkedList(运行期强制类型检查的调试工具)。',
    ],
    [
      block('机制:擦除的编译期与运行期', '编译期:泛型做类型检查(类型不匹配编译错)+自动桥方法(泛型类实现 Comparable<T> 的桥)+类型推断(diamond)。运行期:擦除为上限(raw List/Object)——桥方法保留(运行期分派用;J2b 实测:javap -v 显示 compareTo(BridgeExp) 与 compareTo(Object) 两个方法,后者 flags 含 ACC_BRIDGE+ACC_SYNTHETIC,方法体强转后转发强类型版本);get 后的强转(checkcast)由编译器插入——擦除后塞入错误类型,取值时才 ClassCastException(J2 实验:反射塞 42 成功,取值 cast 失败)。'),
      block('反例:擦除误判的两种事故', '事故一,instanceof 泛型:if (obj instanceof List<String>) 编译不过——运行期类型检查只能 instanceof List(裸)+元素逐个判——设计上避免(方法不该依赖泛型运行期类型)。事故二,反射绕过后的延迟爆炸:反射塞 Integer 进 List<String>——编译期无告警,取值时 ClassCastException(爆炸点远离塞入点)——边界校验(外部数据入集合前逐个校验,第 25 题)。'),
      block('取舍:泛型信息的保留手段', '手段一,显式 Class 参数:方法签名带 Class<T>(运行期可用 T 的信息——反序列化的目标类型)。手段二,超类型令牌(Gson TypeToken/TypeReference:new TypeReference<List<String>>(){} 的匿名子类保留泛型签名——getGenericSuperclass 反射读取)——框架(反序列化)的标准形态。手段三,checkedList:Collections.checkedList(list, String.class)——运行期插入校验(违规即时抛 ClassCastException,爆炸点前移到塞入处——J2 实验的修复形态)。'),
    ],
    [
      block('验证:擦除限制的断言组', '验证:Class 同一断言(两泛型列表 getClass 相同——J2 实测);反射绕过断言(塞 Integer 成功+取值 ClassCastException——护栏缺失的形态);checkedList 断言(checkedList 下塞入即抛——爆炸点前移)——三组固化擦除语义;checkedList 的用法进"运行期类型护栏"指南。'),
      block('追问链:泛型三刀', '一刀:"泛型的桥方法?"——泛型类实现 Comparable<T> 编译器自动生成桥方法 compareTo(Object)(J2b javap -v 实测:flags 含 ACC_BRIDGE+ACC_SYNTHETIC),方法体把 Object 强转后转发强类型版本——擦除后 Object 签名的调用得以正确分派到泛型实现;桥方法是"重载变重写"混乱的根源之一。二刀:"泛型与重载?"——两个方法仅泛型参数不同(erase 后同签名)——编译错("clashes with erasure")——重载设计要避开擦除冲突。三刀:"泛型数组?"——new T[] 与 new List<String>[] 不可(协变写入的类型安全)——用 ArrayList<T> 或 @SuppressWarnings 显式。'),
    ],
    ['泛型是编译期护栏,运行期全擦除', '爆炸点前移:边界校验加 checkedList', '运行期类型信息用 Class 参数'], [api('java/lang/reflect/Type')],
  ),
  'java-language/5': deep(
    'PECS 原则如何用于设计集合型 API？',
    '网银风控 API 沙盘:RiskService.process(List<? extends RiskEvent> events)——extends 还是 super 的选择决定 API 的灵活性(调用方能传什么)。用"生产者 extends 消费者 super"(PECS)说明集合型 API 的签名设计。',
    [
      'PECS:Producer Extends(集合用于读取=生产者→? extends T:可传入 T 及子类的集合);Consumer Super(集合用于写入=消费者→? super T:可传入 T 及父类的集合)。两者兼用→不写通配(精确类型)。',
      '实例:copy(List<? extends T> src, List<? super T> dst)(JDK Collections.copy 的签名)——src 只读(生产者,任意 T 子类列表)、dst 只写(消费者,任意 T 父类列表)——一个签名覆盖所有合理调用。',
      '通配的代价:extends 后不能 add(编译器禁止,除 null)、super 后 get 返回 Object——通配符是用"调用灵活性"换"使用限制"——API 设计在两者间权衡。',
    ],
    [
      block('机制:协变逆变的编译期表达', 'Java 泛型不变(List<String> 不是 List<Object> 的子类)——PECS 用通配符表达"使用处的协变/逆变":? extends T(协变读——把子类列表当 T 生产者);? super T(逆变写——把父类列表当 T 消费者)。编译器的护栏:extends 列表禁 add(T 及子类之外无法保证类型安全——编译器禁止);super 列表 get 返回 Object(只能按 Object 用)。'),
      block('反例:通配符缺失与滥用的两种僵化', '僵化一,缺 extends:process(List<RiskEvent> events)——调用方只有 List<MarketRiskEvent>(子类列表)传不进来——每个子类重载或强制转换(API 硬化)。僵化二,滥用通配:所有参数都 ? extends ? super(可读性崩塌+实现受限)——通配只在"生产/消费"语义明确处用;集合参数既是生产者又是消费者(读改写)→精确类型。两条的正解:按方法内对该集合的实际用法(read-only→extends,write→super,both→精确)——用法定签名。'),
      block('取舍:通配符与函数式接口', '函数式接口的 PECS:Predicate<? super T>(消费 T——super)、Supplier<? extends T>(生产 T——extends)——Stream API 的签名全按 PECS(filter 的 Predicate<? super T>)。Stream 流的 PECS 一致性让链式调用自然——集合 API 设计对照 Stream 的签名风格(JDK 的实践是范本)。'),
    ],
    [
      block('验证:PECS 的编译期断言', '验证:extends 灵活性断言(子类列表传入 ? extends 参数编译通过);super 灵活性断言(父类列表传入 ? super 参数通过);限制断言(? extends 列表 add 编译错——护栏实证)——三组用编译通过/失败的形式固化 PECS;JDK Collections.copy 的签名作为范本引用。'),
      block('追问链:PECS 三刀', '一刀:"通配符捕获(Wildcard Capture)?"——? extends T 列表的 add 被"捕获"限制(不能 add 任意 T)——capture helper(私有方法转换捕获的通配)是标准技巧(JDK swap 的 helper 形态)——捕获的处理写进 API 设计指南。二刀:"与数组协变的对比?"——数组协变(子类数组可赋父类数组——运行期 ArrayStoreException)vs 泛型不变+通配(编译期安全)——泛型+PECS 把数组的运行期错误前移到编译期(第 3 题 bankings 泛型擦除的正面)。三刀:"自类型限定?"——<T extends Comparable<? super T>>(自比较+父类可比)——排序 API 的经典限定——自限定与 PECS 的组合是排序/集合 API 的签名范本。'),
    ],
    ['生产者 extends,消费者 super', '通配换灵活,限制要知情', '用法定签名,JDK 签名是范本'], [api('java/util/Collections')],
  ),
  'java-language/6': deep(
    '重载与重写在静态类型和动态分派上有何差异？',
    '网银沙盘:重载(编译期按静态类型选方法)与重写(运行期按实际类型分派)——同样的调用代码,重载看变量声明类型、重写看对象实际类型——两者混用的调用点行为易误判(方法参数的静态分派)。',
    [
      '重写(Override):运行期动态分派(对象实际类型的方法——虚方法表);重载(Overload):编译期静态绑定(变量声明类型+参数静态类型选签名)——一个在运行,一个在编译。',
      '经典陷阱:重载参数的静态分派——service.handle(Object o) 与 handle(String s):传入 String 类型的 Object 变量→调 handle(Object)(编译期看声明类型)——"我以为调 String 版"。另一个:字段不参与多态(字段按静态类型——方法多态字段不多态)。',
      '与第 6 题spring(代理)的关系:自调用绕过重写的动态分派(spring-advanced 1 题)与重载的静态分派是两个维度——代理影响重写(this 的实际类型),不影响重载(编译期已定)。',
    ],
    [
      block('机制:两个分派时机', '重写的分派:invokevirtual/invokeinterface——按接收者的实际类型查虚方法表(运行期)——多态的核心。重载的绑定:编译期按(静态类型,参数静态类型,自动装箱/变长参数的优先级)选方法——精确匹配>装箱>变长(重载解析的三段优先级,装箱陷阱:Integer 参数与 int 参数的重载在传 int 时的选择)。字段与静态方法:静态绑定(按引用类型)——"字段不多态"。'),
      block('反例:静态分派的两种误判', '误判一,重载的装箱陷阱:handle(int) 与 handle(Integer) 重载,传 Integer 变量→handle(Integer)(精确优先);传 int→handle(int)——重载解析的优先级(精确>装箱>变长)决定行为(第 19 题装箱的连带)。误判二,父类引用调子类重载:子类新增重载 handle(String),父类引用调用→父类签名(子类重载不在父类接口中——编译期绑定)——重载不放多态。两条的正解:重载的调用方用子类引用,或重写替代重载(多态语义)。'),
      block('取舍:重载的使用纪律', '纪律一,同族方法的重载保持"行为一致"(同一语义的不同参数形态——语义不同不重载,改名);纪律二,避免装箱/变长的重载歧义(int 与 Integer 不重载——二选一);纪律三,重载的文档与测试(每个重载的用例——静态分派的行为固化,第 24 题评审)。重写的纪律:spring-advanced 1 题的代理纪律(经代理才分派)。'),
    ],
    [
      block('验证:分派时机的断言组', '验证:重写动态分派断言(父类引用调子类重写方法——运行期分派实证);重载静态分派断言(Object 变量传 String 值调 Object 版——编译期绑定实证);装箱优先级断言(int 与 Integer 重载的解析行为)——三组用编译运行对照固化两个分派时机。'),
      block('追问链:分派三刀', '一刀:"invokevirtual 的内部?"——虚方法表(vtable)按实际类型查——单分派(按接收者);多分派(按参数类型)不支持(重载在编译期处理)——单双分派的语言差异是重载/重写差异的理论根源。二刀:"invokestatic 与私有?"——静态方法与私有方法非虚分派(invokestatic/invokespecial——编译期绑定)——不可重写(私有/static/final)——"重写失败"的隐形原因。三刀:"invokedynamic?"——Lambda 与字符串拼接的 invokedynamic(运行期引导——Lambda 的实现策略与拼接的策略由引导方法定,第 21 题)——Java 7+ 的第五条调用指令。'),
    ],
    ['重写运行分派,重载编译绑定', '字段不多态,装箱有优先级', '代理只影响重写不影响重载'], [api('java/lang/invoke/package-summary')],
  ),
  'java-language/7': deep(
    '接口默认方法与抽象类应该如何取舍？',
    '网银 SDK 沙盘:给接口加通用方法(Java 8 默认方法)让所有实现继承——但默认方法无状态(接口无字段)、不能覆盖 Object 方法——抽象类有状态与构造器。用能力差异说明取舍(类单继承 vs 接口多实现的结构约束)。',
    [
      '能力差异:接口默认方法——无状态(接口无实例字段)、无构造器、可多实现(类可实现多接口)、可被 lambda 目标(函数式+默认方法组合);抽象类——有状态(字段)、构造器(初始化)、模板方法(final 骨架)、单继承限制。',
      '取舍判据:需要状态/构造/模板骨架→抽象类;纯行为组合/已存在的接口演进(Java 8 加默认方法的动机:接口向后兼容加方法)→默认方法;函数式行为(Strategy)→接口+默认+lambda。',
      '混合形态:抽象类实现接口的部分方法(骨架)+接口的默认方法做"便捷重载"(接口的API面+抽象类的状态)——两者不是竞争而是分工(第 5 题)。',
    ],
    [
      block('机制:默认方法的动机与边界', '动机:接口的向后兼容演进(Java 8 给 Collection 加 stream() 而不破坏所有实现——默认方法的诞生原因)。边界一,无状态:默认方法不能用实例字段(接口无字段——状态必须来自实现类或参数)——"有状态的通用行为"放不了默认方法。边界二,Object 方法不可默认(toString/equals 不能在接口默认——编译拒绝)。边界三,菱形继承:两接口的同签名默认方法——实现类必须重写解决冲突(显式 InterfaceName.super.method())。'),
      block('反例:默认方法的两种误用', '误用一,默认方法藏状态逻辑:默认方法调用"静态全局"(变相状态,第 47 题)——默认方法的纯净性被破坏(全局可变状态)。误用二,默认方法当抽象类的替代:需要构造/字段的"类"写成接口+默认(状态没地方放,静态 Map 顶着)——结构错位。两条的正解:默认方法只做"行为的便捷默认/组合器"(与流的 default 方法同款:andThen 组合),状态与生命周期归类。'),
      block('取舍:菱形冲突与演进成本', '菱形冲突:类实现两接口同签名默认方法→编译错(必须显式重写)——冲突是显式的(编译器强迫决策)——决策形式:自己实现/选一个父接口(A.super.m())/组合两者。演进成本:接口加默认方法=所有实现类"免费"获得(向后兼容);抽象类加抽象方法=所有子类破坏——兼容性是默认方法的核心优势(第 14 题契约演进)。'),
    ],
    [
      block('验证:取舍的断言组', '验证:状态限制断言(接口定义实例字段编译错——边界实证);菱形断言(两接口同默认方法的实现类必须重写,否则编译错——冲突显式化);组合器断言(默认方法返回新接口实例的链式组合——andThen 形态)——三组固化默认方法的能力边界。'),
      block('追问链:接口三刀', '一刀:"接口的静态方法?"——接口静态方法(Java 8+)——工具方法的归属(接口上的工厂/工具——不污染实现类);与抽象类的静态方法同义。二刀:"私有接口方法?"——Java 9+ 接口私有方法(默认方法之间的共用逻辑)——默认方法的代码复用(不暴露为公共)——接口内聚性提升。三刀:"密封接口(sealed)?"——sealed interface 限定实现集(Java 17)——接口演进的可控性(谁知道实现了什么)+模式匹配的穷尽检查——密封与默认方法的组合(封闭集+默认行为)。'),
    ],
    ['默认方法管行为组合,抽象类管状态骨架', '接口无状态无构造', '菱形冲突显式决策'], [api('java/lang/Iterable')],
  ),
  'java-language/8': deep(
    '如何设计真正不可变的 Java 值对象？',
    '网银金额沙盘:Money 对象(final 类+final 字段)但字段是可变 List(内部状态可改)——不可变的完整性=类 final+字段 final+无 setter+可变成员防御性处理+不可变元素(record 与 List.copyOf 的组合,第 13 题 collections)。',
    [
      '不可变五条:类 final(防子类破坏)、字段 final(构造后赋值一次)、无 setter、可变成员防御(构造入拷贝/getter 出拷贝或不可变视图)、元素不可变(深不可变,第 13 题 unmodifiable 的深浅)。',
      'record 的便利与边界:record 自动 final+字段 final+生成访问器——但 record 的 List 字段仍是可变引用(浅不可变)——record+List.copyOf(构造时拷贝)才完整(record 的防御性构造是开发者责任)。',
      '不可变的收益:线程安全免费(第 20 题 distributed 替换思想)、hashCode 缓存(String,第 1 题)、防御性设计零成本(第 43 题)——不可变是"一次投入多处免维护"的设计(第 46 题 banking 替换优于修改)。',
    ],
    [
      block('机制:防御性处理的进与出', '入向:构造器接收可变集合→List.copyOf(in)(拷贝断开源引用,第 43 题collections)——拷贝后源变化不影响对象。出向:访问器返回 Collections.unmodifiableList(items)(视图)或直接返回 List.copyOf 构造的不可变列表(零拷贝防御)——元素的深浅:元素 record(不可变)→浅拷贝即完整;元素可变→深拷贝或不可变包装(成本)。'),
      block('反例:伪不可变的三种形态', '形态一,字段可变引用:final List 字段但 List 内容可变(外部经 getter add)——"final"只锁引用。形态二,record 的可变字段:record Order(List<Item> items)——items 引用可变(浅不可变)。形态三,可变元素:Money 列表的元素是可变 bean(字段可改,引用不变)——深不可变缺失。三形态的正解:copyOf 包装+元素 record 化+类 final——不可变要"递归到底"(第 20 题 distributed 递归不可变)。'),
      block('取舍:不可变与可变的性能权衡', '不可变的成本:修改=新对象(分配+GC,第 19 题J1 装箱的分配同族)——高频修改大对象(渲染帧)不可变代价高。可变的收益与风险:修改原对象(省分配)+并发风险(同步负担)。判据:修改频率×对象大小×并发暴露——值对象(金额/配置/DTO)不可变优先;可变独占(单线程局部缓冲)可变合理。混合:可变缓冲类(内部)+不可变快照(对外暴露)——内部可变,边界不可变。'),
    ],
    [
      block('验证:不可变完整性的断言组', '验证:五条断言(类 final/字段 final/无 setter/入拷贝/getter 视图或拷贝——逐条断言或 ArchUnit);深浅断言(可变元素的字段修改穿透[对照]、record 元素不穿透);并发断言(不可变对象跨线程共享零同步)——三组固化不可变的完整性;ArchUnit 规则(值对象包内类必须 final+无 setter)进 CI。'),
      block('追问链:不可变三刀', '一刀:"with 方法的链式?"——record 的 withX(生成新实例)——不可变的"修改"语义(替换,第 20 题)——链式 with 的可读性(冗长但显式)。二刀:"不可变与框架?"——JPA/Hibernate 需要可变实体(懒加载/脏检查)——实体不可变与 ORM 冲突——分层:实体可变(持久层)+值对象不可变(领域层)——不可变的适用面按层分。三刀:"builder 模式?"——不可变对象的构建(多字段构造)→builder(构建期可变,build 后不可变)——builder 的线程安全(构建器不共享)——builder 是不可变的构造伴侣。'),
    ],
    ['五条缺一不可,不可变要递归到底', 'record 加 copyOf 才完整', '修改即替换,替换即原子'], [api('java/lang/record/package-summary')],
  ),
  'java-language/9': deep(
    'record 是否自动保证深度不可变？',
    '网银沙盘:record Order(List<Item> items)——record 保证:类 final+组件 final+无 setter;不保证:items 引用的 List 内容不可变(可变元素穿透,第 8 题)——record 的浅不可变与深度不可变的边界。',
    [
      'record 的自动保证:类与组件 final、访问器(组件名())、equals/hashCode/toString(全组件)——"自动"的部分到此为止。不自动的:组件的深度不可变(List 内容/可变元素——开发者责任)、组件的校验(紧凑构造器做校验—— Objects.requireNonNull/范围检查)。',
      '深不可变的 record 模板:record Order(List<Item> items) { Order { items = List.copyOf(items); } }——紧凑构造器拷贝(防御性,第 8 题)——访问器返回的 List 本身不可变(copyOf 的产物)——完整深不可变。',
      '紧凑构造器(无参数列表重复)的职责:校验+规范化(规范化=规范化大小写/编码,第 33 题 banking 键)+防御性拷贝——record 的"构造期约束"集中在这里。',
    ],
    [
      block('机制:record 的自动与手动边界', '自动:头组件的 final 字段+访问器+三件套——组件类型为 List 时,record 只保证"引用不变"。手动责任:List.copyOf(构造时)+紧凑构造器校验(负金额拒绝)+可达性(组件不泄露 this——构造期 this 逃逸=record 不变式被破坏)。紧凑构造器:`public Order { if (amount <= 0) throw ...; items = List.copyOf(items); }`——校验与拷贝的集中点。'),
      block('反例:record 浅不可变的两种事故', '事故一,可变 List 穿透:record Order(List<Item>) 直接持有调用方 List——调用方 add 改变 record"内容"(equals/hashCode 随之变——集合中的行为异常,第 1 题)。事故二,可变组件元素:List.copyOf 包装后 List 不可变,但 Item 元素可变(字段改)——深度穿透。两条的正解:紧凑构造器 copyOf+组件类型 record 化(递归不可变,第 8 题)。'),
      block('取舍:record vs 手写不可变类', 'record:代码极简(一行顶 50 行)/语义清晰(纯数据载体)/不可变默认——数据传输/值对象。手写类:需要继承/懒字段/自定义 equals 细节/大量行为方法——record 的限制(不可继承、组件即字段、行为方法受限)。选择:纯数据+值语义→record;有行为与生命周期→手写(或类)。record 的限制清单:不可继承/不能声明实例字段(组件外)/组件不可变引用——限制即特性(不可变保障的代价)。'),
    ],
    [
      block('验证:record 边界的断言组', '验证:浅不可变断言(record 的可变 List 组件被外部修改——穿透实证);深不可变断言(copyOf 紧凑构造器后修改源 List——不穿透);三件套断言(record 的 equals/hashCode/toString 自动生成且一致)——三组固化 record 的边界;紧凑构造器的校验用例(负金额拒绝)进单测。'),
      block('追问链:record 三刀', '一刀:"record 与序列化?"——record 的序列化用组件(不走字段反射——反序列化调用紧凑构造器!校验在反序列化也生效)——record 的序列化安全性优于传统类(校验不可绕过)。二刀:"静态组件?"——record 不允许实例组件外字段——类级常量(static final)可以——组件与常量的边界。三刀:"局部 record?"——方法内局部 record(临时结构,Java 16+)——中间结果的类型化(不污染类域)——局部 record 与 Stream 的配合(第 40 题分组统计的中间类型)。'),
    ],
    ['record 自动浅不可变,深不可变是责任', '紧凑构造器:校验加 copyOf', '序列化走构造器,校验不可绕过'], [api('java/lang/Record')],
  ),
  'java-language/10': deep(
    '为什么组合通常比继承更适合业务规则扩展？',
    '网银计费沙盘:计费规则用继承扩展(VipPricing extends BasePricing——每加一个规则维度加一层继承:VipDiscountPricing/VipDiscountRegionPricing——类爆炸+组合爆炸);组合(策略注入:BasePricing + List<Discount> 装饰叠加)——规则维度正交时继承的组合爆炸(2 维度 3 值=9 个类 vs 组合 5 个类)。',
    [
      '继承的组合爆炸:规则维度正交(会员等级×地域×活动)时,继承树=维度数的笛卡尔积(VipRegionPromoPricing…)——类数量指数增长;组合:每维度一个策略类,运行时叠加(装饰器/策略列表,第 9 题)——类数量线性。',
      '继承的耦合:子类依赖父类实现细节(基类修改破坏子类——脆弱基类问题,第 40 题 distributed 行为不变被破坏);组合:仅依赖接口(实现细节隐藏)。',
      '继承的合法场景:真 IS-A 且基类稳定(框架的模板方法:AbstractList——JDK 的骨架实现)——业务规则的扩展(变化频繁、维度正交)几乎总适合组合。',
    ],
    [
      block('机制:组合爆炸与策略叠加', '继承爆炸:3 维度×2 值=8 个子类;加一维度=16 个(指数)。组合:每维度一个策略接口(Discount/RegionFee/Promo)+组合器(叠加计费)——加维度=加一个策略类+组合点(线性)。叠加语义:装饰器(逐层包装,顺序敏感)vs 策略列表(遍历应用,顺序可配)——计费的"先折扣后加价"顺序语义显式化(第 21 题手续费叠加顺序)。'),
      block('反例:继承扩展的类爆炸实例', '沙盘:计费规则继承树 2 年长到 24 个类(3 维度组合)——新需求(新活动)再加 4 个类;同类逻辑(折扣计算)在多层重复。重构:策略组合(24 类→6 类:基类+3 策略接口+组合器)——类数量减 75%,新维度=新策略类。重构的验证:行为等价(第 40 题distributed 特征测试)。'),
      block('取舍:继承仍有的位置', '继承的合法场景:框架骨架(AbstractXxx 的模板方法——JDK 集合骨架)、同质扩展(单一维度的子类型化——is-a 关系真实)。组合的纪律:组合的对象数量(组合过深=调用链长,第 9 题)——组合的层次也要节制(适度组合)。判断问句:扩展是"多个正交维度"还是"单一维度的特殊化"?——正交=组合;单一 is-a=继承。'),
    ],
    [
      block('验证:组合爆炸的量化断言', '验证:类数量对照(继承树 vs 策略组合的类数——维度增长时继承指数/组合线性的曲线);行为等价断言(重构前后计费结果一致——第 40 题distributed 特征测试);新维度成本断言(加一维度的代码改动量:继承=N 个新类 vs 组合=1 个策略类)——三组量化"组合优于继承"的工程含义。'),
      block('追问链:组合三刀', '一刀:"组合的依赖注入?"——策略通过构造注入(组合的装配)——装配的配置化(第 34 题规则快照:组合的规则集是配置)——组合+配置=规则引擎的轻量形态(第 9 题)。二刀:"is-a 的检验?"——里氏替换(子类必须能替换父类——行为契约)——不满足 LSP 的继承=is-a 谎言(改组合)。三刀:"默认方法与组合?"——接口默认方法=无状态的"继承替代"(第 7 题):行为组合在接口层——默认方法(无状态组合)+策略组合(有状态注入)的组合拳。'),
    ],
    ['正交维度继承爆炸,组合线性', '脆弱基类是继承的税', 'is-a 谎言改组合,LSP 检验'], [pod],
  ),

  'java-language/11': deep(
    '受检异常与运行时异常如何划分边界？',
    '网银转账沙盘:余额不足算受检(调用方必须处理)还是运行时(直接炸)?划分判据=调用方能否合理恢复——能恢复的预期失败→受检;程序缺陷或不可恢复→运行时(第 35 题分布式:异常当控制流的成本)。',
    [
      '判据:可恢复的预期业务失败(余额不足/单号已存在)→受检异常(强制调用方决策);程序缺陷(空指针/非法状态——修复代码而不是处理)→运行时;资源/环境不可控(IO 失败)→运行时包装或受检视恢复可能。',
      '与第 35 题distributed 的衔接:受检异常的 catch 是显式决策点(好);但高频可预期的失败用异常当控制流=性能与语义双坑(预校验优先,第 35 题加强版)。',
      '演进视角:响应式/Kotlin 的趋势是"异常去受检化"(受检在 lambda/流中处理笨拙)——新代码的划分更倾向"运行时+文档+Result 模式"——团队规范要显式(新旧代码的边界)。',
    ],
    [
      block('机制:三类异常的语义与责任', '受检(Exception 子类非 RuntimeException):编译器强制 catch/throws——语义=调用方"必须知道并处理"的预期失败;责任=调用方。运行时(RuntimeException):不强制——语义=程序缺陷或不可恢复;责任=修复代码/全局兜底(第 27 题统一异常)。Error:JVM 级(OOM/StackOverflow)——不捕不处理。三级的语义边界即划分判据。'),
      block('反例:边界错位的两种病', '病一,全运行时:业务失败(余额不足)抛 RuntimeException——调用方不知道要处理(编译器不强制)——资金路径的失败被吞(第 35 题事故)。病二,全受检:IO 异常层层 throws 传递(签名污染)——lambda 与 Stream 中笨拙(受检在函数式中的处理成本)——包装为运行时(带原因链)。两条的正解:按恢复可能性划分,函数式边界包装,决策点保留受检。'),
      block('取舍:异常设计的一致性', '异常层次:业务异常基类(BizException:错误码/消息)+子类(InsufficientBalanceException)——统一异常处理(第 27 题 spring)按基类路由。错误码:受检异常携带业务错误码(第 45 题错误码体系)——异常与错误码的一致性。包装纪律:包装运行时保留原因链(cause 不丢,第 12 题)——异常链的完整性是排障的生命线。'),
    ],
    [
      block('验证:划分边界的断言组', '验证:编译强制断言(受检异常不处理编译错——编译器护栏实证);清单断言(业务异常清单:每类失败标注受检/运行时与理由——划分的文档化);处理率断言(受检异常的 catch 覆盖——未被处理的受检异常扫描为零)——三组固化划分纪律。'),
      block('追问链:异常边界三刀', '一刀:"第三方异常的转换?"——第三方受检异常(渠道 SDK)在防腐层包装为运行时(业务语义化,第 7 题)——防腐层的异常翻译职责。二刀:"受检与资源清理?"——try-with-resources(第 12 题)处理受检 close 异常——资源异常的受检语义被语言机制吸收。三刀:"异常与重试?"——可重试(超时/限流)与不可重试(余额不足)的异常分类——重试预算按异常类型分配(分布式 29 题)。'),
    ],
    ['可恢复受检,缺陷运行时', '函数式边界包装运行时', '决策点保留受检,处理率进检查'], [api('java/lang/Exception')],
  ),
  'java-language/12': deep(
    'try-with-resources 遇到多个异常时如何处理？',
    '网银资源沙盘:try 块抛业务异常+close 也抛异常——try-with-resources 的语义:close 的异常被抑制(suppressed),业务异常为主异常抛出——getSuppressed() 可取被抑制的异常(排障完整)。',
    [
      '机制:try-with-resources 中 try 体异常为主异常,多个 close 的异常按声明逆序附加为 suppressed——主异常+抑制链=完整故障信息(手写 finally 的"close 异常覆盖业务异常"问题的语言级解)。',
      '对比手写 finally:finally 中 close 抛异常会"吞掉"try 体异常(业务异常丢失)——try-with-resources 的 suppressed 机制解决了这个历史坑——资源清理的异常不该掩盖业务异常。',
      '两个资源的顺序:声明顺序=关闭逆序(后开先关——栈序)——依赖顺序的资源(包装流:BufferedOutputStream(FileOutputStream))按声明序保证关闭顺序正确。',
    ],
    [
      block('机制:主异常与抑制链', '语义:try 体异常抛出;资源 close 异常→addSuppressed 附加;多个资源→每个 close 的异常依次附加(逆序关闭)。getSuppressed():Throwable[]——排障时抑制链可见(关闭失败的根因不丢)。对比 finally:finally 的异常覆盖 try 异常(业务异常丢失,历史坑)——try-with-resources 的诞生动机之一。'),
      block('反例:finally 覆盖的事故', '沙盘:try 体抛"余额不足"业务异常,finally 的 close 也抛 IO 异常——手写 finally 下 IO 异常覆盖业务异常(调用方收到"close 失败"而不是"余额不足")——业务语义丢失+排障误导。修复:try-with-resources——业务异常为主,IO 异常进 suppressed(主次分明)。'),
      block('取舍:资源的声明与 AutoCloseable', '声明顺序=关闭逆序:依赖资源的包装流按声明序(内层先声明先关闭?——声明序=打开序,关闭=逆序——BufferedOutputStream(FileOutputStream):声明 BufferedOutputStream 在前?实际 try (FileOutputStream fos = ...; BufferedOutputStream bos = new BufferedOutputStream(fos))——关闭序 bos→fos(包装层先关,先 flush 再关底层)——依赖顺序正确。AutoCloseable 的契约:close 幂等(可重复调用)、close 不抛中断以外的强异常(资源类的 close 纪律)。'),
    ],
    [
      block('验证:抑制链的断言组', '验证:主异常断言(try 体异常为主抛出——getSuppressed 含 close 异常);逆序关闭断言(多资源的关闭顺序=声明逆序——日志/断言);对照断言(手写 finally 的覆盖行为复现——历史坑实证)——三组固化 try-with-resources 语义;close 的幂等用例(重复 close 无害)补充。'),
      block('追问链:资源三刀', '一刀:"close 里做业务?"——close 做资源释放(不做业务提交——提交在 try 内显式,第 10 题distributed afterCommit 同构禁忌)——close 的职责边界。二刀:"Effectively final 资源?"——有效 final 变量可直接进 try-with-resources(Java 9+)——外部创建的资源也能用语法。三刀:"Lombok @Cleanup?"——@Cleanup=作用域结束自动 close(编译期生成)——与 try-with-resources 等价但作用域控制不同(方法级 vs 块级)——按作用域选。'),
    ],
    ['主异常保留,close 异常进 suppressed', '关闭逆序=声明序的反转', 'close 不掩盖业务异常'], [api('java/lang/AutoCloseable')],
  ),
  'java-language/13': deep(
    '为什么不能在 finally 中随意 return？',
    '网银沙盘:finally 里 return 99 覆盖 try 的 return 1(本机实验:tryReturn 返回 1——finally 修改局部变量不影响,但 finally 里 return 会覆盖)——finally return 的三重伤害:吞异常/覆盖返回值/编译器警告。',
    [
      '本机实验(J1):try { return r; } finally { r = 99; } 返回 1——finally 修改局部变量不影响返回值(返回值在 return 时已拷贝);但 finally { return x; } 直接覆盖 try 的任何 return/异常——finally 的 return 是"最终发言权"(吞一切)。',
      '三重伤害:一,吞异常(try 抛异常,finally return 把异常吞掉——调用方以为成功);二,覆盖返回值(try 的 return 作废);三,语义混乱(调用方无法推断哪条路径的返回值)——编译器给 warning("finally block does not complete normally")。',
      '正确姿势:finally 只做清理(资源关闭/日志——不 return 不 throw);返回值在 try 内确定;finally 的清理失败不吞主流程(suppressed,第 12 题分布式 try-with-resources)。',
    ],
    [
      block('机制:返回值拷贝与 finally 覆盖', 'try return 的执行序:计算返回值→暂存→执行 finally→(finally 无 return)→返回暂存值——finally 修改局部变量 r 不影响暂存副本(实测返回 1)。finally return 的执行序:try 的 return 暂存→finally 执行→finally 的 return 直接返回(覆盖暂存,吞 try 的异常)——finally 的 return 是"无条件最终返回"。编译器 warning 的依据是 JLS §14.20.2(finally 非正常完成:try 的异常被丢弃、返回值被覆盖)——warning 即护栏。'),
      block('反例:finally return 的资损事故', '沙盘:转账方法的 finally 里 return false(日志记录失败的兜底)——try 内成功转账返回 true 被 finally 覆盖为 false——调用方以为失败重试(双花,分布式 7 题)。修复:finally 去 return(返回值在 try 内确定);失败兜底的语义用显式 try-catch(catch 后决定返回值)——兜底逻辑不放 finally。'),
      block('取舍:finally 的合法内容', '合法:资源关闭(try-with-resources 替代)、日志(不抛)、状态复位(锁释放[显式锁,第 21 题])。禁忌:return/throw/改变返回值(语义覆盖)/长时间操作(异常窗口)。现代替代:try-with-resources 吃掉大部分 finally 场景——剩余 finally(锁释放)只做 finally 锁 unlock(第 21 题JVM)。'),
    ],
    [
      block('验证:finally 行为的断言组', '验证:副本断言(finally 修改局部变量不影响返回——J1 实测返回 1);覆盖断言(finally return 覆盖 try 返回值与吞异常——复现);warning 断言(编译器的 finally warning 出现)——三组固化 finally 纪律;finally 去 return 的重构用例(兜底逻辑显式化)对照。'),
      block('追问链:finally 三刀', '一刀:"finally 一定执行吗?"——System.exit/JVM 崩溃/线程被杀不执行——finally 的执行边界(第 19 题distributed OOMKilled 同源);守护线程的 finally 不保证。二刀:"finally 与锁?"——显式锁的 unlock 必在 finally(获取与释放配对,第 21 题JVM)——finally 的最后合法阵地;try-with-resources 对 Lock 的适配(自定义 AutoCloseable 包装锁)。三刀:"finally 与异步?"——异步回调的"finally"(finallyAsync)——异步资源释放的语义(CompletableFuture.whenComplete)——同步 finally 的思想在异步的映射。'),
    ],
    ['finally 只清理,不发言', '副本机制:改局部不影响返回', '吞异常是资损级反模式'], [api('java/lang/Thread')],
  ),
  'java-language/14': deep(
    'Optional 适合作为所有字段和参数的类型吗？',
    '网银接口沙盘:Optional<User> 做字段/参数/集合元素——Optional 的设计意图=返回值表达"可能无结果"(方法签名语义化);字段/参数用 Optional=设计意图滥用(序列化问题/嵌套 Optional/接口噪音)。',
    [
      '设计意图(官方口径):Optional 是"可能无返回值"的方法返回类型——强制调用方面对"可能无";字段/参数的"可能无"用重载/哨兵/null(按既有模式)——设计者意图如此(Stuart Marks 的使用建议)。',
      '字段 Optional 的三个问题:不可序列化(Optional 不实现 Serializable)、嵌套(Optional<Optional<T>> 的丑陋)、两状态变三状态(null/empty/present——更复杂)。',
      '正确用法:返回值(Optional<User> findUser(id)——找不到=empty)、链式(map/orElse 组合)、集合元素不用(集合空即表达"无"——empty collection 优于 null 优于 Optional 元素)。',
    ],
    [
      block('机制:返回值的强制语义', '强制语义:Optional 返回值=调用方编译期必须处理(empty——isPresent/orElse/orElseThrow)——null 返回值可以被无视(NPE 延后),Optional 不行——把"可能无"从运行时前移到编译期(类型即文档)。链式:findUser(id).map(User::getEmail).orElse("未绑定")——null 检查的嵌套被链式替代(可读性)。orElseThrow(异常语义:必须存在,否则抛业务异常)——三种出口(orElse 默认值/orElseGet 供应商/orElseThrow 异常)。'),
      block('反例:Optional 滥用的三种事故', '事故一,Optional 字段:实体字段 Optional<User>——不可序列化(JPA/序列化框架)且两状态变三状态(null/empty/present)。事故二,Optional 参数:方法参数 Optional<String>——调用方被迫包装(ofNullable 包一下再传)——接口噪音;参数的"可选"用重载表达(两个方法签名)。事故三,Optional 元素:List<Optional<T>>——集合元素的可空性用集合设计解决(filter 掉 null 后装——不要 Optional 元素)。三条的正解:Optional 只做返回值。'),
      block('取舍:Optional 的性能与语义', '性能:Optional 对象分配(每次 ofNullable 一次分配)——热路径的分配成本(第 19 题 J1 装箱同族);空 Optional 可复用(Optional.empty() 是单例)。语义边界:内部代码(自己可控)可用可不用(null 纪律好则少用);对外 API(第三方调用)Optional 值得(强制语义)——Optional 的价值随调用方的不可控程度上升。'),
    ],
    [
      block('验证:使用边界的断言组', '验证:链式断言(map/orElse 组合替代嵌套 null 检查——可读性对照);三出口断言(orElse 立即求值[默认值有副作用时慎用]vs orElseGet 惰性——两者差异实证);误用扫描断言(字段/参数的 Optional 扫描为零——静态检查进 CI)——三组固化使用边界。'),
      block('追问链:Optional 三刀', '一刀:"Optional 的 null?"——Optional.ofNullable(null)=empty;Optional.of(null)=NPE——ofNullable vs of 的选择(已知非空用 of——语义更强)。二刀:"optional ifPresent 的陷阱?"——ifPresent 的 lambda 内做副作用(写库)——副作用藏在 Optional 链里(可读性降)——副作用显式化(ifPresentOrElse[Java 9]或拆语句)。三刀:"orElse 与 orElseGet 的差异?"——orElse 的参数总是求值(立即);orElseGet 惰性(默认值昂贵时用 orElseGet)——两者差异的经典面试点与真实事故源(默认值构造有副作用时 orElse 的意外执行)。'),
    ],
    ['Optional 只做返回值', '字段参数用重载,集合用空表达', 'orElse 立即 orElseGet 惰性'], [api('java/util/Optional')],
  ),
  'java-language/15': deep(
    'Stream 的惰性求值会带来哪些副作用问题？',
    '网银过滤沙盘:stream.filter(x -> { audit(x); return valid(x); })——惰性求值下 audit 的执行时机与次数不可预期(终端操作才触发/短路可能跳过/并行流乱序)——Stream 的 lambda 应纯,副作用显式挪出。',
    [
      '惰性的语义:中间操作(filter/map)只记录不执行——终端操作(collect/forEach/count)才触发——lambda 的执行时机=终端操作时刻(不是代码书写位置)。',
      '副作用的三类问题:时机不可预期(调试/审计的时机错位)、次数不可预期(短路操作[findFirst]跳过元素——审计漏记)、顺序不可预期(并行流乱序——审计顺序错,第 15 题分布式)。',
      '正解:Stream 的 lambda 纯(只转换/判断,不改状态);副作用显式挪出(先 collect 再 forEach 审计/用 peek 调试仅限[debug 语义])——Stream 管道的数据流与副作用的分离。',
    ],
    [
      block('机制:惰性求值与短路', '惰性:filter(x -> expensive(x)) 在 count() 时才执行(且 count 优化可跳过 filter[JDK 9 的 count 优化:已知 size 的流直接返回])——lambda 执行次数与元素数的关系不透明。短路:findFirst/findAny/limit——短路后的元素不经过中间操作(副作用 lambda 跳过)。并行:parallel stream 的 lambda 并发执行——共享可变状态的副作用竞态(第 20 题)——并行流的 lambda 必须无状态。'),
      block('反例:副作用 Stream 的三种事故', '事故一,审计漏记:filter(lambda 内审计)——短路/优化跳过部分元素——审计不完整(合规风险,第 32 题)。事故二,调试失效:peek 调试(peek 在短路下同样跳过——调试输出误导)。事故三,状态污染:map(lambda 内改外部 Map)——并行流竞态(丢失更新)——统计错误。三条的正解:审计/调试/状态修改全部挪出 Stream(collect 后处理)或用 Collector 内聚(toMap 的 merge)。'),
      block('取舍:Stream 可读性与副作用的平衡', 'Stream 的价值:声明式数据转换(过滤映射归并的可读性);副作用是它的禁区(函数式纪律)。副作用需求的替代:循环(命令式,副作用自由)——"Stream 管转换,循环管副作用"的代码分工(混合:先 Stream 转换 collect,再循环处理副作用)。团队的 Stream 纪律:lambda 纯度检查(评审:lambda 内禁止赋值/IO)——纪律进评审清单(第 24 题)。'),
    ],
    [
      block('验证:副作用问题的断言组', '验证:时机断言(惰性求值:无终端操作时 lambda 零执行——时机实证);短路断言(limit(1) 下 filter 的 lambda 只执行到首个匹配——次数实证);并行竞态断言(parallel 流内改共享 Map,断言丢失更新——竞态复现)——三组固化副作用问题;纯 lambda 的 lint 规则进 CI(抽查)。'),
      block('追问链:Stream 三刀', '一刀:"peek 的定位?"——peek=调试用途(JDK 文档明确:调试用)——生产代码的 peek(副作用)反模式;peek 的合理残留=日志开关内的 debug(第 32 题)。二刀:"Collectors 的原子性?"——toMap 的 merge(第 17 题)与 groupingBy 的并发版(concurrent)——Collector 内的副作用是受控的(框架协调)——副作用"收口到 Collector"是 Stream 的合法副作用形态。三刀:"Stream 与异常?"——lambda 不能抛受检(包装运行时,第 11 题)——Stream 与受检异常的摩擦(包装函数/Exit 文本)——异常与流的边界。'),
    ],
    ['惰性求值,时机次数顺序都不可预期', 'lambda 纯,副作用挪出管道', 'peek 只调试,副作用进 Collector'], [api('java/util/stream/Stream')],
  ),
  'java-language/16': deep(
    'parallelStream 为什么可能拖慢在线接口？',
    '网银接口沙盘:接口里 parallelStream 处理列表——ForkJoinPool.commonPool 被占用(全 JVM 共享)——其他用 commonPool 的操作(ForkJoin 任务/部分并行流)被饿死;且 commonPool 并行度=核数-1,IO 阻塞型任务占住线程让并行度归零。',
    [
      'commonPool 共享:ForkJoinPool.commonPool 是 JVM 全局共享(所有 parallelStream 默认用它+CompletableFuture 的默认执行器+其他 ForkJoin 任务)——在线接口的 parallelStream 占用 commonPool→其他并行操作饿死。',
      'IO 阻塞的灾难:parallelStream 的 lambda 里做远程调用(阻塞 200ms)——commonPool 的线程(核数-1 个)全被阻塞占住——整个 JVM 的并行操作停滞(吞吐归零的窗口)。',
      '正确姿势:在线接口禁 parallelStream(数据量小时串行更快,第 9 题);大计算用独立 ForkJoinPool(parallelStream 用自定义池提交[submit 后 join]);IO 型并行用独立线程池(CompletableFuture.supplyAsync(executor),第 16 题distributed 异步事务)。',
    ],
    [
      block('机制:commonPool 的共享与饥饿', '共享池:commonPool 的并行度=Runtime.availableProcessors()-1(至少 1)——全局唯一(所有默认并行任务共享)——一个任务的阻塞线程=全局并行度减少。饥饿链:接口 A 的 parallelStream(IO 阻塞)占满 commonPool→接口 B 的 parallelStream 排队→B 的 P99 爆——跨接口的干扰(第 37 题distributed 聚合拖垮交易的同构)。CPU 型任务:commonPool 合适(CPU 密集+无阻塞——核数-1 刚好)。'),
      block('反例:parallelStream 的三种事故', '事故一,IO 阻塞占池:接口内 parallelStream 调远程(200ms×线程数)——commonPool 全阻塞——JVM 其他并行任务饿死(全局故障)。事故二,小数据并行:10 元素的列表 parallelStream——任务拆分与线程调度开销>收益(并行比串行慢,第 9 题distributed 数组链表的伪优化同构)。事故三,嵌套并行:parallelStream 内再 parallelStream——嵌套 ForkJoin 的拆分爆炸。三条的正解:在线接口串行优先;CPU 密集大数据独立池;IO 并行用专用池+CompletableFuture。'),
      block('取舍:并行的选型阶梯', '阶梯:串行(默认,数据小/在线接口)→独立池的 parallelStream(CPU 密集大数据:submit 到自定义 ForkJoinPool)→CompletableFuture+专用池(IO 并行)→批处理框架(超大数据)。判据:数据量(万级以下串行)+任务类型(CPU vs IO)+在线 or 离线(在线串行优先,离线可并行)——三个维度定并行策略。'),
    ],
    [
      block('验证:commonPool 干扰的断言组', '验证:饥饿复现断言(接口 A 的 IO parallelStream 占池,断言接口 B 的并行任务延迟暴涨——全局干扰实证);独立池断言(自定义 ForkJoinPool 后 A 不再干扰 B);串行对照断言(小数据串行 vs 并行的耗时——并行开销可见)——三组固化并行选型纪律。'),
      block('追问链:并行三刀', '一刀:"如何判断该并行?"——数据量×单元素成本>并行开销(拆分+调度+合并)——预估不足就串行(并行是优化不是默认,第 50 题distributed 伪优化同源)。二刀:"自定义池的参数?"——ForkJoinPool(并行度/工厂/异常处理)——池大小=CPU 核数(CPU 型);IO 型用普通线程池(不是 ForkJoin)——池类型匹配任务类型。三刀:"并行的副作用?"——parallel 流的 lambda 无状态(第 15 题)+共享资源的竞态(第 20 题)——并行的正确性前提比串行严苛(纪律先于性能)。'),
    ],
    ['commonPool 全局共享,阻塞即全局灾难', '在线接口串行优先', 'IO 并行用专用池,不用 commonPool'], [sre, api('java/util/concurrent/ForkJoinPool')],
  ),
  'java-language/17': deep(
    'Collectors.toMap 遇到重复键应如何处理？',
    '网银统计沙盘:Collectors.toMap(key, value) 遇重复键直接抛 IllegalStateException("Duplicate key")——生产事故的经典(数据里有重复键,统计接口 500)。三参数重载(merge 函数)是标准解。',
    [
      '默认行为:toMap(keyFn, valFn) 遇重复键抛 IllegalStateException——一次性炸掉整个统计(数据驱动的事故:上游数据多了一条重复记录)。',
      '三参数重载:toMap(keyFn, valFn, mergeFn)——merge(old, new) 决定重复键的处理(取首/取后/求和/自定义)——merge 的语义=业务决策(统计口径)。',
      '分组统计的替代:groupingBy(分组本身容忍重复——每组 List)+下游聚合(summingLong)——"去重取一"用 toMap+merge,"分组聚合"用 groupingBy——语义选择(第 40 题)。',
    ],
    [
      block('机制:重复键的抛出与合并', '抛出:Map.merge 的缺省形态(toMap 内部用 merge,key 已存在且无 merge 函数→抛 IllegalStateException("Duplicate key ..."))——异常即"数据与假设不符"(假设键唯一)。merge 函数:(old, new) → 决策——取首(old,保留首次)、取后(new,最后赢)、求和、自定义业务规则(banking 45 题:按时间取最新)。merge 的原子性:并行流的 toMap(merge 在合并时调用——并发段的合并语义)。'),
      block('反例:重复键的三种事故', '事故一,炸接口:统计接口 toMap 无 merge——上游数据重复一条→IllegalStateException→接口 500(全局故障)。事故二,静默取错:有 merge 但取错方向(取 first 实际业务要最新)——统计口径错(静默,第 50 题distributed)。事故三,HashMap.put 的隐式覆盖:非 toMap 场景直接 put(后写覆盖)——覆盖语义与 merge 混淆。三条的正解:toMap 必带 merge(团队规范)+merge 的业务语义评审(第 24 题)。'),
      block('取舍:toMap vs groupingBy 的选择', 'toMap:键唯一语义(每键一条,重复=异常或合并)——一对一映射。groupingBy:键分组语义(每键多条,聚合)——一对多。边界:统计"每账户最新一条"(toMap+merge 按时间)vs "每账户全部交易"(groupingBy)——数据形态与业务意图决定。Map 的类型指定:toMap 的第四参(TreeMap::new——有序输出,第 41 题)。'),
    ],
    [
      block('验证:重复键的断言组', '验证:抛出断言(无 merge 的重复键抛 IllegalStateException——默认行为实证);merge 断言(三参数 toMap 的取首/取后/求和行为);分组对照断言(groupingBy 的分组聚合语义)——三组固化重复键处理;merge 函数的单元测试(合并语义的可测)进规范。'),
      block('追问链:toMap 三刀', '一刀:"null 值?"——toMap 的 value 为 null 抛 NPE(toMap 不允许 null value——HashMap.merge 的语义)——null 值的过滤(map 前滤)或哨兵(第 18 题)。二刀:"键的 null?"——keyFn 返回 null 同样 NPE——键的规范化(第 33 题banking)。三刀:"toMap 的并发?"——toMap 非并发容器(HashMap)——并发流的 toMap(Parallel 流的合并正确但容器非线程安全[最后 collect 单线程])——parallel toMap 的语义(合并发生在子结果层)。'),
    ],
    ['toMap 默认抛,merge 必带', '取首取后求和,语义即业务', '一对一 toMap,一对多 groupingBy'], [api('java/util/stream/Collectors')],
  ),
  'java-language/18': deep(
    'Lambda 捕获变量为什么要求有效 final？',
    '网银计数沙盘:lambda 里改外部计数器(int count++)编译错("must be final or effectively final")——lambda 捕获的是值的副本(局部变量)或引用(对象)——副本的修改无意义(局部变量栈帧生命周期)所以语言强制 final。',
    [
      '机制:局部变量在栈帧(方法结束即销毁)——lambda 可能超越方法生命周期(异步执行)——捕获局部变量=拷贝值(基本类型)或引用(对象)——拷贝的修改不会反映到原变量(语义混乱)→语言强制 final(有效 final=不修改即等价 final)。',
      '对象引用的例外:lambda 捕获对象引用(final),修改对象内部状态合法(count 字段++)——"final 的引用,可变的对象"(第 20 题distributed 值安全同源)——AtomicLong/long[] 的绕行技巧(引用不变,状态变)。',
      '正确姿势:计数用 LongAdder/AtomicLong(并发安全)或数组包装(long[1]——丑但有效)或把逻辑抽方法(返回值传递,不用捕获)——异步 lambda 的计数用并发原语(第 19 题distributed 原子 API)。',
    ],
    [
      block('机制:捕获的副本语义与生命周期', '值捕获:int/long 局部变量→lambda 内是副本(方法栈帧的拷贝)——副本修改不影响原变量(原变量可能已销毁——异步场景)→语义混乱→final 强制(不可改)。引用捕获:对象→lambda 持有同一引用(对象生命周期由 GC 管——lambda 存活对象就存活)——引用的修改(对象内部)合法(引用本身不变)。this 的捕获:lambda 内 this=外围类实例(不同于匿名内部类的 this=匿名对象本身)。'),
      block('反例:绕行技巧的两种事故', '事故一,long[1] 包装:lambda 内 count[0]++——并发场景非原子(丢失更新,分布式 7 题)——串行合法但并发坑——并发计数换 LongAdder(第 19 题)。事故二,捕获可变对象的状态依赖:lambda 捕获 List 引用,捕获后外部 add——lambda 内看到变化(时序依赖——lambda 的行为随捕获后的状态变)——行为不确定性(第 15 题副作用问题)。两条的正解:lambda 纯(参数进结果出,第 15 题)+并发计数用原子类。'),
      block('取舍:final 强制的收益与变通', '收益:lambda 的行为可预测(捕获不变=无隐藏状态依赖)+并行安全的基础(lambda 无状态=parallel 安全,第 15 题)。变通的合规度:AtomicLong(并发正规)、long[1](串行/演示)、自定义 Holder 类(显式状态)——变通要标注并发语义。语言演进的视角:Java 的值捕获(拷贝)vs Scala/Kotlin 的闭包捕获(引用)——Java 的选择=简单+线程友好(引用捕获需要逃逸分析+堆分配——Java 选择的实现简单性)。'),
    ],
    [
      block('验证:捕获语义的断言组', '验证:副本断言(局部变量捕获后外部修改,lambda 内看不到——编译期拒绝更直接);并发计数断言(long[1] 并发的丢失 vs LongAdder 的精确——对照);this 捕获断言(lambda 内 this=外围类[与匿名类对照])——三组固化捕获语义;有效 final 的编译错误示例(教学)进指南。'),
      block('追问链:lambda 三刀', '一刀:"lambda 的实现机制?"——invokedynamic+LambdaMetafactory(运行期生成类,非匿名类语法糖)——Lambda 的类是运行期合成的(类名含 $Lambda);性能与匿名类相当(JIT 后)。二刀:"方法引用?"——类::方法(等效 lambda,更简)——方法引用的四种形态(静态/实例绑定/实例未绑定/构造)——lambda 与方法引用的可读性权衡。三刀:"序列化?"——lambda 可序列化(标记接口)但脆弱(编译器合成的类名跨版本不稳定)——lambda 序列化禁止(用命名类替代)。'),
    ],
    ['局部变量拷贝语义,final 是语言强制', '引用不变,对象状态可变是例外', '并发计数用原子类,别绕行'], [api('java/lang/invoke/LambdaMetafactory')],
  ),
  'java-language/19': deep(
    '如何避免自动装箱导致的性能与正确性问题？',
    '网银计数沙盘:Long sum 循环 +=(每次装箱创建 Long 对象)——本机 J1 实测:装箱 6ns vs 原始 1ns(6 倍);正确性问题:Integer 的 ==(缓存 -128~127,J1 实测 128==false)——装箱的性能与正确性双坑(第 19 题distributed 累计的原始类型优化)。',
    [
      '性能坑:Long/Integer 的包装对象(每次运算拆箱+重新装箱+分配)——循环内的装箱=百万次对象分配(GC 压力,J1 实测装箱 6 倍耗时)——热点循环用原始类型(long/int)+ long[] 替代 List<Long>(第 32 题collections 内存)。',
      '正确性坑:Integer 的 ==(引用比较,缓存 -128~127 内 true——J1 实测 128==false)——包装对象的等值判断必须 equals/compareTo/unboxing(== 只对缓存范围碰巧对——缓存外的错误)。',
      '缓存的意外依赖:Integer.valueOf(-128~127 缓存)——== 在缓存范围内碰巧 true——代码依赖这个"碰巧"(跨 JDK/参数 -XX:AutoBoxCacheMax 可变)——== 对包装类型是红线(banking 3 题 BigDecimal 同款)。',
    ],
    [
      block('机制:装箱的分配与缓存池', '装箱:Integer.valueOf(i)——缓存池(-128~127 预建,AutoBoxCacheMax 可调)命中复用,池外 new Integer(分配)——J1 实测:127==true(池)、128==false(分配)。性能的量化:装箱 6ns/次(分配+GC 压力)vs 原始 1ns——10 亿次累加的装箱=6 秒+亿级对象 GC——热点循环的红线。Long 的陷阱更隐蔽:Long sum 循环 +=(每迭代装箱—— Effective Java 的经典性能条目)。'),
      block('反例:装箱的两种事故', '事故一,热点循环装箱:百万次循环的 Long +=——GC 风暴+6 倍耗时(J1 实测)——接口延迟。事故二,== 判等:订单状态 Integer==某值——状态>127 时 false(业务判断失效——状态机判断错误,第 40 题)。两条的正解:热点循环原始类型;包装对象判等 equals 或先拆箱(显式 intValue);状态枚举替代 Integer 状态(类型安全,第 8 题)。'),
      block('取舍:原始类型与包装类型的边界', '原始类型:局部变量/数组/热点循环(性能);包装类型:集合元素(泛型需要)/可空表达(第 14 题)/对象字段(可空)。三态语义:包装类型表达"三态"(null=未设置/值)——原始类型两态(默认值[0]与真值混淆——0 是合法金额)——三态需求包装类型的正当性(可空语义,第 14 题)。边界转换:包装↔原始的转换点集中(边界函数)——散落的拆箱 NPE 风险(null 拆箱 NPE)。'),
    ],
    [
      block('验证:装箱坑的断言组', '验证:性能断言(J1 实测:装箱 6 倍耗时——热点循环对照);缓存断言(127/128 的 == 对照——J1 实测);NPE 断言(null Integer 拆箱 NPE——null 拆箱的陷阱复现)——三组固化装箱纪律;装箱热点的扫描器(循环内包装类型运算的检测)进 CI(抽查)。'),
      block('追问链:装箱三刀', '一刀:"AutoBoxCacheMax?"——-XX:AutoBoxCacheMax=10000(缓存上限可调)——调缓存绕装箱(治标:分配变复用)——范围依赖 JVM 参数(不可移植)——默认纪律:热点用原始类型,不调缓存。二刀:"Long 的 == 常见源?"——Long a = 1000L; Long b = 1000L; a==b false——"两个 Long 比较"是 == 事故的高发区(Long 的字面量自动装箱)——equals 习惯的强制。三刀:"泛型与装箱?"——泛型只能包装类型(List<Long> 不能 List<long>)——流式数值(mapToLong,第 40 题)——泛型的装箱不可避免(容器边界),热点循环内拆箱后运算。'),
    ],
    ['热点循环零装箱', '包装对象 == 是红线', '三态语义是包装的正当性'], [api('java/lang/Integer')],
  ),
  'java-language/20': deep(
    'String.intern 在高基数业务数据中有什么风险？',
    '网银订单沙盘:订单号做 intern("省内存")——字符串常量池(PermGen[JDK7 前]/堆[JDK7+])被百万业务字符串填满:JDK7 前 PermGen OOM;JDK7+ 堆膨胀+池无淘汰——intern 的收益(共享)在高基数数据上变成风险。',
    [
      'intern 的机制:字符串入常量池(全局共享,唯一实例)——返回池中引用——收益=相同字符串共享一份(重复率高时省内存)+== 比较(池内引用相等)。',
      '高基数风险:业务数据(订单号)基数百万级且不重复——intern 把百万字符串塞池:JDK7 前 PermGen 固定大小 OOM(经典);JDK7+ 池在堆(可 GC)但池本身无淘汰策略+哈希表开销——堆膨胀+GC 扫描面扩大。',
      'JDK7 的转折:intern 从 PermGen 移到堆(普通对象,可 GC)——"intern 会 OOM"的经典结论在 JDK7+ 需重新表述(堆膨胀+表开销替代 PermGen OOM)——版本边界(第 49 题JVM 回归)。',
    ],
    [
      block('机制:常量池的位置与共享语义', '位置:字面量编译期入池(class 常量池);运行期 intern 动态入池——JDK7 起池在堆(GC 可回收无引用的池串)。共享:intern 后的引用=池内唯一实例(相同内容共享一份)——收益=重复率×字节数;成本=池表(hash 表)的内存+查询成本+GC 扫描。高基数的账:百万唯一订单号 intern——池增百万条+哈希表——共享收益≈0(不重复),纯增成本。'),
      block('反例:intern 的两种事故', '事故一,PermGen OOM(JDK6):百万订单号 intern——PermGen 满OOM(经典案例,JDK7 前)。事故二,堆膨胀(JDK7+):intern 的百万字符串+池表——堆内存膨胀+GC 标记面扩大——"省内存"变"费内存"(高基数下)。两条的正解:intern 只用于"确定重复率高+生命周期长"的字符串(协议常量/枚举名);业务数据(订单号/手机号)禁 intern——用结构压缩(第 32 题)或直接存储。'),
      block('取舍:intern 的合法场景', '场景:编译期字面量(自动入池,无需手动)、高度重复的运行期字符串(协议头/状态名——重复率>90%)。== 比较的诱惑:intern 后 == 比较(引用相等)——性能微优但语义危险(忘 intern 的比较错)——equals 纪律优先(第 19 题 == 红线同源)。G1 的字符串去重(-XX:+UseStringDeduplication,第 32 题)——自动去重替代手动 intern(JDK 8u20+ G1 特性)。'),
    ],
    [
      block('验证:intern 行为的断言组', '验证:共享断言(intern 后 == true——引用共享实证);高基数断言(百万唯一串 intern 的内存增长——堆/池的膨胀实测[JDK17 堆内]);版本对照(JDK7 前后行为的文档级区分——推演标注,第 49 题)——三组固化 intern 的适用边界;字符串去重(G1)的开关对照实验补充。'),
      block('追问链:intern 三刀', '一刀:"intern 的线程安全?"——池操作线程安全(全局锁/JVM 内部同步)——高并发 intern 的锁竞争(热点字符串的 intern 竞争)——性能的隐藏维度。二刀:"与字面量的关系?"——字面量自动入池(intern 等价)——"he"+v 运行时结果 intern 后==字面量(J1 实测 true)——intern 统一引用的语义。三刀:"字符串去重的演进?"——G1 去重(自动,JDK8u20+)/ZGC 无去重(JDK17)——去重特性随 GC 演进(第 49 题回归项)——手动 intern 的必要性随 GC 演进下降。'),
    ],
    ['高基数 intern 是反向优化', 'JDK7 前 PermGen OOM,7 后堆膨胀', 'intern 只给高重复低基数的串'], [api('java/lang/String')],
  ),
  'java-language/21': deep(
    'StringBuilder 与字符串拼接应该如何选择？',
    '网银日志沙盘:循环内 1000 次 s += piece(每次创建新 String——O(n²) 总)vs StringBuilder.append(O(n) 总)——编译器的优化边界:单表达式拼接(编译成 StringBuilder)会被优化,循环内的 += 不会(每次循环新 SB)。',
    [
      '编译器优化边界:单表达式 "a"+b+"c" 编译期转 StringBuilder(等价)——自动优化;循环内 s += piece——每次循环创建新 StringBuilder+新 String(O(n²) 总成本)——优化不了(循环跨迭代)。',
      '本机实测形态(理论+推演标注):千次拼接的 += vs StringBuilder——差距随字符串长度平方增长(每次 += 拷贝全部已有内容)——第 10 题distributed ArrayList 扩容的字符串版。',
      '选择纪律:单表达式拼接(编译器处理);循环内→StringBuilder(显式);常量拼接编译期折叠(J1)。JDK 9+ 的 invokedynamic 使单表达式拼接比手写 SB 更快。',
    ],
    [
      block('机制:编译期折叠与 invokedynamic', '编译期折叠:全字面量拼接("he"+"llo")编译期合并为 "hello"(常量池,J1 实验 s1==s2 true)——零运行时成本。invokedynamic(JDK 9+):单表达式拼接(a+b+c 含变量)编译为 invokedynamic+StringConcatFactory——运行期选择最优策略(MethodHandles+字节数组直构——比传统 StringBuilder 链更快)。循环 +=:编译器不跨迭代优化(每次循环独立拼接)——O(n²) 的本质。'),
      block('反例:+= 循环的三种代价', '代价一,O(n²):1000 次 +=(每次拷贝已有内容)——总拷贝量≈n²/2(千次×百字符=5 万字符拷贝——可感)。代价二,GC:每次 += 产生中间 String+StringBuilder——千次循环的千个临时对象(GC 压力)。代价三,尾延迟:大字符串(日志聚合)的 += 在尾部翻倍增长(第 10 题 distributed 扩容抖动同构)。三条的正解:循环内 StringBuilder.append(一个 SB,循环外声明)。'),
      block('取舍:SB 的容量与线程纪律', 'SB 容量:预估长度构造(new StringBuilder(256)——免扩容,第 10 题预分配同源)。SB 非线程安全:多线程共享 SB=未定义行为(单线程局部使用——SB 是局部变量,不共享)。日志的拼接:日志参数化(log.debug("x={}", x)——延迟格式化,零拼接成本,第 34 题 distributed)+条件拼接的守卫(isDebugEnabled 或参数化——第 34 题distributed 的日志纪律)。'),
    ],
    [
      block('验证:拼接姿势的断言组', '验证:折叠断言(J1 实测:字面量折叠 == true);性能对照断言(千次 += vs StringBuilder 的耗时对照——O(n²) vs O(n) 的实测);invokedynamic 断言(单表达式拼接 vs 手写 SB 的耗时——JDK 9+ 优化的实证,标注环境相关)——三组固化拼接姿势;循环内 += 的扫描器(代码评审检查点)。'),
      block('追问链:拼接三刀', '一刀:"StringJoiner?"——多元素拼接的专用(String.join/StringJoiner——分隔符语义清晰,第 41 题顺序)——join 的语义优于循环 append(可读)。二刀:"文本块?"——文本块(JSON/SQL 多行,Java 15+)——多行常量的可读性+/incident 缩进规范化——文本块与格式化(格式化占位与文本块的组合)。三刀:"格式化?"——String.format(慢但表达力强)/MessageFormat/占位符日志——format 的性能红线(热路径禁 format,参数化日志替代)——格式化的层级选择。'),
    ],
    ['单表达式让编译器优化,循环内显式 SB', 'invokedynamic 让单表达式更快', '日志参数化,热路径禁 format'], [api('java/lang/StringBuilder')],
  ),
  'java-language/22': deep(
    'Java 序列化为何不适合作为不可信输入协议？',
    '网银接口沙盘:接口接收 Java 序列化对象流——反序列化执行 readObject(可重写/触发类路径 gadget)——反序列化漏洞(经典 RCE 攻击面)。序列化的安全定位:仅限内部可信边界(内部 RPC 的遗留),不可信输入用 JSON/proto+校验。',
    [
      '漏洞的本质:readObject 在反序列化时执行代码(ObjectInputStream 的 gadget 链:类路径上任何可利用类的 readObject/readResolve)——攻击者构造序列化流触发 gadget(无需源码漏洞,类路径即攻击面)。',
      'JDK 的防御演进:反序列化过滤器(ObjectInputFilter,JEP 290[9]/283[18]——白名单类+深度/引用限制)——过滤器是缓解不是根治(白名单维护负担)。ysoserial 的攻击面:gadget 链库(攻击者的武器化)——序列化的攻击面是"类路径即攻击面"。',
      '正解:不可信输入用数据格式(JSON/proto——无代码执行语义)+schema 校验(第 25 题);Java 序列化仅限内部可信边界(遗留内部协议)+过滤器+尽快迁移(第 14 题契约演进)。',
    ],
    [
      block('机制:gadget 链与过滤器', 'gadget 链:类路径上的一组类(其 readObject/readResolve/等回调可被串成任意代码执行)——攻击者无需目标代码漏洞,组合 JDK/库的类即可(ObjectInputStream 的反序列化=调用 readObject=潜在代码执行)。过滤器:ObjectInputFilter(白名单类模式/深度限制/引用数限制)——JEP 290(9)的缓解;配置的粒度(全局/流级)与维护成本(新增类要更新白名单)。'),
      block('反例:序列化的三种事故', '事故一,回调接口收序列化:渠道回调收 Java 序列化流(历史遗留)——反序列化 RCE(经典攻击)。事故二,缓存序列化:Redis 存 Java 序列化对象(JdkSerializer)——缓存数据被篡改(攻击面进缓存)。事故三,gadget 依赖:引入带 gadget 的库(commons-collections 旧版)——攻击面扩大(供应链,第 33 题)。三条的正解:不可信输入换数据格式+过滤兜底+依赖治理。'),
      block('取舍:序列化的替代与迁移', '替代:JSON(Jackson——校验+schema)+proto(二进制+schema 强制)——数据格式的选择(第 14 题)。迁移路径:内部序列化协议的双格式过渡(新格式并存+旧格式 deprecated,第 41 题);过滤器先行(立即缓解)+格式迁移(根治)。序列化的遗留价值:内部 RPC 的性能(Java 原生)与复杂对象图——遗留兼容的短期合理性+长期迁移的必然性。'),
    ],
    [
      block('验证:防御的断言组', '验证:过滤器断言(非白名单类的反序列化被拒——ObjectInputFilter 实测);gadget 演练断言(ysoserial 类 payload 被过滤器拦截——攻击面验证);扫描断言(代码中 ObjectInputStream 的使用清单——全部标注可信边界)——三组让序列化防御可验证;ObjectInputStream 的引入审批(第 33 题供应链纪律)'),
      block('追问链:序列化安全三刀', '一刀:"record 的序列化?"——record 反序列化走构造器(校验不可绕过,spring-advanced 9 题)——record 是序列化安全的结构改善。二刀:"Kryo/其他库?"——Kryo/Hessian 同有反序列化风险(各自的类注册机制缓解)——任何"反序列化执行代码"的格式都有攻击面——数据格式(JSON/proto)无执行语义是根本解。三刀:"序列化的密钥?"——序列化流的加密(传输保护)不影响反序列化漏洞(解密后仍执行)——加密≠安全(混淆了传输保护与输入安全)。'),
    ],
    ['类路径即攻击面,过滤是缓解', '不可信输入换数据格式', 'record 反序列化走构造器'], [api('java/io/ObjectInputStream')],
  ),
  'java-language/23': deep(
    '如何安全地实现枚举或静态持有者单例？',
    '网银配置沙盘:单例的序列化破坏(反序列化新实例)与反射破坏(Constructor.setAccessible)——枚举单例(JVM 保证唯一)与静态持有者(类加载线程安全)是两种安全实现——双重检查锁的 volatility 纪律(手写 DCL 的最后场景)。',
    [
      '单例的三种安全实现:枚举(天然防反射+防序列化——首推)、静态持有者(类加载线程安全+懒加载)、双检锁(DCL:volatile+两次判空——手写正确形态)。',
      '单例的破坏面:反射(setAccessible 调私有构造——防:构造器二次检查[已存在抛异常])、序列化(readObject 返回新实例——防:readResolve 返回单例/枚举天然防)、克隆(不实现 Cloneable)。',
      '单例的代价与替代:全局可变状态(第 47 题)、测试困难(状态隔离)、依赖隐藏——单例的替代=DI 容器的单例 bean(可控生命周期+可 mock,spring-advanced 38 题)——单例模式的现代形态是容器单例。',
    ],
    [
      block('机制:枚举单例与 DCL 的 volatile', '枚举单例:INSTANCE——反射 setAccessible 构造枚举抛 IllegalArgumentException(JVM 禁)+序列化 readObject 特殊处理(枚举不建新实例)——语言级唯一性保证。DCL 的 volatile:实例字段 volatile(禁止"分配+构造"与"赋值"的重排——半初始化发布,第 8 题spring DCL)——无 volatile 的 DCL 在重排下发布半初始化对象;重排为何非法、happens-before 完整规则清单与内存屏障对应,见并发基础第 2 题。静态持有者:内部静态类在"首次引用"时类加载(JVM 初始化锁保证线程安全)——懒加载+零锁(类加载锁替代 DCL)。'),
      block('反例:单例的三种事故', '事故一,反射破坏:攻击/误用 setAccessible 调私有构造——第二个实例(状态分叉)。事故二,序列化破坏:单例序列化往返产生新实例(单例失效)。事故三,DCL 无 volatile:半初始化对象发布(另一线程拿到"构造到一半"的对象——字段默认值)——最难排查的并发 bug(第 8 题 spring)。三条的正解:枚举/静态持有者(语言机制)+DCL 必须 volatile+反射防护(构造器守卫)。'),
      block('取舍:单例 vs DI 容器单例', '手写单例:无依赖(容器外场景)/状态全局(测试难)/破坏面(反射序列化)。容器单例(spring @Component):生命周期管理/依赖注入(可测试)/作用域可控——业务单例的现代形态。手写单例的残余地:工具类(无状态——其实不需要单例,静态方法即可)/JVM 级(与容器无关的基础设施)——业务代码的单例交给容器。'),
    ],
    [
      block('验证:单例安全的断言组', '验证:枚举反射断言(setAccessible 调枚举构造抛 IllegalArgumentException);DCL 断言(volatile 的 DCL 正确性[JMH/压力下的实例唯一];无 volatile 的风险标注推演[难以稳定复现,第 8 题 spring]);序列化断言(枚举序列化往返实例不变)——三组固化单例安全;反射防护的守卫用例(构造器二次检查)进模板。'),
      block('追问链:单例三刀', '一刀:"单例的测试?"——单例的状态隔离(测试间重置[reset 方法——污染单例纯粹性])vs DI 注入 mock(测试友好)——单例的测试困难是 DI 的最强理由。二刀:"静态持有者的类加载?"——Holder 类的初始化时机(首次引用 Holder 类时——JVM 类加载锁)——类加载失败的传播(Holder 初始化异常=NoClassDefFoundError 后续引用全挂)。三刀:"枚举单例的字段?"——枚举的实例字段与方法(枚举即类)——枚举单例可以有状态与方法(不只是常量)——枚举的能力被低估。'),
    ],
    ['枚举防反射防序列化,语言级唯一', 'DCL 必须 volatile', '业务单例交容器,手写只留基础设施'], [api('java/lang/Enum')],
  ),
  'java-language/24': deep(
    '深拷贝与浅拷贝在 DTO 隔离中如何选择？',
    '网银 DTO 沙盘:接口返回内部 DTO(浅引用——外部改字段影响内部状态);DTO 含 List 字段(浅拷贝的 List 引用共享)——隔离的选择:浅拷贝(结构拷贝,元素共享)+元素不可变(record)=完整隔离且零深拷贝成本(第 43 题collections 的防御三姿势)。',
    [
      '浅拷贝:复制对象本身(字段引用共享)——内部可变对象仍共享(修改穿透);深拷贝:递归复制全部(全隔离,成本高)。判据=元素的可变性与共享需求。',
      '组合拳:浅拷贝+元素 record(不可变)=完整隔离零深拷贝(第 43 题:record 让隔离免费)——DTO 用 record(不可变)后,"拷贝"只需浅层(结构不变,元素不可变)。',
      '拷贝的实现:手写构造器拷贝/序列化往返(慢+安全面,第 22 题)/框架(MapStruct——编译期生成,零反射)/record 重建(new WithX)——实现的层次选择。',
    ],
    [
      block('机制:浅深拷贝与元素可变性', '浅拷贝:new DTO(dto.a, dto.b)(字段引用复制)——DTO 的可变字段(List/bean)共享(修改穿透);深拷贝:递归复制(每字段 new/clone)——完全独立(成本随深度)。元素 record:DTO 的字段用 record(不可变)——浅拷贝后的元素不可改(隔离完整)——"元素不可变化"把深拷贝的需求消掉。序列化往返:深拷贝的实现(但性能差+安全面,第 22 题——不用)。'),
      block('反例:浅拷贝的两种穿透', '穿透一,List 字段:浅拷贝 DTO 的 items 列表——外部对副本 add 影响(引用共享)——第 13 题collections unmodifiable 的同题(引用逃逸)。穿透二,bean 字段:浅拷贝的内嵌 bean(地址对象)——外部改地址字段穿透到原 DTO。两条的正解:元素 record 化(record 的字段也 record——递归不可变)+List.copyOf(构造时防御)。'),
      block('取舍:DTO 的不可变化策略', '策略:DTO 全 record 化(不可变 DTO——接口响应的值语义,第 14 题)——修改=重建(new record 或 builder,第 8 题)——DTO 的生命周期短(请求内)重建成本可接受。可变 DTO 的残余地:表单绑定(前端表单的逐步填充——可变是自然的)/JPA 实体(第 8 题JPA 冲突)——可变的合理边界。防御的进与出:接口出参(record 快照)+入参(拷贝进内部模型)——两侧的隔离。'),
    ],
    [
      block('验证:隔离的断言组', '验证:浅穿透断言(浅拷贝的可变元素修改穿透——实证);record 隔离断言(record DTO 的浅拷贝,元素修改不穿透[元素不可变]——隔离免费实证);往返断言(序列化往返的隔离[对比手写拷贝的正确性])——三组固化隔离选择;深拷贝的必要性评估用例(可变元素的真实需求)进评审。'),
      block('追问链:拷贝三刀', '一刀:"clone 的地位?"——clone 的设计缺陷(不做构造器校验/浅拷贝默认/Cloneable 空接口)——Effective Java:"优先拷贝构造器/工厂"——clone 禁用进规范。二刀:"MapStruct 的角色?"——编译期生成拷贝(零反射+可审计生成代码)——手写拷贝的样板代码消除(第 43 题)——框架的引入判据(第 17 题)。三刀:"不可变 DTO 与修改?"——DTO 的字段修改需求(编辑表单回显)——回显用查询(重读),修改用命令(提交后重读)——DTO 不可变化与 CQRS(第 11 题)的同构。'),
    ],
    ['浅拷贝加不可变元素,隔离免费', 'clone 禁用,record 优先', 'DTO record 化,修改即重建'], [pod],
  ),
  'java-language/25': deep(
    'Java 的值传递为什么仍能修改对象内容？',
    '网银沙盘:method(account) 里 account.setBalance(0) 影响调用方(引用的值被复制——引用指向同一对象)——"Java 只有值传递"的准确表述:值=引用的拷贝(对象字段可改);而 method(account = new Account()) 不影响调用方(引用变量本身是副本)。',
    [
      '值的本质:Java 传参=实参的值拷贝——基本类型拷贝值,对象拷贝引用——引用的拷贝指向同一对象(内容修改可见);引用变量本身是副本(重新赋值不影响调用方)。',
      '两种效果的解释:account.setBalance(0) 可见(同一对象);account = new Account() 不可见(副本引用被重新指向)——"Java 只有值传递"的准确理解:传的是"引用的值"。',
      '陷阱:方法内重赋值参数的"以为生效"(参数副本重指向——调用方不变);集合参数的 clear()(清空调用方的集合——引用语义的破坏性方法,防御性拷贝,第 43 题collections)。',
    ],
    [
      block('机制:值传递与引用语义', '栈与堆:参数在栈帧(副本);对象在堆——副本引用与原引用指向同一堆对象——堆内容的修改共享(引用语义);栈变量的重赋值只改副本(值语义)。字符串的特殊:String 不可变(重赋值=新对象;修改"内容"不可能——不可变,第 8 题)——不可变类型的值传递无副作用(纯)。'),
      block('反例:值传递误解的两种事故', '事故一,参数重赋值的幻觉:方法内 param = new ArrayList()(以为清空了调用方)——调用方列表原样(引用副本被覆盖)——"重置参数"的意图落空。事故二,破坏性方法:process(list) 内 list.clear()(清空调用方数据)——调用方的数据被破坏(防御性拷贝缺失,第 43 题)。两条的正解:参数重赋值无意义(局部变量——编译器可警告[参数 final 化]);破坏性方法的入参拷贝或文档声明(契约)。'),
      block('取舍:参数传递的设计纪律', '纪律一,参数 final 化(可选[明确"参数不改指"]——不是强防但表意);纪律二,破坏性方法的显式契约(方法名/文档声明"会修改传入集合"——或返回新集合[不可变思想,第 8 题]);纪律三,返回新集合优于修改入参(调用方决定弃留——函数式倾向,第 15 题纯 lambda)。设计的一致性:同一 API 的参数语义统一(都修改或都不改)——不一致的参数语义是调用方事故的温床。'),
    ],
    [
      block('验证:值传递的断言组', '验证:内容修改可见断言(setBalance 后调用方余额变化——引用语义实证);重赋值不可见断言(参数 new 后调用方不变——副本实证);String 断言(String 参数的修改不可行[不可变]——返回新串)——三组固化值传递语义;参数 final 的团队纪律进评审清单(第 24 题)。'),
      block('追问链:值传递三刀', '一刀:"与 C/C++ 指针的对照?"——Java 的引用≈受限指针(不能算术/不能取地址)——值传递=C 按指针值传参(同语义)——"Java 无指针"的表述误导(引用即安全指针)。二刀:"逃逸分析?"——参数对象的逃逸分析(对象可能栈分配——不逃逸时,第 26 题 distributed 反射的开销同域的 JIT 分析)——值传递的成本在 JIT 下可优化。三刀:"不可变参数的流行?"——record 参数(不可变——方法内无法破坏)——不可变参数消除"参数副作用"的设计纪律(第 8 题)。'),
    ],
    ['引用的值被拷贝,对象内容共享', '重赋值参数是幻觉', '破坏性方法显式契约或返回新集合'], [pod],
  ),
  'java-language/26': deep(
    '反射调用比直接调用慢的原因有哪些？',
    '网银框架沙盘:反射调用比直接调用慢(10-100 倍量级,随版本与 inflation 优化浮动)——原因链:方法查找(解析)/参数装箱(Object[])/安全检查/无法内联——框架的应对:缓存 Method、inflation(JIT 化)、MethodHandle/LambdaMetafactory 替代。',
    [
      '慢的四个原因:方法查找(getMethod 需缓存)、参数装箱(Object[]+varargs 分配)、访问检查(setAccessible+模块)、无法内联(JIT 受限——inflation 机制)。',
      '优化的阶梯:缓存 Method(getMethod 一次,Method.invoke 复用)→setAccessible(true)(跳过访问检查)→MethodHandle(比反射快的现代形态,第 27 题)→LambdaMetafactory(生成调用类——接近直接调用的性能,第 18 题 lambda 机制)。',
      '本机量级(推演标注:本机未做精确基准,引用社区普遍数据+第 27 题 MethodHandle 选型):直接调用 1ns 量级(A1)、反射 10-100ns 量级(inflation 后)、MethodHandle 接近直接调用——框架的性能设计(反射在冷路径/热路径用 MH)。',
    ],
    [
      block('机制:inflation 与 MethodHandle', 'inflation:反射调用前 15 次(JDK 的 inflation 阈值)走 Native 实现;15 次后生成字节码 stub(JIT 化的 MethodAccessor)——反射的"先慢后快"(inflation 的名字由来)——JDK 18 起改为 MethodHandle 统一(旧机制废弃)。MethodHandle:type-safe 的方法句柄(编译期可验证签名+JIT 可内联 invokeExact)——比反射快(接近直接调用)。LambdaMetafactory:接口的运行时实现(Proxy 的现代替代——性能接近手写类,spring-advanced 32 题的动态代理替代)。'),
      block('反例:反射滥用的两种事故', '事故一,热路径反射:高频接口的每请求反射调用(未缓存 Method+未 inflation)——10-100 倍的调用开销(接口 P99)。事故二,反射绕类型:反射绕过编译期检查(类型错误运行期才爆,第 4 题泛型擦除的反射形态)——类型安全的流失。两条的正解:热路径缓存+MH/生成类替代;反射只留冷路径(配置加载/工具,第 39 题)。'),
      block('取舍:反射的合法场景与替代', '合法场景:框架的装配(容器/SPI——冷路径一次)、跨模块的解耦(运行期发现)、注解处理(第 28 题)。替代阶梯:直接调用(编译期)→MethodHandle(运行期+类型安全+快)→LambdaMetafactory(生成实现)→反射(最慢最灵活)——按调用频率选。反射的参数纪律:可变参数的打包(Object[] 分配)、基本类型的装箱(第 19 题)——反射的参数传递是第二重的开销。'),
    ],
    [
      block('验证:反射开销的断言组', '验证:开销对照断言(直接调用 vs 反射 vs MethodHandle 的耗时对照——本机微基准[JMH 或简化循环+预热,第 50 题distributed 基准纪律]);缓存收益断言(getMethod 缓存 vs 每次查找);inflation 断言(反射调用的前 15 次与后续的耗时差)——三组量化反射开销;基准报告的口径(第 50 题)标注环境。'),
      block('追问链:反射三刀', '一刀:"setAccessible 的模块化?"——JDK 17 的模块封闭(java.base 不 opens——本机 --add-opens 的实验经历)——模块化对反射的限制(第 4 题)——--add-opens 的依赖治理(哪些模块需要 opens——清单化)。二刀:"注解的反射?"——注解保留策略(第 28 题:RUNTIME 才可反射读)——注解+反射的框架形态(第 29 题 SPI)。三刀:"反射与安全?"——setAccessible 绕访问控制(私有方法调用)——安全敏感模块的反射防护(模块封闭+安全管理器的弱化[deprecated])——反射的安全边界随模块化收紧。'),
    ],
    ['四重开销:查找装箱检查不内联', 'inflation 先慢后快,18 起 MH 统一', '热路径缓存加 MH,反射留冷路径'], [api('java/lang/reflect/Method')],
  ),
  'java-language/27': deep(
    'MethodHandle 与反射应如何进行技术选型？',
    '网银框架沙盘:动态调用选 MethodHandle 还是反射——MH:类型安全(签名编译期可验)+性能(接近直接调用,JIT 可内联)+不可访问私有(需 lookup 权限);反射:灵活(运行期发现)+慢+可访问私有(setAccessible)——按调用频率与访问需求选。',
    [
      'MH 的能力:MethodHandle(方法句柄——可验证签名的调用)+Lookup(句柄工厂——访问权限按查找方)+invokeExact(精确签名调用——JIT 友好)+参数自适应(invoke 通用形态+asType 适配)。',
      '反射 vs MH 的对照:反射(字符串方法名+Object[] 参数——灵活但装箱/查找开销,第 26 题);MH(方法类型+句柄——类型安全+性能);LambdaMetafactory(生成接口实现——最高性能,第 18 题机制)。',
      '选型阶梯:直接调用→LambdaMetafactory(接口形态的动态实现)→MethodHandle(非接口形态的动态调用+类型安全)→反射(运行期发现/私有访问/极端灵活)——按调用频率与灵活性需求选(第 26 题)。',
    ],
    [
      block('机制:Lookup 与访问权限', 'Lookup:MethodHandles.Lookup(工厂——权限=查找方的访问能力)——privateLookupIn(模块系统的跨模块私有访问——需目标模块 opens,第 26 题反射的模块化限制);Lookup 的能力降级(dropLookupMode)——权限的最小化原则(第 33 题)。invokeExact:签名严格匹配(不匹配 WrongMethodTypeException)——类型安全的强制;invoke(通用——asType 自适应,性能略降)。'),
      block('反例:选型的两种错位', '错位一,热路径用反射:高频调用的框架反射(第 26 题事故)——MH/生成类替代(性能 10 倍)。错位二,MH 的灵活性误用:需要"运行期按字符串发现方法"(反射的合法场景)用 MH(MH 需要预知签名——发现能力弱于反射)——灵活性与性能的反比关系(MH 中间态)。两条的正解:调用频率(热→MH/生成)+访问需求(私有→反射[或 opens+MH])+发现需求(运行期字符串发现→反射)。'),
      block('取舍:MH 的工程成本', '成本:API 学习曲线(MethodType/Lookup/适配)、调试的复杂度(句柄链的栈)、JDK 版本的 API 演进(VarHandle[字段]/MH 的 Java 9+ 语义)。收益:性能(接近直接调用)+类型安全(签名验证)+VarHandle(字段的原子操作[volatile/CAS 的现代形态——替代 Unsafe])。VarHandle 的独立价值:字段的 volatile/CAS 操作(Unsafe 的安全替代——并发工具的实现底座,第 19 题 AtomicLong 的底层)。'),
    ],
    [
      block('验证:选型的断言组', '验证:性能断言(直接/反射/MH/Lambda 的调用耗时对照——本机微基准,第 50 题distributed 纪律);类型安全断言(MH 的签名不匹配异常——invokeExact 的严格性实证);访问断言(privateLookupIn 的模块权限行为)——三组固化选型阶梯;MH 与反射的选择树进框架设计指南。'),
      block('追问链:MH 三刀', '一刀:"VarHandle 与 Unsafe?"——VarHandle(Java 9+,字段的内存语义操作[volatile/getAndSet/CAS])——替代 Unsafe(安全+可维护);Unsafe 的残留(高性能场景的绕过——deprecated 趋势,第 44 题)。二刀:"LambdaMetafactory 的场景?"——动态接口实现(每次生成的开销 vs 预生成缓存,第 18 题lambda 机制)——生成类的高性能与不可 introspect(调试图难)。三刀:"invokeExact 的严格?"——签名不匹配即异常(无自动适配)——invokeExact 的严格性=性能的前提(类型在编译期确定);invoke(适配)的代价(每次 asType)。'),
    ],
    ['按频率选:MH 生成类优于反射', 'invokeExact 严格,invoke 适配', 'VarHandle 替代 Unsafe'], [api('java/lang/invoke/MethodHandles')],
  ),
  'java-language/28': deep(
    '注解保留策略如何影响框架运行？',
    '网银框架沙盘:自定义注解 RetentionPolicy.CLASS(编译进 class 但运行期反射读不到)——框架的注解扫描(反射)读不到——SOURCE/CLASS/RUNTIME 三级保留与框架的读取时机(编译期注解处理器/运行期反射)。',
    [
      '三级保留:SOURCE(仅源码,编译丢弃——@Override/编译期检查)、CLASS(编译进 class 文件,运行期 classpath 不可反射读——字节码工具[ASM]可读——编译期注解处理器[APT]的输出)、RUNTIME(运行期反射可读——Spring 的 @Component/@Autowired)。',
      '框架的读取时机:编译期(注解处理器 APT:生成代码/校验——Lombok/MapStruct)、字节码期(ASM/Javassist 修改字节码——AOP 的织入)、运行期(反射读取——Spring 的扫描)——保留策略必须匹配读取时机。',
      '与模块化的交互:RUNTIME 注解的反射读取(第 26 题)--add-opens 的模块边界——注解扫描的模块依赖清单(第 33 题供应链)。',
    ],
    [
      block('机制:三级保留与读取时机', 'SOURCE:@Override(编译器检查覆写——丢弃,运行期不存在)。CLASS:APT 的产物标记(编译期处理器生成代码的输入/输出标记——运行期反射读不到)——Lombok 的 @Getter(SOURCE——编译期改 AST)。RUNTIME:反射读取(@Retention(RUNTIME)——Spring 扫描 @Component/@Transactional)——运行期框架的生命线。错配事故:运行期反射读 CLASS 注解=读不到(框架失效,静默——第 49 题文档背离的注解版)。'),
      block('反例:保留策略错配的事故', '事故一,RUNTIME 写成 CLASS:自定义 @Audit 注解保留 CLASS——AOP 的反射扫描读不到——审计静默失效(第 32 题)。事故二,APT 与 RUNTIME 混淆:编译期生成代码的场景用 RUNTIME(运行期反射读——多此一举的性能成本)。事故三,元注解的保留:@Inherited(注解的类继承传递)与 @Target(适用位置)的遗漏——注解的作用范围错误。三条的正解:保留策略=读取时机(编译期 SOURCE/CLASS、运行期 RUNTIME)——注解设计的第一决策。'),
      block('取舍:注解 vs 显式配置', '注解的便利:声明式(贴注解即生效)+零配置。注解的代价:隐式性(行为藏注解里,阅读代码看不见)、侵入(注解依赖进业务代码)。取舍:横切基础设施(事务/缓存——注解)+业务规则(显式代码)——注解的滥用(业务逻辑藏注解参数)反模式(第 24 题分布式)。替代形态:显式配置(Java Config/DSL——第 32 题分布式)——注解与配置的分工(声明式基础设施 vs 显式业务)。'),
    ],
    [
      block('验证:保留策略的断言组', '验证:保留断言(三级注解的反射可达性:SOURCE/CLASS 反射 null,RUNTIME 可读——三级对照实证);APT 断言(注解处理器的生成产物存在[编译期]——编译日志);框架失效复现(CLASS 保留的 @Audit 反射扫描读不到——静默失效实证)——三组固化保留策略;注解清单(每注解的保留策略与读取方)进框架文档(第 49 题)。'),
      block('追问链:注解三刀', '一刀:"注解的继承?"——@Inherited(类级注解的子类继承——接口不继承)+元注解的组合——注解的继承边界(方法级注解不继承——覆写方法的注解要重标)。二刀:"repeatable?"——@Repeatable(同位置多注解——Java 8+)——多实例注解(多个规则标签)——重复注解的容器注解机制。三刀:"注解与密封?"——sealed 类的注解继承(sealed 的许可子类与注解扫描的配合,第 7 题)——注解扫描与模块系统的协同(第 26 题)。'),
    ],
    ['保留策略=读取时机,错配即静默失效', 'RUNTIME 才能反射读', '注解管横切,业务规则显式'], [api('java/lang/annotation/RetentionPolicy')],
  ),
  'java-language/29': deep(
    'SPI 与依赖注入容器各自解决什么问题？',
    '网银插件沙盘:渠道接入的扩展——SPI(ServiceLoader:运行期发现实现,零容器依赖)与 DI 容器(Spring:依赖装配+生命周期+AOP)——SPI 解决"发现",DI 解决"装配"——互补不竞争(spring-advanced 29 题SPI 的深入版)。',
    [
      'SPI 的机制:META-INF/services 文件声明实现→ServiceLoader.load(接口).iterator() 运行期发现——零依赖(无容器)、懒加载(iterator 惰性)、模块化友好(ServiceLoader 与模块系统,第 26 题)。',
      'DI 容器的机制:依赖装配(bean 之间的注入关系)、生命周期(创建/销毁/作用域)、AOP(代理增强)——容器解决"组装与治理"。SPI 解决"发现"(有哪些实现、运行期发现)——DI 解决"装配"(实现之间的依赖关系)。',
      '配合形态:SPI 发现实现→实现的依赖由容器装配(SPI 发现的 bean 交给 Spring 管——Spring Boot 的自动配置即此形态,第 33 题)——发现与装配的组合。',
    ],
    [
      block('机制:SPI 的流程与边界', '流程:接口定义(SDK)→第三方实现+META-INF/services 声明→ServiceLoader 发现→遍历使用。边界:SPI 无依赖注入(实现的依赖要自己解决——构造参数无容器装配)、无生命周期(创建与销毁自己管)、无 AOP(增强自己包)。Spring Boot 的自动配置=SPI 思想的容器化(spring.factories/AutoConfiguration.imports——发现+容器装配的组合,第 33 题)。'),
      block('反例:SPI 与 DI 错位的两种代价', '错位一,DI 场景用 SPI:复杂依赖的实现用 ServiceLoader(实现的依赖自己 new——依赖地狱手工版,第 29 题)。错位二,插件依赖容器:第三方插件强制依赖 Spring(插件不可用于非 Spring 宿主)——SPI 的零依赖价值丢失(插件的用户面收窄)。两条的正解:零依赖插件(库/SDK)用 SPI;宿主内组件(服务)用 DI——扩展点的归属判据(第 43 题分布式:库 vs 服务同构)。'),
      block('取舍:SPI 的演进与替代', 'SPI 的演进:META-INF/services(经典)→ServiceLoader 的模块化(ServiceLoader 与 module-info 的 provides/uses——模块化的 SPI)→注解发现(@AutoService[Google——编译期生成 services 文件])。替代形态:OSGi(重,服务注册中心——金融少用)、Spring 的条件装配(第 33 题)——SPI 的轻量与 OSIG 的重量的取舍(引入成本,第 17 题)。'),
    ],
    [
      block('验证:SPI 机制的断言组', '验证:发现断言(Services 文件声明后 ServiceLoader 发现全部实现);懒加载断言(iterator 惰性——未遍历不实例化);模块化断言(module-info 的 provides/uses 的发现)——三组固化 SPI;SPI 与 DI 的组合用例(SPI 发现的实现交容器装配)进框架指南。'),
      block('追问链:SPI 三刀', '一刀:"SPI 的失败隔离?"——一个实现的构造失败影响整个 ServiceLoader 迭代(ServiceConfigurationError)——实现的构造健壮性(防御)+迭代的 try-catch(跳过失败的实现)。二刀:"SPI 的排序?"——实现的顺序(文件内的声明序——优先级机制[顺序+优先级字段]自定义)——发现的排序协议。三刀:"SPI 的测试?"——SPI 发现的测试(services 文件的正确性——文件名/格式/类的存在)——文件格式的 typo 是 SPI 的常见故障(测试覆盖)。'),
    ],
    ['SPI 管发现,DI 管装配', '零依赖插件走 SPI,宿主组件走 DI', '失败隔离与排序要自定义协议'], [api('java/util/ServiceLoader')],
  ),
  'java-language/30': deep(
    '如何判断一个 API 改动是否保持二进制兼容？',
    '网银 SDK 沙盘:SDK 升级后宿主 NoClassDefFoundError/NoSuchMethodError(二进制不兼容)——二进制兼容=旧编译产物(字节码引用)在新版本下可链接——源兼容(源码可编译)与二进制兼容(字节码可链接)是两个维度。',
    [
      '兼容矩阵:加方法(二进制兼容+源兼容)、删方法(两者都不兼容)、改方法签名(不兼容——签名即方法标识)、改返回类型协变(兼容[桥方法,第 4 题])、加字段/改字段类型(字段按类型+名解析——改类型不兼容)。',
      '反直觉的不兼容:改 checked 异常列表(二进制兼容——异常表不在调用方字节码;源不兼容[调用方 catch 需改])、final 化方法/类(源兼容+二进制兼容——但语义变化[override 被拒])、static 化实例方法(不兼容——invokevirtual 改 invokestatic)。',
      '工具与流程:二进制兼容检查(japi-compat/JDK 的 jdeps)、语义化版本(破坏性变更=大版本,第 41 题)、消费者测试(第 14 题契约测试的编译产物形态)。',
    ],
    [
      block('机制:链接的解析规则', '字节码引用:方法引用=类+方法名+描述符(参数与返回类型)——任一变化=新符号(旧引用 NoSuchMethodError)。字段引用=类+字段名+描述符。链接的时机:首次使用时解析(懒)——不兼容的爆炸点=首次调用(运行期,构建期不暴露——jdeps/japi 前移)。协变返回:桥方法让协变返回二进制兼容(编译器生成桥,第 4 题)。'),
      block('反例:不兼容变更的三种事故', '事故一,删方法:SDK 删 deprecated 方法(以为没人用)——宿主 NoClassDefFoundError(使用量未归零,第 41 题)。事故二,改签名:重命名参数不影响二进制(参数名不在描述符)但改类型炸——签名变更的敏感性。事故三,接口加抽象方法:实现类全炸(未实现)——接口的破坏性变更=默认方法替代(第 7 题)。三条的正解:兼容矩阵进变更评审(第 50 题)+工具检测(japi)+废弃流程(两段式,第 41 题)。'),
      block('取舍:兼容检测的工具链', '工具:japi-compat(clirr 思想:两个 jar 的 API diff)、jdeps(依赖分析)、Revapi(规则化检测)。流程:CI 的兼容门禁(破坏性 PR 拦截)+版本策略(语义化)+消费者测试(第 14 题)。成本:检测工具的配置(规则库)与维护——按 SDK 的用户面(第 43 题)决定检测深度。'),
    ],
    [
      block('验证:兼容矩阵的断言组', '验证:兼容断言(加方法的二进制兼容[旧字节码在新 SDK 上链接成功]——编译产物跨版本测试);不兼容断言(删方法的 NoSuchMethodError 复现);桥方法断言(协变返回的桥方法[注:本机 javap 可验,标注])——三组固化兼容矩阵;兼容检测进 SDK 的 CI(第 33 题供应链)。'),
      block('追问链:兼容三刀', '一刀:"默认方法的兼容?"——接口加默认方法=二进制兼容+源兼容(实现类无需改,第 7 题)——默认方法的兼容红利。二刀:"sealed 的兼容?"——sealed 化(限制继承)=源兼容(实现类加 extends/permits)二进制兼容(链接不变)但语义收紧——兼容≠无影响(语义的兼容矩阵,第 14 题契约)。三刀:"反射的兼容?"——反射 API(方法名/字段名)的兼容=符号兼容(同上)+注解保留策略(第 28 题)——反射用户的兼容面更广(名字即契约)。'),
    ],
    ['链接符号=类加名加描述符', '协变返回桥方法兼容', '兼容矩阵进 CI,破坏性拦截'], [api('java/lang/Class')],
  ),


  'java-language/31': deep(
    '为什么可变对象不适合直接作为缓存键？',
    '网银缓存沙盘:缓存键用可变的配置对象——放入后修改键字段,再 get 拿不到(哈希变了桶也变)——collections C1 实测:可变 key 修改后 get=null、containsKey=false。不可变键的设计纪律。',
    [
      '可变键的失效:put 时 hashCode=X→桶 A;修改键字段→hashCode=Y→get 按 Y 找桶 B——桶 A 的条目"丢失"(实测 get=null、containsKey=false)。',
      '不可变键的设计:键类 final+字段 final+equals/hashCode 仅用不可变字段(record 天然满足)——键的状态永不变化,容器行为确定。',
      '与 collections 8 题的衔接:equals/hashCode 契约违约的容器行为(消失/重复)在可变键上的放大——可变性使违约不可控(不可控时机=任意时刻)。',
    ],
    [
      block('机制:哈希桶与可变键的失效链', '失效链:put(hash=X,桶 A)→键字段修改→hash=Y→get 按 Y 找桶 B→桶 A 的条目不在 B(丢失)。containsKey 同理 false——键"消失"但不释放内存(条目还在桶 A,不可达)。第 2 题 distributed 的 HashMap 并发丢数据是并发版的丢失;可变键是单线程版的丢失——两者都破坏"键能找到"的预期。'),
      block('反例:可变键的三种事故', '事故一,缓存丢失:可变配置对象做键,配置更新后缓存全部 miss——缓存失效风暴(回源打满,第 15 题)。事故二,Set 重复:可变键修改后重新 add——原条目不删、新条目加入(Set 出现"重复")。事故三,弱一致键:WeakHashMap 的可变键——GC 判断与 hash 判断的不一致(清理时机不可控)。三条的正解:键类 record 化+不可变字段+不可变集合封装(List.copyOf,第 8 题)。'),
      block('取舍:可变键的防御性方案', '防御:键的快照化(put 前拷贝键的不可变快照——record 键)——快照的 hash 永不变;或键的类型约束(接口声明不可变契约——调用方承诺)。防御的层次:类型系统(record 编译期保证)>文档(注释"键不可变")>运行时检查(修改时抛异常)——前移到编译期最优(第 25 题)。'),
    ],
    [
      block('验证:可变键的断言组', '验证:丢失断言(可变键修改后 get=null、containsKey=false——collections C1 实测);record 断言(record 键修改=新对象,原键不受影响);快照防御断言(put 前拷贝键快照,后续修改不影响缓存)——三组固化不可变键的必要性。'),
      block('追问链:可变键三刀', '一刀:"String 键安全吗?"——String 不可变(final char[]→byte[]+无修改方法)——String 键是安全的(缓存 key 最常用)——不可变的天然键类。二刀:"record 键的 equals?"——record 的 equals/hashCode 自动(全组件)——组件不可变→键安全;组件可变→键不安全(record 的浅不可变边界,第 9 题)。三刀:"键的可变字段?"——键类的不可变字段+可变字段共存——equals/hashCode 只用不可变字段(显式控制)——但键的"业务相等"可能与可变字段有关——设计矛盾要显式决策。'),
    ],
    ['键改哈希变,条目就丢失', 'record 键天然不可变', 'String 是安全的键'], [api('java/util/HashMap')],
  ),
  'java-language/32': deep(
    '如何设计包含敏感字段的 toString 和日志输出？',
    '网银账户沙盘:Account 的 toString 包含完整卡号/CVN——日志泄露(第 44 题distributed 敏感字段的日志纪律)。脱敏设计:toString 显式排除敏感字段/掩码格式化/日志框架的脱敏转换器。',
    [
      'toString 的泄露面:默认 toString(IDE 生成)包含全部字段——卡号/CVN/密码/身份证全打;日志的传播面:日志被采集/搜索/导出(泄露面比堆大,第 31 题 distributed 数据边界)。',
      '脱敏设计:toString 手写(只含非敏感字段)、掩码格式化(卡号前 4 后 4 中间星号)、日志框架脱敏(logback 的转换器/PatternLayout 替换)、结构性方案(敏感字段用 SensitiveString 类型——toString 自动掩码,第 25 题类型边界)。',
      '与第 44 题distributed 的衔接:错误响应(对外)与日志(对内)是两个视图——toString 服务日志视图;错误响应的敏感过滤是另一道防线(独立设计)。',
    ],
    [
      block('机制:脱敏的层次与工具', '层一,toString 设计:手写排除敏感字段(或只含 ID——不含值)。层二,掩码工具:MaskUtil.mask(cardNo, 4, 4)(前 4 后 4 星号中间)——统一掩码逻辑(第 47 题)。层三,日志框架:logback 的 MessageConverter(正则替换敏感模式)/自定义 Converter。层四,类型方案:Sensitive<T> 包装类型(toString 自动掩码——类型即脱敏,第 25 题类型边界)。四层的成本递增,覆盖面递增——按数据分级选层(第 31 题 distributed 分级降级同构)。'),
      block('反例:toString 泄露的三种事故', '事故一,IDE 默认 toString:Account@1a2b 的自动生成含 CVN——日志泄露 CVN(合规违规)。事故二,异常消息带数据:throw new Exception("用户" + id + "余额" + balance)——异常消息含金额(第 44 题 distributed)。事故三,debug 日志全量:log.debug("账户详情: {}", account)——account.toString 泄露——debug 级也要脱敏(日志级别可调高到生产)。'),
      block('取舍:脱敏与排障的平衡', '过脱敏:日志全掩码——排障困难(看不出是哪个用户的问题)。脱敏的粒度:标识字段掩码(可关联)、内容字段掩码(不可见)、关键判断字段保留(是/否)。排障的替代:traceId 关联(第 48 题)+后台详细查询(权限审批,第 33 题)——日志掩码+traceId+后台查询的三角替代全量日志。'),
    ],
    [
      block('验证:脱敏的断言组', '验证:toString 断言(toString 不含 CVN/完整卡号——断言排除);掩码断言(卡号掩码格式正确:****-****-****-1234);日志扫描断言(生产日志无明文卡号/CVN 的扫描——正则扫描常态化)——三组固化脱敏;敏感字段的标注清单(哪些字段脱敏)进数据分级文档。'),
      block('追问链:脱敏三刀', '一刀:"equals/hashCode 的敏感字段?"——equals 用敏感字段(卡号)——比较需要但 toString 掩码——比较与展示的分离(toString 不代表比较语义)。二刀:"序列化的脱敏?"——序列化的敏感字段(@JsonIgnore/自定义序列化器)——序列化、toString、日志三道的脱敏一致性(第 22 题)。三刀:"调试模式?"——开发环境的全量日志(调试便利)与生产的脱敏(安全)——环境差异的配置化(logback 的 profile 切换)——开发便利不突破生产边界。'),
    ],
    ['toString 显式排除敏感字段', '掩码工具统一,类型方案治本', 'traceId 加后台查询替代全量日志'], [sre],
  ),
  'java-language/33': deep(
    '时间点、当地时间与时区应如何建模？',
    '网银账期沙盘:Instant(时间点)/ZonedDateTime(带时区)/LocalDateTime(无时区)——混用导致账期错位(banking 19 题:对账需要明确时区)。三类的建模边界与转换纪律。',
    [
      '三类的语义:Instant=绝对时间点(UTC 时间戳——"什么时候",无地点语义);ZonedDateTime=时间点+时区(带地点语义的完整时间);LocalDateTime=墙钟时间(无时区——"墙上显示几点的日期时间")。',
      '建模纪律:数据库存 UTC(Instant/timestamp with time zone);业务日切/账期用 ZonedDateTime(带时区的日切,第 19 题);展示层用用户时区的 ZonedDateTime;LocalDateTime 仅用于"无时区语义的墙钟"(本地闹钟设置)。',
      '转换纪律:Instant→ZonedDateTime 需要 atZone(zone)(显式时区);LocalDateTime→Instant 需要 atZone(隐含时区的显式声明)——转换必带时区参数(隐式系统时区是事故源,第 19 题)。',
    ],
    [
      block('机制:三类时间的语义与转换', 'Instant:时间线上的一个点(等价于 Unix timestamp 的纳秒版)——时区无关。ZonedDateTime:Instant+ZoneId(规则:某时区的墙钟表示)——DST 切换时同一 Instant 两个 ZonedDateTime 表达。LocalDateTime:无时区的墙钟(不对应唯一 Instant——不同时区不同 Instant)。转换:atZone(时区)→ZonedDateTime;toInstant()→Instant——每种转换都要显式时区或上下文。'),
      block('反例:混用的三种事故', '事故一,LocalDateTime 存库:交易时间存 LocalDateTime(无时区)——多机房部署(第 38 题distributed)的时区不同→同一笔交易在不同机房的"时间"不同——对账(第 19 题)错位。事故二,系统默认时区:LocalDateTime.now() 用系统默认时区——容器时区变更(第 20 题)导致时间跳变。事故三,日切时区遗漏:账期的日切(第 19 题)未显式声明时区——默认 UTC/系统——与渠道日切(第 19 题)错位。三条的正解:UTC 存储+显式时区转换+LocalDateTime 只用于无时区语义。'),
      block('取舍:时间库的选择', 'java.time(JSR-310):设计良好(不可变/清晰分层)——标准选择。旧 API(Date/Calendar):可变+月份从 0 起+时区混乱——遗留迁移(新代码禁用旧 API)。第三方(Joda-Time):java.time 的前身——迁移到 java.time(Joda 作者建议)。规范:import java.time.* 禁 java.util.Date——静态检查(第 25 题类型边界的规范)。'),
    ],
    [
      block('验证:时间建模的断言组', '验证:转换断言(Instant→ZonedDateTime→Instant 的往返无损);日切断言(不同时区的日切边界正确——banking 19 题的双标);DST 断言(DST 切换的歧义时刻处理[第 34 题专论])——三组固化时间建模;LocalDateTime 的禁用清单(哪些场景禁用)进规范。'),
      block('追问链:时间建模三刀', '一刀:"数据库的时间类型?"——timestamp with time zone(推荐——UTC 存储)vs timestamp without time zone(危险——无时区语义)——DB 列类型的选择影响时间建模(第 19 题)。二刀:"序列化格式?"——ISO 8601(2026-01-01T00:00:00Z——带时区偏移)——序列化的时间格式统一(禁自定义格式,第 49 题)。三刀:"时间的比较?"——Instant 的比较(时间线序,与时区无关)vs LocalDateTime 的比较(墙钟序,时区歧义)——比较用 Instant(时间线的绝对序)。'),
    ],
    ['数据库存 UTC,展示带时区', 'LocalDateTime 仅用于无时区语义', '转换必带时区,禁系统默认'], [api('java/time/Instant')],
  ),
  'java-language/34': deep(
    '夏令时会如何影响定时任务与账单周期？',
    '网银计费沙盘:每月 1 日 00:00 的月费扣款——DST 切换日(3 月第二个周日)的 00:00 出现两次或不存在——定时任务跑两次或跳过,账单周期错位。DST 的歧义时刻与正确处理(第 33 题时间的 DST 面)。',
    [
      'DST 的歧义时刻:春季切换(02:00→03:00,02:00-02:59 不存在)、秋季切换(02:00→01:00,01:00-01:59 出现两次)——定时任务的 cron 在歧义时刻的行为不确定(spring 的 Cron 表达式/DST 的处理)。',
      '影响面:定时任务(重复/跳过)、账单周期(月费的日切偏移)、会议提醒(跨时区偏移)、日志时间戳(回拨的时间重复,第 39 题distributed 时钟)。',
      '处理原则:定时任务用 UTC(无 DST)——业务的"当地 00:00"用显式时区计算(ZoneId.rules 的 DST 感知)而非 cron;日切(第 19 题)用 ZoneId 的日期边界(DST 感知的 LocalDate.atStartOfDay(zone))——不用硬编码 00:00。',
    ],
    [
      block('机制:歧义时刻与 UTC 替代', '歧义:Spring 的 2:30 在 DST 切换日不存在(atStartOfDay 不会命中)——cron 的行为:跳过或延迟(实现依赖)——不可控。UTC 替代:任务的调度用 UTC(时间线无 DST)——业务的"当地 00:00"翻译为"UTC 的当地 00:00"(按 ZoneId 计算 UTC 时刻)——计算随 DST 自动调整(ZoneId 的 rules)。账单周期:用 LocalDate 的月边界(atStartOfDay(zone)——DST 感知)而非固定 00:00 的 cron。'),
      block('反例:DST 的三种事故', '事故一,月费双扣:DST 秋季回拨,00:00 出现两次——cron 00:00 扣款跑两次(双扣,banking 28 题分布式 28 题防重)。事故二,任务跳过:春季 02:30 的任务(02:30 不存在)——跳过(该做的事没做)。事故三,账期偏移:DST 切换日的日切(第 19 题)偏移 1 小时——账期窗口与渠道(第 19 题)错位。三条的正解:UTC 调度+ZoneId 日切+DST 感知的日期计算——不用本地墙钟做系统调度。'),
      block('取舍:哪些层感知 DST', '存储层:UTC(Instant——无 DST 问题)。调度层:UTC 的 cron(每任务标注对应业务的当地含义)。业务层:ZoneId 的日期计算(DST 感知——"当地 00:00"的正确翻译)。展示层:用户时区的格式化(DST 自动)。DST 的感知集中到"业务层的日期计算"——其他层 UTC 化——DST 的复杂度收敛到一层。'),
    ],
    [
      block('验证:DST 的断言组', '验证:YYYY 断言(J2 实测:2025-12-29 用 YYYY 格式化出 2026——week-year 陷阱);歧义时刻断言(DST 切换日的 atStartOfDay(zone) 行为——不存在/重复的时刻处理);UTC 调度断言(UTC 的 cron 在 DST 切换日不受影响——对照)——三组固化 DST 纪律;YYYY 的静态扫描(pattern 中的 YYYY)进 CI。'),
      block('追问链:DST 三刀', '一刀:"时区数据库的更新?"——TZ 数据库(tzdata)随政策变(某国取消 DST)——JVM 的 tzdata 版本管理(tzupdater 工具)——tzdata 过期=DST 计算错误(合规事故)。二刀:"历史时间的 DST?"——历史时间(DST 切换前的交易)的时区转换——java.time 用历史 rules(正确回溯)——存 UTC 的必要(历史 UTC 不受 DST 变化影响)。三刀:"无 DST 时区?"——UTC/中国(无 DST)——无 DST 的时区无歧义时刻——全球化服务的时区策略(统一 UTC 存储+展示层时区)。'),
    ],
    ['调度用 UTC,日切用 ZoneId', 'YYYY 是周年,yyyy 是年——别混', 'DST 的复杂度收敛到业务层'], [api('java/time/ZoneId')],
  ),
  'java-language/35': deep(
    '为什么格式化日期时不能混用 YYYY 和 yyyy？',
    '网银对账沙盘:对账文件用 YYYY-MM-dd 格式化日期——2025-12-29(2025 年最后一周)被格式化为 2026-12-29(week-year 归 2026)——对账文件日期错位,渠道按 2026 处理。YYYY(week-year)与 yyyy(calendar-year)的实测对照(J2 教科书证据)。',
    [
      '实测证据(J2 实验):LocalDate.of(2025,12,29) 用 yyyy 格式化=2025-12-29(正确);用 YYYY 格式化=**2026-12-29**(week-year:该周属于 2026 的第 1 周)——日期凭空跳了一年。',
      'YYYY 的语义:周年(week-based-year——用于周报/周计划的场景)——不是"年"的简写;yyyy=日历年(calendar-year)——日常日期用 yyyy。',
      '事故的形态:跨年周(12 月末/1 月初)的日期被 YYYY 格式化到错误的年份——对账文件(第 19 题)日期错位→渠道处理错账期→资金差错(banking 17 题)。J2 实测:2025-12-29 的 YYYY 输出=2026-12-29(跳了一年)。'
    ],
    [
      block('机制:week-year 与日历年的分野', 'week-year:ISO 8601 的周历系统(周从周一开始,每年的第一周=含第一个周四的周)——12 月末的几天可能属于下一年的第 1 周(week-year=下一年)——YYYY 格式化输出下一年。yyyy:日历年(calendar-year)——日常日期。两者的分歧窗口:每年 12 月末 3-4 天+1 月初 1-3 天——YYYY 在这个窗口"跳年"。'),
      block('反例:YYYY 的三种事故', '事故一,对账文件:对账日期用 YYYY——跨年周的对账文件日期=2026(渠道按 2026 对账)——账期错位(banking 19 题)。事故二,日志时间戳:日志 pattern 的日期用 YYYY(周报系统的遗留)——跨年周的日志归到错误年份(第 39 题distributed 时序)。事故三,文件名:归档文件名用 YYYY(第 45 题)——归档目录错位。三条的正解:全局搜索 YYYY(静态扫描——除非是周报,一律改 yyyy)+YYYY 的合法场景注释(周报才用)——静态扫描进 CI。'),
      block('取舍:周历的正确用法', '周历的合法场景:周报/周计划的周编号(YYYY-ww)——YYYY 与 ww 配对使用(week-year 与 week-of-year——两者同体系);与 yyyy-MM-dd 混用=事故。周历的配置:Locale 的周首日(ISO=周一)与 firstWeekOfYear 的定义——Locale 影响 week-year 的计算(跨 Locale 的周历差异)。规范:日期格式串的 YYYY 与 ww 必须成对出现(静态检查的规则)。'),
    ],
    [
      block('验证:YYYY 陷阱的断言组', '验证:跨年断言(J2 实测:2025-12-29 的 YYYY 输出=2026——跳年实证);窗口断言(12 月 28-31 日的 YYYY 输出——全部跳年的窗口验证);扫描断言(YYYY 在代码中的出现清单——逐个确认是否周报场景)——三组固化 YYYY 纪律;YYYY→yyyy 的替换用例(修复验证)。'),
      block('追问链:YYYY 三刀', '一刀:"Locale 的影响?"——Locale.US 与 Locale.CHINA 的 week-year 可能不同(周首日与第一周定义差异)——格式化的 Locale 参数显式(禁 Locale.getDefault 的隐式,第 33 题)。二刀:"SimpleDateFormat 的遗留?"——SimpleDateFormat 的 YYYY 同样陷阱(且线程不安全,第 47 题)——java.time 的 DateTimeFormatter 替代(不可变+线程安全,第 8 题)。三刀:"日期格式串的审计?"——全代码的日期格式串审计(YYYY/yyyy/DD/dd 的大小写审计)——DD(day-of-year)与 dd(day-of-month)的混用同类事故——格式串的大小写规范进 checklist。'),
    ],
    ['YYYY 跳年,yyyy 才是年', '跨年周的实测跳一年', '静态扫描 YYYY,只留周报场景'], [api('java/time/format/DateTimeFormatter')],
  ),
  'java-language/36': deep(
    '如何使用 Charset 避免跨平台乱码？',
    '网银文件网关沙盘:new String(bytes)(用系统默认编码)——Windows GBK/Linux UTF-8 的默认编码差异→同一文件跨平台乱码;显式 Charset 是唯一正解。',
    [
      '乱码的根源:编码与解码的 charset 不一致——new String(bytes) 用系统默认编码(Windows GBK/Linux/macOS UTF-8——跨平台不同)——同一字节序列在不同平台解码结果不同。',
      '显式 Charset:每个 new String/getBytes/InputStreamReader/Writer 都显式传 StandardCharsets.UTF_8——显式 vs 隐式(默认)是乱码的生死线。JDK 18 起 file.encoding 默认 UTF-8(JEP 400)——但 JDK 17 及前默认随平台(不可依赖默认)。',
      'UTF-8 的理由:全字符覆盖+向后兼容 ASCII+互联网标准——内部数据的统一编码(存储/传输/日志全 UTF-8)——编码统一收敛到 UTF-8 一处(第 47 题)。',
    ],
    [
      block('机制:编码解码的对称性', '编码:字符串→字节(getBytes(charset));解码:字节→字符串(new String(bytes, charset))——编码与解码的 charset 必须一致(不对称=乱码)。乱码的不可逆:GBK 编码的字节用 UTF-8 解码→替换字符(U+FFFD)或乱码串(信息丢失——不可逆还原)。显式的覆盖面:new String/getBytes/InputStreamReader/OutputStreamWriter/Files.newBufferedReader/Scanner——所有 IO 入口都要显式。'),
      block('反例:默认编码的三种事故', '事故一,跨平台乱码:文件在 Windows(GBK 写入)到 Linux(UTF-8 读取)——乱码(中文变问号)。事故二,容器编码:容器的 LANG 未设(POSIX/C locale)——Java 的 file.encoding=ANSI_X3.4-1968(ASCII)——中文全变问号(第 20 题 distributed 容器)。事故三,邮件/HTTP 的编码遗漏:Content-Type 缺 charset——接收方猜编码——猜错即乱码。三条的正解:显式 UTF-8 全覆盖+环境检查(file.encoding 进启动日志)+HTTP 的 Content-Type 显式。'),
      block('取舍:UTF-8 统一的迁移', '迁移:存量 GBK 数据的转码(GBK→UTF-8 的批量转换——先确认源编码[不可猜])——转码是不可逆(UTF-8→GBK 可能丢字符:GBK 有 UTF-8 没有的生僻字)——转码前备份+校验(第 45 题distributed)。JDK 18 的 file.encoding=UTF-8(JEP 400):默认已 UTF-8——JDK 17 及前的系统默认仍需显式——升级 JDK 18 是根治之一(但有行为变更风险,第 49 题回归)。'),
    ],
    [
      block('验证:显式编码的断言组', '验证:跨平台断言(同文件 GBK 与 UTF-8 的读取对照——乱码复现与显式修复);显式扫描断言(new String(bytes) 无 charset 的调用扫描为零);环境断言(启动日志打印 file.encoding——环境检查)——三组固化编码纪律;UTF-8 统一的迁移用例(存量数据转码的验证)'),
      block('追问链:Charset 三刀', '一刀:"Charset 的不可变?"——Charset 不可变(charset.forName 缓存单例)——Charset 对象可安全共享(第 8 题)。二刀:"invalid 字节的处理?"——CodingErrorAction(REPLACE/REPORT/IGNORE)——解码的容错策略(REPORT 严格/REPLACE 宽容)——按数据的不可妥协性选(资金文件 REPORT,日志 REPLACE)。三刀:"BOM 的处理?"——UTF-8 BOM(EF BB BF,Windows 记事本添加)——UTF-8 不需要 BOM 但 Windows 工具常加——BOM 的剥离(读取时跳过)——BOM 不剥离=文件头出现 U+FEFF 字符(解析故障)。'),
    ],
    ['默认编码随平台,显式 Charset 是正解', 'UTF-8 统一收敛', 'BOM 剥离,CodingErrorAction 显式'], [api('java/nio/charset/Charset')],
  ),
  'java-language/37': deep(
    'Files.readAllBytes 为什么可能造成线上 OOM？',
    '网银文件网关沙盘:Files.readAllBytes(用户上传的 2GB 文件)——整个文件加载进内存(byte[2GB])——堆不够即 OOM(且大数组分配的 GC 压力)。大文件的流式处理(InputStream 逐块/Files.lines 逐行)替代全量加载。',
    [
      'readAllBytes 的行为:一次性读取整个文件到 byte[]——文件大小=内存需求(2GB 文件=2GB 堆分配)——并发请求多个大文件=内存乘法(OOM,第 23 题 distributed 队列堆积同构)。',
      '大数组的额外代价:byte[2GB] 的分配(堆需要连续空间——碎片化时分配失败)+GC 扫描(2GB 的 byte 数组的标记成本)——即使堆够,分配与 GC 的代价也可观。',
      '流式替代:InputStream 逐块读取(8KB 缓冲循环)、Files.lines(逐行流)、Files.copy(直接到输出流)——内存 O(缓冲区) 不 O(文件大小)——文件处理的流式纪律。',
    ],
    [
      block('机制:全量加载的内存账', '内存账:byte[2GB]=2GB 堆分配(需连续空间)+复制期间的旧数组(如果是从流拷贝)——并发 3 个请求=6GB(堆 4GB 即 OOM)。大数组的 GC:大对象进老年代(分配直接进 old gen[大对象阈值])——Full GC 的扫描面。替代:流式处理(逐块校验/转存/解析)——内存 O(8KB) 不 O(2GB)。'),
      block('反例:全量加载的三种事故', '事故一,上传接口 OOM:Files.readAllBytes(上传文件)——用户上传 2GB 文件——OOM(并发上传更糟)。事故二,配置加载 OOM:配置文件被替换为大文件(恶意或误操作)——readAllBytes OOM。事故三,CSV 解析 OOM:大 CSV 全量读入内存解析(第 42 题distributed N+1 的全量加载版)——流式解析(逐行)替代。三条的正解:文件大小预检(超过阈值拒绝/流式)+流式处理+并发限流(第 42 题)。'),
      block('取舍:全量 vs 流式的判据', '全量:文件小(≤堆的 10%)+需要随机访问(SeekableByteChannel)+多次遍历——readAllBytes/readAllLines 合理。流式:文件大/顺序处理/单次遍历——InputStream/lines。随机访问大文件:FileChannel + MappedByteBuffer(内存映射——不占堆,OS 页缓存)——大文件的随机访问用 mmap 而非 readAllBytes。'),
    ],
    [
      block('验证:OOM 防护的断言组', '验证:OOM 复现断言(大文件 readAllBytes 在小堆下 OOM——-Xmx 限制的复现);流式对照断言(同一文件流式处理的内存峰值——对照);大小预检断言(超过阈值的文件拒绝/流式——预检生效)——三组固化大文件纪律;文件大小限制进接口层(第 42 题distributed 查询限流)。'),
      block('追问链:大文件三刀', '一刀:"上传的大小限制?"——上传的预检(Content-Length 头校验)+流式接收(边收边写盘,不全量进内存)——上传的限制在入口层(第 42 题)。二刀:"Files.lines 的资源?"——Stream<String> 的资源关闭(try-with-resources——Stream 是 AutoCloseable,第 12 题)——Files.lines 不关闭=文件句柄泄漏。三刀:"mmap 的适用?"——MappedByteBuffer 的随机访问高效(页缓存)+文件关闭的 unmap 问题(显式 unmap 无 API——GC 延迟释放)——mmap 的适用与陷阱(随机大文件,不用于顺序读)。'),
    ],
    ['全量加载=文件大小的堆分配', '流式处理,内存 O(缓冲)', '大文件随机访问用 mmap'], [api('java/nio/file/Files')],
  ),
  'java-language/38': deep(
    '如何设计可关闭的业务组件生命周期？',
    '网银连接池沙盘:自研连接池组件未实现 AutoCloseable——关闭靠"记得调 shutdown()"——泄漏。生命周期设计:AutoCloseable(close 幂等)+try-with-resources 集成+关闭顺序(依赖反向)+关闭超时(阻塞的 close 不挂死)。',
    [
      'AutoCloseable 契约:close() 幂等(重复调用无害——状态检查)、close 不抛受检异常(或显式声明)、close 后的行为定义(关闭后再用的行为——IllegalStateException 或降级)。',
      '关闭顺序:依赖反向(后创建先关闭——第 12 题try-with-resources 的逆序)——组件间的依赖关系决定关闭序(连接池→其上的服务)。',
      '关闭的完整性:关闭路径全覆盖(正常关闭/异常关闭/JVM 关闭[shutdown hook——仅兜底不替代显式关闭,第 13 题finally 的边界])——第 38 题 spring 生命周期的业务组件版。',
    ],
    [
      block('机制:close 的幂等与超时', '幂等:close 置 closed 标志(AtomicBoolean)——重复调用直接返回(资源不重复释放);close 后操作:closed 检查→IllegalStateException("组件已关闭")——关闭后的行为显式。超时:close 的内部清理(等待活跃连接归还)带超时——超时后强制关闭(泄漏的连接标记)+日志——阻塞的 close 不挂死调用方(第 23 题 distributed 背压的阻塞边界)。'),
      block('反例:生命周期缺陷的三种事故', '事故一,未 close 泄漏:组件靠调用方记得 shutdown——忘记=泄漏(连接池不释放,连接耗尽)。事故二,close 非幂等:重复 close 抛异常/重复释放(资源二次释放)。事故三,close 死锁:close 等待活跃任务完成,任务又需要该组件的资源——死锁(第 7 题 distributed 反向交易死锁同构)。三条的正解:AutoCloseable+幂等+超时+关闭顺序文档化。'),
      block('取舍:生命周期管理的层级', '层级一,try-with-resources:短生命周期(请求级资源)——语言级管理。层级二,容器管理(spring @PreDestroy):应用级组件(容器控制生命周期)。层级三,显式关闭(shutdown hook/手动):独立进程/框架外——显式的责任(调用方记得)。判据:生命周期的"归属者"是谁(请求/应用/进程)——归属者决定管理层级。'),
    ],
    [
      block('验证:生命周期的断言组', '验证:幂等断言(重复 close 无异常无重复释放);关闭后行为断言(close 后的操作抛 IllegalStateException——显式);超时断言(阻塞的 close 在超时后强制关闭);try-with-resources 集成断言(资源自动关闭)——四组固化生命周期;关闭顺序文档化(组件依赖图)进设计文档(第 49 题)。'),
      block('追问链:生命周期三刀', '一刀:"shutdown hook?"——Runtime.addShutdownHook(JVM 退出时的清理)——仅兜底(SIGTERM 的最后机会),不可替代显式关闭(第 13 题finally 的边界同构);hook 的时限(JVM 退出不等长 hook)。二刀:"Spring 的生命周期?"——@PostConstruct/@PreDestroy(容器管理)——与 AutoCloseable 的兼容(DisposableBean/Destroyable)——容器生命周期的业务组件集成(第 33 题)。三刀:"关闭的日志?"——关闭的事件日志(谁关闭/何时/耗时——第 32 题)——组件的生命周期也进审计。'),
    ],
    ['close 幂等,超时不挂死', '关闭顺序=依赖反向', 'shutdown hook 仅兜底'], [api('java/lang/AutoCloseable')],
  ),
  'java-language/39': deep(
    '如何让随机数满足不同的业务需求？',
    '网银安全沙盘:验证码用 Random(可预测!—48 位种子可枚举)——安全场景必须 SecureRandom;业务随机(抽签)用 Random/ThreadLocalRandom;UUID 用 SecureRandom 的类型 4。按安全等级选随机源。',
    [
      '随机源的谱系:Random(48 位 LCG 种子——可预测[已知输出可推种子])、ThreadLocalRandom(线程隔离的 Random——同样可预测)、SecureRandom(CSPRNG——加密安全,不可预测)、UUID.randomUUID()(SecureRandom 的类型 4 UUID)。',
      '安全等级:验证码/密钥/令牌→SecureRandom 必选(Random 的验证码可被推算[种子枚举]);业务随机(抽奖/随机展示)→Random 足够;UUID→randomUUID()(内部 SecureRandom)。',
      'SecureRandom 的工程注意:熵源阻塞(/dev/urandom 替代)、实例复用(创建贵——复用单例)、线程竞争(多实例缓解)。',
    ],
    [
      block('机制:Random 的可预测性与 SecureRandom', 'Random 的可预测:48 位种子+LCG 算法——已知两个输出可反推种子(48 位空间可枚举)——验证码用 Random=攻击者可推下一个码。SecureRandom:OS 熵源(/dev/urandom/Windows CryptoAPI)+加密强度哈希——不可预测(CSPRNG 的定义)。性能:Random 快(LCG 计算)vs SecureRandom 慢(熵混合+哈希)——安全与性能的取舍(安全场景性能不是理由)。'),
      block('反例:随机源误用的两种事故', '事故一,验证码用 Random:攻击者知道时间戳(种子来源)——枚举种子推验证码——验证码失效。事故二,令牌用 UUID.randomUUID() 的字符串截断:UUID 类型 4 是 CSPRNG 安全——但截断(取前 8 位)后空间缩小(暴力可行)——截断降低安全强度(令牌用完整 UUID 或专用生成器)。两条的正解:安全场景 SecureRandom+完整熵空间;Random 只用于"可预测无影响"的场景。'),
      block('取舍:随机数的业务分类', '分类:安全随机(验证码/密钥/令牌/会话 ID——SecureRandom)、业务随机(抽奖/AB 测试/随机展示——Random/ThreadLocalRandom)、确定性随机(种子化的可复现随机——模拟/测试——new Random(seed))。三类不可混用:安全场景禁非安全源,确定性场景禁非种子源——随机源的类型安全(第 25 题类型边界的运行时形态)。'),
    ],
    [
      block('验证:随机源的断言组', '验证:可预测性断言(Random 的种子枚举——已知输出推下一个[演示级]);SecureRandom 断言(SecureRandom 的输出不可推[CSPRNG 的定义——实测不可枚举]);分布断言(SecureRandom 的均匀分布——卡方检验)——三组固化随机源分类;安全扫描(Random 在安全场景的扫描告警)进 CI(第 24 题)。'),
      block('追问链:随机三刀', '一刀:"熵源阻塞?"——/dev/random 的熵池阻塞(Linux)——SecureRandom 的 getInstanceStrong 用 /dev/random(阻塞)——默认 getInstance 用 urandom(非阻塞)——getInstanceStrong 的阻塞风险(启动挂起)。二刀:"UUID 的排序?"——UUID v4(随机,无序——第 40 题 distributed 索引效率)vs UUID v7(时间有序)——UUID 的排序与索引效率的版本选择。三刀:"种子管理?"——Random(seed) 的固定种子(测试可复现——但生产禁固定种子)——种子管理的测试与生产分离。'),
    ],
    ['验证码密钥令牌,SecureRandom 必选', 'Random 可预测,安全场景禁用', '熵源阻塞,urandom 替代'], [api('java/security/SecureRandom')],
  ),
  'java-language/40': deep(
    'UUID 能否同时满足索引效率与全局排序？',
    '网银订单沙盘:UUID v4(随机)做主键——B+ 树索引的随机写入(页分裂频繁,写入放大);UUID v7(时间有序)——索引顺序写入(B+ 树友好)+全局唯一+时间排序——v4 与 v7 的索引效率与排序能力对照(banking 41 题distributed 的版本选择)。',
    [
      'UUID v4 的索引代价:完全随机→B+ 树插入位置随机→页分裂(写入放大)+缓存命中率低(每次写入不同页)——主键索引的写入性能损耗(实测基准的社区数据:随机 UUID 的插入性能比自增差数倍)。',
      'UUID v7 的改进:时间戳前缀(48 位毫秒+随机)——时间有序→B+ 树顺序写入(索引友好)+全局唯一+时间可排序(按 UUID 排序≈按时间排序)——JDK 无内置 v7(第三方库或手写,第 49 题distributed)。',
      '取舍:唯一性(全部满足)+索引效率(v7 优于 v4)+时间排序(v7 支持)+隐私(v7 泄漏时间信息——不可用于安全令牌,第 39 题)——按用途选版本:主键=v7,令牌=v4。',
    ],
    [
      block('机制:v4 随机与 v7 有序的索引行为', 'v4:128 位全随机——B+ 树插入=随机位置(页分裂:页满时拆两页,新页半空)——写入放大(每插入可能触发页分裂+页重写)。v7:48 位 Unix 毫秒时间戳前缀+74 位随机——时间有序→插入在索引右端(顺序追加——页填充满后新页)——写入友好。时间排序:v7 的前缀=时间——按 UUID 字节序排序=按时间排序(第 48 题 distributed 可追踪的排序能力)。'),
      block('反例:v4 主键的三种代价', '代价一,写入放大:B+ 树的页分裂(随机插入)——每页的利用率降至 ~50%(分裂后)——存储空间浪费。代价二,缓存失效:随机访问使缓冲池的页命中率低(每次写不同页)。代价三,复制延迟:主从复制的 row-based 随机写入——从库回放慢(写入乱序)。三条的正解:主键用时间有序 ID(v7/雪花/号段,第 17 题 distributed)——v4 保留给令牌/会话 ID(第 39 题)。'),
      block('取舍:有序 UUID 的隐私与安全', 'v7 泄漏:时间戳可读(创建时间暴露)+可预测(下一个 ID 可猜)——不可用于安全令牌(可预测,第 39 题Random 同源)——令牌用 v4(不可预测)。v7 的合法场景:主键/日志 ID/事件 ID(需要时间有序+全局唯一)。隐私的分层:内部分配(v7 的信息只在内部)+外部展示(掩码/令牌化,第 31 题)。'),
    ],
    [
      block('验证:索引效率的断言组', '验证:插入性能断言(v4 vs v7 主键的批量插入耗时——B+ 树页分裂的写入放大实测);页利用率断言(随机 vs 顺序插入的页填充率);排序断言(v7 的 UUID 排序=时间排序——字节序断言)——三组固化 UUID 版本选择;JDK 无 v7 的内置(第三方[uuid-creator]或手写,标注)进实现指南。'),
      block('追问链:UUID 三刀', '一刀:"UUID 的长度?"——36 字符(标准格式)/16 字节(二进制)——DB 存储用 binary(16)或 char(36)——存储格式影响索引大小(第 48 题)。二刀:"雪花与 UUID 的对照?"——雪花(banking 41 题):64 位(时间+机器+序列)——趋势递增+紧凑;UUID v7:128 位(时间+随机)——全局无协调+更长——两者的选择(中心化协调 vs 去中心)。三刀:"UUID 的碰撞?"——v4 的碰撞概率(2^122 空间——生日悖论下可忽略)——v7 的时间部分碰撞(同毫秒多实例——随机位兜底)——碰撞分析按版本。'),
    ],
    ['v4 随机拖索引,v7 有序友好', '主键用 v7,令牌用 v4', 'v7 泄漏时间,不可做令牌'], [pod],
  ),
  'java-language/41': deep(
    '如何避免正则表达式引起拒绝服务？',
    '网银表单沙盘:用户输入走正则校验(a{0,100}{0,100}{0,100} 的嵌套量词)——灾难性回溯(ReDoS:指数级回溯,CPU 100%)——ReDoS 的模式识别+输入长度限制+安全正则库(RE2)。',
    [
      'ReDoS 的机制:回溯正则的歧义匹配((a+)+$ 对 "aaaaaaaaaaaaaaaaaaaaaaaa!"——每字符回溯指数级)——恶意输入构造触发指数回溯(CPU 100% 单线程)——单请求拖死一个线程池线程(第 37 题 distributed)。',
      '模式识别:嵌套量词((a+)+/(a|a)*的歧义)+交替重叠((a|a)+)+字符类重叠——静态扫描(正则的安全分析工具)——危险模式的清单化。',
      '防御三层:输入长度限制(正则校验的输入上限——长度限制把指数截断)、安全正则库(RE2[线性时间,无回溯——Google 的正则引擎]——功能子集[无回溯引用])、超时(正则执行的线程超时——Java 无原生超时,需独立线程+中断[中断对正则无效!——只能放弃线程])。',
    ],
    [
      block('机制:回溯与指数爆炸', '回溯:NFA 引擎的回溯(Java 正则=NFA——匹配失败时回溯尝试其他路径)——(a+)+$ 对 "aaaa...b":每个 a 的分组有两种解释(单个 a 或并入前组)——2^n 的路径(指数)。线性引擎:RE2(自动机——无回溯,线性时间)——功能限制(不支持回溯引用/环视)——ReDoS 免疫的代价是功能子集。Java 的替代:RE2/J(Java 移植版)——安全场景的替换(第 17 题选型)。'),
      block('反例:ReDoS 的两种事故', '事故一,校验接口 ReDoS:用户输入走嵌套量词正则——恶意输入(长串+触发字符)——CPU 100%(该线程)——并发攻击=线程池耗尽(第 37 题 distributed 聚合同构)。事故二,日志解析 ReDoS:日志解析的正则(非用户输入但日志内容含用户数据——间接注入)——日志内容的 ReDoS。两条的正解:用户输入的正则长度限制+RE2 替换+静态扫描危险模式。'),
      block('取舍:ReDoS 防御的层次', '层一,静态扫描:CI 的正则扫描(危险模式清单:嵌套量词/重叠交替)——开发期拦截。层二,长度限制:正则校验的输入长度上限(长度截断回溯指数)——入口层。层三,RE2 替换:安全敏感的正则用 RE2/J(线性)——正则层。层四,超时+隔离:正则执行在独立线程+超时(放弃线程[不可中断——线程泄漏的代价评估])——最后防线。四层按部署成本递增。'),
    ],
    [
      block('验证:ReDoS 防御的断言组', '验证:ReDoS 复现断言((a+)+$ 对长串的耗时——指数回溯实测[短输入即可演示]);长度限制断言(输入截断后耗时线性);RE2 对照断言(同一模式在 RE2 的线性时间)——三组固化 ReDoS 防御;危险模式清单(CI 扫描的规则库)进安全文档。'),
      block('追问链:ReDoS 三刀', '一刀:"Java 正则的超时?"——Matcher 无原生超时——独立线程+放弃(线程泄漏[中断对回溯无效]——Thread.stop deprecated)——超时的代价评估(线程泄漏 vs ReDoS 的 CPU 占用——泄漏线程有限[池上限]优于 ReDoS 无限[CPU])。二刀:"RE2 的功能限制?"——RE2 不支持回溯引用(反斜杠1)/环视(?=)——功能子集的正则迁移(受影响模式的清单)——RE2 的引入评估(第 17 题)。三刀:"正则的缓存?"——Pattern.compile 的缓存(编译贵——Pattern 预编译常量)——每次 compile 的开销(热路径禁 inline compile,第 21 题distributed)——Pattern 的预编译纪律。'),
    ],
    ['嵌套量词是 ReDoS 的标志', '长度限制截断指数,RE2 治本', 'Java 无正则超时,独立线程兜底'], [sre],
  ),
  'java-language/42': deep(
    '字符串长度与用户可见字符数为何不同？',
    '网银表单沙盘:昵称限制"10 个字符"——String.length() 返回 char 数(UTF-16 码元)——emoji(👨‍👩‍👧‍👦)length=11(码元)但用户看到 1 个字符——用户可见字符数用 codePointCount 或 BreakIterator(字素簇)。',
    [
      '三层计数:String.length()=UTF-16 码元数(surrogate pair 占 2)、codePointCount=Unicode 码点数(emoji 家庭 7 个码点)、字素簇(BreakIterator/grapheme)=用户可见字符(emoji 家庭=1 个字素)——三层递进,用户感知=最内层。',
      '本机实验(J2):emoji 👨‍👩‍👧‍👦 length=11(码元)、codePointCount=7(码点)、用户看到 1 个——三层的差距=校验的精度差;é 的两种编码(composed 1 码元/decomposed 2 码元)——规范化(NFC)的必要性。',
      '校验与存储:长度校验按字素簇(用户预期)或码点(存储精度)——按业务定义(表单的"10 字符"是什么口径)——口径显式化(第 48 题distributed 口径)。',
    ],
    [
      block('机制:码元、码点与字素簇', '码元(char):UTF-16 的编码单元(16 位)——BMP 字符 1 码元、增补字符(emoji)2 码元(surrogate pair)。码点(codePoint):Unicode 字符的编号(21 位)——1 码点可 1 或 2 码元。字素簇(grapheme):用户可见的字符(1 个 emoji=多个码点[ZWJ 连接])——BreakIterator.getCharacterInstance 的边界。规范化:NFC(NFD 的组合序列→组合形式)——é 的两种编码统一(composed.equals(decomposed)=false → Normalizer.normalize 后相等)。'),
      block('反例:计数口径的三种事故', '事故一,长度截断断 emoji:substring(0, 10) 截断在 surrogate pair 中间——无效字符(存储/展示异常)。事故二,计数控件:输入框 maxlength=10(HTML 按 codePoint?浏览器差异)——后端按码元校验——前后端口径不一致(合法输入被拒)。事故三,去重失败:é 的两种编码(composed/decomposed)被当两个不同用户——规范化缺失(第 33 题 distributed 键规范化)。三条的正解:口径显式(码元/码点/字素簇)+规范化(NFC)+截断的边界安全(codePoint 对齐)。'),
      block('取舍:口径的选择与统一', '口径选择:存储限制(codePoint 或字节数[UTF-8 字节数——DB 的 varchar(n) 是字符数但 n 的定义随 DB])、用户限制(字素簇)、传输限制(码元/字节)——每层口径不同,转换函数统一。前后端一致:前端的字符计数(JS 的 length=UTF-16 码元,与 Java 一致)与后端的口径对齐(第 27 题 distributed 前后端一致)。'),
    ],
    [
      block('验证:计数控件的断言组', '验证:三层计数断言(J2 实测:emoji 的 length/codePointCount/字素簇计数对照);规范化断言(NFC 后 composed.equals(decomposed)=true);截断安全断言(codePoint 对齐的截断不产生无效字符)——三组固化计数口径;前后端口径一致的联调用例。'),
      block('追问链:字符计数三刀', '一刀:"String 的 UTF-16?"——Java String 内部 UTF-16(JDK 9 紧凑字符串 Latin1[ASCII 内容])——Latin1 内容的 length=字节数=码元数(一致);非 Latin1(中文/emoji)UTF-16(紧凑失效)——紧凑字符串的条件(第 32 题)。二刀:"DB 的字符计数?"——MySQL varchar(n) 的 n=字符数(UTF-8 下按字符)vs 字节数——DB 的口径与 Java 的口径对齐(第 33 题)。三刀:"字素簇的库?"——BreakIterator(标准库)——字素簇的迭代(用户可见字符的遍历)——BreakIterator 的性能(文本分割的成本)——大量文本的字素簇操作成本评估。'),
    ],
    ['码元码点字素簇,三层计数三口径', 'emoji 是多码点单字素', 'NFC 规范化,前后端口径一致'], [api('java/text/BreakIterator')],
  ),
  'java-language/43': deep(
    'Comparable 与 Comparator 如何保证有序集合正确性？',
    '网银沙盘:TreeSet 的判等=compare(collections 8 题)——比较器的不一致(对称/传递违约)导致 TimSort 异常(第 34 题)或元素"消失"——有序集合的正确性=比较器契约(comparing 链+唯一键兜底,第 44 题)。',
    [
      '有序集合(TreeSet/TreeMap/PriorityQueue)的判等与排序=compare——compare==0=同一元素(替换/拒绝);compare 的契约(对称/传递/自反)违约=集合行为不可预测(元素消失/排序异常)。',
      '比较器的设计:comparing(字段).thenComparing(次字段).thenComparing(唯一键)——比较链落到唯一键(总序,第 44 题)——链式构建 Comparator.comparing 的组合器模式(第 9 题)。',
      '一致性的校验:随机对象对的属性测试(对称+传递断言,第 34 题断言组)——比较器的契约测试进有序集合的组件单测。',
    ],
    [
      block('机制:compare 的契约与有序集合', '契约:sgn(compare(x,y))=-sgn(compare(y,x))(对称)+传递性+(compare(x,y)>0 && compare(y,z)>0 → compare(x,z)>0)——违约的后果:TreeSet 的元素丢失/TreeMap 的键覆盖/PriorityQueue 的堆序破坏(第 26 题collections)/TimSort 异常(第 34 题)。compareTo 与 equals 的一致性(第 8 题):一致(推荐)或不一致(显式声明语义——"按业务键排序"的刻意设计)。'),
      block('反例:比较器违约的三种事故', '事故一,传递违约:比较器"A 在 B 前如果 A 大,否则按时间"——交叉条件的传递断裂——TimSort 异常(偶发,数据依赖)或 TreeSet 行为异常。事故二,字段遗漏:比较器只比金额(同金额不同单号)——TreeMap 的键覆盖(后者吞前者,第 8 题collections)——比较链落到唯一键。事故三,比较器与 equals 不一致:compareTo 用金额+equals 用全字段——TreeSet 的 size 与 HashSet 的 size 不同(判等分野,collections 8 题)——不一致要显式声明(有意设计)。'),
      block('取舍:Comparable 与 Comparator 的分工', 'Comparable(自然序):类自身实现(默认排序——金额类的自然序=金额)——单一序。Comparator(外部序):多排序维度(按金额/按时间/按名称——每个维度一个 Comparator 常量)——多序。组合:自然序(Comparable)+外部序(Comparator)并存——Collections.sort(list, BY_TIME)(外部序)与 Collections.sort(list)(自然序)并存——两种排序的语义显式。'),
    ],
    [
      block('验证:比较器契约的断言组', '验证:一致性断言(随机对象对的对称+传递+自反断言——属性测试);总序断言(比较链的唯一键兜底——无并列);有序集合断言(TreeSet 的判等行为与比较器一致——无意外吞元素)——三组固化比较器契约;比较器的常量注册(第 9 题策略注册)进指南。'),
      block('追问链:比较器三刀', '一刀:"Comparator 的 null 处理?"——nullsFirst/nullsLast(显式 null 位置)——默认 null 抛 NPE——null 的排序语义显式(第 18 题)。二刀:"reverse 的组合?"——reversed()(反转)+thenComparing(链)——reverseOrder(自然序反转)——比较器的组合代数(链式+反转)的表达力。三刀:"比较器的异常?"——compare 内抛异常(字段 null 的 NPE)——比较器的健壮性(防御 null/类型)——比较器的异常=排序整体失败(异常传播到调用方)。'),
    ],
    ['有序集合的判等=compare', '比较链落到唯一键', '契约测试:对称传递自反'], [api('java/util/Comparator')],
  ),
  'java-language/44': deep(
    '如何在 Java 中避免整数溢出导致金额或容量错误？',
    '网银转账沙盘:两笔 int 金额相加溢出(2147483647+1=-2147483648)——溢出环绕(资金错误)+溢出检测(Math.addExact 抛异常)+类型升级(long)+上限校验——溢出的三层防御。',
    [
      '溢出的形态:int 的环绕(加法溢出/乘法溢出)、long 的溢出(更大但仍可溢出)、隐式溢出(自动装箱的 Long 累加不会溢出[Long 是 long]但 int 相加赋给 long 仍先溢出[int + int 先按 int 算])。',
      '三层防御:类型升级(int→long:1/0 路径的金额一律 long 分,第 3 题)、精确运算(Math.addExact/multiplyExact/subtractExact——溢出抛 ArithmeticException,错误前移)、上限校验(业务上限:转账单笔上限——超限拒绝,第 23 题 banking 限额)。',
      'Java 8 的 Math 精确方法:addExact/multiplyExact/subtractExact/negateExact——溢出即异常(不静默环绕)——精确运算的默认纪律(资金路径)。',
    ],
    [
      block('机制:环绕、精确运算与隐式提升', '环绕:int 的二进制补码环绕(最大+1=最小)——静默(无异常无警告)——资金错误最隐蔽的形态。隐式提升的陷阱:int + int 先按 int 计算(结果可能已溢出)再赋给 long——(long)a + b 才安全(先提升再算)——隐式提升的时序(表达式内类型提升)。Math 精确:addExact(a,b)——溢出抛 ArithmeticException("integer overflow")——显式(错误前移)。'),
      block('反例:溢出的两种事故', '事故一,金额累加溢出:日累计金额 int 累加——超过 21.47 亿分(2147 万)溢出为负——限额判断失效(负数<上限恒真)——超限放行(资金风险)。事故二,容量计算溢出:容量 = count * itemSize——int 乘法溢出(负容量)——分配失败或异常行为。两条的正解:金额一律 long(Math.addExact)、容量计算 Math.multiplyExact 或 long 提升——溢出的防御路径显式。'),
      block('取舍:溢出策略的分级', '严格(资金):Math.addExact——溢出即异常(拒绝操作,错误前移)。宽松(非资金统计):普通运算+周期校验(溢出的容忍——统计误差可接受)。防御检查:Math.subtractExact 的结果<0(下溢检测——余额扣减的负数检查)。分级的判据:溢出的后果(资金>统计)——后果决定严格度。'),
    ],
    [
      block('验证:溢出的断言组', '验证:环绕复现断言(Integer.MAX_VALUE+1 的环绕——实测);精确断言(Math.addExact 的溢出异常——错误前移);隐式提升断言(int+int 赋 long 的溢出——先 int 后 long 的陷阱复现)——三组固化溢出防御;Math 精确方法的使用规范(资金路径必用)进 checklist。'),
      block('追问链:溢出三刀', '一刀:"long 的溢出?"——long 也有上限(9.2E18)——long 分的万亿级安全(1 亿×万=1E14<9.2E18)——long 的量级足够绝大多数资金(超大额的 BigDecimal,第 2 题)。二刀:"无符号运算?"——Java 无无符号(int 有符号)——Integer.toUnsignedLong(无符号解读)/divideUnsigned——无符号的补丁 API(网络协议的字节解读)。三刀:"溢出的测试?"——边界值测试(Integer.MAX_VALUE/MIN_VALUE 附近的运算——边界值进单测模板,第 44 题)——溢出的测试覆盖(边界值用例)。'),
    ],
    ['int 环绕静默,long 升级防溢出', 'Math.addExact 错误前移', '资金路径精确运算必用'], [api('java/lang/Math')],
  ),
  'java-language/45': deep(
    '如何实现支持版本演进的错误码体系？',
    '网银错误码沙盘:错误码"E001"无语义(什么错?)——数字码递增后段位混乱、前端硬编码映射——错误码的版本演进:结构化编码(模块+类型+序号)+错误码注册表(机器可读)+版本兼容(第 14 题契约)。',
    [
      '结构化编码:E-PAY-1001(E=错误,PAY=支付模块,1=类型[参数],001=序号)——结构化的可读性(模块可定位/类型可路由)+序号的唯一性;或数字码的分段(前 2 位模块+中 2 位类型+后 4 位序号)——编码的 schema 显式。',
      '注册表:错误码→(HTTP 状态/用户消息/内部原因/是否可重试)的机器可读映射(YAML/JSON)——注册表即错误码的契约(第 14 题),前端/网关/文档从注册表生成(单一事实源)。',
      '版本演进:错误码只增不删(废弃标记[deprecated:替代码])——旧客户端兼容(旧码继续返回+新码并存,第 41 题分布式两段式)——错误码的演进走注册表版本。',
    ],
    [
      block('机制:注册表与契约化', '注册表结构:code(结构化)/http_status/message_zh/message_en/retryable/deprecated/替代码——机器可读(YAML/JSON)=文档+前端映射+网关路由的单一事实源。契约化:注册表变更走评审(第 14 题)+版本号+消费者测试(前端按注册表生成错误映射——提供方变更跑消费者测试)。演进:废弃码保留+标记(旧客户端逐步迁移——使用量监控归零后移除,第 41 题)。'),
      block('反例:错误码的三种失控', '失控一,无结构递增:1001/1002/…/9999/10001(段位混乱——模块无法定位)。失控二,硬编码映射:前端的 code→message 硬编码(与后端不一致——改后端忘改前端)。失控三,码复用:旧码被新错误复用(旧客户端的映射错乱)——码只增不删(演进纪律)。三条的正解:结构化编码+注册表+演进纪律——错误码的体系化。'),
      block('取舍:错误码的粒度', '粒度:细粒度(每种失败一个码——前端精确提示)vs 粗粒度(大类+详情字段——前端展示详情)。粒度的成本:细粒度=码爆炸(前端映射维护)+粗粒度=信息不足。折中:大类码(HTTP 状态+业务大类)+detail 字段(人类可读详情,第 44 题)——大类路由+详情补充——粒度按前端消费方式定。'),
    ],
    [
      block('验证:错误码体系的断言组', '验证:唯一性断言(注册表的码唯一——重复检测);结构断言(码的 schema 校验——模块/类型/序号的结构);演进断言(废弃码的标记与替代码存在——旧客户端兼容);消费端断言(前端映射从注册表生成——与后端一致)——四组固化错误码体系;注册表的版本管理(第 14 题)进 SDK 发布(第 33 题)。'),
      block('追问链:错误码三刀', '一刀:"错误码与异常的映射?"——异常→错误码的映射(BizException 的 errorCode→注册表查询)——异常与码的一致性(第 11 题分布式异常划分)。二刀:"错误码的国际化?"——message_zh/message_en(多语言)——i18n 的消息键(码为键,翻译为值)——错误码的多语言扩展。三刀:"错误码与可观测?"——错误码进监控指标(错误码分布,第 48 题distributed 标签基数——错误码有限可作标签)——错误码的分布是系统健康的信号。'),
    ],
    ['结构化编码,注册表即契约', '码只增不删,废弃标替代', '大类路由加 detail,粒度按消费'], [pod],
  ),
  'java-language/46': deep(
    '如何设计分页返回对象的泛型边界？',
    '网银接口沙盘:分页返回 Page<T>(T=不同类型的列表)——泛型的正确边界:Page<T> 的泛型(列表类型+分页元数据)、通配边界(第 5 题 PECS)、子类列表的协变(Page<SpecialOrder> 传给 Page<Order> 消费)。',
    [
      '分页对象的结构:Page<T>{ List<T> content; long total; int page; int size; }——T 的边界=列表元素类型。泛型的协变限制:Page<SpecialOrder> 不是 Page<Order> 的子类(泛型不变,第 5 题)——需要协变处用 ? extends Order(PECS 生产者)。',
      '通配的形态:Page<? extends Order>(消费 Order 的方法可接 SpecialOrder 的 Page)——消费侧的灵活性(第 5 题 PECS);写入侧(Page<T> 的构建)精确类型。',
      '与分页稳定性的配合:T 的比较字段(排序链,第 44 题)——Page 的泛型不影响排序稳定性(排序在 T 的类型层面)——分页对象的泛型与排序契约独立。',
    ],
    [
      block('机制:泛型边界与 PECS', '不变性:Page<SpecialOrder> ≠ Page<Order>(Java 泛型不变)——消费方法签名 Page<? extends Order>(PECS 生产者——读侧协变)。构建:Page.of(List<T> content, total, page)——精确类型(构建用具体 T)。递归泛型:Page<T extends BaseEntity>(T 的上界——分页对象的通用行为[createdAt 等])——上界约束的泛型。'),
      block('反例:泛型边界的两种事故', '事故一,raw 类型:Page(无泛型参数)——类型安全丢失(元素 Object,调用方强转——第 4 题泛型擦除的 raw 形态)。事故二,通配滥用:Page<? extends ? super T>(嵌套通配——不可读不可用)——通配的滥用(第 5 题 distributed)。两条的正解:精确 T 构建+消费侧 ? extends(PECS 纪律)——泛型边界的干净。'),
      block('取舍:分页对象的抽象层次', '抽象:通用 Page<T>(所有接口共用)vs 专用 Page(每接口自定义)——通用=复用+统一前端分页组件;专用=灵活(额外元数据)。泛型边界:通用 Page<T> 的 T 上界(BaseEntity?还是无界——无界更灵活,上界按需)——抽象层次的选择(第 49 题)。Spring Data 的 Page:标准形态(Pageable/Page——生态的事实标准)——用生态标准减少自建(第 17 题)。'),
    ],
    [
      block('验证:泛型边界的断言组', '验证:协变断言(Page<SpecialOrder> 传入 Page<? extends Order> 方法——编译通过);不变断言(Page<SpecialOrder> 不能直接赋 Page<Order>——泛型不变实证);上界断言(Page<T extends BaseEntity> 的行为方法可用)——三组固化泛型边界;PECS 的签名检查(第 5 题)进 API 评审。'),
      block('追问链:分页泛型三刀', '一刀:"泛型与序列化?"——Page<T> 的序列化(T 的类型信息擦除——反序列化需显式类型,第 4 题)——序列化的泛型边界(TypeReference,第 4 题)。二刀:"Page 的排序字段?"——排序的字段名(String)类型安全(类型化排序键——枚举/常量)——排序键的类型安全(第 34 题)。三刀:"Page 与游标?"——游标分页(keyset,第 44 题)的游标对象(Cursor<T>——游标编码[最后记录的排序键])——游标的泛型与序列化。'),
    ],
    ['Page<T> 不变,消费用 extends', '构建精确,消费协变', 'raw 类型是擦除的 raw 形态'], [api('java/lang/reflect/Type')],
  ),
  'java-language/47': deep(
    '如何给遗留静态工具类引入可测试性？',
    '网银遗留沙盘:StaticUtils.validateAmount(double)(静态方法直调,不可 mock)——测试要测"使用 StaticUtils 的代码"但 StaticUtils 内部逻辑不可控。可测试性的引入:实例化包装(静态→实例)+接口抽取(依赖倒置)+绞杀者式替换(第 20 题)。',
    [
      '可测试性的障碍:静态方法的硬依赖(调用方无法替换行为——测试时要测"调用方的逻辑"但 StaticUtils 的行为固定)。障碍的解:接口抽取(IValidator)+静态实现(StaticValidator)+测试实现(MockValidator/可控实现)——依赖倒置(spring-advanced 25 题)。',
      '迁移的渐进:新代码用接口(注入)——存量代码逐步替换(绞杀者,第 20 题)——静态调用点逐个改为接口注入(每次替换行为不变验证,第 40 题 distributed)。',
      '终局:静态工具类的两种归宿——无状态纯函数(保留静态——纯函数可测[无状态无需 mock],第 4 题)或有状态/需替换的(实例化+注入)——静态工具的判定=是否有状态/是否需要多实现。',
    ],
    [
      block('机制:接口抽取与依赖倒置', '抽取:定义 AmountValidator 接口(静态方法的签名)→StaticAmountValidator 实现(委托原静态方法——行为不变)→调用方注入接口(构造注入/字段注入)。测试:MockValidator(可控返回——测试"调用方的逻辑"对验证结果的响应)。依赖倒置:高层(业务)依赖抽象(接口)——低层(静态实现)依赖抽象——DIP 的标准形态(spring-advanced 25 题)。'),
      block('反例:不可测试的两种代价', '代价一,覆盖盲区:调用方的边界处理(StaticUtils 抛异常时)无法测试(异常不可控)——边界覆盖缺失。代价二,行为锁定:StaticUtils 的行为变更(如精度规则)影响所有调用方——无法按调用方差异化(第 8 题 distributed)。两条的正解:接口注入(测试可控)+按调用方的差异化(多实现)。'),
      block('取舍:静态保留的判定', '保留静态:纯函数(无状态/无 IO/确定性——第 4 题:Math.max 类的纯函数可测[直接调用断言])。实例化:有状态(缓存/配置依赖)/需多实现(策略)/需 mock(测试可控)。判定问句:这个工具的"行为"在测试中需要变化吗?——需要→实例化;不需要(纯函数)→保留静态。'),
    ],
    [
      block('验证:可测试性的断言组', '验证:mock 断言(注入 MockValidator,断言调用方对验证结果的响应——mock 可控);渐进断言(替换一个调用点→行为不变验证→下一个——绞杀者的步进);纯函数保留断言(无状态工具的静态保留+直接单测)——三组固化迁移路径;静态调用的扫描(存量调用点的清单)进迁移计划。'),
      block('追问链:静态工具三刀', '一刀:"静态的并发?"——静态方法的并发安全(无状态=安全;有状态[static Map]不安全——第 47 题 banking 全局可变)——静态的并发审计。二刀:"静态与 DI 的混合?"——迁移期间的混合(部分注入部分静态)——混合的临时性(终局=全注入或全静态)——混合期的纪律(新代码用注入)。三刀:"工具类的接口最小化?"——接口的方法数(最小接口——只抽需要替换的行为)——接口爆炸的防(第 43 题)——接口的粒度按替换需求。'),
    ],
    ['静态纯函数可测,有状态实例化', '接口抽取+依赖倒置', '绞杀者式渐进,行为不变验证'], [pod],
  ),
  'java-language/48': deep(
    '接口幂等语义可以只靠方法名表达吗？',
    '网银接口沙盘:方法名 createOrder(暗示幂等?不——每次创建新单)与 processPayment(暗示不幂等?)——幂等语义靠文档/Javadoc 不够(调用方不看文档)——幂等的工程表达:接口注解+唯一约束+调用方契约(分布式 8 题的 API 面)。',
    [
      '方法名的局限:命名无法强制调用方行为(幂等键的传递)——"幂等"是调用方与服务端的协议(键的传递+服务端去重)——命名只是文档的一部分。',
      '工程表达三层:服务端实现(幂等键唯一约束,第 3 题 banking——强制幂等)、接口契约(OpenAPI 注解/文档:幂等键的 header 声明——X-Idempotency-Key)、调用方 SDK(SDK 自动生成/传递幂等键——调用方无感)。',
      '与 HTTP 的对齐:HTTP 语义的幂等(GET/PUT/DELETE 幂等,POST 不幂等——REST 的动词语义)——REST 动词的幂等语义与业务幂等的映射(POST 的业务幂等靠幂等键,不靠动词)。',
    ],
    [
      block('机制:幂等的三层表达', '层一,服务端:幂等键的唯一约束(插入冲突=重复,返回首次结果——banking 3 题)。层二,契约:OpenAPI 的幂等键声明(header 参数+幂等语义标注)+文档(哪些接口幂等/幂等键的生成规则——第 14 题)。层三,SDK:客户端自动生成键(单号派生)+自动重试带键(调用方无感——SDK 的幂等是"透明的正确")。三层缺一:只有服务端=调用方不知道传键;只有契约=没有实现;只有 SDK=服务端没去重。'),
      block('反例:幂等表达缺失的事故', '事故一,方法名误导:createOrderIfNotExists(名字暗示幂等)——但服务端无幂等键校验(并发双创建)——名字的"暗示"不是实现。事故二,文档与实现背离:文档说幂等,实现无去重(调用方重试双花,第 49 题)。事故三,SDK 不带键:SDK 重试不带幂等键(重试=新请求)——重试双花(分布式 8 题)。三条的正解:三层齐备(实现+契约+SDK)——幂等的工程化(不是文档化)。'),
      block('取舍:幂等键的强制程度', '强制:关键接口(资金)强制幂等键(缺失 400——网关拦截,第 33 题 distributed)。建议:非关键接口幂等键可选(缺失自动生成[服务端生成——调用方无键时])——自动生成的键=请求级(不防重试——重试换新键)——强制的等级按资金后果(第 44 题)。演进:从"建议"到"强制"的过渡(监控无键请求的比例——归零后强制)。'),
    ],
    [
      block('验证:幂等表达的断言组', '验证:服务端断言(同键重放零副作用——幂等实现的行为断言);契约断言(OpenAPI 的幂等键声明与实现一致——契约测试);SDK 断言(SDK 重试自动带键——重放的副作用=1)——三组固化幂等的三层表达;无键请求的监控(比例)进指标(第 48 题)。'),
      block('追问链:幂等表达三刀', '一刀:"幂等键的 API 设计?"——header(X-Idempotency-Key)vs body 字段(业务字段)——header 的通用性(与业务解耦)vs body 的可见性——HTTP 语义的 header 幂等键是标准形态。二刀:"幂等与 REST?"——REST 的 PUT 天然幂等(完整替换)/POST 不幂等——POST 的业务幂等靠键(不靠动词);PUT 的幂等也要防并发(第 29 题 distributed 编辑冲突)——REST 动词的幂等是 HTTP 语义,业务幂等是另一层。三刀:"幂等键的文档?"——幂等键的生成规则/作用域/TTL(第 3 题 banking)——幂等键自身的契约(文档,第 14 题)。'),
    ],
    ['名字不表达,三层才表达', '服务端去重+契约声明+SDK 自动', '资金接口强制键,缺失 400'], [pod],
  ),
  'java-language/49': deep(
    '如何评审一个看似简洁却难维护的链式表达式？',
    '网银评审沙盘:一行链式(orders.filter(o -> o.amount > 100).map(Order::id).collect(groupingBy(..., summingLong(...))))——简洁但调试困难(断点难打/中间值不可见/异常定位模糊)——链式的评审:可调试性+异常信息+中间命名。',
    [
      '链式的三类维护痛点:调试难(中间值不可见——断点/日志插入要改结构)、异常模糊(NPE 在链中哪一环?栈只有一行)、类型推断复杂(嵌套泛型的推断失败信息)。',
      '评审的判据:链长(≤3-4 个操作)、副作用(纯转换)、异常可定位(链中的 NPE/ClassCastException 可定位到环)——超限=拆分(中间变量命名)。',
      '拆分的形态:中间变量命名(List<Order> filtered = ...; List<Long> ids = ...)——命名的中间值=可调试+可注释+类型显式;或者peek 调试(临时,第 15 题)。',
    ],
    [
      block('机制:链式的调试与异常', '调试:链中的中间值不可见(IDE 的 Evaluate 也要模拟流状态)——拆分为中间变量后断点/日志自然。异常:链中的 NPE(map 中 null 元素的映射)——栈指向 lambda 行但不知道哪个元素(元素级定位难)——包装函数(带上下文的异常,第 44 题distributed)。类型推断:嵌套泛型(嵌套 collect 的 Map<String, Map<...>>)——推断失败的错误信息——中间变量显式类型。'),
      block('反例:链式的两种事故', '事故一,异常定位难:链中 NPE 的栈只有 lambda 行(不知道哪个订单的哪个字段 null)——排查时间×5。事故二,修改风险:链的中间插入操作(同类型链)——插入位置错误(顺序依赖)——语义模糊。两条的正解:链长控制(≤4)+中间变量命名(关键中间值)+异常包装(上下文)。'),
      block('取舍:简洁与可维护的平衡', '简洁的价值:声明式意图(过滤→映射→归并的意图清晰);可维护的代价:调试/异常/修改。平衡:意图清晰的短链(保留)+复杂逻辑拆分(中间变量)——"简洁"服务可读,不为简洁而简洁(第 49 题 distributed 文档的信任同构)。评审的话术:不是"这行太长",而是"这链的中间结果值得命名"(具体的改进建议,第 38 题)。'),
    ],
    [
      block('验证:评审判据的断言组', '验证:链长断言(链的操作数统计——超 4 的链列出);调试断言(拆分后的中间变量断言/日志可行——可调试性实证);异常定位断言(链中 NPE 的定位时间——拆分前后对照)——三组固化链式评审;链长与拆分的度量(第 48 题)进评审清单。'),
      block('追问链:链式三刀', '一刀:"Optional 链?"——Optional 的链式(map/orElse)——Optional 链的调试同样难(中间值不可见,第 14 题)——Optional 链的同款判据(≤3)。二刀:"builder 链?"——builder 链(构建器的 fluent API)——builder 链的意图清晰(构建语义)——builder 的链通常合理(构建是单步意图)。三刀:"流与循环的边界?"——简单转换用流(声明式),复杂逻辑(多分支/异常处理)用循环(命令式)——流与循环的选择按"逻辑复杂度"而非"风格偏好"(第 15 题)。'),
    ],
    ['链长≤4,中间值命名', '异常可定位,调试可打点', '简洁服务可读,不为简洁而简洁'], [pod],
  ),
  'java-language/50': deep(
    'Java 版本升级前应验证哪些兼容性？',
    '网银升级沙盘:JDK 17→21 升级——兼容性五面:语言与 API(移除/弃用的 API)、字节码与运行时(类文件版本/JIT 行为)、GC 与内存(默认 GC 行为变化,第 46 题)、依赖与工具链(框架/构建工具的版本支持)、序列化与安全(JEP 290 过滤器/安全管理器移除)。',
    [
      '五面的验证清单:语言 API(jdeps 扫描)、字节码(类文件版本)、GC(默认参数变化——日志对比)、依赖(框架 JDK 支持)+序列化(过滤器/SecurityManager 禁用)。',
      '验证的三级:静态分析(jdeps/jdeprscan 的 API 使用扫描)、运行测试(全量回归+真值测试,第 49 题)、灰度对照(生产流量双版本对照——分布式 42 题框架)。',
      '与本仓库的衔接:本仓库已跑 JDK 17(spring 6.2.19)——升级 21 的回归集=本仓库的真值测试(SpringAdvancedExamplesTest)+90 后端测试+前端测试——回归集的完备性决定升级的可信度(第 49 题)。',
    ],
    [
      block('机制:五面的具体验证', '面一,语言 API:jdeps --jdk-internals(内部 API 使用)+jdeprscan(deprecated 使用)——扫描清单逐项处理(替换/保留[配 --add-opens])。面二,运行时:类文件版本(61→65——编译目标与运行版本)、instrumentation(agent 的兼容)。面三,GC:默认 GC 的参数变化(G1 的默认值演进)+新 GC(分代 ZGC[21]的评估)+GC 日志的对比(暂停时间/吞吐)。面四,依赖:框架矩阵(Spring/MyBatis/Netty 的 JDK 支持表)+构建工具(maven-compiler-plugin 的 release 参数)。面五,序列化:JEP 290 过滤器的默认行为+SecurityManager 的安全检查在 JDK 17 标记弃用(JEP 411)、JDK 24 由 JEP 486 永久禁用(设置后不再生效)——依赖 SecurityManager 的代码迁移。'),
      block('反例:升级遗漏的三种事故', '事故一,内部 API 依赖:sun.misc.BASE64Encoder(JDK 内部)——升级后 NoClassDefFoundError——jdeps 前移发现。事故二,GC 行为漂移:默认堆参数/GC 触发阈值变化——内存行为漂移(第 46 题distributed 的升级兼容)。事故三,依赖不兼容:框架不支持新 JDK(字节码增强[ASM 版本]失败)——启动即崩(依赖矩阵先行)。三条的正解:五面清单+三级验证+灰度对照——升级的系统化。'),
      block('取舍:升级的策略与节奏', '策略:LTS 跳跃(17→21→25)+每 LTS 内小版本跟安全补丁——LTS 策略减少升级频率。节奏:升级先于"必须"(被动升级=紧急+风险;主动升级=从容)——升级的保鲜期(第 17 题 distributed)。回滚:旧版本制品保留(第 35 题)+回滚条件(第 46 题)+升级演练(第 46 题灾备演练)——升级是变更,走变更纪律。'),
    ],
    [
      block('验证:升级验证的断言组', '验证:静态断言(jdeps/jdeprscan 扫描零未处理项);回归断言(全量测试在新 JDK 全绿——含真值测试[本仓库 SpringAdvancedExamplesTest 编译执行]);灰度断言(双版本对照的性能与稳定性指标)——三组固化升级验证;升级报告(五面清单+验证结果)进 ADR(第 18 题)。'),
      block('追问链:升级三刀', '一刀:"preview 特性?"——preview 特性(--enable-preview)的锁定(版本绑定——preview 在下一版变更)——preview 的生产禁用(除非接受版本锁定)。二刀:"依赖的先行?"——依赖的升级先行于 JDK(框架先支持新 JDK,再升 JDK)——顺序:依赖兼容性检查→依赖升级→JDK 升级——顺序反了=依赖崩(第 49 题回归集)。三刀:"升级的团队沟通?"——升级的影响面(行为变化/性能变化/依赖变化)进团队公告——升级的知识共享(第 38 题评审不垄断)——升级不是个人的事。'),
    ],
    ['五面验证:API/运行时/GC/依赖/序列化', '三级验证:静态/回归/灰度', 'LTS 策略+主动升级,不被动'], [sre],
  ),

  'java-language/51': deep(
    'switch 模式匹配与传统的 instanceof 链有何不同？',
    '网银报文沙盘:解析多种消息类型时，旧代码用 instanceof 链逐级判断并强转；团队升级到 JDK 21 后讨论改用 switch 模式匹配，需要说明空值、穷尽性与版本边界。',
    [
      '模式匹配把"类型判断 + 强转 + 取值"合成一条表达式或语句，减少样板代码；变量只在匹配成功的作用域内可用。',
      'switch 模式匹配在 JDK 21 转正（JEP 441），可配合 record 解构与 guard 条件；null 必须用 case null 显式处理，否则会抛 NullPointerException。',
      '穷尽性只在密封类型等已知类型集合下可被编译器静态保证；面对开放继承体系仍需 default 分支，不能说"switch 模式一定穷尽"。',
    ],
    [
      block('机制:从判断强转到绑定变量', '传统写法先 if (obj instanceof Order o) 再使用 o，重复判断与强转；模式匹配在匹配成功时直接绑定变量。switch 进一步把多个类型分支集中到一个表达式，record 模式还能拆出组件。类比海关查验:旧写法是"看护照—确认国籍—再翻译"三步重复；模式匹配是一次查验后直接给对应通道的通行证——但无护照（null）的人仍要单独处理。'),
      block('边界:null 与穷尽性是两个问题', 'switch 对 null 不自动放行:传统写法里没有分支命中时可能落到 else，而 switch 需要显式 case null（或先判空），否则运行时抛 NPE。穷尽性方面，sealed 类/接口限定了许可子类，编译器可检查所有分支；普通接口或父类可被任意新类实现，必须有 default 兜底。'),
      block('取舍:可读性与版本约束', '模式匹配减少强转和临时变量，适合多类型分派；复杂 guard 条件和过多分支仍会损可读性，必要时保留策略表或 Visitor。版本上，项目基线 Java 17 不能编译 JDK 21 的 switch 模式；回答要给出版本前提和 null 处理策略。'),
    ],
    [
      block('验证:分支覆盖的推演', '教学验证（JDK 21+）:构造 Order、Refund、未知类型与 null 四类输入，断言前三类进入对应分支、null 按 case null 处理；再新增一个未覆盖的 sealed 子类，观察编译是否报错。该验证为设计口径，本项目 Java 17 基线未运行该实验。'),
      block('追问:instanceof 模式还常用吗', '常用。单个类型判断用 instanceof 模式更简单，只需要提取一个组件时也不会引入多余的分支语法；多类型分派或需要一次性解构 record 的多个组件时，switch 模式更集中。两者不是替代关系，按分支数量和是否需要解构选择，混合使用也很正常。'),
    ],
    ['匹配即绑定，少写强转', 'null 显式处理，穷尽靠 sealed', 'JDK 21 转正，17 不能用'], ['https://openjdk.org/jeps/441', 'https://openjdk.org/jeps/409'],
  ),

};
