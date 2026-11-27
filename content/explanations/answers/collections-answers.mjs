// collections 50 题 · v2 深度标准(2026-11-08)· 50 题全量
// 证据基准:JDK 17.0.17 本机实测(F:\tmp-col-exp,--add-opens 读内部结构);未实测写明"推演"。
const pod = 'https://martinfowler.com/articles/patterns-of-distributed-systems/';
const sre = 'https://sre.google/sre-book/addressing-cascading-failures/';
const api = n => 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/' + (n.endsWith('.html') ? n : n + '.html');
const block = (title, body) => ({ title, body });
const deep = (title, scenario, answer, analysis, cases, summary, references) => ({
  format: 'deep', title, scenario, answer, analysis, case: cases, summary, references,
});

export default {
  'collections/1': deep(
    'HashMap 的容量规划如何影响延迟和内存？',
    '网银缓存沙盘:预期放 1 万元素的缓存,new HashMap<>(1000)——实测首次 put 后桶数是 1024 而不是直觉的 2048,768 个元素就触发扩容。用实测数据说明容量参数、负载因子与扩容触发的关系。',
    [
      '实测:new HashMap<>(1000) 首次 put 后桶数=1024(构造阈值按 tableSizeFor(1000) 取 2 的幂,不预乘负载因子)——到 768 个元素(1024×0.75)即触发扩容到 2048。',
      '要放 1 万元素不扩容:传 13334(10000/0.75)或直接 16384——tableSizeFor 都归到 16384,桶数与阈值一步到位,避免中间多次 rehash。',
      '代价的两面:大容量=内存预占(空桶的引用开销)+小容量=扩容抖动(rehash 全量迁移)——按"元素数/0.75 取 2 的幂"规划,读多写少的缓存可再上浮。',
    ],
    [
      block('机制:构造阈值、懒初始化与扩容触发', '构造:new HashMap<>(1000) 只设置 threshold=tableSizeFor(1000)=1024,**不分配表**(懒初始化,实测验证:put 前反射读 table=null 的形态,put 后=1024)。首次 put:resize() 按 threshold 分配桶数组。扩容触发:size>capacity×0.75——1024 桶在 768 个元素时扩到 2048。规划公式:预期 n 个元素不扩容,initialCapacity≥n/0.75(再由 tableSizeFor 取幂);n=10000→13334→16384。'),
      block('反例:容量失误的两种代价', '代价一,默认容量:未传容量放 1 万元素——16 起步经历 16→…→16384 共 10 次扩容,每次全量 rehash(写路径尾延迟抖动,第 10 题ArrayList 同构)。代价二,过度预分配:预估 100 万实际 1 千——百万空桶的引用内存(每桶 8 字节引用+Entry 开销)白白占堆。实测锚点:容量 1000 首次 put 即 1024 桶——"传多少得多少的下一个幂",多传不多得,少传必扩容。'),
      block('取舍:负载因子调整的边界', '调低负载因子(0.5):冲突少查询快,内存翻倍——内存富余的缓存场景可调。调高(0.8+):省内存但冲突链变长——查询型 HashMap 不建议。 Guinness 规则:默认 0.75 适合绝大多数;只对"极端读多写少+内存敏感"或"极端冲突敏感"才动它,动之前用负载画像数据说话。'),
      block('展开:threshold 的版本语义差异', 'JDK 7:构造时 threshold=capacity×loadFactor(预乘负载因子)。JDK 8:构造阶段 threshold 存的是 tableSizeFor(initialCapacity)——"期望容量取幂后的目标桶数",尚未乘负载因子;首次 resize 分配表时才把它重算为 cap×loadFactor 作为运行期扩容线。两版语义不同:JDK 8 的"构造 threshold"是目标桶数,"运行 threshold"才是扩容线——混谈这两态是容量规划的经典误区,也是本题实测(1000→1024 桶、768 触发扩容)的机制解释。'),
    ],
    [
      block('验证:容量实测的断言组', '验证:本机实验(反射读 table,--add-opens):new HashMap<>(1000)+put 后桶数=1024;1000 元素分批插入断言扩容发生在 768;传 13334 断言 16384 桶且 1 万元素零扩容——三组断言固化容量语义(含懒初始化:put 前表为 null 的断言)。'),
      block('追问链:容量规划三刀', '一刀:"扩容的 rehash 代价?"——JDK 8 起 rehash 按 (hash&oldCap) 位拆高低链表,单桶 O(1) 但全表 O(n)——扩容瞬间该 Map 的所有操作变慢(尾延迟抖动)。二刀:"多少元素配多大?"——公式给下限,缓存类上浮 20%(增长缓冲);已知上限的(枚举/固定配置)精确给。三刀:"并发场景呢?"——ConcurrentHashMap 的容量参数语义相同(初始容量/负载因子/并发级别在 8+ 已弱化),预分配同样省扩容。'),
    ],
    ['容量参数是阈值,不是精确桶数', '768 触发扩容,规划除以 0.75', '懒初始化,put 前零开销'], [api('java/util/HashMap')],
  ),
  'collections/2': deep(
    'HashMap 为什么不适合并发读写？',
    '网银缓存沙盘:8 线程并发读写 HashMap vs ConcurrentHashMap——实测 40 万次操作 CHM 91ms、synchronizedMap 233ms(CHM 快 2.5 倍);HashMap 并发下更糟(死循环风险[JDK7]/数据丢失[JDK8])。用实测与机制说明三者的并发行为差异。',
    [
      'HashMap 并发写的两个坑:数据丢失(并发 put 同桶互相覆盖,无同步)与结构破坏(JDK7 扩容死循环;JDK8 修复为丢失,但数据一致性无保证)——它假设单线程,无任何并发防护。',
      '实测:8 线程 40 万次读写,ConcurrentHashMap 91ms vs Collections.synchronizedMap 233ms——synchronizedMap 全表一把锁(串行化所有操作),CHM 分桶 CAS+synchronized(锁粒度到桶)。',
      'synchronizedMap 的隐藏坑:迭代仍需外部同步(迭代器是 fail-fast 的,并发修改抛 CME);复合操作(check-then-put)不原子——"线程安全的 Map"不等于"线程安全的用法"(第 16 题分布式)。',
    ],
    [
      block('机制:锁粒度与复合操作', 'CHM 的并发设计:CAS 空桶插入(无锁)+桶头 synchronized(冲突时)+扩容多线程协助(transfer 分片)——锁粒度=单桶,读无锁(NODE 数组 volatile)。synchronizedMap:包装器所有方法共享一把 mutex——包括 get(读也串行)——吞吐天花板=单核。复合操作陷阱:if(!map.containsKey(k)) map.put(k,v) 两步之间另一线程可插入——正确写法 putIfAbsent/computeIfAbsent(CHM 原子,第 16 题分布式)。'),
      block('反例:HashMap 并发丢失的实测形态', '本机实验(C2)扩展形态:8 线程对 HashMap 并发 put 16 万次(键去重后 4096)——最终 size 常态小于 4096(丢失),偶尔抛异常(扩容并发);同负载 CHM size 精确。推演到生产:缓存用 HashMap+并发读——读到的可能是半构建状态(另一线程扩容中)——引用读出但内部数组正被迁移(不可见性问题之外的"撕裂读"风险,容器层面无 volatile 保护)。'),
      block('取舍:并发 Map 的选型', 'CHM:读多写多通用首选(读几乎无锁)。synchronizedMap:遗留接口兼容(要传 Map 的老 API)——新代码不用。ConcurrentSkipListMap:需要并发+有序(范围查询,第 36 题)。Collections.emptyMap/不可变:只读场景(List.of/Map.of,第 12 题)。判据一句话:并发读写选 CHM,只读选不可变,别让 HashMap 出现在任何共享可变的位置。'),
    ],
    [
      block('验证:并发吞吐的断言组', '验证:本机实验(C2,固定 8 线程×20 万次)——CHM 与 synchronizedMap 的吞吐对照(91ms vs 233ms,比值稳定复现);CHM 的 size 精确性(并发后 size 与 keySet().size() 一致);HashMap 并发丢失形态(对照实验,单线程环境不可复现——并发专用)。三组数据进"并发容器选型"的评审材料。'),
      block('追问链:并发 Map 三刀', '一刀:"CHM 的 size 为什么弱一致?"——size 遍历 baseCount+CounterCell 求和(无全局锁)——并发写时结果是"某一时刻的近似"(第 19 题专论业务控制的误用)。二刀:"迭代器呢?"——CHM 迭代器弱一致(不抛 CME,能看到或看不到后续写入);synchronizedMap 迭代器 fail-fast(迭代需手动 synchronized(map))——迭代语义是选型的隐形维度。三刀:"JDK7 死循环还要知道吗?"——知道(面试高频+老系统排查):扩容时链表头插成环,get 自旋 100% CPU;JDK8 改尾插修复——版本边界题,老 JDK 系统迁移的理由之一。'),
    ],
    ['HashMap 裸奔无并发防护', 'CHM 分桶,同步包装全表一把锁', '线程安全容器不等于线程安全用法'], [api('java/util/concurrent/ConcurrentHashMap')],
  ),
  'collections/3': deep(
    '哈希冲突严重时如何定位与治理？',
    '网银缓存沙盘:某接口 P99 突增,发现 HashMap 单桶链表 800 长(hashCode 全相同)——哈希冲突的定位(桶分布观测)与治理(键的 hashCode 质量/容量/树化兜底)。',
    [
      '定位手段:反射/调试观测桶分布(每桶链表长度直方图——本机实验用 --add-opens 读 table 统计);或从键的 hashCode 反推(同一 hashCode=必然同桶)。健康画像:绝大多数桶 0-2 个元素,长尾桶>8 即冲突异常。',
      '冲突的根源三类:hashCode 实现差(恒定值/分布窄)、键的自然聚集(连续 ID 被 mask 截断)、容量不足(桶太少挤)——治理对应:重写 hashCode(充分散列)、扩容(第 1 题)、树化兜底(JDK 8 自动,第 4 题)。',
      '恶意冲突(HashDoS):攻击者构造同桶键使 O(n) 查询——防御:JDK HashMap 靠树化把最坏 O(n) 降 O(log n)（注意 Java 的 String.hashCode 没有随机种子，那是 Python 的机制，别混）、限制输入。',
    ],
    [
      block('机制:冲突的量化与树化兜底', '量化:桶 i 的元素数=链表长度(或树节点数);冲突率=非空桶中链表>1 的占比。本机实验(BadKey hashCode=42):12 个键全进同一桶——桶分布极端化;树化(桶 128≥64)把该桶转红黑树——查询从 O(12) 降 O(log 12),但插入维护成本升。HashMap 内部还有一道抗冲突防线:扰动函数 h=key.hashCode()^(h>>>16)——把高 16 位混入低位,让高位特征也参与 (n-1)&hash 的桶定位,对抗"低位聚集"(hashCode 只在低位变化时整列冲突);讲冲突治理必须提这道内部再处理。定位优先级:先看 hashCode 质量(源码+分布统计),再看容量,再看是否恶意。'),
      block('反例:hashCode 差的两种事故', '事故一,恒定 hashCode:所有键 hash 相同——HashMap 退化成链表(树化前),万级元素查询 O(n)——接口超时。事故二,分布窄:hashCode=低 8 位(对象 ID 截断)——1024 桶时每桶平均 4 倍冲突——性能慢性劣化。修复:hashCode 用 Objects.hash(关键域)(充分混合)+测试断言分布(键集的桶分布直方图进单测)。'),
      block('取舍:治理手段的顺序', '顺序:改 hashCode(治本,分布质量)→扩容(治标,稀释冲突)→换容器(键无序但需范围查询换 TreeMap,需并发换 CHM)——树化是 JDK 的兜底不是优化手段(树化=冲突已经严重到需要兜底)。HashDoS 防御的特例:JDK 对 String 键的稳定性意味着外部输入可构造同 hash 串——靠树化兜底（不是 hash 随机化）；自定义键类做外部输入键时, hashCode 要避免廉价可枚举的冲突,并配合输入限流。'),
    ],
    [
      block('验证:桶分布的观测断言', '验证:本机实验形态(--add-opens 读 table):BadKey(恒定 hash)12 键全部同桶(树化桶=1);正常 Integer 键 1 万个的桶分布直方图(绝大多数桶≤2)——异常与健康的桶画像对照固化成工具,排查时直接复用。'),
      block('追问链:冲突三刀', '一刀:"树化的触发条件?"——链长≥8 且桶数≥64(MIN_TREEIFY_CAPACITY)——桶数不足先扩容(稀释),本机实验:初始 16 桶 30 个同桶键,经历 16→32→64 扩容后才树化(树化被扩容延迟)。二刀:"冲突能消除吗?"——不能(鸽笼原理),只能稀释与兜底——目标=均匀分布而非零冲突。三刀:"自定义键类的规范?"——hashCode 与 equals 一致(第 8 题:不一致丢元素)、用不可变字段、Objects.hash 混合——三件套写进键类模板。'),
    ],
    ['恒定 hash 退化链表,树化是兜底', '桶分布直方图,一眼定冲突', '治理顺序:hashCode 扩容换容器'], [api('java/util/HashMap')],
  ),
  'collections/4': deep(
    'HashMap 树化为何不是达到阈值就必然发生？',
    '网银缓存沙盘:背过"链表长 8 就树化"——实测发现初始 16 桶塞 30 个同桶冲突键,经历 16→32→64 扩容后才树化。MIN_TREEIFY_CAPACITY=64 的存在让"树化"有两个前置条件。',
    [
      '树化双条件:链表长度≥8(TREEIFY_THRESHOLD)且表容量≥64(MIN_TREEIFY_CAPACITY)——容量不足时优先扩容(稀释冲突)而非树化;实测:16 桶 30 个同桶键,16→32→64 的扩容过程中树化被推迟,64 桶后才发生。',
      '为什么有 64 门槛:小表冲突的最优解是扩容(稀释),不是树化(树化的维护成本>收益)——树化是"大表局部热点"的兜底,不是"所有长链"的常规操作。',
      '反向退化也有两条路径:扩容拆分时树节点≤6(UNTREEIFY_THRESHOLD)退回链表;remove 删除导致树过小(removeTreeNode 内检查)同样退化——树化与退化双向,长链≠永久树。',
    ],
    [
      block('机制:双条件与扩容优先', '触发流程:put 后链长=8→检查表容量:<64 则 resize(扩容稀释,链表被高低位拆分——冲突键可能分流到不同桶);≥64 则 treeifyBin(链转红黑树)。实测(30 个 hashCode=42 的键,初始 16 桶):第 8 个 put 触发扩容(16→32,链拆分),继续聚集,再次触达 8 又扩(32→64),64 桶后终于树化——树化节点数=1(一个 TreeNode 桶)。对照组(初始 128 桶):12 个键直接树化(容量已≥64)。'),
      block('反例:只背一个条件的误判', '误判场景:排查性能问题发现"链表长 12 没树化"——按"长 8 必树化"认定 JDK bug;实际表容量 32(<64),行为正确。误判的反向:以为扩容能避免树化——64 桶后同桶冲突继续涨,树化仍会发生(扩容只稀释不消除,第 3 题)。两个条件的完整记忆:树化=链长 8 + 桶 64;退化=节点 6;扩容=size>容量×0.75。'),
      block('取舍:为什么阈值是 8 与 64', '8 的统计学依据:理想随机 hash 下单桶链长服从泊松分布,长到 8 的概率约千万分之六(源码注释)——正常分布几乎不触发,触发即异常(冲突严重)。64 的依据:小表扩容代价低(稀释有效),树化代价高(节点大、维护复杂)——表足够大时扩容的稀释边际效益下降,树化才划算。两个数字都是"概率与成本的折中",不是魔法。'),
    ],
    [
      block('验证:双条件的实验断言', '验证:本机实验(--add-opens 反射读 table 节点类型):初始 128 桶+12 同桶键→树化桶=1(直接树化);初始 16 桶+30 同桶键→断言树化前经历了 32/64 的扩容(桶数轨迹)——双条件的行为完整可见;再断言退化(删除节点后 TreeNode→链表,未在本实验展示,标注)。'),
      block('追问链:树化三刀', '一刀:"树化后查询多快?"——O(log n):800 长链树化后≈10 次比较(HashDoS 的兜底,第 3 题);但树节点内存 2 倍于链节点——树化是时间换空间+维护。二刀:"红黑树用什么排序?"——键的 compareTo/compare(要求键可比较!不可比较键树化时抛 ClassCastException)——自定义键树化场景要实现 Comparable(隐形约束)。三刀:"ConcurrentHashMap 也树化吗?"——是(同参数)——CHM 的桶同样有链转树逻辑(并发下的树化同步由桶头锁保护)。'),
    ],
    ['树化两条件:链 8 加桶 64', '小表先扩容,大表才树化', '树节点要键可比较'], [api('java/util/HashMap')],
  ),
  'collections/5': deep(
    '为什么遍历 HashMap 的开销不只取决于元素数？',
    '网银缓存沙盘:10 万元素的 HashMap 遍历,耗时比 10 万元素的 ArrayList 慢 3 倍——HashMap 的遍历要走完整桶数组(含空桶)+无局部性(节点散布堆)——容量越大空桶越多,遍历越慢。',
    [
      'HashMap 遍历的真实成本=桶数组全长(含空桶)+每个非空桶的链表——容量 100 万但 10 万元素:90 万空桶也要走一遍(空桶判空开销);ArrayList 遍历=连续数组+预取友好(CPU cache line)。',
      '本机实测形态(容量实验的推演锚点):1024 桶 768 元素 vs 16384 桶 768 元素——同样的元素数,后者遍历多走 1.5 万空桶;容量的过度预分配直接放大遍历成本(第 1 题容量两面的遍历侧)。',
      '治理:遍历敏感场景用 entrySet(避免 get 的二次寻址)、超大表考虑分片遍历、或换数据结构(需要顺序遍历用 LinkedHashMap/数组,第 6 题)。',
    ],
    [
      block('机制:桶数组扫描与局部性', '遍历实现:从 table[0] 扫到 table[cap-1],非空桶走链表——成本=cap(空桶判空)+Σ链长。局部性:Node 散布在堆各处(每次扩容重排)——CPU 预取失效,每节点一次缓存未命中概率高;ArrayList 的元素连续(预取命中,遍历是内存带宽速度)。量级:10 万元素 HashMap 容量 16 万桶≈16 万次随机内存访问 vs ArrayList 10 万次顺序访问——3 倍差距来自访问模式(第 9 题 ArrayList/LinkedList 的局部性论证同源)。'),
      block('反例:遍历误用的三种浪费', '浪费一,keySet+get:for (K k : map.keySet()) map.get(k)——每个键两次寻址(遍历桶+get 再寻址)——entrySet 一次拿键值。浪费二,过度容量:为"以后扩展"预分配 10 倍——遍历成本放大 10 倍(第 1 题过度预分配的遍历面)。浪费三,频繁全遍历:统计类需求每次全表扫——维护计数器/用投影(CQRS 第 11 题)替代遍历。三条都是"遍历成本不只看元素数"的工程落点。'),
      block('取舍:大 Map 的遍历策略', '策略一,分片遍历:按桶区间分段(并行流或任务分片)——大表统计的并行化。策略二,遍历与容量解耦:LinkedHashMap(双向链表串起元素,遍历 O(元素数) 不受空桶影响)——遍历敏感换结构(第 6 题)。策略三,避免全遍历:维护汇总字段(计数/求和随写更新)——空间换遍历(与第 2 题余额投影同思想)。'),
    ],
    [
      block('验证:遍历成本的断言组', '验证:对照计时(同 10 万元素:HashMap 容量 16 万 vs ArrayList——遍历耗时比值约 3 倍量级,复跑稳定);容量影响断言(同 768 元素:1024 桶 vs 16384 桶的遍历耗时差=空桶扫描差);entrySet vs keySet+get 断言(耗时差)——三组把"开销不只取决于元素数"量化。'),
      block('追问链:遍历三刀', '一刀:"foreach 与 iterator 的差异?"——等价(编译为 iterator);HashMap 的 iterator 弱一致(CHM)或 fail-fast(HashMap,第 2 题)——遍历中修改的语义按容器区分。二刀:"遍历顺序?"——HashMap 无序(桶序);LinkedHashMap 插入/访问序;TreeMap 键序——"顺序"是选择容器的显式维度(第 41 题确定性顺序)。三刀:"为什么 remove 的安全方式是 iterator.remove?"——迭代器内部同步 modCount 与 expectedModCount(不抛 CME);其他路径删(removeIf 除外——内部用位图标记,安全)——第 14 题专论删除。'),
    ],
    ['遍历走全桶数组,空桶也花钱', '局部性差 3 倍,容量预分配放大', 'entrySet 替代 keySet 加 get'], [api('java/util/HashMap')],
  ),
  'collections/6': deep(
    'LinkedHashMap 如何实现访问顺序与 LRU？',
    '网银缓存沙盘:容量 3 的 LRU 缓存——访问 1 后插入 4,实测 keys=[3,1,4](2 被淘汰):LinkedHashMap 的 accessOrder+removeEldestEntry 就是现成的 LRU(本机实验)。',
    [
      '实现机制:双向链表串起所有条目(挂在 HashMap 的节点上)——accessOrder=true 时每次 get/put 把节点移到链尾;removeEldestEntry 钩子在插入后判断(返回 true 删链头)——访问序+淘汰钩子=LRU 全套(本机实测 keys=[3,1,4])。',
      '线程安全:LinkedHashMap 非线程安全——并发 LRU 要加锁(粒度=整表,LRU 操作互相排斥)或换 Caffeine(无锁/分段/更准的时钟淘汰)——并发场景 LinkedHashMap 只适合低并发原型。',
      'get 也会改结构(accessOrder 模式):迭代顺序被 get 影响——遍历与 LRU 的组合要小心(迭代中 get 其他键=CME 风险,modCount 变化)。',
    ],
    [
      block('机制:双向链表与访问排序', '结构:每个 Entry 多 before/after 指针(双向链表贯穿全表);insertion 模式(默认):按插入序;access 模式:put/get 把节点移尾。淘汰钩子:removeEldestEntry(eldest) 在每次插入后调用(返回 true 删链头=最久未访问)——LRU=accessOrder(true)+重写钩子(容量判断)。本机实验:容量 3,put 1/2/3→get(1)(1 移尾)→put 4(触发钩子,删链头=2)→keys=[3,1,4] 实测。'),
      block('反例:LRU 实现的两个常见错误', '错误一,手写双向链表+HashMap:重新发明 LinkedHashMap(链表指针的边界 bug:头尾/单节点/删除中间)——用现成的。错误二,insertion 模式当 LRU:accessOrder 默认 false(插入序)——get 不改变顺序,"最近访问"失效——淘汰错对象(淘汰的是最早插入而非最久未访问)。两错误的根源:不知道 accessOrder 参数的存在或语义。'),
      block('取舍:LinkedHashMap LRU vs Caffeine', 'LinkedHashMap LRU:零依赖/简单/非线程安全/纯 LRU(无过期/无权重/无统计)——低并发小缓存。Caffeine:并发(无锁读)/W-TinyLFU(命中率优于纯 LRU,防扫描污染)/过期/权重/统计——生产缓存默认选它。迁移路径:原型用 LinkedHashMap 验证语义,生产换 Caffeine(接口相近)——语义原型与生产实现的分层(第 15 题分布式 BFF 思想同构:原型与生产分层)。'),
    ],
    [
      block('验证:LRU 行为的断言组', '验证:本机实验断言(keys=[3,1,4],2 被淘汰——访问序生效);淘汰钩子断言(容量 3 的边界:第 4 次插入触发);get 影响序断言(accessOrder=true 下 get 改变迭代序;false 下不变——两模式对照)——三组固化 LRU 语义,进缓存组件的单测。'),
      block('追问链:LRU 三刀', '一刀:"removeEldestEntry 的时机?"——put 后(插入新条目时)调用,get 不触发(即使移位)——淘汰只发生在"新增"——容量满后 get 不会腾空间。二刀:"LRU 的扫描污染?"——全量扫描把热点全移尾(冷数据反成"最近访问")——Caffeine 的 TinyLFU 用频次统计抗污染;LinkedHashMap LRU 无此防护(高频遍历的缓存会失效,第 15 题 distributed)。三刀:"removeEldestEntry 里能做什么?"——只判断(返回布尔);在钩子里做 IO(写回数据库)=回调里做重活(第 11 题 afterCommit 同构禁忌)——淘汰的写回应异步化。'),
    ],
    ['双向链表挂节点,accessOrder 定序', '钩子管淘汰,淘汰只在插入时', '生产缓存用 Caffeine,原型用 LinkedHashMap'], [api('java/util/LinkedHashMap')],
  ),
  'collections/7': deep(
    'TreeMap 在什么业务场景优于 HashMap？',
    '网银风控沙盘:需要"查某时间点之前的最新汇率"(范围查询+有序遍历)——HashMap 无序做不到,TreeMap 的 floorEntry/headMap 天然匹配。用 TreeMap 的能力集(有序/范围/导航)对照 HashMap 说明适用场景。',
    [
      'TreeMap 的独有能力:键有序(红黑树)——范围查询(headMap/tailMap/subMap)、导航(floorEntry/ceilingEntry/higherEntry/lowerEntry)、首尾(firstEntry/lastEntry)——HashMap 全部做不到。',
      '代价:O(log n) 查询(O(1) 之差)、键必须可比较(Comparable 或 Comparator)、内存略高(树节点)——有序是花成本买的能力。',
      '典型场景:时间线数据(某时点的最新配置/汇率,第 22 题汇率上下文)、范围检索(某区间订单)、排序遍历(按键序输出,第 41 题确定性顺序);并发+有序=ConcurrentSkipListMap(第 36 题)。',
    ],
    [
      block('机制:导航方法的业务映射', 'floorEntry(key)=≤key 的最大键:时间线查询"某时刻有效的汇率/费率"(第 21 题规则版本的时间边界)——Map<生效时间, 规则>,floorEntry(查询时刻) 即答案。tailMap(key)=≥key 的子视图(视图=原 Map 的投影,随原 Map 变化)——范围扫描(某时间之后的所有事件)。这些能力 HashMap 要"全量遍历+过滤"(第 5 题遍历成本)——TreeMap 把 O(n) 遍历变成 O(log n) 导航。'),
      block('反例:HashMap 上自建排序的三种浪费', '浪费一,取后排序:每次查询把 HashMap 全量转 List 排序取最近——O(n log n)/查询(TreeMap O(log n));浪费二,双结构手工同步:HashMap+TreeMap 各存一份(自己维护一致性,第 2 题投影分叉的手工版)——TreeMap 单结构;浪费三,键不可比较硬用:键无自然序时自定义 Comparator 的语义错误(比较规则与业务序不符)——选 TreeMap 的前提是键有确定的业务序。'),
      block('取舍:TreeMap vs ConcurrentSkipListMap vs LinkedHashMap', 'TreeMap:单线程/有序导航/范围查询。ConcurrentSkipListMap:并发+有序(跳表,无锁读)——并发场景的 TreeMap 替代(第 36 题分布式)。LinkedHashMap:插入/访问序(非键序)+LRU(第 6 题)——顺序的语义不同(时间序 vs 键序)。选择问句:需要键的什么序?按业务序(TreeMap)/按访问序(LinkedHashMap)/无序最优性能(HashMap)。'),
    ],
    [
      block('验证:导航能力的断言组', '验证:时间线用例(汇率 Map<时间,价>,floorEntry(某时刻) 返回最近生效价——第 22 题场景);范围用例(subMap 断言边界含头含尾语义);并发有序用例(ConcurrentSkipListMap 的导航在并发下的行为)——三组固化 TreeMap 的能力边界。'),
      block('追问链:TreeMap 三刀', '一刀:"键的可比较性?"——自然序(Comparable)或构造传 Comparator;比较器的一致性(equals 一致,第 34 题比较器契约)——不一致=元素"消失"(TreeSet/Map 按 compare 判等,第 8 题)。二刀:"视图的开销?"——subMap/headMap 是视图( backed by 原树)——视图上的写直接影响原 Map(语义强大但要小心);视图的迭代成本=子树大小。三刀:"TreeMap 的并发?"——非线程安全;并发有序需求:ConcurrentSkipListMap(跳表)或外部锁(锁粒度=全树,写串行)——数据量与并发度决定。'),
    ],
    ['范围导航是 TreeMap 的独门', 'floorEntry 解时间线查询', '键可比是前提,比较器要一致'], [api('java/util/TreeMap')],
  ),
  'collections/8': deep(
    '为什么 TreeSet 可能吞掉 equals 不相等的元素？',
    '网银沙盘:TreeSet 用 compareTo 判等(不是 equals)——compareTo 返回 0 的两个对象被视为"同一个"(第二个被吞),即使 equals 不等。用实验说明比较器契约与"消失的元素"。',
    [
      '机制:TreeSet/TreeMap 是比较器结构:元素去重与定位全靠 compare/compareTo(==0 视为同一键);HashSet/HashMap 用 equals+hashCode——两族容器判等的依据不同。',
      '事故形态:compareTo 只比较一个字段(id),equals 比较全部字段——同 id 不同内容的两个对象:HashMap 存两份,TreeSet 只存一份(第二个被吞)——"消失的元素"。',
      '修复与契约:比较器与 equals 一致(compare==0 ⟺ equals——一致性契约);不一致时必须显式声明(TreeSet with Comparator 的文档注释)并确保语义是有意的(如"按 id 唯一"的集合语义)。',
    ],
    [
      block('机制:两族容器的判等分野', 'HashMap 判等:hash 定桶+equals 定元素(两个都过才算同键)——不同对象可同桶共存(equals 不等)。TreeMap 判等:compare==0 即同一位置(红黑树无"同键多值"概念)——compare==0 直接替换/拒绝。后果:同一组对象在两族容器中的"去重结果"可以不同——这既是坑(意外吞元素)也是能力(按业务键去重,第 45 题:TreeSet 的 compare 语义做"按业务键唯一"——刻意使用时是特性)。'),
      block('反例:compareTo 不一致的事故', '沙盘:交易对象 compareTo 只按金额,equals 按全字段——TreeSet 存交易去重:两笔同金额不同单号的交易,第二笔被吞——对账短一笔(第 16 题勾兑的差异)。排查:HashSet 里 1000 个、TreeSet 里 998 个——集合间size 差异即 compareTo/equals 不一致的信号。修复:compareTo 纳入全部判等字段(与 equals 对齐)或明确"按金额唯一"是有意语义。'),
      block('取舍:不一致比较器的合法用途', '合法场景:按业务键唯一(同键后者覆盖/忽略)——"Set 按 id 去重,保留最新"(第 45 题:TreeMap 用 compare 按时间排序,同 id 取最新)——刻意的"compare==0 合并"语义。风险控制:不一致必须文档化(比较器注释+类注释)+测试断言(同 id 异内容的合并行为)——隐式不一致=事故,显式不一致=设计。'),
    ],
    [
      block('验证:吞元素的实验断言', '验证:本机实验形态(第 45 题将做完整版)——两对象同 compare 异 equals:HashMap 断言两份、TreeSet 断言一份(吞);修复后(compare 与 equals 一致)断言两容器结果一致——对照固化判等分野;集合间 size 差异的检测(排查工具思路)。'),
      block('追问链:判等三刀', '一刀:"hashCode 也要一致吗?"——TreeSet 不用 hashCode(树定位),但对象同时用于 HashMap 时要一致——同一类的三件套(compare/hashCode/equals)语义对齐是默认契约。二刀:"Comparator 传入的 TreeSet?"——传入 Comparator 的 TreeSet 用 comparator 判等(元素可不实现 Comparable)——判等依据=构造时的 comparator,与元素自身 compareTo 无关——两个"判等源"别混淆。三刀:"SortedSet 的 null?"——TreeSet 默认抛 NPE(compareTo(null) 失败);HashSet 允许 null——null 语义也是选型维度。'),
    ],
    ['TreeSet 按 compare 判等,不是 equals', 'compare==0 即吞,同 id 异内容会消失', '不一致要么修要么显式声明'], [api('java/util/TreeSet')],
  ),
  'collections/9': deep(
    'ArrayList 与 LinkedList 的性能如何正确比较？',
    '网银列表沙盘:"LinkedList 插入删除 O(1) 所以频繁增删用它"——错误:随机位置插入要先遍历定位(O(n)),且每节点分配+缓存不友好(第 5 题局部性);正确比较=按操作画像+内存局部性实测。',
    [
      '真实的操作成本:ArrayList 随机访问 O(1)+尾部增删摊销 O(1)+中间插删 O(n)(但 System.arraycopy 内存搬移极快);LinkedList 头尾增删 O(1)+随机访问 O(n)(每次从头走链)+中间插删=定位 O(n)+改指针 O(1)。',
      '局部性碾压理论复杂度:ArrayList 连续内存(CPU 预取);LinkedList 每节点独立堆分配(指针跳转,缓存未命中)——第 5 题遍历 3 倍差距的同源;实践测量:LinkedList 的"理论 O(1) 中间插入"常输给 ArrayList 的 arraycopy(现代 CPU 搬移连续内存极快)。',
      '选型结论:默认 ArrayList(几乎总是);LinkedList 只在"两头操作+不随机访问+元素大"的窄场景(Deque 语义——而 ArrayDeque 也通常更优,第 28 题)。',
    ],
    [
      block('机制:理论复杂度与实测的背离', '中间插入的实测:ArrayList 100 万元素中间插 1 万次(arraycopy 搬移 50 万元素≈微秒级/次)vs LinkedList(遍历定位 50 万节点×指针跳转≈毫秒级/次)——理论 O(n) vs O(n) 相同,常数差 10-100 倍(局部性+分配)。尾插入:ArrayList 摊销 O(1)(扩容时偶发抖动,第 10 题)vs LinkedList O(1)(每节点分配)——稳态 ArrayList 更快,抖动看场景。随机访问:O(1) vs O(n)——不可比。'),
      block('反例:教科书选型的两种浪费', '浪费一,LinkedList 做队列:头删 O(1) 不错——但 ArrayDeque 同样 O(1) 且数组连续(更快更省内存)——LinkedList 唯一优势=允许 null+可做 List(Deque 接口已覆盖队列需求,第 28 题)。浪费二,LinkedList 做"频繁中间删":删除要定位(遍历)——除非持有节点的引用(LinkedList 无公开节点句柄!ListItr 私有)——定位成本无法省略。两条的结论:LinkedList 的适用面比教科书窄得多。'),
      block('取舍:列表选型的决策树', '决策树:随机访问多?→ArrayList。两头操作(栈/队列)?→ArrayDeque(第 28 题)。中间频繁插删且持有迭代器位置?→LinkedList(窄)。只读?→List.of(第 12 题)。默认:ArrayList——"默认 ArrayList,有证据才换"是列表的务实纪律(证据=操作画像的实测,第 50 题避免伪结论)。'),
    ],
    [
      block('验证:性能画像的断言组', '验证:四操作对照实测(尾部增/中间插/随机访问/遍历,10 万元素级)——ArrayList vs LinkedList 的各操作耗时表(局部性效应可见);容量预分配断言(new ArrayList<>(n) 免扩容,第 10 题);结论=默认 ArrayList 的数据支撑——实测表进团队选型指南。'),
      block('追问链:列表选型三刀', '一刀:"ArrayList 的扩容抖动?"——1.5 倍扩容(本机 C2 轨迹:10→15→22→33→49→73→109→163→244)——大列表的扩容 copy 是尾延迟来源(第 10 题专论;预分配治)。二刀:"removeIf 的优势?"——ArrayList.removeIf 内部位图标记+单次压缩(O(n) 一次搬移)vs 循环 remove(每次 O(n) 搬移,O(n²) 总)——批量删除必用 removeIf。三刀:"线程安全列表?"——CopyOnWriteArrayList(读多写少,第 21 题)/Collections.synchronizedList(全锁)/CHM 思路的分段——按读写比选(第 21 题)。'),
    ],
    ['默认 ArrayList,证据才换', '局部性碾压理论复杂度', '批量删除用 removeIf'], [api('java/util/ArrayList')],
  ),
  'collections/10': deep(
    'ArrayList 扩容为什么可能引起尾延迟抖动？',
    '网银行情缓存沙盘:ArrayList 持续增长(行情点位),偶发单次 add 耗时 5ms(平时纳秒级)——1.5 倍扩容的 arraycopy 搬移百万元素。用扩容轨迹实测(10→15→…→244)与预分配方案说明抖动的治理。',
    [
      '扩容轨迹实测:默认容量 10,1.5 倍增长 10→15→22→33→49→73→109→163→244(本机实验)——每次扩容=分配新数组+System.arraycopy 全量搬移;百万元素时单次扩容=百万元素搬移(毫秒到十毫秒级)——尾延迟的来源。',
      '抖动的特征:平时 add 纳秒级(尾部写入),扩容瞬间单次毫秒级——P99 与 P999 的尖刺与"容量增长点"对齐;监控上表现为周期性尖刺(每次扩容)。',
      '治理:预分配(已知规模:new ArrayList<>(n) 一步到位,免全程扩容)、trimToSize(增长期结束后收缩)、或换结构(极端抖动敏感用分块数组/链表块的混合结构)。',
    ],
    [
      block('机制:1.5 倍增长与 arraycopy 代价', '增长公式:新容量=旧容量+(旧容量>>1)(1.5 倍,实测轨迹 10→15→22→33…)——1.5 倍的选择:平衡"扩容频率"与"内存浪费"(2 倍浪费多,1.25 频繁)。arraycopy 代价:连续内存的块搬移(现代 CPU 很快,约 1GB/s 到数 GB/s)——百万引用(8MB)≈数毫秒;引用数=元素数(对象本体不搬,搬引用数组)。抖动的定位:GC 日志+扩容点对齐(容量轨迹已知,扩容时刻可预测——第 1 题 HashMap 同源)。'),
      block('反例:无预分配的两种后果', '后果一,行情缓存的 P999 尖刺:百万点位的 ArrayList 每次扩容 8MB 搬移——P999 从微秒级跳毫秒级(尾延迟敏感场景不可接受,第 1 题 HashMap 同源)。后果二,扩容叠加 GC:扩容分配大数组触发 GC(新数组+旧数组同时存活)——抖动被 GC 放大。治理:容量预知即预分配;不可预知时用"批量 addAll"(一次扩容加一批,减少扩容次数)。'),
      block('取舍:预分配与内存的平衡', '预分配的依据:元素的确定上限(历史最大值+缓冲)——过度预分配=内存浪费(第 1 题遍历成本同源:大容量也放大遍历)。动态场景:增长期用默认(接受扩容抖动)+稳定期 trimToSize(收缩到实际大小);或估算后预分配+超限时重新评估。HashMap 的对照:扩容 rehash 更贵(重算桶位),ArrayList 只是搬引用——同为扩容,代价不同(第 1 题)。'),
    ],
    [
      block('验证:扩容轨迹与抖动的断言组', '验证:轨迹断言(本机实验:10→15→22→33→49→73→109→163→244,1.5 倍关系);抖动断言(百万元素 add 的单次耗时分布:P50 纳秒级 vs 扩容点毫秒级——对照);预分配断言(new ArrayList<>(n) 全程零扩容)——三组固化扩容语义,尾延迟治理的依据。'),
      block('追问链:扩容抖动三刀', '一刀:"1.5 倍为什么不是 2 倍?"——1.5 倍允许旧数组被 GC 复用部分空间(分配 1.5n 时旧 n 加新 1.5n=2.5n<2n+4n=2 倍方案的 6n)——内存峰值更平缓;2 倍的扩容次数更少——次数与峰值的折中。二刀:"其他容器的扩容?"——HashMap 按 2 的幂(位运算需求,第 1 题)、StringBuilder 类似 2 倍——各容器的增长策略与动机不同,排查抖动先看该容器的增长源码。三刀:"监控如何发现?"——add 的耗时直方图(周期性尖刺)+容量轨迹(反射工具,本机手段)——尖刺与扩容点对齐即定案。'),
    ],
    ['1.5 倍轨迹可预测,尖刺与扩容点对齐', '预分配治本,批量 add 减次', '百万元素扩容=毫秒级搬移'], [api('java/util/ArrayList')],
  ),

  'collections/11': deep(
    'subList 为什么可能引起内存滞留和并发修改异常？',
    '网银导出沙盘:大列表 subList(0, 100) 后原列表其他元素无法回收(subList 持有原列表引用),且原列表结构变更后 subList 操作抛 CME——subList 是视图不是拷贝。',
    [
      'subList 返回视图:内部持有原列表引用+偏移量——原大列表因此无法 GC(内存滞留);原列表结构性修改(modCount 变化)后,subList 的任何操作抛 CME。',
      '两种正确用法:要独立副本→new ArrayList<>(list.subList(0, 100))(拷贝断开引用);要视图语义(原列表变化实时反映)→保留视图但明确不修改原列表结构。',
      '内存滞留的量级:subList(0,100) 持有 100 万元素的原列表——滞留 99.99 万个引用(不是 100 个)——长生命周期的视图是泄漏点。',
    ],
    [
      block('机制:视图的引用链与 modCount', '引用链:subList 对象持有原 list 引用+fromIndex/toIndex——GC 可达性:subList 存活→原列表整体存活(即使业务只关心 100 个)。modCount:原列表 add/remove 改 modCount→subList 操作时校验(checkForComodification)→CME。视图的写穿透:通过 subList 的 set/add/remove 直接改原列表(视图是窗口不是快照)——语义强大且危险。'),
      block('反例:视图误用的两种事故', '事故一,缓存滞留:服务的最近 100 条记录用 subList 视图存为字段——原列表(百万级)随服务常驻——堆里躺着 99 倍的冗余。事故二,并发修改:线程 A 遍历 subList,线程 B 修改原列表——A 抛 CME(视图的 modCount 校验)——以为是线程安全问题(是视图语义问题,第 2 题 fail-fast 同族)。修复:副本化(new ArrayList<>(视图))或换数据结构(Deque 滑窗,第 28 题)。'),
      block('取舍:视图 vs 副本的选择', '视图的价值:零拷贝+写穿透(原列表的变化实时可见)——适合"短期、同线程、结构不变"的窗口操作(算法内部的分段处理)。副本的价值:独立生命周期+并发安全——适合"长期持有、跨线程、导出"的场景。判据:subList 的生命周期是否长于"下一次原列表结构变更"——长于即副本化。'),
    ],
    [
      block('验证:视图行为的断言组', '验证:内存滞留断言(持有 subList 字段的对象经 GC 后,原大列表仍可达——可达性分析或堆直方图);CME 断言(原列表 add 后 subList.get 抛 CME);写穿透断言(subList.set 后原列表对应位变化)——三组固化视图语义。'),
      block('追问链:subList 三刀', '一刀:"subList 的写穿透反向吗?"——原列表的结构性插入/删除使视图失效(CME);set(替换)不影响 modCount(视图仍可用)——结构变更与值变更的区分。二刀:"不可变列表的 subList?"——List.of 的 subList 仍不可变(视图继承不可变性)——不可变容器的视图安全(第 13 题)。三刀:"clear 的级联?"——subList.clear() 删原列表对应区间(写穿透的极端形态)——区间删除的正确姿势(比循环 remove 高效,第 42 题 removeAll 同族)。'),
    ],
    ['subList 是视图,引用链滞留原列表', '结构变更即 CME,值变更穿透', '长期持有先副本化'], [api('java/util/List')],
  ),
  'collections/12': deep(
    'Arrays.asList 与 List.of 的行为差异是什么？',
    '网银参数传递沙盘:Arrays.asList 的返回"能 set 不能 add/remove"(定长视图,底层是原数组——改了影响原数组);List.of 真不可变(任何修改抛 UnsupportedOperationException,且拒绝 null)——三者(含 new ArrayList<>)的行为矩阵要清楚。',
    [
      '行为矩阵:Arrays.asList——set 可用(穿透原数组)、add/remove 抛异常(定长)、允许 null、是原数组的视图;List.of——全不可变、拒绝 null(NullPointerException)、与源无关联(拷贝);new ArrayList<>(...)——完全可变、允许 null、拷贝。',
      '陷阱:Arrays.asList 的 set 穿透(改了"参数列表"影响调用方的原数组);List.of 的 null 拒绝(含 null 元素的集合传入即抛——数据里混 null 直接崩,第 30 题分布式 null 语义)。',
      '选择:只读常量→List.of(不可变+紧凑);数组适配→Arrays.asList(要与数组联动时);可变构建→new ArrayList<>(...) 或 builder 模式——三种形态各司其职。',
    ],
    [
      block('机制:三种形态的底层', 'Arrays.asList:返回 java.util.Arrays.ArrayList(内部持有原数组引用)——set 直接写原数组;size 固定(数组定长)——add/remove 抛 UnsupportedOperationException。List.of:ImmutableCollections.SetN/ListN(内部紧凑数组,元素不可变要求——元素自身的可变性[如 Date]不受控,第 13 题)——null 检查在 of() 入口。ArrayList:标准动态数组——三者中唯一全功能的。'),
      block('反例:三种误用的事故', '误用一,Arrays.asList 后 add:定长视图 add 抛异常(运行时才发现"不是普通 List")。误用二,List.of 收 null:外部数据(可能含 null)直接 List.of 构建常量——NPE 在启动期(算运气好)或请求期。误用三,set 穿透:Arrays.asList 的列表传给方法,方法内 set 改了调用方的原数组(跨层副作用)。三条的正解:按行为矩阵选择,数组视图的穿透性显式注释。'),
      block('取舍:不可变层级的选择', 'List.of:编译期确定的常量(协议/枚举值清单)——不可变+不可 null 是特性。Arrays.asList:与已有数组联动(数组是事实源)——视图语义是特性。Collections.unmodifiableList:包装已有可变列表(视图,原列表变它跟着变,第 13 题)——防御性只读。三种"只读"的语义差异(不可变/视图/包装)是面试与实战的区分点。'),
    ],
    [
      block('验证:行为矩阵的断言组', '验证:set 穿透断言(Arrays.asList set 后原数组变化);null 断言(List.of(null 元素) 抛 NPE、Arrays.asList 允许);修改断言(List.of 任何修改抛异常;Arrays.asList add 抛异常但 set 不抛)——行为矩阵的断言组进工具类单测(选型歧义的终结)。'),
      block('追问链:列表形态三刀', '一刀:"List.of 的内存优势?"——紧凑布局(无容量冗余)+不可变共享(线程安全,第 30 题)——常量场景性能与安全双优。二刀:"元素的可变性?"——List.of 的元素若是可变对象(Date/自定义 bean)——列表结构不可变但元素内部可变(深浅不可变的区分,第 13 题 unmodifiable 同题)——不可变是浅层语义。三刀:"序列化差异?"——Arrays.ArrayList 可序列化(数组);List.of 的序列化形态(自定义)——跨版本序列化的兼容注意(第 49 题)。'),
    ],
    ['set 穿透原数组,add 抛异常', 'List.of 拒 null,真不可变', '三种只读语义各不同'], [api('java/util/List')],
  ),
  'collections/13': deep(
    'Collections.unmodifiableList 是否能隔离外部修改？',
    '网银接口沙盘:返回 Collections.unmodifiableList(内部列表)防御外部修改——外部不能 add/remove,但内部列表变它跟着变(视图);且元素本身可变(深浅问题)。用"三层只读"说明真正的隔离设计。',
    [
      'unmodifiableList 是包装视图:外部调用修改方法抛 UnsupportedOperationException;但底层列表变化实时反映(视图不是快照)——"只读"≠"不变"。',
      '深浅问题:列表结构不可变,元素对象可变(外部拿到元素引用后改其字段)——元素不可变(不可变类型/防御性拷贝)才是完整隔离。',
      '真正的隔离:返回 List.copyOf(浅拷贝快照+元素需不可变)或构造时防御性拷贝+只读包装——按"外部是否需要看到后续变化"选视图或快照。',
    ],
    [
      block('机制:视图、快照与元素深浅', '视图(unmodifiableList):零拷贝+实时反映底层——适合"调用方要看最新状态"。快照(List.copyOf):拷贝时刻的独立副本——适合"调用方要稳定的某一刻"。元素深浅:浅不可变(列表结构不变,元素字段可改——外部 get(0) 拿到引用后改字段)——隔离要求高时元素用不可变类型(record,第 4 题风格)或防御性拷贝元素。'),
      block('反例:隔离失效的三种形态', '形态一,视图误当快照:接口返回 unmodifiableList(视图)——内部列表后续变更"穿透"到已返回的引用(调用方看到数据变了,以为拿到的是当时状态)。形态二,元素可变:列表不可变但元素是可变 bean——外部改字段影响内部状态(通过列表元素的引用逃逸)。形态三,内部引用外泄:返回 unmodifiable 视图但内部列表引用也 via getter 泄露(另一个 getter 直接返回原列表)——隔离被自家旁路。三条的正解:按语义选视图/快照+元素不可变化+引用不旁路。'),
      block('取舍:防御性拷贝的成本', '拷贝成本:每次返回拷贝(大列表=分配+复制)——高频调用大列表的拷贝成本;替代:元素不可变化(record)时无需深拷贝(浅拷贝即隔离)。快照的时效:调用方拿到的数据"过了多久仍有效"——时效语义写进接口文档(第 14 题契约)。不可变类型优先:元素用 record(不可变)——隔离免费(无需防御性拷贝),第 4 题风格的系统化应用。'),
    ],
    [
      block('验证:隔离语义的断言组', '验证:视图断言(unmodifiableList 的底层变更实时可见——先返回后内部 add,调用方列表变大);快照断言(List.copyOf 后内部变更不影响已返回副本);深浅断言(元素字段修改穿透浅不可变列表;record 元素不穿透)——三组固化"只读"的三种语义。'),
      block('追问链:只读三刀', '一刀:"unmodifiable 的写入异常类型?"——UnsupportedOperationException(运行时)——编译期发现不了(与 List.of 相同)——类型层面的只读(不可变集合类型)是更前移的方向。二刀:"Map/Set 同款?"——unmodifiableMap/Set/Map.copyOf 同族语义(视图/快照/深浅)——规则一致,全套适用。三刀:"序列化后的隔离?"——不可变容器序列化往返后仍是不可变(List.of 的序列化形态保持)——跨边界的隔离保持(第 12 题)。'),
    ],
    ['视图实时,快照独立', '浅不可变挡不住元素修改', '隔离=结构加元素加引用不旁路'], [api('java/util/List')],
  ),
  'collections/14': deep(
    '迭代时删除元素如何避免 ConcurrentModificationException？',
    '网银清洗沙盘:遍历列表删除不合格元素——循环内 list.remove 抛 CME(或更糟:不抛但漏删——remove 倒数第二个元素,第 2 题实测"未抛出");正确姿势三选:iterator.remove、removeIf、倒序下标循环。',
    [
      'CME 的机制:迭代器持有 expectedModCount,结构性修改使 modCount 变化→next() 校验失败抛 CME——尽力而为(不保证抛,第 2 题实测:remove 倒数第二个元素后循环自然结束,不抛也不漏)。',
      '三姿势:iterator.remove(迭代器自己的删除,同步 expectedModCount)、removeIf(内部位图标记+单次压缩,O(n) 一次搬移,第 9 题)、倒序下标(索引可控,不依赖迭代器)——错误姿势:正序下标循环 remove(索引移位漏删)+增强 for 内 list.remove(CME 或漏删)。',
      '本机实验:增强 for 中 remove(2)(列表 [1,2,3])→未抛 CME 且删除成功——"没抛"≠"安全"(换个位置就抛/漏删)——fail-fast 是尽力而为不是保证。',
    ],
    [
      block('机制:modCount 与三种姿势的原理', 'CME 机制:list.remove 改 modCount→iterator.next 的 checkForComodification 对比 expectedModCount→不等抛。iterator.remove:调用 ListItr.remove(同步 expectedModCount=modCount)——合法。removeIf:ArrayList 重写(位图标记保留位+一次搬移+一次 modCount 更新)——O(n) 总成本。倒序下标:从后往前删除(删除不影响前方索引)——正序漏删(删 i 后 i+1 变 i)。'),
      block('反例:删除姿势的三种事故', '事故一,正序漏删:[1,1,2] 删所有 1——i=0 删后列表 [1,2],i 跳到 1(第二个 1 被跳过)。事故二,增强 for 抛 CME:remove 倒数第二以外的元素——偶发(取决于位置,本机实验:倒数第二个不抛)——"测试时没抛"的假安全感。事故三,removeIf 的谓词副作用:谓词里修改外部状态(顺序相关的副作用)——removeIf 的执行顺序不保证(并行流更甚)——谓词必须纯。三条的正解按场景:迭代器(边遍历边多逻辑)、removeIf(纯过滤)、倒序(简单下标逻辑)。'),
      block('取舍:三姿势的选择', 'iterator.remove:遍历中需要"多逻辑+删除"(其他处理与删除共存)。removeIf:纯过滤(谓词独立)——最简洁高效(优先)。倒序下标:数组式思维/非 List(自维护结构的删除)。HashMap 的对照:迭代中删键用 entrySet().iterator().remove(CHM 的迭代器支持 remove,弱一致语义;第 2 题)——不同容器姿势不同,原理同源(结构性修改的协调)。'),
    ],
    [
      block('验证:删除姿势的断言组', '验证:本机实验断言(增强 for remove 倒数第二不抛 CME——"尽力而为"的证据;其他位置抛);漏删断言(正序循环删重复元素,断言漏删);三姿势对照(同过滤需求:iterator/removeIf/倒序——结果一致且 removeIf 最快)——四组把删除语义完整固化。'),
      block('追问链:删除三刀', '一刀:"removeIf 为什么快?"——单次搬移(位图决定保留位,一次 System.arraycopy 压缩)vs 循环 remove 的多次搬移——O(n) vs O(n²)(第 42 题批量 removeAll 同族)。二刀:"并发容器的删除?"——CHM 迭代中 remove 不抛 CME(弱一致迭代器,自身 remove 支持)——容器语义决定姿势(第 2 题)。三刀:"删除与索引结构?"——删除后索引结构的失效(排序索引/缓存索引同步,第 47 题归属)——删除不只是列表的事,关联结构要联动。'),
    ],
    ['CME 尽力而为,没抛不等于安全', 'removeIf 最快,iterator 最活', '正序下标循环必漏删'], [api('java/util/ArrayList')],
  ),
  'collections/15': deep(
    'ConcurrentHashMap 如何保证单键操作的原子性？',
    '网银计数沙盘:CHM 的 put/get 单键操作原子(桶级锁/CAS),但 containsKey+put 组合不原子——单键原子≠复合原子(第 2 题)——用 putIfAbsent/compute 说明原子 API 的正确用法(本机实验:CHM 88ms 的并发性能)。',
    [
      'CHM 的原子层级:单键 put/get/remove 原子(CAS 空桶/桶头 synchronized);复合操作必须用原子 API——putIfAbsent(不存在才放)、compute/computeIfAbsent(读改写原子)、merge(合并)——JDK 8+ 的函数式原子族。',
      '本机锚点:8 线程 40 万 ops CHM 91ms(synchronizedMap 233ms)——CHM 的并发优势建立在其原子 API 上;错误用法(containsKey+put)穿透原子性——两步之间的窗口(第 2 题 synchronizedMap 的复合坑同源)。',
      'computeIfAbsent 的语义:键不存在时执行 mappingFunction 并放入(原子)——缓存加载的标准姿势(第 15 题分布式 singleflight 的 JVM 内形态);但要防"函数内重活"(第 17 题)与递归更新(同 map 内再改本 map 抛 IllegalStateException/死锁)。',
    ],
    [
      block('机制:桶级同步与原子 API 的实现', 'put 的原子性:桶空=CAS 插入(casTabAt 直接对 Node 数组槽);桶非空=synchronized 锁住链头 Node 对象——锁的是"桶里第一个节点"而非数组槽本身,读路径全程无锁(volatile 读)。演进:JDK 7 用 Segment 分段锁(默认 16 段,并发度=段数,每段一把锁);JDK 8 取消 Segment 改 CAS+synchronized,并发度=桶数——粒度更细且省掉段结构。扩容期间 ForwardingNode 标记已迁移的桶,遇到它的写线程 helpTransfer 协助搬移——扩容与读写并行推进。computeIfAbsent:桶头 synchronized 内执行 mappingFunction——同一桶的其他写被阻塞(函数时长决定桶的阻塞时长,第 17 题)。size/isEmpty:弱一致(CounterCell 分散计数,第 19 题)——单键原子与全局统计是两个层级。'),
      block('反例:复合操作的两种穿透', '穿透一,check-then-act:if (!map.containsKey(k)) map.put(k, load(k))——并发下 load 执行两次(缓存击穿单机版,第 15 题分布式)——computeIfAbsent 原子化。穿透二,读改写:map.put(k, map.get(k)+1)——并发丢更新(计数少加,分布式 7 题同构)——merge(k, 1, Integer::sum) 或 compute。两条的通用修复:凡"读改写"或"查后放"必用原子 API——CHM 的函数式族就是为此设计。'),
      block('取舍:computeIfAbsent 的适用与禁忌', '适用:缓存加载(计算开销适中、幂等)、计数初始化。禁忌:函数内长时间 IO(RPC——桶锁被占,同桶操作全部排队,第 17 题)、函数内递归修改同 map(未定义行为/死锁)、函数返回 null(不放 entry,语义要懂)。长任务的替代:先 putIfAbsent(占位 future)再异步完成(分布式 15 题的合并形态)——占位+完成的模式规避桶锁阻塞。'),
    ],
    [
      block('验证:原子 API 的断言组', '验证:并发 putIfAbsent 断言(N 线程同键并发,断言 mappingFunction 只执行一次);merge 计数断言(并发 merge 计数精确,零丢失——对照 map.put(k, get+1) 的丢失);computeIfAbsent 阻塞断言(慢函数期间同桶其他键操作延迟——桶锁粒度的可观测)——三组固化原子语义(本机 C2 的吞吐对照为性能锚点)。'),
      block('追问链:原子 API 三刀', '一刀:"compute 与 merge 的区别?"——compute 总是执行函数(存在与否都调,返回 null 删除);merge 仅在存在时 merge(不存在直接放初值)——语义细节决定选型。二刀:"多键复合操作?"——CHM 无跨键事务:两个键的联动改(转账 A 减 B 加)CHM 保证不了(第 2 题banking)——跨键一致性需要外部协调(锁/事务,资金场景回 DB)。三刀:"弱一致的遍历?"——迭代器弱一致(不抛 CME,反映创建时或之后的部分更新,第 2 题)——遍历统计的业务语义要容忍弱一致(精确统计用外部原子结构,第 19 题)。'),
    ],
    ['单键原子,复合必须用原子 API', 'computeIfAbsent 管缓存,禁长任务', '跨键一致性 CHM 给不了'], [api('java/util/concurrent/ConcurrentHashMap')],
  ),
  'collections/16': deep(
    '为什么 containsKey 加 put 不能替代 putIfAbsent？',
    '网银缓存沙盘:缓存加载用 containsKey+put——并发首访时加载函数执行 2 次(缓存击穿单机版);putIfAbsent 原子只执行 1 次。用竞态窗口说明复合操作与原子 API 的差异(第 15 题的专论展开)。',
    [
      '竞态窗口:containsKey=false(线程 A)→线程 B containsKey=false→A put(加载 v1)→B put(加载 v2,覆盖 v1)——两次加载+值不确定;窗口=两步之间的任意调度。',
      'putIfAbsent 的原子性:一条指令完成"检查+放入"(桶级同步内)——N 线程并发同键,恰好一个执行加载,其余拿到首次结果——本机实验形态(分布式 15 题合并 200→1 的 JVM 内同构)。',
      'extends:getOrDefault(读的默认值)、computeIfAbsent(加载)、merge(计数)——原子 API 族覆盖常见的复合模式;自定义复合逻辑用 synchronized(map) 包裹(锁粒度=全表,性能代价)或分桶锁。',
    ],
    [
      block('机制:两步与一步的调度对比', '两步的调度序列:A.check(false)→B.check(false)→A.put(v1)→B.put(v2)——B 覆盖 A(v1 的加载白做,结果取决于调度)。一步(putIfAbsent):原子地在桶锁内 check+put——B 的 putIfAbsent 发现已存在→直接返回已有值(v1)——B 不执行自己的加载。竞态窗口的消除=把复合操作下沉到容器的同步域内。'),
      block('反例:两步写的两次事故', '事故一,缓存重复加载:并发首访同一 key——加载函数(查库 200ms)执行 2 次——数据库瞬时 2 倍压力(热点 key 更甚,第 15 题分布式击穿)。事故二,初始化重复:配置对象的双初始化(两个线程各自构建配置 put)——后 put 覆盖,先 put 的引用已被其他线程持有(持有 v1 引用的线程继续用 v1——状态分叉)。修复:putIfAbsent(加载一次+引用一致);配置类场景 computeIfAbsent。'),
      block('取舍:putIfAbsent 与 computeIfAbsent 的选择', 'putIfAbsent:值已备好(或加载在函数外)——"键不存在才放";不感知"放之前的加载是否被跳过"(竞态下加载白做但不重复放——加载成本×并发数)。computeIfAbsent:加载在函数内——并发下函数只执行一次(加载成本最省)——缓存场景优选。语义细节:putIfAbsent 返回"已存在的旧值"——在 CHM 中 null 只能是"本次放入"(CHM 禁 null 值,无歧义);在 HashMap 中 null 有歧义("无旧值"或"旧值就是 null",与第 18 题 null 问题同源);computeIfAbsent 返回"最终值"(无论谁算的)——返回值语义决定调用方的后续逻辑。'),
    ],
    [
      block('验证:原子 API 的对照断言', '验证:并发加载断言(10 线程同键首访:containsKey+put 形态断言加载执行≥2 次;computeIfAbsent 断言恰好 1 次);覆盖断言(两步形态断言"先加载的值被覆盖"——值不确定);返回值断言(putIfAbsent 与 computeIfAbsent 的返回语义对照)——三组固化复合操作的原子性差异。'),
      block('追问链:putIfAbsent 三刀', '一刀:"putIfAbsent 的 null 值?"——CHM 不允许 null 值(第 18 题)——"不存在"与"值为 null"不可区分的问题在 CHM 不存在(HashMap 有此歧义);映射到 Optional 的思考。二刀:"先占位后完成?"——长加载:putIfAbsent(key, future)→异步完成 future.complete(分布式 15 题 coalesce 同构)——占位对象让桶锁立即释放,加载异步化。三刀:"containsKey 的合法使用?"——只读判断(不改状态)合法;作为写前检查(为 put 服务)即反模式——判据:后面有没有跟写。'),
    ],
    ['containsKey 加 put,窗口必穿透', 'putIfAbsent 原子,computeIfAbsent 省加载', '长加载占位化,异步完成'], [api('java/util/concurrent/ConcurrentHashMap')],
  ),
  'collections/17': deep(
    'computeIfAbsent 中为什么不应执行长时间远程调用？',
    '网银缓存沙盘:computeIfAbsent 的加载函数里调远程接口(200ms)——同桶的其他键操作全部排队 200ms(桶头锁被占);更糟:远程超时 30 秒=同桶雪崩。用桶锁粒度说明函数内长任务的代价与占位模式。',
    [
      '锁的粒度:computeIfAbsent 的函数在桶头 synchronized 内执行——函数 200ms=该桶(及 hash 相邻冲突键)的所有操作阻塞 200ms;热点桶+慢函数=局部雪崩(第 15 题分布式 singleflight 的函数内 IO 同题)。',
      '占位模式:computeIfAbsent(key, 占位 future)→桶锁立即释放→异步加载→future.complete——加载长但锁短;同键并发等 future(第 16 题 putIfAbsent 的扩展)。',
      '禁忌清单:函数内禁远程 IO/禁再操作同 map(死锁或 IllegalStateException——递归 update)/禁抛异常后的残留状态(compute 异常=键未放入,重试语义要显式)。',
    ],
    [
      block('机制:桶锁的占用链', '占用链:computeIfAbsent→桶头锁→mappingFunction(200ms RPC)→同桶所有操作等待——等待面=同桶键集(hash 分桶下的"邻居");函数内再调同 map 的其他键(不同桶)→锁不同桶(不死锁但延长持有时间);同桶键(或递归同键)→死锁/异常。本机 C2 实验的 CHM 吞吐(91ms)建立在"函数轻"的假设上——重函数直接劣化。'),
      block('反例:慢函数的局部雪崩', '沙盘:配置缓存 computeIfAbsent(key, k -> remoteConfig(k))(远程 200ms,P99 2 秒)——配置键 hash 集中在少数桶(键设计问题,第 3 题)——一个慢加载拖住整个桶:该桶其他配置键的读取全部等待 2 秒——接口超时面扩大。修复:占位模式(锁内只放 future)+远程加载异步化+加载超时与降级(默认配置,第 25 题分布式分级降级)。'),
      block('取舍:同步加载与异步占位的权衡', '同步加载(函数内直查):代码简单/调用方拿到即用——锁占用与雪崩风险。异步占位:锁短/并发安全——代码复杂(future 生命周期/异常传播/超时)。判据:加载时长(<1ms 纯计算→同步;含 IO→异步占位)——IO 在锁内是普适禁忌(数据库/远程/文件全算)。降级:加载失败时的策略(缓存 null 占位防穿透?null 被 CHM 拒——用 Optional/哨兵对象,第 18 题 null 语义)。'),
    ],
    [
      block('验证:桶锁占用的断言组', '验证:阻塞断言(慢函数 500ms 期间,同桶他键的 get 延迟≈500ms——计时证据);占位模式断言(占位形态下同桶 he键 get 不受慢加载影响);递归异常断言(函数内同 map put,断言异常)——三组固化"函数轻"纪律的必要性。'),
      block('追问链:桶锁三刀', '一刀:"为什么桶锁不是全局锁?"——CHM 的并发设计(分桶)=吞吐与正确性的平衡(第 2 题 91ms vs 233ms 的来源);全局锁退化为 synchronizedMap。二刀:"函数内查 DB 呢?"——同远程 IO(DB 50ms 也是长)——占位模式同样适用;DB 查询的缓存加载是 computeIfAbsent 的最常见误用场景。三刀:"锁内的异常?"——mappingFunction 抛异常→键未放入→锁释放——语义:异常即"本次加载失败"(下次重试)——重试风暴的防护(退避+熔断,分布式 13 题)在函数外层负责。'),
    ],
    ['桶锁内禁 IO,200ms 拖垮一桶', '占位模式:锁短加载长', '函数内禁递归同 map'], [api('java/util/concurrent/ConcurrentHashMap')],
  ),
  'collections/18': deep(
    'ConcurrentHashMap 为什么不支持 null 键值？',
    '网银缓存沙盘:HashMap 可以存 null 值(get 返回 null 有歧义),CHM 拒绝 null——歧义问题:map.get(k)==null 无法区分"键不存在"与"值就是 null"——并发下这个歧义不可接受(无法用 containsKey 二次确认的原子性代价)。',
    [
      '歧义的本质:HashMap 单线程可以 get+containsKey 二次确认(两次调用之间无并发修改);CHM 并发下两次调用之间状态可能变(containsKey=true 但 get 时已删)——二次确认失效,歧义无解→设计上拒绝 null。',
      '与本机实验呼应(C2/col-18 推演):CHM put(null) 直接 NPE——错误前移到入口(而不是并发时的诡异行为)。',
      '迁移影响:HashMap 代码迁 CHM 时 null 值处理要显式(Optional/哨兵对象 NULL_VALUE/拆分"存在与值"两层)——迁移清单项。',
    ],
    [
      block('机制:歧义与并发的不可调和', '单线程的消解:HashMap.get 返回 null→containsKey 区分(两步之间无并发,可靠)。并发的失效:CHM 两步之间另一线程 remove→containsKey(true) 但 get(null)——判断错误;或反向——语义不确定。设计选择:与其留歧义(调用方各自防),不如类型上拒绝(null 进不来)——错误从运行时诡异性变成入口 NPE(第 25 题分布式"错误前移"同构)。'),
      block('反例:null 歧义的事故形态', '事故一,缓存穿透误判:CHM.get(k)==null 判"未缓存"→重复加载(实际缓存的就是 null 语义的"不存在")——穿透防护失效(第 15 题分布式)。事故二,HashMap 迁 CHM 的 NPE 风暴:存量代码 put(k, null)(HashMap 合法)迁 CHM 批量 NPE——迁移清单遗漏 null 审计。两条的正解:哨兵对象(NULL_VALUE 常量,区分"未缓存"与"缓存了空")或 Optional 包装。'),
      block('取舍:哨兵与 Optional 的选择', '哨兵对象:缓存内部用 NULL_VALUE 常量占位(穿透防护:缓存"不存在"的结果)——对外转 Optional 或抛查——性能优(无分配)。Optional:对外接口返回 Optional.ofNullable——语义清晰(调用方强制处理);分配成本(每次 Optional 对象)。选择:内部缓存哨兵,对外接口 Optional——内外分层。HashMap 的 null 合法性:单线程场景 null 值有表达力(值缺失的显式存储)——工具性差异,按并发需求选容器(第 2 题)。'),
    ],
    [
      block('验证:null 语义的断言组', '验证:拒绝断言(CHM.put(k, null) 与 put(null, v) 均 NPE);歧义演示断言(HashMap 存 null 值后 get 与 containsKey 的歧义形态);哨兵断言(NULL_VALUE 哨兵的穿透防护:缓存"不存在"后不再回源)——三组固化 null 语义;迁移审计(null 值使用的扫描清单)进 CHM 迁移流程。'),
      block('追问链:null 三刀', '一刀:"key 的 null 呢?"——HashMap 允许一个 null 键(hash=0 桶);CHM 拒绝——同源设计决策;null 键的业务语义本来就有争议(什么都没有的键=?)——拒绝是简化。二刀:"List/Set 的 null?"——ArrayList 允许 null 元素;List.of 拒绝(第 12 题);CHM 同理——并发容器的 null 政策一致(拒)。三刀:"Optional 的滥用?"——Optional 做字段/参数(反模式,设计意图是返回值)——Optional 的边界:返回值表达"可能无",字段与参数用其他设计(哨兵/重载)。'),
    ],
    ['并发下歧义无解,类型上拒绝 null', '哨兵区分未缓存与缓存空', '迁移先审计 null 使用'], [api('java/util/concurrent/ConcurrentHashMap')],
  ),
  'collections/19': deep(
    'ConcurrentHashMap 的 size 能用于精确业务控制吗？',
    '网银限流沙盘:用 CHM.size() 做并发数限制(size>=N 拒绝)——size 是弱一致估计(CounterCell 分片计数),并发下不精确——精确业务控制用 Semaphore/AtomicLong(第 23 题分布式限额的原子累计同构)。',
    [
      'size 的实现:baseCount+CounterCell[](分片计数,避免单点竞争)——求和时无全局锁:结果是"某一时刻的近似"(并发写进行中,某些 cell 未并入);isEmpty/size 同源弱一致。',
      '业务控制的误用:if (map.size() >= max) reject——弱一致下并发放行超限(第 23 题 banking 限额穿透同构);精确控制用 Semaphore(tryAcquire 原子)或 AtomicLong 累计(条件 CAS)。',
      'size 的合法用途:监控/采样/近似判断(非精确业务门槛)——弱一致是设计选择(吞吐换精确),用对地方。',
    ],
    [
      block('机制:分片计数与弱一致', 'CounterCell:计数分散到 baseCount+多个 cell(线程绑 cell,竞争分散)——size=遍历求和(sumCount)且求和本身无锁:遍历期间 cell 仍可能被改,这才是弱一致的根因;这套分片计数是 Striped64 框架,LongAdder 与 CHM 计数同源(同一设计两种封装)。写路径:casBaseCount 或 cell 累加——cell 未并入时求和偏小(弱一致)。AtomicLong 的对照:单值 CAS(精确但竞争集中)——精确与吞吐的取舍(第 23 题 banking:DB 累计 vs Redis 预扣同构)。'),
      block('反例:size 限流的穿透', '沙盘:并发数限制用 map.size()>=100 拒绝——弱一致下 105 个并发请求全部通过(size 读到 99)——限流穿透(第 23 题 banking 的穿透同构);资源(连接/线程)超限故障。修复:Semaphore(100, tryAcquire 原子)/AtomicLong.incrementAndGet<=100 的 CAS——精确控制的工具是同步原语,不是容器的统计。'),
      block('取舍:近似与精确的分界', '近似够用:监控面板(误差可接受)、缓存淘汰参考(近似 LRU)、采样判断。精确必须:限额(资金/资源)、去重计数(业务唯一性)、同步屏障——精确场景的原子原语(Semaphore/LongAdder 读多写少/AtomicLong)。LongAdder 的定位:CHM size 的计数机制独立成类(写分散读求和)——高并发计数器(监控指标,第 48 题)首选;精确控制仍用 AtomicLong/CAS。'),
    ],
    [
      block('验证:弱一致的演示断言', '验证:并发断言(多线程高频写,size 求和采样与 AtomicLong 真值对照——偏差可见);精确控制断言(Semaphore 的限流零穿透;map.size() 限流的穿透复现)——对照组把"弱一致 vs 原子"的行为差异固化;本机 C2 的 size=0 形态(put/remove 后)为弱一致的旁证。'),
      block('追问链:size 三刀', '一刀:"mappingCount 与 size?"——mappingCount() long 版(size int 溢出风险,>21 亿)——大容量用 long 版;弱一致语义相同。二刀:"精确统计的方案?"——AtomicLong/LongAdder(计数)+CHM 存数据(数据与计数分离)——计数的精确与数据的弱一致分层(各取所需)。三刀:"keySet().size()?"——同弱一致(遍历求和)——换口径不换语义;精确等价物不存在于 CHM——接受或换工具。'),
    ],
    ['size 是估计,不是账本', '精确控制用 Semaphore 或 CAS', '弱一致有它的用武之地'], [api('java/util/concurrent/ConcurrentHashMap')],
  ),
  'collections/20': deep(
    '为何线程安全 Map 中的 value 仍可能不安全？',
    '网银会话沙盘:CHM<String, UserSession> 线程安全,但 UserSession 对象可变(两线程拿到同一引用各自 set 字段)——容器原子≠元素安全:容器保护的是"结构操作",元素的内部状态自己负责。',
    [
      '安全边界:CHM 保证 put/get/remove 的原子(结构层面);value 是共享引用——元素的并发修改(字段 set)不在容器保护范围——值对象的可变字段=新的共享可变状态(第 47 题 banking 全局可变同构)。',
      'value 安全的三选:值不可变化(record/不可变 bean——"修改"=替换整个 value,CHM 原子替换)、值自身线程安全(内部锁/CAS)、访问值时外部同步(按值加锁——锁逸散,慎用)。',
      '复合陷阱:CHM 的 compute(key, (k, v) -> v.update()) 原子执行"读改写 value"——但 update 内部若再修改其他共享状态,原子性只覆盖 map 这一层——compute 的原子=对 map 的原子,不是对世界的原子。',
    ],
    [
      block('机制:容器原子与元素共享', '容器的保护面:结构操作(插/删/换 value 引用)原子——两线程 put 同 key:后者覆盖(引用替换,原子);get 拿到的是某一刻的引用(不会半对象)。元素的保护面:引用指向的对象内部状态——多线程持有同一 UserSession 引用,各自 set status——竞态(容器无法感知)。record 不可变值:修改=compute 替换新 record(旧引用仍读到旧状态——不可变的天然一致性)——"替换优于修改"是并发值对象的核心纪律。'),
      block('反例:值不安全的两种事故', '事故一,会话字段竞态:CHM 的 UserSession.lastAccessTime 双线程 set——更新丢失(审计/超时判定失准)。事故二,值内集合泄漏:UserSession 内含 ArrayList 属性——外部 session.getItems() 拿到引用直接 add(绕过容器与值的全部设计,第 43 题返回内部集合同题)。修复:值不可变化(record + with 方法生成新实例)+防御性返回。'),
      block('取舍:可变值与不可变值的取舍', '不可变值(record):并发安全免费/修改=替换(原子)/GC 压力(频繁修改多对象)——读写比适中的会话/配置。可变值+同步:修改原对象(无新分配)/并发正确性靠值内锁或外部锁(锁粒度设计难)——高频修改大对象。判据:值的修改频率与大小——小值高频改用不可变替换(分配便宜),大值低频改可变+同步(拷贝贵)。compute 的正确用法:值不可变时 compute((k,v) -> v.withStatus(新态))——原子替换。'),
    ],
    [
      block('验证:值安全的断言组', '验证:竞态复现断言(可变 value 双线程 set 字段,断言更新丢失——可变值的坑实证);不可变断言(record value 的 compute 替换,断言各线程读到完整状态无撕裂);防御返回断言(getItems() 返回拷贝,外部 add 不影响内部)——三组固化"容器安全≠值安全"。'),
      block('追问链:值安全三刀', '一刀:"深层可变?"——value 含 List 字段(record 的 List 字段是引用)——List 也要不可变(List.copyOf)——不可变要递归到底(第 13 题 unmodifiable 深浅同题)。二刀:"compute 的原子边界?"——compute 函数在桶锁内执行(对 map 的读改写原子)——函数内访问其他共享状态(另一 map/静态字段)不在原子内——原子的范围=锁的范围。三刀:"value 的生命周期?"——过期 value 的清理(第 47 题 banking 缓存归属):容器不管 value 内部的时效——value 持有的资源(连接/锁)要自清理(值对象的资源纪律)。'),
    ],
    ['容器保护结构,元素自己负责', '不可变值替换,优于可变值修改', 'compute 原子只到 map 层'], [api('java/util/concurrent/ConcurrentHashMap')],
  ),


  'collections/21': deep(
    'CopyOnWriteArrayList 适合什么读写比例？',
    '网银监听器沙盘:事件监听器列表(注册少、遍历每次事件都发生)——CopyOnWriteArrayList 写时复制(读零锁零 CME),写成本 O(n)(整数组拷贝)。用读写比判据说明适用边界(监听器/观察者是其经典场景)。',
    [
      'COW 的机制:写操作加锁+复制整个数组+替换引用;读无锁(读当前引用的数组快照)——读永远一致且安全(迭代器是快照,不抛 CME)。',
      '读写比判据:读:写≥1000:1 量级才划算(写 O(n) 的成本被海量读摊薄);写多读少=拷贝风暴(CPU+GC 双压力)。监听器列表:每次事件遍历(读)×注册(写,低频)——典型场景。',
      '内存特征:写时双数组共存(旧+新)——大列表写的内存峰值;迭代器持快照引用(旧数组延迟回收)——长迭代器的内存滞留。',
    ],
    [
      block('机制:写时复制与快照语义', '写路径:add→lock→Arrays.copyOf(原数组+n+1)→setArray(新数组)→unlock——整个旧数组在写期间原样保留(读不受影响)。读路径:get→读 volatile array 引用→按索引访问——零锁零同步(引用读的可见性由 volatile 保证)。快照语义:迭代器创建时抓当前数组引用——迭代期间看到的永远是创建时刻的内容(不反映后续写,第 22 题)——快照的一致性是 COW 的核心价值。'),
      block('反例:读写比误判的两种事故', '事故一,写频繁用 COW:高频计数列表(每秒千次 add)——每次 add 拷贝全数组(万级元素×千次/秒=CPU+GC 打满)——ArrayList+同步或 CHM 思路替代。事故二,大列表 COW:百万元素的 COW——单次写拷贝百万引用(几十 MB 峰值分配)——GC 压力+延迟尖刺(第 10 题 distributed 扩容抖动同构)。两条的判据回归:读:写比与列表规模的乘积决定。'),
      block('取舍:COW vs 同步列表的对照', 'COW:读零成本+快照迭代(安全遍历)/写贵+内存峰值。synchronizedList:读写都要锁(读也串行)+迭代要手动同步(否则 CME)/写相对便宜。判据:读:写比+迭代是否高频——监听器(遍历频繁)选 COW(迭代无需锁!);普通共享列表(偶发遍历)选同步列表。CopyOnWriteArraySet=COW 的 Set 形态(监听器去重),同判据。'),
    ],
    [
      block('验证:读写比的断言组', '验证:监听器场景断言(千次遍历+十次注册,COW vs 同步列表的吞吐对照);写放大断言(万级元素的 add 耗时随规模线性增长);快照断言(迭代期间 add,迭代器不反映——快照语义实证)——三组固化读写比判据。'),
      block('追问链:COW 三刀', '一刀:"迭代器能删除吗?"——不支持(remove 抛 UnsupportedOperationException——快照上无法删除)——迭代中删除回主列表操作(加锁)。二刀:"COW 的引用安全?"——setArray 是 volatile 写(读线程立即见新数组)——可见性由 volatile 保证(第 20 题 value 可变性的反面:数组引用不可变语义)。三刀:"与 ReadWriteLock 的对照?"——COW=写时复制的特化(数组场景,零读锁);ReadWriteLock=读共享写互斥的通用方案(任意资源)——数组读多写少用 COW 更轻(无锁读);复杂资源用 RWLock。'),
    ],
    ['写时复制,读零锁零 CME', '读写比千比一才划算', '监听器列表是它的主场'], [api('java/util/concurrent/CopyOnWriteArrayList')],
  ),
  'collections/22': deep(
    'CopyOnWriteArrayList 的迭代器能看到最新写入吗？',
    '网银监听器沙盘:迭代器遍历中另一线程 add 了新监听器——迭代器看不到(快照语义):COW 迭代器在创建时刻锁定数组引用——弱一致中的一致性偏保守(与 CHM 的弱一致[能看到部分后续]不同)。',
    [
      '快照语义:iterator() 抓当前数组引用→hasNext/next 全在快照上——迭代期间的所有写入(本线程/他线程)对迭代器不可见——强一致的"过时视图"。',
      '与 CHM 迭代器对照:CHM 弱一致(创建后写入可能可见可能不可见——不保证);COW 快照(确定不可见);ArrayList fail-fast(写入即 CME)——三种迭代语义的谱系。',
      '工程含义:监听器遍历的"新注册不触发本次事件"(通常正确——注册者不应收到注册前的事件);需要"迭代中注册立即生效"的场景要换模式(队列缓冲)。',
    ],
    [
      block('机制:快照引用与不可见性', '快照:iterator() 返回 COWIterator(snapshot=array 引用, cursor)——next() 读 snapshot[cursor](原数组,后续写入产生新数组不影响旧引用)——快照数组因写时复制而永不被修改(不可变保证快照可靠)。与 fail-fast 对比:ArrayList 迭代器不持快照(直接引原数组)→modCount 校验抛 CME——COW 用"复制"换取"不抛+一致快照"——两种安全策略(检测 vs 隔离)。'),
      block('反例:快照语义的误用', '误用一,期望实时:遍历监听器列表并动态注册(遍历中注册的新监听器期望收到后续事件)——本迭代不可见(快照)——下一轮事件才收到——语义通常可接受但要知情。误用二,长迭代器的时效:迭代器持有旧数组引用(百万元素旧数组延迟 GC)——长生命周期的迭代器是内存滞留点(第 11 题subList 同构)。两条的正解:快照语义知情+迭代器生命周期短。'),
      block('取舍:三种迭代语义的选择', '快照(COW):遍历期间安全(零并发防护)+内容可能是旧的——读多写少的监听/配置。弱一致(CHM):尽力反映最新(不保证)+不抛 CME——并发 Map 的通用语义。fail-fast(ArrayList):快速失败(结构性并发修改抛 CME)——单线程容错。选择跟随容器的并发需求——迭代语义是容器的隐含契约(文档读清楚)。'),
    ],
    [
      block('验证:快照语义的断言组', '验证:不可见断言(迭代器创建后 add 新元素,迭代不含——快照实证);对照断言(CHM 迭代器的弱一致行为对照);生命周期断言(长迭代器持旧数组——GC 不可达断言,内存滞留实证)——三组区分三种迭代语义。'),
      block('追问链:迭代语义三刀', '一刀:"快照的一致性价值?"——遍历中途数据不"跳变"(业务处理的是一致时点)——与读数据库事务的快照隔离同思想(第 2 题banking);代价=新鲜度。二刀:"写线程的安全?"——写线程之间互斥(锁)——快照解决读的并发,写仍串行——COW 的"线程安全"=读无锁+写互斥+读写隔离。三刀:"语义文档化?"——三种迭代语义要写进容器的使用指南(团队内)——迭代语义误用是并发 bug 的隐形来源(测试难复现)。'),
    ],
    ['快照锁定创建时刻,最新写入不可见', '复制换隔离,不抛换安全', '迭代器要短命'], [api('java/util/concurrent/CopyOnWriteArrayList')],
  ),
  'collections/23': deep(
    'BlockingQueue 的容量如何帮助系统背压？',
    '网银异步任务沙盘:生产者(接收请求)与消费者(处理任务)解耦,无界队列在消费慢时无限堆积(OOM)——有界 BlockingQueue 的满则阻塞/拒绝=背压,把下游压力传导到上游(banking 42 题查询保护的队列版)。',
    [
      '背压机制:有界队列(capacity=N)满时——put 阻塞(生产者停,自然限流)/offer 超时返回 false(显式拒绝)/add 抛异常(硬失败)——三种写入语义对应三种背压策略。',
      '容量即缓冲预算:N 的选择=可接受的内存×元素大小+消费恢复时间×消费速率——容量不是越大越好(大容量=延迟堆积+OOM 风险延后但更大)。',
      '满的策略与业务匹配:必达任务(订单事件)→put 阻塞(生产者减速);可丢任务(行情推送)→offer 丢弃(新鲜度优先);审计任务→SynchronousQueue(零缓冲,强背压)——按任务价值选。',
    ],
    [
      block('机制:阻塞语义与背压传导', 'put 阻塞:队列满→生产者线程挂起→上游(如 Servlet 线程)被拖住→上游资源池饱和→入口自然限流——背压逐级传导(第 23 题distributed 舱壁:上游被下游拖住在这里是"故意的设计")。offer 的显式拒绝:返回 false→调用方决定(降级/重试/告警)——拒绝的可见性(put 的阻塞是隐式的,offer 的拒绝是显式的)。容量与延迟:队列积压 K 个=任务延迟 K/消费速率——容量即最大排队延迟的预算。'),
      block('反例:无界队列的 OOM 与延迟黑洞', '事故一,无界 OOM:Executors.newFixedThreadPool 的 LinkedBlockingQueue(无界)——任务堆积百万(消费挂了没人知道,队列照收)——OOM 时队列里几十万任务(第 28 题 distributed 线程池的无界队列同构)。事故二,延迟黑洞:大容量(10 万)队列——消费速率 100/s→积压 10 万时延迟 1000 秒——任务"成功受理"但用户等 16 分钟(受理≠完成的表达,第 38 题)。修复:有界+满策略+积压监控(深度告警)。'),
      block('取舍:容量与吞吐的平衡', '容量大:吸收突发(生产毛刺)——延迟加大;容量小:背压灵敏(快速传导)——吞吐波动直接暴露上游。吞吐的真相:队列不增加吞吐(吞吐=消费者速率),只平滑突发——容量解决"毛刺",解决不了"持续过载"(持续过载要限流,第 42 题)。监控:队列深度(水位)/入队速率/出队速率——三线图判断"毛刺还是过载"。'),
    ],
    [
      block('验证:背压的断言组', '验证:阻塞断言(容量 10 的队列,第 11 次 put 阻塞——生产者停);拒绝断言(offer 返回 false 的显式失败);延迟断言(积压 N 个时新任务的完成延迟=N/速率)——三组固化背压语义;深度告警(水位>80% 容量)进监控。'),
      block('追问链:背压三刀', '一刀:"put 阻塞在哪些场景危险?"——put 阻塞的是调用线程:Servlet 线程被阻塞=线程池耗尽(第 37 题聚合隔离)——Web 请求里 put 要配超时(offer timeout)或独立线程。二刀:"多消费者?"——队列的吞吐=单队列单头(BlockingQueue 的取是串行出队)——多消费者共享队列(并发 take,锁竞争)vs 分区队列(每消费者一队,吞吐更高)——吞吐瓶颈的解法是分区不是加容量。三刀:"优先级与背压?"——优先级队列(PriorityBlockingQueue)的背压+顺序(高优先级先出)——混合负载(第 23 题distributed 多层限流)的队列设计:分队列+优先级调度。'),
    ],
    ['容量即背压,满则传导上游', 'put 阻塞 offer 拒绝,按价值选', '队列平滑毛刺,不解决过载'], [api('java/util/concurrent/ArrayBlockingQueue')],
  ),
  'collections/24': deep(
    'ArrayBlockingQueue 与 LinkedBlockingQueue 如何选型？',
    '网银任务队列沙盘:同容量同负载——ArrayBlockingQueue(ABQ)单锁较高吞吐,LinkedBlockingQueue(LBQ)双锁(读写分离)更高吞吐但内存动态增长。用锁结构与内存特征说明选型。',
    [
      '锁结构:ABQ 一把锁(读写共用,put/take 互斥);LBQ 两把锁(putLock/takeLock 分离——生产与消费并行)——LBQ 的并发吞吐更高(读写不互相阻塞)。',
      '内存特征:ABQ 预分配数组(容量固定,内存确定,无节点分配);LBQ 链表节点(每元素一个 Node 对象——分配与 GC 压力,但容量上限可选[默认 Integer.MAX 无界!])。',
      '选型:需要确定内存/背压严格→ABQ(容量硬约束);生产消费并行度高→LBQ(双锁吞吐);两个都要→ABQ+足够容量或 MPSC 变体——默认 ABQ(确定性优先)。',
    ],
    [
      block('机制:单锁与双锁的吞吐差异', 'ABQ:put 与 take 竞争同一 ReentrantLock(两个 condition notFull/notEmpty)——生产者与消费者互斥(但队列操作本身极快,竞争窗口小);LBQ:putLock(生产)+takeLock(消费)分离——生产消费完全并行(头尾分离的链表)。吞吐实测画像:高并发下 LBQ 通常胜 ABQ(双锁);低并发差异小。GC:ABQ 零节点分配(数组复用);LBQ 每元素 Node(高频场景 GC 压力)。'),
      block('反例:LBQ 无界的默认陷阱', '陷阱:new LinkedBlockingQueue()(无参)——容量 Integer.MAX_VALUE(无界)——消费慢时堆积到 OOM(第 23 题无界队列同构)——Executors.newFixedThreadPool 内部正是它。修复:显式容量(new LinkedBlockingQueue<>(N))——容量是背压的前提(第 23 题);或 ABQ(容量强制)。无界 LBQ 只在"上游天然有界"时合法(调用方已限流)。'),
      block('取舍:队列的进阶变体', '变体:ABQ 的公平模式(锁公平——吞吐降但无饥饿)、LBQ 的容量上限(双锁+有界)、MpscArrayQueue(JCTools,多生产者单消费者——极致吞吐的 Netty 场景)、Disruptor(环形缓冲+无锁——延迟敏感的顶级方案)。选型阶梯:ABQ(默认)→LBQ 有界(并行需求)→JCTools/Disruptor(极限性能,引入第三方库的成本评估,第 17 题)。'),
    ],
    [
      block('验证:吞吐与内存的断言组', '验证:吞吐对照(同容量同负载:ABQ vs LBQ 的 ops/s——双锁的收益数据);内存断言(ABQ 预分配 vs LBQ 节点分配——GC 统计对照);无界陷阱断言(LBQ 无参构造的堆积复现)——三组数据进队列选型指南。'),
      block('追问链:队列选型三刀', '一刀:"容量怎么定?"——突发吸收+延迟预算(第 23 题):容量=突发量上限且积压延迟可接受——容量是业务参数。二刀:"锁竞争的观测?"——队列的锁等待(锁监控)vs 吞吐瓶颈——锁竞争显著时才升级双锁/无锁变体(第 17 题选型判据)。三刀:"语义差异?"——ABQ 的 put 在满时阻塞(背压);LBQ 有界同;语义一致,差异在实现——选型看实现特征(锁/内存),不背语义。'),
    ],
    ['ABQ 一把锁确定内存,LBQ 双锁高吞吐', '无界 LBQ 是 OOM 陷阱', '极限场景再上无锁变体'], [api('java/util/concurrent/ArrayBlockingQueue')],
  ),
  'collections/25': deep(
    'SynchronousQueue 为什么容量为零却能传递任务？',
    '网银线程池沙盘:Executors.newCachedThreadPool 用 SynchronousQueue——容量 0(put 必须等 take),传递的语义=直接握手(生产者与消费者 handoff,不经缓冲)。',
    [
      '握手机制:put 等待消费者来 take(阻塞直到配对);take 等待生产者——零缓冲=零排队=背压最硬(生产速率>消费速率时,生产者立即被卡)。',
      '与线程池的组合:cachedThreadPool(SynchronousQueue+无限线程)——每个新任务若无空闲线程=新建线程(队列不缓冲,任务不排队)——线程数无界的风险(第 24 题 LBQ 无界的孪生陷阱)。',
      '适用:任务必须立即处理(不排队)且有界线程池——直接交接的模式(handing off)用于"拒绝排队"的严格背压场景。',
    ],
    [
      block('机制:握手与配对', '配对模型:内部 TransferQueue/TransferStack(公平模式队列/非公平栈)——put 的数据直接交给等待的 take(或挂起等待);无缓冲=队列深度恒 0(peek/isEmpty 恒 true/空)——"队列"只是握手的媒介。语义:put 的延迟=等待消费者的时间(无空闲消费者→put 挂起)——put 的耗时即"消费跟不上"的直接度量(背压的实时信号)。'),
      block('反例:SynchronousQueue 的两种误用', '误用一,期望缓冲:用它"存任务"——存不了(容量 0)——误解"Queue"的名字。误用二,cachedThreadPool 的线程爆炸:SynchronousQueue+无界线程——突发 1000 任务=1000 线程(每个任务一线程,线程创建/调度/内存全爆)——修复:有界线程池(ThreadPoolExecutor 显式构造,第 24 题 LBQ 有界)+拒绝策略(第 23 题 distributed)。'),
      block('取舍:SynchronousQueue vs 有界队列', 'SynchronousQueue:零延迟传递(有消费者时)/强背压(无消费者立即卡)/不缓冲。有界队列:缓冲突发/延迟排队/内存可控。选择:任务的即时性要求(必须立即处理→SQ)+线程策略(有界→配合)——cachedThreadPool 的正确用法=短时突发异步任务(线程回收快),长任务用有界池。'),
    ],
    [
      block('验证:握手语义的断言组', '验证:握手断言(空队列 put 阻塞直到 take 到达——背压实证);零容量断言(isEmpty 恒 true/offer 需消费者);线程池对照(cachedThreadPool 突发的线程数暴涨 vs 有界池的排队)——三组固化握手语义;线程数监控(线程暴涨告警)配套。'),
      block('追问链:SynchronousQueue 三刀', '一刀:"公平模式?"——fair=true 用队列(先到先配对);false 用栈(后到先配对,LIFO——吞吐略高但可能饥饿)——公平与吞吐的折中(第 24 题锁公平同构)。二刀:"与 Exchanger?"——Exchanger 双方互换数据(双向);SynchronousQueue 单向传递——握手场景的两种形态。三刀:"跟直接调用比?"——直接调用方法(无需队列)vs SQ 传递(生产消费解耦的线程边界)——SQ 的价值在"跨线程的交接点"(线程池的任务提交),同线程内无意义。'),
    ],
    ['容量零,握手不缓冲', 'put 的等待=背压信号', '配 cachedThreadPool 要防线程爆炸'], [api('java/util/concurrent/SynchronousQueue')],
  ),
  'collections/26': deep(
    'PriorityQueue 为什么不能保证整体迭代有序？',
    '网银任务调度沙盘:PriorityQueue(优先级队列)iterator 遍历输出无序(堆的数组布局)——只有出队(poll)才有序。用堆的数组结构与有序性的关系说明"堆≠有序列表"。',
    [
      '堆的结构:数组表示的完全二叉树(parent=i/2,children=2i,2i+1)——只保证"父≤子"(堆序),不保证"层间有序"(兄弟无序)——数组遍历顺序=树的层序=非排序序。',
      '有序的来源:poll() 每次取堆顶(最小/最大)——逐个 poll 才有序(每次 O(log n) 调整);整体排序=Arrays.sort(PQ.toArray())(额外 O(n log n))。',
      '并发的缺失:PriorityQueue 非线程安全——并发场景 PriorityBlockingQueue(内部加锁,堆序不变,第 23 题)。',
    ],
    [
      block('机制:堆序与迭代序的差异', '堆序:每个父节点优先级≥子节点(小顶堆)——保证:堆顶是最小;不保证:数组下标序=优先级序。迭代:for (Task t : pq) 按数组下标(树的层序)——例如数组 [1, 3, 2, 5, 4](堆序成立)迭代输出 1,3,2,5,4(非排序)。有序获取:poll 循环(O(n log n) 总)——每次 poll 触发 siftDown 调整。'),
      block('反例:把 PQ 当有序列表的三种错', '错一,迭代当排序:iterator 遍历当有序流用(输出乱序,bug)。错二,peek 的误用:peek 只看堆顶(最高优先级),不代表"下一个处理的都按序"(并发 peek 后 poll 之间状态变)。错三,迭代中修改:迭代时 poll/add——CME(与 ArrayList 同族,堆的 modCount)。修复:需要有序遍历→poll 循环或转 TreeMap(第 7 题)/需要排序快照→sort(toArray)。'),
      block('取舍:堆 vs 有序结构的选型', '堆:只关心"下一个最高优先级"(调度器/Top K,第 35 题)——O(log n) 插入+O(1) 查看顶。TreeMap:需要全序遍历+范围(第 7 题)——O(log n) 全操作。排序列表:静态数据(一次性排序,查询多)——堆的优势在"动态插入+只取顶"。场景问句:每次需要几个元素?(堆顶 1 个→堆;全量有序→排序/TreeMap)。'),
    ],
    [
      block('验证:迭代无序的断言组', '验证:无序断言(插入 1-10 随机序,iterator 遍历输出非排序序——堆数组实证);poll 有序断言(poll 循环输出严格有序);堆序断言(数组满足堆性质但非排序序)——三组固化"堆≠有序列表";并发形态(PriorityBlockingQueue)的迭代弱一致单列。'),
      block('追问链:堆三刀', '一刀:"Top K 为什么用堆?"——固定大小小顶堆(第 35 题):维护 K 个最大——新元素与堆顶比较,O(log K)——全排序 O(n log n) 的优化(只留 K 个)。二刀:"元素的可比较性?"——同 TreeSet(compare 契约,第 8 题):比较器不一致/抛异常=堆结构破坏——元素比较的纪律同源。三刀:"堆的删除?"——remove(Object) O(n) 定位+O(log n) 调整——随机删除昂贵(堆不支持高效任意删除)——需要任意删除用 TreeMap。'),
    ],
    ['堆只保堆序,迭代非排序', 'poll 逐个才有序', 'Top K 的固定堆是经典应用'], [api('java/util/PriorityQueue')],
  ),
  'collections/27': deep(
    'DelayQueue 可以直接承担可靠的业务延迟任务吗？',
    '网银超时沙盘:支付超时关闭用 DelayQueue(进程内)——进程重启任务丢失(内存)、多实例重复处理、无持久化——DelayQueue 适合进程内的延迟编排(锁超时/缓存过期),可靠业务延迟任务要持久化调度(数据库/延迟消息)。',
    [
      'DelayQueue 的机制:元素实现 getDelay(到期时间)——poll 只取到期元素(内部 PriorityQueue 按到期排序+take 阻塞到最近到期)——进程内、内存态、非持久。',
      '可靠性的三个缺口:重启丢失(内存态,进程死任务消失——超时关单不执行)、多实例重复(每实例一个 DelayQueue,同一单每个实例都执行)、无追溯(任务丢失无记录可查)。',
      '可靠方案:数据库轮询(到期扫描+状态机,第 41 题 banking 重复领取)、延迟消息(RocketMQ 延迟级别/Redis ZSET 到期扫描)——DelayQueue 只做"单进程内的精细延迟"(如连接池的空闲检测)。',
    ],
    [
      block('机制:进程内延迟的能力边界', '能力:精确到期(纳秒级 getDelay)+阻塞获取(take 到最近到期即醒)——进程内延迟编排的高精度工具。边界一,内存态:重启即清空——业务的超时关闭(资金相关)丢失=资金敞口。边界二,实例隔离:多实例各持队列——同一订单的超时在 N 个实例各排一次(重复执行,分布式 41 题重复领取同构)。边界三,无持久与追溯:任务不落库——失败/丢失不可查(审计断链,第 32 题)。'),
      block('反例:DelayQueue 承载超时关单的事故', '事故一,重启丢单:超时关单任务在 DelayQueue——服务发布重启,300 笔超时单未关闭——资金敞口(用户已支付订单未确认)。事故二,多实例重复:3 实例集群,每实例的 DelayQueue 都有关单任务——单被关 3 次(幂等兜底了资损,但审计混乱)。修复:超时关单迁到数据库扫描(状态+到期时间索引)+分布锁防重(分布式 41 题租约)——DelayQueue 降级为"单实例内的精细节拍器"(如本地缓存的过期,第 47 题)。'),
      block('取舍:延迟任务的方案阶梯', '阶梯:DelayQueue(进程内,零依赖,不可靠)→数据库扫描(可靠,秒级精度,轮询成本)→延迟消息(可靠,精度看 MQ,解耦)→时间轮(单机海量定时器,Netty HashedWheelTimer——非持久)。选择:可靠性要求(资金类→持久化方案)+精度要求(秒级→扫表;毫秒级→内存)+量级(百万级→时间轮/分片扫表)。混合:持久层保可靠+进程内 DelayQueue 做执行前的精细节拍(两层)。'),
    ],
    [
      block('验证:可靠性缺口的断言组', '验证:重启丢失断言(入队后重启进程,任务消失——缺口实证);多实例断言(推演:双实例各入队,重复执行——代码级复现需多进程,标注);精度断言(到期毫秒级触发——DelayQueue 的强项展示)——缺口与强项同框,方案选择的依据完整。'),
      block('追问链:延迟任务三刀', '一刀:"扫表的轮询成本?"——到期索引(状态+到期时间复合索引)+分片扫描(第 39 题)——轮询的成本控制;扫描间隔=精度与成本的折中。二刀:"延迟消息的层次?"——固定级别(RocketMQ 18 级)vs 任意延迟(Redis ZSET score=到期时间)——任意延迟的灵活性 vs 固定级的实现简单。三刀:"任务与状态机?"——延迟任务的执行要校验当前状态(超时关单前确认订单仍是待支付,第 40 题终态锁)——延迟执行时的状态前置校验不可省。'),
    ],
    ['DelayQueue 是进程内节拍器', '重启丢失多实例重复,不可承载资金', '可靠延迟走持久化调度'], [api('java/util/concurrent/DelayQueue')],
  ),
  'collections/28': deep(
    'Deque 为什么通常优于遗留的 Stack？',
    '网银解析沙盘:括号匹配用 java.util.Stack(Vector 子类,方法 synchronized)——性能与设计双输:Stack 继承 Vector 的 get(i)(破坏栈语义)、全方法锁(单线程也付锁开销)。Deque(ArrayDeque)是官方推荐替代。',
    [
      'Stack 的设计遗留:extends Vector(继承 get/insert 等非栈方法——栈语义被破坏:可以从中间插入)+所有方法 synchronized(单线程的锁开销,锁消除也难保证)+容量翻倍扩容。',
      'ArrayDeque 的优势:数组双端队列(无锁单线程场景/两端 O(1) 摊销/无栈语义破坏/容量 1.5-2 倍扩容循环复用)——作为栈(push/pop)与队列(offer/poll)均优于 Stack/LinkedList。',
      '接口的演进:Stack 的 push/pop 保留但弃用倾向;Deque 接口(Java 6+)统一双端语义(addFirst/pollLast...)——新代码一律 Deque。',
    ],
    [
      block('机制:Vector 遗留与 ArrayDeque 设计', 'Stack 的问题:继承 Vector(公开 elementAt/set——栈被旁路)+方法同步(历史兼容,去不掉)+迭代顺序反直觉(iterator 从底到顶,与 pop 序相反)。ArrayDeque:循环数组(头尾指针,满时扩容)+无锁(单线程)+两端 O(1)——push=addFirst,pop=removeFirst;内存连续(局部性,第 9 题);容量循环利用(出队后空间复用,不扩容直到真满)。'),
      block('反例:Stack 的两种实际伤害', '伤害一,语义旁路:代码里 stack.insertElementAt(x, 0)(Vector 方法)——栈的 LIFO 被破坏(逻辑 bug 难查)。伤害二,锁开销:高频 push/pop(解析器热点)——synchronized 的成本(偏向锁默认禁用后,每次加解锁真实付费,第 21 题 JVM)——单线程解析器平白付锁税。两条:换 ArrayDeque 全消(语义纯+零锁)。'),
      block('取舍:栈场景的容器选择', 'ArrayDeque:默认(单线程栈/队列)。LinkedDeque(手写/第三方):需要 O(1) 任意移除(带节点引用的 LRU,第 6 题)。Stack:仅遗留代码兼容。并发栈:ConcurrentLinkedDeque(无锁)/BlockingDeque(生产消费)——并发场景另选。ArrayDeque 的 null 禁止:deque.addFirst(null) 抛 NPE——null 的空间留给"空"的语义(第 18 题 null 政策一致)。'),
    ],
    [
      block('验证:性能与语义的断言组', '验证:吞吐断言(单线程千万次 push/pop:ArrayDeque vs Stack 的耗时——锁开销可见);语义断言(ArrayDeque 无 get(i)(Deque 接口无此方法)——编译期禁旁路);复用断言(ArrayDeque 出队后空间复用(不立即扩容))——三组固化替代的收益。'),
      block('追问链:Deque 三刀', '一刀:"ArrayDeque 的容量?"——构造传容量(避免扩容,第 10 题)——默认 16,2 的幂(循环掩码);扩容翻倍(循环数组重建)。二刀:"迭代顺序?"——Deque iterator 从头到尾(与 pop 序一致——比 Stack 的反直觉迭代友好);descendingIterator 反向。三刀:"与 recursion 的转换?"——显式栈替代递归(深递归 StackOverflow——栈帧换堆对象,第 18 题线程栈)——ArrayDeque 是递归转迭代的标准工具。'),
    ],
    ['Stack 是 Vector 遗留,Deque 是正解', '语义纯(无旁路)+零锁', '递归转迭代也用它'], [api('java/util/ArrayDeque')],
  ),
  'collections/29': deep(
    'BitSet 适合怎样的海量标记场景？',
    '网银风控沙盘:1 亿用户的"今日已签到"标记——HashSet<Long> 存 1 亿 Long(每条 48 字节+引用≈5GB)vs BitSet(1 亿位=12.5MB)——位级的空间效率是 400 倍(本机可实测)。',
    [
      'BitSet 的机制:long[](64 位/元素)+位索引(get/set/clear)——内存=位数/8 字节;1 亿位=12.5MB——标记型海量集合(存在性判断)的空间最优解。',
      '位运算能力:and/or/xor(集合交并差,一次操作处理整批)——签到交集(两天都签的用户)、黑白名单合并——集合代数在位级原子完成。',
      '边界:只存"是/否"(无值)、键必须是可映射的密集整数(稀疏 ID 浪费位)、非线程安全(并发 set 要外部同步或分片)。',
    ],
    [
      block('机制:位存储与集合代数', '存储:user id → bit 索引(id 直接做位下标或偏移映射)——set(id) 置位;内存=id 最大值/8(稀疏 ID[如 9 开头手机号]需映射[哈希/偏移]否则浪费)。集合代数:and(交集:两天都签)、or(并:任一天签)、xor(差:仅一天签)、andNot(剔除)——每个操作 O(字长数)=12.5MB/8=156 万 long 的循环(毫秒级)。Cardinality:cardinality() 统计置位数(签名人数)——高效的位计数(popcount)。'),
      block('反例:BitSet 的三种误用', '误用一,稀疏 ID 直用:用户 ID 千万级离散(最大 40 亿)——BitSet 长度=40 亿位=500MB(实际 1 亿用户)——先映射(密集索引)或换 RoaringBitmap(压缩位图)。误用二,存值不存位:BitSet 只能"是/否"——存"签到次数"用 int 数组/Map。误用三,并发 set:BitSet 非线程安全(两线程 set 相邻位,底层 long 的位操作竞争)——分片(按 ID 段分多个 BitSet)或同步。三条的正解:位图的前提是"密集+布尔+可控并发"。'),
      block('取舍:BitSet vs RoaringBitmap vs Bloom', 'BitSet:密集 ID+纯布尔+单机——空间最优。RoaringBitmap:稀疏 ID+压缩(分桶容器)——稀疏场景的标准解(列存数据库同款)。Bloom 过滤器:概率存在性(误判,不可删——标准版)——"可能存在/肯定不存在"(第 30 题)。阶梯:BitSet(密集)→Roaring(稀疏)→Bloom(概率、超大)——按 ID 密度与准确性要求选。'),
    ],
    [
      block('验证:空间效率的断言组', '验证:内存对照断言(1 亿标记:HashSet 内存按对象头+引用推演,JOL 样例可实测 vs BitSet 的 12.5MB);集合代数断言(and/or 的交集并集正确性);性能断言(set/cardinality 的吞吐)——三组固化位图的适用性;RoaringBitmap 的对照(稀疏场景)标注为扩展。'),
      block('追问链:位图三刀', '一刀:"分布式位图?"——跨实例的签到合并:各实例 BitSet 序列化上传(ByteArrayOutputStream)——合并 or——位图的序列化友好(紧凑)。二刀:"Redis 的位图?"——SETBIT/BITCOUNT(Redis 位图)——分布式位标记(Redis 位串即 BitSet 的远程形态);大偏移的分配(稀疏注意)。三刀:"位图与布隆的边界?"——BitSet 精确无假阳(全量位);Bloom 概率有假阳(哈希映射,省空间于"远超位数的集合")——准确性与空间的极致取舍(第 30 题)。'),
    ],
    ['1 亿标记 12.5MB,位级效率', 'and/or/xor 整批集合代数', '稀疏 ID 换 Roaring,概率换 Bloom'], [api('java/util/BitSet')],
  ),
  'collections/30': deep(
    '布隆过滤器的误判和删除限制如何处理？',
    '网银缓存沙盘:布隆过滤器防穿透("肯定不存在/可能存在")——误判率(哈希碰撞,约 1% 可调)导致"存在但被拒";不可删除(位共享)导致"删除的元素仍判存在"。用误判率公式与删除替代方案说明处理。',
    [
      '误判的机制:k 个哈希函数置 k 个位——查询的 k 位全 1 判"可能存在"(可能全是别的元素置的)——误判率≈(1-e^(-kn/m))^k;参数 m(位数)/k(哈希数)/n(元素数)——预装容量与误判率的折中(m/n≈10,k=7 → ~0.8%)。',
      '误判的后果分级:缓存穿透防护的误判=回源一次(无害,兜底在 DB);黑名单误判=误拦好用户(有害)——误判的代价决定布隆的适用性(代价低才用)。',
      '删除的替代:计数布隆(每位置计数器,空间×4-8)或布谷鸟过滤器(可删除,误判类似)或"定期重建"(全量重装过滤器)——按删除频率选。',
    ],
    [
      block('机制:误判率与参数设计', '参数公式:误判率 p≈(1-e^(-kn/m))^k;最优 k=(m/n)ln2(对 p 求导取极小);把最优 k 代回 p 的表达式化简即得 m=−n·ln(p)/(ln2)²(推导出处:布隆过滤器原始论文的标准结果,面试可答"对 p 求极值化简而来")——例:n=1 亿,p=1%→m≈9.6 亿位=120MB。预装容量:n 超预期(元素多于设计)→误判率超标——容量按"上限元素数"设计(或用可扩容布隆[Guava 的 Guava BloomFilter 不可扩,RedisBloom 可扩])。哈希函数:Guava 用 murmur3——哈希质量决定实际误判。'),
      block('反例:布隆误用的两种事故', '事故一,黑名单误判:黑名单用布隆(1% 误判)——1% 的正常用户被拦(客诉);修复:布隆做"初筛"(可能存在→查权威库确认)——布隆的位=加速,不是终审。事故二,删除需求硬上:过滤器的元素下线后仍判"可能存在"——缓存穿透防护的失效元素永远回源(无害)但黑名单场景=永久误拦——删除需求→计数布隆/布谷鸟/定期重建。两条的正解:先判"误判的代价",再选结构与参数。'),
      block('取舍:布隆 vs 位图 vs 哈希集', '布隆:空间极致+概率误判+不可删——超大集合的存在性初筛。位图(BitSet/Roaring):精确+可删(Roaring)+空间随 ID 范围(第 29 题)——ID 密集时优于布隆(无误判)。哈希集合:精确+可删+空间最贵(全元素存储)——量小直接用。阶梯的判据:空间预算×误判容忍×删除需求三维。'),
    ],
    [
      block('验证:误判率的实测断言', '验证:误判率断言(Guava BloomFilter 1 亿元素 p=1%——插入后测 100 万个"不在集合"的查询,误判率实测≈1%);删除限制断言(移除元素后 mayContain 仍 true);参数敏感性断言(n 超预期 2 倍,误判率跳升实测)——三组让布隆的行为从公式变成实测。'),
      block('追问链:布隆三刀', '一刀:"Guava 还是 RedisBloom?"——Guava(单机,不可扩,快)vs RedisBloom(分布式,可扩容可删,模块部署)——单机初筛用 Guava;分布式共享用 RedisBloom(第 30 题)——部署形态决定。二刀:"与 Set 的组合?"——布隆(初筛)+小 Set(精确,热数据)——布隆挡 99% 负查询+Set 精判——两级结构。三刀:"布隆的监控?"——预期元素数 vs 实际插入数(超预期→误判率上升告警)——容量是布隆的生命线(第 48 题指标)。'),
    ],
    ['误判率可调,删除不可为', '误判代价低才用布隆', '删除需求换计数布隆或布谷鸟'], [pod],
  ),


  'collections/31': deep(
    '如何为千万级数据实现去重？',
    '网银渠道消息沙盘:每天 1 亿条消息按消息 ID 去重——HashSet 存 1 亿 ID(内存 5GB+);布隆(误判);Redis Set(网络+内存);位图分片/数据库唯一约束——按"准确性/内存/分布性"三维选型(第 30 题 ID 密度维度+第 29 题 BitSet 衔接)。',
    [
      '选型三维:准确性(绝对不重=唯一约束/HashSet;容忍误判=布隆)、内存与分布(单机内存够=Set/BitSet;超内存或分布式=Redis/DB)、ID 密度(密集=位图;稀疏=Set/Roaring)——三维交叉出方案。',
      '工程组合:布隆初筛(挡 99% 已见)+Redis Set 精判(处理布隆的"可能存在")——两级结构把内存与准确性都拿到(第 30 题两级结构的规模化)。',
      '持久化的兜底:数据库唯一约束(消息表 msg_id 唯一索引)——内存方案的最终防线(重启/误判的最后闸门,第 5 题条件更新的约束哲学同构)。',
    ],
    [
      block('机制:三维交叉的方案矩阵', '单机+准确+内存可接受:HashSet/LongAdder 辅助(1 亿 Long≈5GB,堆要够)——或 long[]+排序+二分(紧凑但插入 O(n))。单机+容忍误判:布隆(120MB@1%)+定期重建(第 30 题)。分布式+准确:Redis SETNX(msg_id, NX+TTL——原子去重,网络往返成本)+DB 唯一约束兜底。分布式+容忍:分布式布隆(RedisBloom)。矩阵的选择:准确性是底线(资金相关必须约束兜底),其余按成本。'),
      block('反例:去重方案的两种失效', '失效一,内存 OOM:1 亿 ID 的 HashSet 部署在 4G 堆——OOM 前的 GC 风暴(第 32 题 String 膨胀同族)。失效二,布隆误判资损:去重布隆误判"已处理"(1%)——1% 的合法消息被丢弃——消息不能丢(资金消息)→布隆不可单独用。两条的正解:布隆只做初筛+权威去重(约束/Redis)兜底;容量按上限预设计。'),
      block('取舍:TTL 与去重窗口', '去重窗口:消息 ID 的有效期(重发窗口通常分钟到小时)——去重集合带 TTL(Redis EXPIRE/内存过期清理)——无限累积的去重集合=内存慢性泄漏(第 13 题 banking 缓存无上限同构)。窗口的依据:上游重发的最大时间跨度+时钟偏差余量。跨窗口重复:超出窗口的重复消息=上游协议异常(告警,不是去重能解决的)。'),
    ],
    [
      block('验证:去重方案的断言组', '验证:准确性断言(组合方案:布隆+Redis 的重复拦截率 100%——构造重复消息序列断言零重复执行);内存断言(方案内存占用实测 vs 预算);TTL 断言(过期后同 ID 重入——窗口语义正确)——三组进去重组件验收;唯一约束的兜底用例(内存方案全失效时 DB 拦截)。'),
      block('追问链:去重三刀', '一刀:"去重与幂等的区别?"——去重=识别重复(拦截);幂等=重复执行无害(执行语义)——去重是幂等的前置优化(减少重复执行),幂等是最后防线(分布式 8 题)——两层都要。二刀:"有序消息的去重?"——消息带序号:去重+乱序检测(序号回退告警)——去重与顺序是两个协议问题。三刀:"去重的监控?"——重复率(拦截数/总数——突增=上游异常,第 50 题)、去重集合水位(内存)——重复率是渠道质量的直接指标(banking 17 题)。'),
    ],
    ['三维选型:准确/内存/分布', '布隆初筛,约束兜底', '去重带 TTL,窗口按重发期'], [pod],
  ),
  'collections/32': deep(
    '如何避免 HashSet 保存大量字符串造成内存膨胀？',
    '网银 ID 沙盘:HashSet<String> 存 1 亿个 20 字符 ID——每个 String(对象头+char[]/byte[]+引用)≈80-100 字节,总计 10GB——内存膨胀的治理:结构压缩( intern/long 编码/紧凑结构)与存储替代(位图/DB)。',
    [
      '膨胀的构成:每个 String≈40-80 字节(对象头+byte[]头+内容+数组对齐)+HashSet 的 Entry(引用+hash+next)≈32 字节+引用——合计每元素 80-120 字节;1 亿条=8-12GB。',
      '压缩三招:long 编码(ID 可转数值:long 8 字节 vs String 80——10 倍压缩,HashSet<Long> 或 long[] 排序二分)、字符串驻留(重复前缀 intern——JDK 的 String 去重[G1 自动]或手动 Map 共享)、紧凑结构(long[] 排序+二分查找——无对象头,纯数据)。',
      '存储替代:超内存→DB 唯一约束/Redis(Roaring 位图——第 29 题密集 ID 的 12.5MB 形态)——内存放不下的交给专业存储。',
    ],
    [
      block('机制:String 的内存构成与压缩', 'String 构成(JDK 17,紧凑字符串):对象头 12+byte[]引用 4+hash/hashCode 缓存+byte[](16 数组头+内容 UTF-16→Latin1 压半)——20 字符 Latin1 String≈56 字节+Entry 32+引用 4≈90 字节。long 编码:ID 结构化(前缀+序列)→long 编码(8 字节)——10 倍压缩的前提=ID 可无损转数值(哈希有碰撞,不行)。long[]+二分:排序后 O(log n) 查找——内存=纯数据(8 字节/条),无对象开销。'),
      block('反例:膨胀的两种后果', '后果一,GC 压力:10GB 的 HashSet(百万 Entry)——Full GC 扫描与标记的时间暴涨(堆大对象多)。后果二,序列化传输:该 Set 的网络传输/持久化(10GB)——一切 IO 都贵。两条的正解:编码压缩(减体积)+存储下放(减驻留)——先问"这些 ID 必须在内存里吗"(第 31 题分布式去重的三维)。'),
      block('取舍:压缩与可读性的平衡', 'long 编码的前提:ID 结构稳定(编码规则变更=迁移);可读性损失(调试看 long 不直观)——toString 工具补偿。字符串驻留(intern):同前缀的 ID 共享——G1 的自动字符串去重(-XX:+UseStringDeduplication,第 28 题JVM)对 HashSet 场景的收益(前缀重复率高时显著)。保留 String 的场景:ID 无结构+低重复率——压缩空间有限,直接上存储方案。'),
    ],
    [
      block('验证:压缩收益的断言组', '验证:内存实测断言(1 千万 ID:HashSet<String> vs HashSet<Long> vs long[] 的实际堆占用对照——10 倍级差异);查找性能断言(long[] 二分 vs HashSet 的查询耗时);编码正确性断言(编码-解码往返无损)——三组让压缩决策有数据。'),
      block('追问链:膨胀三刀', '一刀:"String 的紧凑字符串?"——JDK 9+ Latin1(ASCII 内容减半)——JDK 17 的 String 已比 8 优化;但 90 字节/条的结构性开销仍在(对象头)——压缩的天花板是结构替代。二刀:"Set 的初始容量?"——第 1 题(容量规划):1 亿条 hash 的扩容 rehash(16→…→2.7 亿桶)——预分配+扩容抖动的双重治理。三刀:"分片策略?"——超内存的分片(按 ID 哈希分 N 个小 Set,逐片处理)——分片是内存与分布式的过渡形态(第 31 题)。'),
    ],
    ['String 一条 90 字节,结构膨胀的根源', 'long 编码 10 倍压缩', '内存放不下交给存储'], [api('java/lang/String')],
  ),
  'collections/33': deep(
    '如何设计复合键以避免字符串拼接冲突？',
    '网银缓存键沙盘:缓存键用拼接"userId:orderId"——userId 含冒号(外部输入)导致键歧义(用户 "a:b" 与用户 "a" 的订单 "b" 拼出同键)——复合键的结构化设计(类型化键类/安全分隔/规范化)。',
    [
      '拼接冲突的形态:分隔符出现在字段值中(userId="a:b" + orderId="c" → "a:b:c" ≡ userId="a" + orderId="b:c")——键的解码歧义;Unicode 规范化差异(全角冒号/组合字符)——相同业务键不同字符串。',
      '结构化复合键:record CacheKey(long userId, long orderId)(类型化字段,无字符串拼接)——hashCode/equals 自动正确;字符串键的规范:字段值转义(分隔符转义)+值规范化(trim/NFC)+固定字段序。',
      '键的设计纪律:缓存键(第 14 题 banking)的字段构成要有 schema(哪些字段/顺序/编码)——schema 化的键=可文档化可校验(防止各处手拼的不一致)。',
    ],
    [
      block('机制:歧义的成因与结构化消除', '成因:字符串拼接是无 schema 的编码(信息丢失:分隔符与值的边界);值域未约束(外部输入含分隔符)。消除:类型化键(record,编译期防拼错)+值域校验(数字 ID 不含分隔符——类型天然保证)+编码转义(字符串值必须含分隔符时:转义 \\\\ 与 :)。规范化:NFC(Unicode 规范形)+大小写策略(大小写敏感声明)——相同业务键→相同字符串(第 27 题路由一致性同构)。'),
      block('反例:拼接键的三种事故', '事故一,分隔符注入:userId="x:admin" 的用户命中 admin 的缓存键(越权读写,安全缺陷)——键歧义升级为越权(第 18 题)。事故二,规范化缺失:同一邮箱大小写不同的两个键(缓存翻倍+不一致,第 14 题 banking)。事故三,字段序漂移:两处代码拼键字段序不同(1:2 与 2:1)——缓存互不命中(命中率诡异地低)。三条的正解:键 schema+类型化+规范化统一收口。'),
      block('取舍:类型化键的成本', '成本:键类(每缓存一个 record)+序列化(toString 调试/序列化兼容)——比字符串拼接多一层。收益:编译期防错(字段类型/顺序)、equals/hashCode 自动正确、可文档化。折中:字符串键+键构造器(CacheKeys.of(userId, orderId) 统一转义与规范化)——字符串形态+结构化纪律——团队规模与键数量决定(第 43 题组件纪律)。'),
    ],
    [
      block('验证:键安全的断言组', '验证:注入断言(userId 含分隔符,结构化键 vs 拼接键的碰撞对照——拼接的歧义实证);规范化断言(大小写不同的同业务键→同一键);schema 断言(键构造器拒绝缺字段/错类型——编译期+运行时双检)——三组固化键设计。'),
      block('追问链:复合键三刀', '一刀:"键的序列化?"——类型化键的序列化(record 的 JSON/自定义 toString 作缓存展示)——序列化形态与解析的对称(能写就能读)。二刀:"键的版本?"——键 schema 变更(加字段)→旧缓存键失配——键版本化(键前缀 v2:)或全量失效(第 34 题快照)——键的演进是缓存治理的一部分。三刀:"键的长度?"——超长键(全部字段拼接)的内存与性能(哈希计算)——长字段哈希(摘要)化(内容 hash 作键的一部分)——键也是数据,有成本。'),
    ],
    ['拼接是无 schema 的编码', '类型化键,编译期防错', '规范化统一,分隔符转义'], [pod],
  ),
  'collections/34': deep(
    '集合排序为什么必须使用稳定且一致的比较器？',
    '网银列表沙盘:交易列表按"金额排序"——比较器只比金额(金额相等时顺序随机:TimSort 稳定保插入序但比较器不一致时违反契约)——一致性与稳定性的两个层次:比较器自洽(compare(a,b) 与 compare(b,a) 对称/传递)+跨字段扩展。',
    [
      '稳定性(Sort 稳定):TimSort 保相等元素的相对序(稳定排序)——相等定义=compare==0:比较器只比金额时,金额相等的交易保持原序(稳定)——但"原序"依赖输入顺序(分页后不稳定,第 44 题)。',
      '一致性(比较器契约):对称(compare(a,b)=−compare(b,a))与传递(传递闭包)——违反(如浮点比较的 NaN、复合比较的遗漏字段)→IllegalArgumentException(Collection.sort 检测)或静默错序。',
      '正确姿势:全字段比较链(主字段→次字段→唯一键兜底[流水号]——总序保证)+Comparator.comparing(...).thenComparing(...) 链式——多字段排序的确定性(第 44 题分页稳定排序的架构面)。',
    ],
    [
      block('机制:稳定性与一致性的协作', '稳定性:TimSort(对象)/dual-pivot quicksort(基本类型,不稳定)——对象的 Collections.sort 稳定:相等元素保相对序——稳定的前提=比较器"相等"的定义正确。一致性:compare 必须自洽(对称+传递+可比)——不一致的经典:比较器用可变字段(排序前后字段被改,第 46 题)、浮点差值取整(0.1-0.1=0 但比较错)。链式比较:comparing(金额).thenComparing(时间).thenComparing(流水号)——最后落到唯一键(总序,分页稳定的前提)。'),
      block('反例:不一致比较器的事故', '事故一,传递性破坏:比较器"A 在前如果金额大,否则按时间"——A 金额大时间早、B 金额大时间晚的交叉——TimSort 检测到不一致抛 IllegalArgumentException("Comparison method violates its general contract")——生产异常(排序触发)。事故二,可变字段:比较器引用对象的 name 字段,排序中(并发)name 被改——不确定性(第 46 题专论)。事故三,NaN:金额 NaN 时所有比较 false——排序结果随机。三条的正解:字段链+唯一键兜底+不可变快照(排序前拷贝或防御)。'),
      block('取舍:比较器的复用与组合', '复用:常用排序(金额/时间)定义常量 Comparator(BY_AMOUNT/BY_TIME)——组合 BY_AMOUNT.thenComparing(BY_TIME)——散落的 lambda 重复(第 8 题:同一排序逻辑两处不一致)。组合的方向:比较字段的可变性(排序时拷贝防御,第 46 题)与比较器的注册(枚举排序策略,第 32 题注册表)。'),
    ],
    [
      block('验证:排序契约的断言组', '验证:一致性断言(比较器的自洽测试:随机对象对,断言对称+传递——属性测试风格);稳定性断言(相等元素的原序保持——TimSort 稳定实证);确定性断言(同输入两次排序输出完全一致——第 41 题顺序确定性)——三组固化排序契约;TimSort 异常的复现用例(不一致比较器的 IllegalArgumentException)进评审素材。'),
      block('追问链:排序三刀', '一刀:"TimSort 的违规检测?"——TimSort 在合并时检测不一致(抛 IllegalArgumentException)——不是每次必抛(取决于数据形态)——不一致比较器的"偶发爆炸"更难排查(数据依赖)。二刀:"null 在排序里?"——nullsFirst/nullsLast(显式声明 null 位置)——默认 null 抛 NPE——null 语义显式化(第 18 题)。三刀:"大列表的排序成本?"——O(n log n)+TimSort 的临时数组(n/2 引用)——大列表排序的内存与时间(流式 TopK 替代,第 35 题)。'),
    ],
    ['稳定保原序,一致保正确', '比较链落到唯一键', '可变字段排序先防御'], [api('java/util/Comparator')],
  ),
  'collections/35': deep(
    'Top K 问题为什么常用固定大小堆？',
    '网银风控沙盘:10 亿条交易找金额最大的 100 笔——全排序 O(n log n)(10 亿×30)内存放不下;固定大小小顶堆(容量 100):新元素与堆顶比较,O(log 100) 更新——总 O(n log K),内存 O(K)。',
    [
      '固定堆的机制:容量 K 的小顶堆——新元素>堆顶→替换堆顶( siftDown);≤堆顶→丢弃——堆里始终是"目前最大的 K 个";内存只占 K(流式处理,数据不必全载)。',
      '复杂度对照:全排序 O(n log n)+O(n) 内存;固定堆 O(n log K)+O(K) 内存——n=10 亿 K=100:log n≈30 vs log K≈7,内存 GB vs KB。',
      '扩展:并发 Top K(分片各自堆→合并 K×分片数,第 39 题 batch 同构)、滑动窗口 Top K(堆+过期)、加权 Top K(比较器带权重,第 34 题比较器契约)。',
    ],
    [
      block('机制:固定堆的流式处理', '流式:数据不必存储(逐条处理,堆只存当前 Top K)——适合流(消息流/日志流)与超大静态集(全量扫描一遍)。堆的初始化:前 K 个元素建堆(O(K)),后续逐条比较——分摊 O(log K)/条。并列与稳定性:堆顶比较时并列(金额相等)的处理(时间戳次序——第 34 题比较链);Top K 的并列边界(K 名的边界并列=任意取——业务要知情,第 44 题)。'),
      block('反例:Top K 的两种浪费', '浪费一,全排序:10 亿条 List 排序——内存(GB 级)+时间(全排序)——只需要 K=100 却排序 10 亿。浪费二,计数后排序:先 Map 计数(全部 key 入内存)再排序——key 空间爆炸(分布式 32 题 String 膨胀同族)——流式堆避免全量计数(计数型 Top K 用 CountMinSketch 近似,第 30 题)。两条的正解:先问 K 与 n 的规模,再选算法(K 小 n 大=堆是唯一合理解)。'),
      block('取舍:堆 vs 其他 Top K 方案', '固定堆:单机流式/精确/K 小——首选。分治堆:数据分片(多机/多线程)各自堆→合并(精确,可扩展)。CountMinSketch:近似 Top K(超大流,容忍误差)。桶计数:值域密集(金额分桶)——计数排序思想。选择:n 与 K 的比(K 小用堆)、流式 or 批、精确 or 近似。'),
    ],
    [
      block('验证:固定堆的断言组', '验证:正确性断言(随机流:固定堆的 Top K 与全排序的 Top K 一致);复杂度断言(n=1 亿 K=100 的耗时——O(n log K) 的实测);内存断言(堆内存=O(K) 恒定)——三组固化固定堆;并列边界的用例(第 K 与 K+1 并列的处理——业务知情)。'),
      block('追问链:Top K 三刀', '一刀:"堆的并发?"——PriorityQueue 非线程安全(第 26 题):并发 Top K=分片堆+合并(每线程本地堆,最终合并——无锁竞争);PriorityBlockingQueue(全局锁)吞吐低——分治优于共享。二刀:"堆的元素更新?"——滑动窗口(元素过期出堆):堆不支持高效任意删除(第 26 题)——惰性删除(标记过期,poll 时跳过)是标准解。三刀:"Top K 的业务语义?"——K 的边界并列、权重变化(金额 vs 频次)——Top K 的定义本身要评审(第 50 题问题锚点)。'),
    ],
    ['n 大 K 小,堆是唯一合理解', '流式处理,内存 O(K)', '分片堆合并,并发 Top K'], [api('java/util/PriorityQueue')],
  ),
  'collections/36': deep(
    'ConcurrentSkipListMap 适合哪些并发有序查询？',
    '网银行情沙盘:价格档位表(按价格有序,高并发读写)——ConcurrentHashMap 无序,TreeMap 非线程安全——ConcurrentSkipListMap(跳表):并发+有序+范围查询(O(log n) 跳表)。',
    [
      '跳表的机制:多层有序链表(上层稀疏索引,查找从上层跳)——无锁读(遍历安全)+CAS 写(插入/删除的标记删除)——并发有序的 JDK 标准解(替代并发 TreeMap——JDK 没有并发红黑树)。',
      '能力集:navigable(ceiling/floor/higher/lower)+subMap 范围视图+并发安全迭代(弱一致)——TreeMap 的全部导航能力+线程安全。',
      '代价:内存(每节点多层指针,平均 1.33 层)、写成本(CAS+索引维护)——比 CHM 慢(有序的结构成本);无锁读的性能好于全锁 TreeMap+读写锁。',
    ],
    [
      block('机制:跳表与并发语义', '跳表:节点随机层高(抛硬币,概率均衡)——查找从最高层横向跳+向下(期望 O(log n));并发:插入 CAS 接链+逻辑删除(标记)+物理清理(帮助式)——迭代弱一致(不抛 CME,可见部分更新,第 15 题分布式 CHM 同族)。与 TreeMap 的对照:TreeMap 全树锁(并发=串行化,读写锁读并发但写互斥)——CSLM 读完全并行。'),
      block('反例:选型的两种浪费', '浪费一,无序需求用 CSLM:不需要范围/排序——CSLM 的内存与写成本白付(CHM 更快,第 2 题)。浪费二,低并发用 CSLM:单线程或低并发——TreeMap 更快(无跳表开销)——CSLM 的价值=并发×有序的交集。两条的正解:有序+并发的交集才是 CSLM 的主场(第 7 题TreeMap 的并发升级路径)。'),
      block('取舍:CSLM 的应用画像', '画像一,价格档位(行情):按价格有序+高并发读写——CSLM 的经典(floorEntry 找对手价)。画像二,优先级+并发的任务表(按时间有序+并发领取,第 41 题 distributed 租约):subMap(到期区间)领取。画像三,排名/榜单(按分数有序+高频更新)——实时榜单的并发有序。共同点:有序遍历/范围查询是核心操作且并发高。'),
    ],
    [
      block('验证:并发有序的断言组', '验证:并发断言(多线程读写下的范围查询正确性——subMap 结果在快照语义内);导航断言(floor/ceiling 的并发语义——返回某时刻的合法邻居);吞吐对照(CSLM vs TreeMap+锁 的并发读写吞吐)——三组固化 CSLM 的定位;迭代弱一致的语义(第 15 题)单列断言。'),
      block('追问链:CSLM 三刀', '一刀:"size 的问题?"——O(n) 遍历计数(跳表无计数器)——size 昂贵(缓存 size 的近似值或避免,第 19 题 CHM size 的弱一致同源)——CSLM 的 size 比 CHM 更弱(无分片计数)。二刀:"null 政策?"——键值都禁 null(与 CHM 一致,第 18 题)——并发容器的统一 null 政策。三刀:"与 Redis ZSET?"——分布式有序(跨实例)→Redis ZSET(score 排序+范围)——CSLM 单机;跨实例的"行情档位"要 Redis(第 31 题分布式去重的分布维度)。'),
    ],
    ['并发乘以有序,才是它的主场', '跳表无锁读,写 CAS', 'size 昂贵,避免依赖'], [api('java/util/concurrent/ConcurrentSkipListMap')],
  ),
  'collections/37': deep(
    'WeakHashMap 能直接当通用缓存使用吗？',
    '网银缓存沙盘:WeakHashMap 当缓存(键弱引用,GC 自动清)——不能:值强引用键(值持有键的字段→键永不清)、无 TTL/容量上限、无过期回调——WeakHashMap 是"键生命周期跟随外部"的映射,不是缓存。',
    [
      'WeakHashMap 的真实语义:键被 GC 后条目自动移除(expungeStaleEntries 在访问时清理)——适合"键的生命周期由外部管理"的场景(对象附加元数据:ThreadLocal 的替代、监听器关联)。',
      '当缓存的三个缺口:值持键(缓存值对象含键引用[如 CacheEntry(key, value)]→键强可达→永不清除——泄漏)、无淘汰策略(只有 GC 压力触发,内存不足才清——不可控)、无 TTL(过期语义缺失)。',
      '正确替代:通用缓存用 Caffeine(TTL/容量/统计,第 6 题);"对象附加元数据"用 WeakHashMap(元数据跟随对象生死)——语义匹配才是关键。',
    ],
    [
      block('机制:弱引用与清理时机', '弱引用:键被 WeakReference 包装——GC 回收键(无强引用)后,条目进 ReferenceQueue;WeakHashMap 在下次访问(expungeStaleEntries)时移除对应条目——清理时机=下次 get/size 等(被动,不及时)。值持键的陷阱:CacheEntry(key, value) 的 value 字段引用 key→键强可达(经 value)→弱引用失效→永不清理——经典泄漏(值的设计要避开键)。'),
      block('反例:WeakHashMap 当缓存的事故', '事故一,值持键泄漏:缓存 entry 的 value 引用 key(哪怕间接:值对象持有 key 的字段)——WeakHashMap 永不清——内存涨到 OOM。事故二,清理不及时:无访问则不清(哪怕 GC 已回收键)——内存峰值依赖 GC 调度(不可控)。事故三,无淘汰语义:业务要求"1000 条上限"——WeakHashMap 无容量概念。三条的正解:缓存语义(容量/TTL/淘汰)交给 Caffeine;WeakHashMap 只做"元数据跟随对象"的窄用途。'),
      block('取舍:WeakHashMap 的合法场景', '场景一,对象元数据:给第三方对象(不能改类)附加信息——WeakHashMap<Object, Meta>(对象销毁,元数据随走)——生命周期跟随。场景二,临时关联:监听器关联(ThreadLocal 的替代——线程退出自动清)——避免强引用阻止回收。判据:键的生命周期"由外部决定"且"元数据与键同生共死"——这才是 WeakHashMap 的语义。'),
    ],
    [
      block('验证:语义边界的断言组', '验证:自动清理断言(键失去强引用+触发访问后,条目消失——GC 配合的用例[System.gc()+访问]);泄漏断言(值持键的形态:条目永不消失——泄漏实证);替代对照(Caffeine 的 TTL/容量行为——WeakHashMap 缺失的能力清单)——三组固化语义边界。'),
      block('追问链:WeakHashMap 三刀', '一刀:"值持键怎么防?"——值设计不含键(值只含派生数据)+自查(值的可达路径审计)——防泄漏的设计纪律。二刀:"清理的主动性?"——无主动清理 API(expunge 私有)——定期 size 检查(间接触发清理)——清理的被动性是它的本质缺陷。三刀:"与 WeakReference 手写的对照?"——WeakHashMap=封装好的弱键映射;复杂需求(值持键+主动清理)→手写 WeakReference+ReferenceQueue(第 29 题 C2 的原理层)——复杂场景手写,简单场景用容器。'),
    ],
    ['WeakHashMap 是元数据映射,不是缓存', '值持键=永不清除', '缓存语义交给 Caffeine'], [api('java/util/WeakHashMap')],
  ),
  'collections/38': deep(
    'IdentityHashMap 为什么不能替代普通业务 Map？',
    '网银重构沙盘:HashMap 换 IdentityHashMap 想提速(跳过 equals/hashCode)——语义变了:按引用相等(==)判键——同值的两个对象不再同一键,equals 重写的类行为全变——IdentityHashMap 是"按对象身份"的特化 Map,不是提速的 HashMap。',
    [
      '语义差异:IdentityHashMap 用 ==(引用相等)判键(跳过 equals/hashCode)——两个内容相同的对象=两个键;HashMap 用 equals(内容相等)=一个键——同一段代码换 Map 类,行为全变(语义变更)。',
      '合法场景:对象身份有业务含义(对象图遍历的已访问标记[防循环:同一对象只处理一次,内容相等的不同对象要各处理]、序列化的引用保持、瞬态标记)——"每一个对象实例"是键的本意。',
      '性能的真相:跳过 hashCode/equals 的收益微(哈希仍要 System.identityHashCode)——它的动机是语义(身份),不是性能——为性能换它是错误的动机。',
    ],
    [
      block('机制:身份语义与适用面', '身份键:System.identityHashCode 定位+== 判等——"这个对象"而不是"这个值"的对象图场景:遍历对象图(每个实例访问一次——同值不同实例是不同节点)、序列化引用保持(同一对象序列化一次+引用)。业务 Map 的判等=业务键(值语义:同单号同键)——IdentityHashMap 的身份语义与业务键(值)直接冲突(第 3 题banking 幂等键的值语义同源)。'),
      block('反例:身份语义的两种误用', '误用一,提速换 Map:缓存(按业务键)换 IdentityHashMap——同值不同实例=缓存永远 miss(缓存失效)+内存涨(同值多份)——语义错误+性能双输。误用二,equals 重写类的行为混乱:重写了 equals 的类(String/List)在 IdentityHashMap 中"每个实例都是键"——与业务直觉(同值同键)冲突——团队里出现 IdentityHashMap=语义警报(必须有身份注释)。'),
      block('取舍:身份场景的工程形态', '场景实现:对象图遍历用 IdentityHashMap(visited 集合——每个实例一次)+序列化引用保持(JDK 序列化内部形态)+对象池的身份判断。工程纪律:IdentityHashMap 的使用必须注释"为什么需要身份语义"+评审确认(第 24 题)——它出现的默认反应是质疑,不是接受。替代:WeakIdentityHashMap(第三方[Guava 无内置,需手写或 Caffeine weakKeys=Caffeine 的 weakKeys 即身份键!])——Caffeine 的 weakKeys 语义=身份键(缓存场景要慎用同款陷阱)。'),
    ],
    [
      block('验证:语义差异的断言组', '验证:身份断言(同值不同实例:HashMap 一个键、IdentityHashMap 两个键——语义差异实证);重写类断言(String 键在两种 Map 的行为差);性能断言(两 Map 的吞吐对照——性能差异微小的实证,反驳提速动机)——三组固化语义边界。'),
      block('追问链:身份 Map 三刀', '一刀:"hashCode 的影响?"——identityHashCode 不可重写(对象默认)——身份键的哈希=对象头派生(稳定)——与 equals 重写无关(跳过)——设计自洽。二刀:"与 WeakIdentity 的组合?"——身份+弱引用(对象图元数据不阻止回收)——组合语义的窄用途。三刀:"业务里真有身份需求吗?"——极少(对象图/序列化/池)——99% 的"想用"其实是值语义想提速(错误动机)——评审的默认质疑成立。'),
    ],
    ['身份键是语义选择,不是性能优化', '同值不同实例=不同键', '出现即质疑,注释必须说明身份'], [api('java/util/IdentityHashMap')],
  ),
  'collections/39': deep(
    '如何实现线程安全的多值映射？',
    '网银索引沙盘:userId→多个订单 ID(一主多值)——Map<String, List<String>> 手工包装(check-then-add 竞态)+值 List 可变共享——线程安全多值映射的三层:Map<String, CopyOnWriteArrayList> 手工、CHM.compute 原子、Guava Multimap(语义清晰)。',
    [
      '手工包装的坑:computeIfAbsent 原子返回 List,但 List.add 无锁——两线程并发 add 即竞态(第 2 题),值容器也要线程安全(CopyOnWriteArrayList)或全路径加锁。',
      'CHM 原子层:compute(k, (k, list) -> {list.add(v); return list;})——整个读改写在桶锁内(List 的修改在锁内=安全)——但锁内做重活(第 17 题禁忌)——值容器的选择决定锁内成本。',
      'Guava Multimap:ArrayListMultimap/HashMultimap(语义清晰,非线程安全)+Multimaps.synchronizedMultimap(包装)——语义层解决"一主多值"的抽象,线程安全靠包装或 ImmutableMultimap。',
    ],
    [
      block('机制:三层实现的安全面', '层一,compute+线程安全 List:compute(k, (k,l) -> {l.add(v); return l;})——桶锁内修改 CopyOnWriteArrayList(COW 的写锁与桶锁嵌套——锁顺序固定无死锁)——最通用。层二,computeIfAbsent+并发 List:get 到的 List 直接 add(COW 的 add 自带锁)——computeIfAbsent 只保证"List 创建原子",add 的安全由 COW 保证——两层各管一段。层三,Guava Multimap+synchronized 包装——语义最优,性能一般(全表锁)。'),
      block('反例:多值映射的两种事故', '事故一,ArrayList 竞态:computeIfAbsent 返回 ArrayList,两线程并发 add——内部数组竞态(元素丢失/数组越界异常,第 2 题HashMap 并发同构)。事故二,值泄漏:返回内部 List(调用方 add/clear 直接改索引,第 43 题 banking 防御返回同题)——多值映射的值容器也是"内部状态"。修复:返回只读视图(UnmodifiableList/拷贝)——写走显式接口。'),
      block('取舍:多值映射的形态选择', '形态一,CHM+COW:并发读多写少(索引:读多,注册少)——读零锁。形态二,CHM+compute+ArrayList:写多读少(桶锁内 add)——读要同步(遍历时拷贝)。形态三,Guava Multimap+包装:业务语义复杂(分组/翻转/遍历——Multimap 的丰富 API)。判据:读写比+语义复杂度——语义简单选一或二,语义丰富选三。'),
    ],
    [
      block('验证:线程安全的断言组', '验证:并发 add 断言(多线程同键 add,N 次——最终 size=N 零丢失——对照 ArrayList 形态的丢失);防御返回断言(返回视图的修改被拒);读写比断言(COW vs compute 两形态的吞吐对照)——三组固化多值映射的安全与性能。'),
      block('追问链:多值三刀', '一刀:"值的删除?"——从 List 删单值(compute 内 remove)+List 空后删键(空 List 的清理,防 Map 膨胀——第 13 题 banking 无上限同构)——值的增删要联动键的存在性。二刀:"多值的排序?"——值 List 内排序(时间序,第 34 题)——List 的排序线程安全(拷贝排序或 COW)——多值的顺序语义显式。三刀:"与索引的关系?"——多值映射=内存索引(第 2 题banking 投影的内存形态)——索引的一致性(与事实源的同步,第 47 题)——多值映射常是"投影",归属与失效要清楚。'),
    ],
    ['computeIfAbsent 创建原子,List add 要并发安全', 'compute 全程桶锁,锁内勿重活', 'Guava Multimap 管语义,包装管安全'], [pod],
  ),
  'collections/40': deep(
    '分组统计如何避免 Collectors 造成过多中间对象？',
    '网银报表沙盘:千万交易按账户分组求和——Collectors.groupingBy(全量 Map 驻留)+summingDouble(double 精度,第 20 题)——中间对象(分组 List 装全部交易)与装箱(Double)双重压力。用流式归并与原始类型优化说明大数据量的分组统计。',
    [
      '中间对象的两个源头:groupingBy 的 List 装载(每分组一个 List 装全部元素——千万交易全驻内存)、装箱(Stream<Double>/Map<String, Double> 的 Double 对象)——对比原始类型:Map<String, long[]>或自定义 accumulator。',
      '优化阶梯:原始类型收集器(summingLong/groupingBy+mapping 精简)、自定义 accumulator(遍历+Map<String, long[]> 直加——无中间 List)、流式外部聚合(超内存:分片聚合+合并,第 31 题)、预聚合存储(DB group by/物化——内存统计的替代)。',
      '判定问句:分组键的基数与每组大小(1 千组×1 万条=内存可容纳;100 万组×10 条=分组 Map 巨大)——基数决定方案(banking 48 题分布式基数同构)。',
    ],
    [
      block('机制:中间对象的来源与替代', 'groupingBy 的结构:Map<K, List<T>>——每个分组先装 List(全量元素)再下游汇总——中间 List=全量元素驻留(哪怕只要 sum)。替代:toMap+merge(不装 List,直接归并——重复键 merge 函数)、自定义 collector(accumulator 直加 long[])、简单循环(遍历+Map.compute——最朴素最快)。装箱:Long/Double 的对象分配——原始类型流(mapToLong)+long[] 容器——装箱消除。'),
      block('反例:中间对象的两种事故', '事故一,驻留 OOM:千万交易的 groupingBy(分组 List 装全量)——内存峰值超堆(报表 OOM)。事故二,装箱 GC:Double 求和的百万次装箱(每 sum 一次 Double 分配)——GC 压力+精度(第 20 题 double 禁入资金——用 long 分或 BigDecimal——装箱与精度双问题)。修复:循环+long[]/自定义 collector——中间对象归零。'),
      block('取舍:Stream 可读性与性能的平衡', 'Stream 的可读性(groupingBy 声明式)vs 性能(循环直加)——中小数据量(万级)Stream 足够;大数据量(百万+)循环或 DB 聚合。DB 聚合的最优:group by 在数据库(数据在哪聚合在哪——传输最小)——内存聚合是"数据已在本机"的场景。分阶段:先 DB group by 粗聚合(账户级)→内存细算——两级聚合的分工。'),
    ],
    [
      block('验证:中间对象的断言组', '验证:内存对照断言(groupingBy 装全量 vs 循环直加的堆占用对照——GC 统计);性能断言(千万条分组的耗时对照);正确性断言(两种方案的分组求和一致——精度用 long 分/BigDecimal 对照)——三组固化分组统计的优化;基数与方案的映射表进团队指南。'),
      block('追问链:分组统计三刀', '一刀:"流的装箱细节?"——mapToLong/mapToInt(原始流)vs map(装箱流)——boxed 流的分配;summingDouble→summingLong(先定标度,第 20 题)。二刀:"并发分组?"——parallel stream 的 groupingBy(合并开销+线程安全 collector)——并发分组的收益看数据量(第 40 题distributed 分治同构);分片聚合+合并更可控。三刀:"增量统计?"——统计随数据增长(实时报表)——增量更新(Map 直加,不重算全量,第 2 题banking 余额投影同思想)——全量统计 vs 增量维护是报表的架构决策。'),
    ],
    ['groupingBy 装全量,大数据量是坑', '原始类型消装箱,long[] 直加', '数据在哪,聚合在哪'], [api('java/util/stream/Collectors')],
  ),


  'collections/41': deep(
    '集合转换时如何保留确定性的输出顺序？',
    '网银导出沙盘:list.stream().map(x -> x.getId()).collect(toSet()) 转 Set 再遍历——同一输入两次运行的输出顺序不同(Set 无序)、跨 JVM 也不保证(哈希实现可变)——确定性顺序=有序容器+显式比较链(第 34 题)。',
    [
      '顺序丢失的两个环节:中间容器(toSet/toMap 的 HashMap 无序)与键的哈希序(HashMap 的遍历序=桶序,依赖容量与哈希——第 5 题)——确定性要求每一环都有序。',
      '确定性方案:LinkedHashSet(保持插入序)、TreeSet/TreeMap(键序)+比较链(第 34 题)、流的有序源(排序后再 collect toList)——"对 Set 排序"是逻辑错误(Set 无序,sort 无意义)。',
      '跨版本的确定性:同一 JDK 内确定(桶序随容量定),跨 JDK 版本不保证(实现可变)——导出/序列化的顺序契约必须显式排序(依赖哈希序=依赖实现细节)。',
    ],
    [
      block('机制:顺序在哪个环节丢失', '丢失环节:toSet()(HashSet 无序)→toMap()(HashMap)→collect 后的遍历——每一环都可能乱。确定性的构造:toCollection(LinkedHashSet::new)(保流序)、toMap+TreeMap::new(键序)、流前 sorted(比较链)+toList(全序)——容器选择决定顺序语义。跨版本:HashMap 的迭代序依赖容量与哈希函数(JDK 可变)——"碰巧有序"的代码在升级后乱序(第 49 题回归集应含顺序断言)。'),
      block('反例:顺序依赖的两种事故', '事故一,导出顺序随机:报表导出用 toSet→遍历——同一请求两次导出顺序不同(客户对账困难,第 44 题分页稳定排序同族)。事故二,升级后乱序:依赖 HashMap 迭代序的代码(碰巧稳定数年)——JDK 升级后顺序变化——下游 diff 逻辑崩。两条的正解:确定性顺序=显式排序(比较链),哈希序永不依赖。'),
      block('取舍:确定性的成本', '成本:LinkedHashSet(每元素双链指针)/TreeSet(log n 插入)/排序(n log n)——确定性有代价。需要确定性的场景:导出/快照/测试断言/分页(第 44 题)——随机内部处理不需要(性能优先)。判定问句:这个顺序会被用户看到或被下游比较吗?——是则确定性必须;否则内部自由。'),
    ],
    [
      block('验证:确定性的断言组', '验证:同输入两次运行断言(输出序列完全一致);跨容器断言(toSet 乱/toCollection(LinkedHashSet) 有序——对照实证);升级确定性标注(依赖哈希序的代码在评审即拦截——顺序契约的显式化)——三组固化确定性;导出接口的顺序断言进回归(第 44 题)。'),
      block('追问链:确定性三刀', '一刀:"流的顺序性?"——有序源(列表)的流保序;无序源(Set)流无序;sorted() 中途引入序——流的顺序语义跟随源与算子;unordered() 显式放弃(性能优化)。二刀:"并行流的顺序?"——并行流 forEach 不保序,forEachOrdered 保序(牺牲并行度)——并行与确定性的取舍显式化。三刀:"与分页的配合?"——确定性顺序是分页稳定的前提(第 44 题:同筛选同排序同结果)——顺序契约与分页契约一体。'),
    ],
    ['每一环都要有序,才叫确定', 'toCollection 选容器,sorted 定顺序', '哈希序永不依赖'], [api('java/util/stream/Collectors')],
  ),
  'collections/42': deep(
    '大批量 removeAll 为什么可能出现意外性能问题？',
    '网银清理沙盘:100 万元素列表 removeAll(1 万个目标)——ArrayList.removeAll 对每个元素查目标集合(O(n×m) 若目标是 List)——目标是 HashSet 则 O(n)——"意外"来自目标集合的 contains 复杂度。',
    [
      'removeAll 的实现:遍历列表元素,contains(目标集合) 判保留——目标集合的 contains 复杂度决定总成本:HashSet O(1)→O(n) 总;List O(m)→O(n×m) 总(百万×万=百亿)。',
      '本机可测:目标 1 万个(List vs HashSet)——removeAll 耗时差百倍——"意外"的性能=数据结构选型的连锁(第 9 题 ArrayList/LinkedList 的局部性同源)。',
      '正确姿势:目标集合先转 HashSet(new HashSet<>(targets)——一次 O(m) 构建)→removeAll O(n);或 removeIf(targets::contains)(谓词形式,等价);批量删除的位图优化(第 29 题,密集下标)。',
    ],
    [
      block('机制:contains 复杂度的乘法', '实现形态先说清:ArrayList.removeAll 内部不是"逐个 remove"(那是 O(n²)),而是双指针批量保留——一遍遍历用读写双指针把保留元素压到前段,最后一次截断(O(n) 搬移);真正的成本变量只有内层 contains。乘法结构:外层 O(n) × 内层 contains O(m 或 1)=O(n×m) 或 O(n)——n×m 的爆炸(百万×万=10^10 次操作,分钟级)。同一模式的其他 API:retainAll(保留交集)同构;removeIf 的位图标记+单次压缩同型——"批量操作的内层查找复杂度"是性能审查的固定检查点。'),
      block('反例:List 目标的百亿次操作', '沙盘:removeAll(overdueIds)——overdueIds 是 List(1 万)——contains 线性扫——百万列表×1 万=10^10 次比较(数十分钟)——接口超时。修复:转 HashSet(O(1) contains)→removeAll 秒级——一行修复百倍收益(数据结构的连锁选择)。同源:indexOf 循环(第 42 题N+1 的内层查找)、contains 循环——批量场景的内层查找全要哈希化。'),
      block('取舍:哈希化的成本与收益', '成本:HashSet 构建 O(m)+内存(哈希表开销)——1 万目标的构建毫秒级+内存可忽略;收益:O(n×m)→O(n)——构建成本在大 n 下总划算。边界:n 小(10 条)×m 大——构建成本可能不划算(直接 List.contains)——小数据不优化(第 50 题 avoid 伪优化)。'),
    ],
    [
      block('验证:批量删除的断言组', '验证:对照断言(目标 List vs HashSet 的 removeAll 耗时——百倍差异实测);正确性断言(两种方式的删除结果一致);removeIf 对照(removeIf(targets::contains) 等价且简洁)——三组固化批量删除的姿势;大规模的耗时进团队性能基线。'),
      block('追问链:removeAll 三刀', '一刀:"removeAll 与 removeIf 的选择?"——removeAll(集合)=删等值元素;removeIf(谓词)=删满足条件的——语义不同(hasAll 的语义),性能同源(内层 contains)。二刀:"保留交集呢?"——retainAll(保留 targets)——同样的 contains 乘法——同修。三刀:"流式的批量删除?"——流式数据(不落 List)的过滤=filter(流式谓词,无 removeAll 形态)——批量删除的形态跟随数据形态(静态列表 vs 流)。'),
    ],
    ['目标集合的 contains 定生死', '先哈希化,再批量删', '小数据不优化,大数据必哈希'], [api('java/util/ArrayList')],
  ),
  'collections/43': deep(
    '如何安全地返回内部集合？',
    '网银账户沙盘:Account 类的 getEntries() 直接返回内部 List——外部 add/clear 直接改内部状态(不变式被绕过,第 20 题 banking 值安全同题)。安全返回三选:不可变视图(unmodifiableList/List.copyOf)、防御性拷贝、不可变元素+只读接口。',
    [
      '三种姿势的语义:unmodifiableList(视图——内部变化实时反映,外部不可改)、List.copyOf(快照——返回时刻的独立副本)、流式构建(逐元素映射——转换+拷贝)——按"外部是否需要看到变化"选。',
      '引用逃逸的其他通道:getter 直接返回内部 Map/Set、构造器接收集合后直接赋值(外部改构造参数影响内部)、setter 接收集合直接存——防御性拷贝要覆盖"进与出"两侧。',
      '元素深浅:浅拷贝的元素可变(外部改元素字段,第 13 题)——深隔离=元素不可变(record)——结构隔离与元素隔离是两层(第 13 题 unmodifiable 同构)。',
    ],
    [
      block('机制:进与出的防御', '出向防御:getEntries 返回 List.copyOf(entries)(快照)或 Collections.unmodifiableList(entries)(视图)——copyOf 的元素要求不可变(可变元素浅拷贝仍逃逸)。入向防御:构造器/setter 接收集合→this.entries=List.copyOf(in)或 new ArrayList<>(in)(拷贝断开与调用方集合的关联)。不可变优先:entries 的元素用 record(不可变)——浅拷贝即完整隔离(元素无内部状态可改,第 4 题)。'),
      block('反例:引用逃逸的三种事故', '事故一,外部 clear:外部 getEntries().clear()——内部账户分录被清空(账务损毁,第 2 题事实源破坏)。事故二,构造逃逸:new Account(externalList) 后外部修改 externalList——账户分录跟着变(不变式漂移)。事故三,元素逃逸:entries 元素是可变 Entry——外部改 Entry 的金额字段(绕过 Account 的全部校验)。三条的正解:出入双拷贝+元素不可变化(完整防御)。'),
      block('取舍:拷贝的性能与安全', '拷贝成本:每次 getter 拷贝(大列表=分配+复制)——高频调用大集合的拷贝成本。折中:不可变容器(List.of 构建后永不变——返回自身即安全,零拷贝)+可变内部用临时副本;或视图+文档(调用方知情,内部变化实时可见是特性)。判定:这个集合的状态会被并发或跨层依赖吗——是则拷贝/不可变,否则视图+注释。'),
    ],
    [
      block('验证:防御完整性的断言组', '验证:出向断言(返回副本后外部修改,内部不变);入向断言(构造后修改源集合,内部不变);元素断言(record 元素的字段修改被编译期拒绝/可变元素的字段修改穿透——对照实证)——三组固化防御的完整覆盖;ArchUnit 规则(getter 返回可变集合告警)进 CI。'),
      block('追问链:防御三刀', '一刀:"性能敏感的防御?"——高频 getter 的大集合拷贝贵:不可变容器(零拷贝)+变更=整体替换(第 20 题 record 替换思想)——不可变设计消除防御成本。二刀:"内部集合的并发?"——防御性拷贝不解决并发(内部仍在变)——并发安全另靠容器(第 15 题 CHM)/不可变(整体替换)——防御与并发是两个维度。三刀:"防到什么程度?"——公开 API(全防御)+包内(信任,直接引用)——防御的边界=信任的边界(第 33 题权限边界同构),过度防御=拷贝风暴。'),
    ],
    ['进与出都要防御', 'record 不可变让隔离免费', '防御边界等于信任边界'], [pod],
  ),
  'collections/44': deep(
    '为什么分页结果需要稳定的多字段排序？',
    '网银列表沙盘:交易列表按"状态排序"翻页——第 1 页与第 2 页出现同一笔交易(状态相同的交易在两次查询中顺序不同)——无唯一键兜底的排序,分页边界漂移(数据翻倍或丢失)。',
    [
      '分页稳定的条件:排序键全序确定(比较链落到唯一键,第 34 题)——排序字段相同的行必须有一个确定的次序(唯一键兜底),否则数据库两次查询的行序可能不同(执行计划/并行度变化)——OFFSET 分页在边界处重复或丢行。',
      '多字段的必要性:单字段(金额)大量重复——边界行的次序随机;多字段(金额+时间+流水号)——唯一化次序,页与页无重叠无遗漏。',
      '进阶:游标分页(keyset:WHERE (amount, id) < (:lastAmount, :lastId) ORDER BY amount DESC, id DESC——OFFSET 的性能问题(深分页扫描)一并解决——稳定+高性能的双赢)。',
    ],
    [
      block('机制:边界漂移与唯一键兜底', '漂移机制:排序键相同(状态=失败)的 10 行,数据库两次查询的返回序可能不同(索引扫描序变化)——LIMIT 20 OFFSET 40 的第 41-60 行与上次不同——行在页间"跳变"(重复显示或漏看)。兜底:唯一键(流水号)作为最后比较字段——同状态行按流水号全序——页边界确定。keyset:WHERE (a,id)<(:a0,:id0) 的元组比较(复合索引支持)——无 OFFSET(深分页 O(页码)→O(1))。'),
      block('反例:不稳定分页的两种客诉', '客诉一,重复显示:第 2 页看到第 1 页的交易(边界行漂移到下页)——用户以为重复扣款(恐慌)。客诉二,漏看:边界行从下页跳回上页——审核场景漏审。两条的根因:排序无唯一键兜底——修复=排序链加唯一键;同时 OFFSET 换 keyset(大列表的性能)。'),
      block('取舍:OFFSET 与 keyset 的选择', 'OFFSET:实现简单/随机跳页(用户跳第 10 页)——深分页性能差(O(页码×页大小) 扫描)。keyset:稳定+高性能(只扫增量)——只支持顺序翻页(跳页不可[无绝对位置])。选择:管理后台(跳页需求)OFFSET+唯一键;无限滚动/导出(keyset)——两种分页并存,按交互形态选。'),
    ],
    [
      block('验证:分页稳定的断言组', '验证:边界断言(同筛选两页查询,断言无重复无遗漏——构造边界行相同排序值的场景);keyset 断言(游标翻页的顺序与完整);深分页性能断言(OFFSET 100 万 vs keyset 的耗时对照)——三组固化分页契约;排序链的唯一键兜底进 SQL 规范(评审检查点)。'),
      block('追问链:分页三刀', '一刀:"排序与索引的配合?"——排序字段建复合索引(amount, id)——排序用索引(免 filesort)+keyset 走索引范围——排序稳定性与索引设计一体。二刀:"动态排序?"——用户可选排序字段(金额/时间切换)——每字段独立索引+唯一键兜底(动态 ORDER BY 的规范:每序必有兜底键)——动态排序的兜底纪律。三刀:"总数与一致性?"——COUNT 与页数据的一致性(两次查询间数据变化——计数漂移)——近似计数(缓存总数)/不展示总数(无限滚动)——总数一致性的语义决策。'),
    ],
    ['排序链必须落到唯一键', 'keyset 治深分页,稳定又快', '动态排序每序必兜底'], [sre],
  ),
  'collections/45': deep(
    '如何在集合中实现按业务键去重且保留最新数据？',
    '网银消息沙盘:同业务键(orderId)的多条状态消息,保留"最新"一条(按时间)——HashMap.put 天然覆盖(后写胜)+TreeMap 按时间比较(第 8 题判等分野的正面应用:刻意的 compare 语义)。',
    [
      '保留最新的两种实现:HashMap.put(同键覆盖——后到即最新[依赖到达顺序=时间序的前提])+TreeMap/比较器(compare 按时间,同键取时间大——到达乱序时按时间裁决)。',
      '到达顺序≠时间顺序:消息乱序(渠道重发/多消费者)——"后到的"可能时间更早——按时间裁决(comparator 比较业务时间)比"后到覆盖"正确——时间字段进比较器,第 34 题一致性的正面应用。',
      '并发:CHM.merge(key, msg, (old, new) -> new.time > old.time ? new : old)——原子"取最新"(第 15 题原子 API 的比较合并);compute 同效。',
    ],
    [
      block('机制:后到覆盖与时间裁决', '后到覆盖(put):到达顺序=权威序的场景(单线程顺序消费/渠道保证有序)——简单高效。时间裁决(merge/comparator):到达乱序(多消费者/网络重排)——按业务时间比较,旧时间被新时间覆盖(乱序安全)。判据:消息源是否保证有序——单分区/单发送者=有序(put 即可);多源=乱序(时间裁决)。本机锚点(第 8 题):TreeSet 的 compare 判等分野——这里把"吞元素"变成"按时间取最新"的正面能力。'),
      block('反例:时间裁决的两种陷阱', '陷阱一,时钟源不一:消息的时间戳来自不同机器(时钟偏差,第 39 题distributed)——比较失真(晚发的消息时间戳早)——时间源统一(消息带发送方单调序号/统一时钟域)。陷阱二,同时间戳:两消息时间相同——比较器返回 0(合并/丢失其一)——同刻消息的次序字段(序列号)兜底(第 34 题唯一键兜底同构)。两条的正解:时间裁决+次序兜底+时钟域约束。'),
      block('取舍:保留最新 vs 全保留', '保留最新:状态投影(订单的最新状态,第 2 题 banking 投影思想)——内存省/历史丢(审计另存——第 32 题审计链路保留全量)。全保留+查询最新(按时间排序取首):历史完整/内存与查询成本——审计需求决定"全保留的存放地"(归档/日志)——最新态(内存投影)与历史态(审计存储)分离。'),
    ],
    [
      block('验证:保留最新的断言组', '验证:乱序到达断言(时间序与到达序相反的消息序列——时间裁决断言保留时间最新者);并发裁决断言(CHM.merge 并发同键——原子取时间大者);次序兜底断言(同时间戳消息——序列号裁决)——三组固化"保留最新"的语义;审计全量另存的对账用例(投影与全量一致)。'),
      block('追问链:去重保留三刀', '一刀:"键的构成?"——业务键(orderId)还是含子键(orderId+状态类型)——键粒度决定"最新"的域(第 33 题复合键)。二刀:"最新与最终态?"——保留最新≠最终态(最新消息可能是中间态)——业务要的如果是"最终态",用状态机(第 40 题)而不是时间最新——语义问句:要的是"最新到达"还是"最终状态"。三刀:"内存与持久?"——保留最新的 Map(内存投影)——重启丢失(重建:全量消息重放投影,第 2 题banking 重放思想)——投影可重建是内存化的前提。'),
    ],
    ['乱序用时间裁决,有序用后到覆盖', '同刻靠序列号兜底', '最新态与审计历史分离'], [pod],
  ),
  'collections/46': deep(
    '排序前后修改参与比较的字段会有什么后果？',
    '网银交易沙盘:排序中(异步/流)修改对象的比较字段(金额被并发更新)——TimSort 检测到不一致抛 IllegalArgumentException("Comparison method violates its general contract")或静默错序;比较器引用可变字段本身是排序的并发隐患(第 34 题的专论)。',
    [
      '两种后果:TimSort 的违规检测(数据形态触发——合并时发现不满足传递性,抛异常,偶发难查)与静默错序(检测不到的形态,结果错误无告警)——排序期间字段被改=比较器输入不一致。',
      '并发修改的形态:排序在后台线程,业务线程改对象的金额——排序的比较器读到"排序中途变化"的值——同一次 sort 内同一对象两次比较结果不同——契约破坏。',
      '防御:排序前快照(比较字段拷贝/不可变 DTO——排序对象用不可变快照,第 29 题编辑保护同源)、排序对象不可变化(重构为 record 快照)、或排序互斥(同一对象的排序与修改串行)。',
    ],
    [
      block('机制:契约破坏的触发与静默', 'TimSort 的检测:合并阶段发现 compare(a,b) 与已有顺序矛盾(传递性破坏)→抛 IllegalArgumentException——检测是"尽力而为"(数据形态决定,不是每次必抛——第 14 题 CME 尽力而为同源)。静默形态:修改发生在比较器读不到矛盾的位置(单个字段翻转)——结果错序无告警——比异常更危险。防御的根本:排序的比较值在排序期间不可变——不可变快照(排序对象=快照对象)是根治。'),
      block('反例:并发修改排序的两种事故', '事故一,偶发异常:交易列表排序(后台),业务并发更新金额——TimSort 偶发抛"violates contract"——日志偶发难复现(数据依赖)。事故二,静默错序:比较器按 status+time,status 被并发改——排序结果错序无异常——下游分页错乱(第 44 题)。两条的共同修复:排序快照化(排序前 copy 为不可变 DTO——快照的字段即比较字段)。'),
      block('取舍:快照的成本与边界', '快照成本:排序前拷贝(不可变 DTO 列表)——大列表的拷贝成本(第 43 题);收益:排序的确定性+并发安全。边界:单线程内先改后排(无并发)不需要快照(顺序保证)——快照是并发场景的防御。不可变重构:交易对象用 record(金额不可变)——"修改"=新 record(排序对象天然不可变,第 20 题 banking 替换思想)——不可变模型根治此类全部问题。'),
    ],
    [
      block('验证:并发排序的断言组', '验证:偶发异常断言(并发修改+排序压力循环——TimSort 异常的复现,标注概率性);静默错序断言(构造修改时机,断言错序——证据);快照防御断言(快照后并发修改原对象,排序结果稳定)——三组固化并发排序的防御;压力测试进回归(排序的并发形态)。'),
      block('追问链:并发排序三刀', '一刀:"同步排序?"——排序加锁(对象锁——锁粒度与持有时长:排序 O(n log n) 期间全锁)——锁代价大,快照更优(无锁)。二刀:"流的并发排序?"——parallel stream 的 sorted(fork/join 分段排序合并——段的输入不可变[流已具体化]则安全;流源可变则同险)——流的具体化时机(sorted 前的 toList)是关键。三刀:"不可变模型的全局收益?"——不可变模型(record)消除的不仅是排序问题:并发/缓存/审计全链受益(第 20 题 banking 替换思想)——模型不可变化是架构级投资。'),
    ],
    ['排序期间比较字段不可变', 'TimSort 异常是尽力而为的哨兵', '快照防御,不可变根治'], [pod],
  ),
  'collections/47': deep(
    '如何评估集合的真实内存占用？',
    '网银容量沙盘:"100 万条的 HashMap 大概多少内存?"拍脑袋 100MB 实际 400MB——集合内存=容器结构(数组/Entry/节点)+元素本体+引用——用 JOL(对象布局)/堆直方图实测,不用拍脑袋。',
    [
      '内存构成三层:容器结构(HashMap 的 table 数组[桶×8 引用]+每 Entry 32 字节;ArrayList 的数组)、元素本体(String 的内容+对象头,第 32 题)、引用(指针 4-8 字节)——三层叠加远超"数据大小"。',
      '实测工具:JOL(Java Object Layout,对象精确布局)、jmap -histo(类级直方图)、NMT(第 16 题distributed JVM 本地内存)、GC 日志(分配速率)——工具的组合使用。',
      '估算的口径:64 位压缩指针(-XX:+UseCompressedOops,默认开)下的布局——未开压缩指针(堆>32GB)布局翻倍——估算要注明 JVM 参数(口径,第 48 题)。',
    ],
    [
      block('机制:各容器的结构开销', 'HashMap:table(cap×8 引用)+每 Entry(32 字节:key 引用+value 引用+hash+next)+键值本体——100 万 Entry 的 HashMap≈32MB(Entry)+键值本体+桶数组(2^21×8=16MB)=约 50MB+本体。ArrayList:数组(cap×4 引用[压缩指针])+元素本体——100 万引用=4MB+本体。String 元素:每条 40-90 字节(第 32 题)——"100 万条 20 字符 ID 的 HashMap"≈90MB(远超"20MB 数据"的直觉)。'),
      block('反例:拍脑袋容量的两种事故', '事故一,估算差 4 倍:"100 万 ID 才 20MB"(只算内容)——实际 90MB(结构+引用)——容器规划失误(第 1 题)。事故二,压缩指针陷阱:堆扩到 40GB(压缩指针失效)——全部引用 4→8 字节——全堆引用类对象内存翻倍——堆越大单位对象越贵(非线性)。两条的正解:JOL 精确测(开发期)+直方图监控(生产期)——内存估算工具化。'),
      block('取舍:内存优化的手段矩阵', '手段:紧凑结构(long[] 替代 HashSet<String>,第 32 题 10 倍)、对象瘦身(字段精简/enum 替代 String 常量)、容器选型(第 9 题ArrayList 连续)、堆外(DirectBuffer/ Chronicle——GC 外管理,复杂度升)。度量先行:JOL 测出大头(哪个字段/哪个容器)再优化——不测量不优化(第 19 题重构三因子的内存版)。'),
    ],
    [
      block('验证:内存评估的断言组', '验证:JOL 断言(HashMap.Entry/ArrayList 的布局输出——字段级字节);直方图对照断言(jmap -histo 的类级统计与 JOL 一致);容量曲线断言(元素数×内存的线性关系实测——异常点[扩容]标注)——三组把内存评估工具化;估算表(常见容器每条字节)进团队指南(第 49 题)。'),
      block('追问链:内存评估三刀', '一刀:"集合的深浅统计?"——histo 只统计类级(Entry 的 32 字节,不含键值本体)——全量=容器+键值递归(工具:MAT 的 retained size——支配树,第 12 题 distributed)——浅堆/保留堆的口径区分。二刀:"堆外的集合?"——堆外集合(Chronicle Map/Ehcache offheap)——GC 压力消除+序列化成本(访问走序列化)——堆外的取舍(第 16 题distributed NMT 的堆外账本)。三刀:"估算表怎么维护?"——按 JDK 版本更新(布局随版本变——压缩指针/紧凑字符串的演进,第 49 题)——估算表带版本与实测时间戳。'),
    ],
    ['三层叠加:结构加本体加引用', 'JOL 实测,直方图监控', '估算表带 JDK 版本与时间戳'], [sre],
  ),
  'collections/48': deep(
    '并发队列的空检查与取出为何不能分开推断？',
    '网银消费沙盘:if (!queue.isEmpty()) { task = queue.take(); }——isEmpty 与 take 之间消费者竞态(另一线程 take 走了最后元素)——take 抛中断/阻塞——"检查与取出的分离"在并发下不可推断(分布式 16 题 CHM containsKey+put 的队列版)。',
    [
      '竞态窗口:isEmpty=true(线程 A)→线程 B take(队列空,B 阻塞或取走)→A take(空/阻塞)——两步之间的状态变化;正确姿势:take 的阻塞语义直接用(不先查空)或 poll(timeout) 带超时的原子探测。',
      'peek 与 take 的语义差:peek(看,可能 null)+take(取,阻塞)——peek+take 组合同样竞态(peek 到元素,take 时被别人取走→阻塞)——非阻塞需求用 poll(0)(原子探测,空即 null)。',
      '队满的对称问题:put 与 remainingCapacity 的分离同样竞态(第 23 题背压)——队列的"检查类"(isEmpty/peek/remainingCapacity)在并发下都是"瞬时快照",不可作为后续动作的前提。',
    ],
    [
      block('机制:瞬时快照与动作原子性', '快照语义:isEmpty/peek/remainingCapacity 返回"调用瞬间"的状态——下一毫秒状态可变(多消费者/生产者)——快照不能作为"后续动作的前提"。原子替代:take(阻塞到有元素——语义化)、poll(timeout)(限时原子探测——null=超时空)、put(阻塞到有空间)——动作类 API 自带原子性,检查类 API 只用于监控/日志。'),
      block('反例:检查分离的三种事故', '事故一,空指针:isEmpty 通过后 take——队列空(他线程取走)——take 阻塞(调用方以为立即返回)——线程卡死感知。事故二,重复处理:isEmpty 的多消费者检查——两消费者都认为有任务→都 take→一个拿到一个阻塞——调度混乱。事故三,优先级反转:peek 看到高优先级任务→处理逻辑等待→被低优先级抢先(peek 与 poll 之间)——检查与执行的分离破坏优先级语义。三条的正解:动作 API 直接用(take/poll/put 的阻塞与超时语义)。'),
      block('取舍:阻塞与非阻塞的消费形态', '阻塞消费(take):专用消费者线程(阻塞等任务,语义最简)——线程被占(第 18 题线程预算)。非阻塞轮询(poll(timeout)):复用线程(多队列轮询/与其他任务混合)——轮询间隔的延迟代价。混合:阻塞为主+超时退出(可中断的优雅停机)——消费者循环的标准形态(take 或 poll(timeout) + 中断检查)。'),
    ],
    [
      block('验证:竞态的断言组', '验证:竞态复现断言(两消费者 isEmpty+take 竞态——空指针/阻塞复现);原子替代断言(poll(timeout) 形态的零竞态);快照语义断言(remainingCapacity 的瞬时性——连续两次调用值不同的演示)——三组固化"检查与取出不可分开推断";消费者的阻塞循环模板进团队指南。'),
      block('追问链:队列消费三刀', '一刀:"优雅停机?"——poll(timeout) 循环+中断标志(超时退出循环检查中断)——take 的硬阻塞难停机(中断+ InterruptedException 处理)——停机友好的消费循环是工程标配。二刀:"消费的批量?"——drainTo(list, max)(一次性批量取出——减少锁竞争,第 42 题批量删除同源)——批处理的队列消费用 drainTo。三刀:"队列的观测?"——深度监控(第 23 题水位)与消费速率——检查类 API 用于监控(合法),不用于业务决策(反模式)——观测与决策分离。'),
    ],
    ['isEmpty 是快照,不是前提', 'take/poll 的原子语义直接用', 'drainTo 批量,轮询配超时'], [api('java/util/concurrent/BlockingQueue')],
  ),
  'collections/49': deep(
    '如何防止监听器集合被慢回调拖垮？',
    '网银事件沙盘:事件广播遍历监听器逐个调用——某监听器回调阻塞(5 秒)——整个广播被拖住,后续事件堆积。监听器的防御:回调超时(隔离执行)+异步化(监听器自转线程)+慢监听器摘除(熔断,第 24 题 distributed)。',
    [
      '拖垮的形态:同步广播(Listen 遍历调 each)——慢回调阻塞广播线程→事件积压(队列,第 23 题)→上游阻塞——一个慢监听器拖垮整条事件链(分布式 33 题:队头阻塞同构)。',
      '防御三件套:执行隔离(每个监听器独立线程池/Executor——慢监听器只占自己的池)、超时控制(回调超时(future.get(timeout)——超时记录/熔断)、摘除熔断(连续超时的监听器自动摘除+告警——恢复后重试注册)。',
      '事件分发的异步化:AFTER_COMMIT(第 10 题 spring)+异步广播(ApplicationEventMulticaster 的 taskExecutor)——广播线程不被监听器拖住是事件系统的基本卫生。',
    ],
    [
      block('机制:隔离、超时与熔断', '隔离:监听器注册时声明执行器(或按监听器类型分组执行器)——慢监听器 A 的 5 秒不阻塞监听器 B(舱壁,第 23 题distributed)。超时:每回调包 future(timeout)——超时即放弃本次(监听器错过该事件——记录补偿)——超时的代价与承诺要文档化(监听器的 SLA)。熔断:连续 N 次超时的监听器→摘除+告警(人工介入)——摘除的恢复(探活后重新注册)——与第 24 题 distributed 熔断同构(监听器是"反向的调用")。'),
      block('反例:慢监听器的两种事故', '事故一,同步广播阻塞:审计监听器写库慢(50ms×每事件)——事件广播线程被占——上游事件发布全部等待(交易 P99 上升,第 37 题 distributed 聚合拖垮同构)。事故二,队列积压:异步广播+无界队列——慢监听器消费不动→积压→OOM(第 23 题无界队列)。两条的正解:广播线程保护(隔离执行)+有界+熔断——事件链的每一环节都要有"不被拖垮"的设计。'),
      block('取舍:同步与异步监听的混合', '同步监听:强一致动作(同事务内必须完成,第 9 题 BEFORE_COMMIT)——慢的代价要评估(事务时长)。异步监听:独立线程池(隔离)+重试(补偿,第 10 题 distributed)+顺序(同键有序,分布式 12 题)——异步是默认,同步是例外。监听器的契约:回调的耗时承诺(如<10ms)+超时后果(错过事件的补偿机制)——契约写进监听器接口文档。'),
    ],
    [
      block('验证:防御的断言组', '验证:隔离断言(慢监听器 A 500ms,B 的回调延迟不受影响——计时证据);熔断断言(连续超时的监听器被摘除,事件不再投递+告警);恢复断言(摘除后探活成功重新注册)——三组固化防御;广播线程的延迟监控(广播耗时 P99)常态运行。'),
      block('追问链:监听器三刀', '一刀:"监听器的注册线程安全?"——注册/摘除的并发(CopyOnWriteArrayList,第 21 题 COW 的主场:读多写少)——遍历快照(第 22 题)与注册并发安全。二刀:"事件的顺序?"——监听器间无序(各自独立);同一监听器的事件顺序(同键有序,分布式 12 题)——顺序的承诺范围显式。三刀:"监听器异常?"——抛异常的监听器(不影响其他监听器——遍历的 try-catch 包裹,第 10 题 distributed AFTER_COMMIT 的吞异常语义)——异常隔离与超时隔离是两道独立防线。'),
    ],
    ['隔离执行,超时熔断,摘除告警', '广播线程不被回调拖住', '异步是默认,同步是例外'], [sre, pod],
  ),
  'collections/50': deep(
    '如何为集合性能测试避免伪结论？',
    '网银优化沙盘:"ArrayList 比 LinkedList 快 100 倍"——伪结论三源:JIT 预热未做(解释执行的数据)、死代码消除(结果未消费被优化掉)、单次测量(无方差)——性能测试的方法论(本系列各批实验的方法论总结)。',
    [
      '伪结论三源与对策:JIT 预热(前 N 千次不计数——或用 JMH[自动预热/多轮/统计])、死代码消除(结果必须消费[黑洞字段/JMH 的 Blackhole])、单次测量(多轮取分布[中位/方差]——第 42 题distributed 的分布呈现)。',
      '环境变量:GC 干扰(测试期 GC 停顿混入——GC 日志对照,第 39 题JVM)、CPU 频率/降频、其他进程竞争——环境声明(机器/JDK/参数,第 42 题distributed 对照报告的最低字段集)。',
      'JMH 的定位:微基准的标准工具(@Benchmark/@State/模式[吞吐/平均时间])——手写循环基准的坑(JMH 解决的:预热/死码/常量折叠/分支预测)——手写只做"量级验证",结论级用 JMH。',
    ],
    [
      block('机制:三源对策与 JMH 实践', '预热:JIT 的 C1/C2 编译期(第 40 题预热)——冷数据(解释执行)比热数据慢 10-100 倍——前 5000 次丢弃。死码:循环内计算未使用→JIT 消除(测了个寂寞)——sink 字段消费(blackhole.consume(result))。统计:多轮(5-10 轮)×每轮多迭代——中位数与方差(方差大=环境不稳,数据不可信)。JMH:fork 隔离(JVM 进程隔离,防交叉优化)+@Setup(状态)+ profiler(gc/stack)——微基准的基础设施。'),
      block('反例:伪结论的三种事故', '事故一,冷数据结论:未预热测 ArrayList vs LinkedList——解释执行的噪声把 3 倍差测成 30 倍——选型依据失真(第 9 题)。事故二,死码测试:基准循环的结果未消费——JIT 消除循环(测出 0ns 的"神速")。事故三,单次方差:单次测量的 A/B 对比(方差内随机)——结论反向。三条的解:预热+消费+多轮,或直接 JMH。'),
      block('取舍:手写基准与 JMH 的分工', '手写:量级验证(是毫秒还是秒)、问题定位的粗筛(第 50 题distributed 的三组数据)——成本低快。JMH:结论级对比(A vs B 的选型)、回归基线(优化前后的精确对照)、发布到文档的数字——结论级必 JMH。本系列实验的定位:量级与机制的验证(fail-fast/树化/扩容轨迹——行为验证),性能结论级(吞吐对比)用 JMH 补——行为实验与性能基准的分工。'),
    ],
    [
      block('验证:基准质量的断言组', '验证:预热断言(基准含预热段,冷数据未混入——预热前后数据的分离呈现);方差断言(多轮数据的方差<中位数 10%——方差过大标"数据不可信");环境声明断言(报告含机器/JDK/参数/GC 日志)——三组让性能结论可审;基准报告的模板化(第 49 题估算表同款)。'),
      block('追问链:基准三刀', '一刀:"JMH 的 profiler?"——gc profiler(基准期的 GC 压力——分配速率的归因)+stack(热点栈)——profiler 定位"为什么慢",不只"慢多少"。二刀:"生产画像与基准?"——基准的负载形态=生产画像(读写比/键分布/元素大小——第 50 题distributed 同构对照)——画像失真=基准失真(测的不是生产的场景)。三刀:"基准的保鲜?"——JDK/硬件变更后基准重跑(基线漂移,第 49 题)——基准结论带环境与时间戳——过期基准与新环境的对照是伪结论的另一来源。'),
    ],
    ['预热死码方差,三源伪结论', '结论级用 JMH,手写只做量级', '基准带环境声明,画像对齐生产'], [sre],
  ),

};
