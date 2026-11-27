// JVM 进阶 50 题 · v2 深度标准(2026-11-07)· 50 题全量
// 证据基准:JDK 17.0.17 HotSpot 本机实测(Windows x64,2026-11-07),实验程序与日志在 F:\tmp-jvma-exp。
// 未实测的推演一律写明"推演";版本边界注明适用 JDK。口诀服从准确性:先有钩子,后有机制短语。
const api = n => 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/' + (n.endsWith('.html') ? n : n + '.html');
const jvms2 = 'https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html';
const jvms5 = 'https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-5.html';
const gctun = 'https://docs.oracle.com/en/java/javase/17/gctuning/garbage-collector-implementation.html';
const g1tun = 'https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-g1-tuning.html';
const javaman = 'https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html';
const jcmdman = 'https://docs.oracle.com/en/java/javase/17/docs/specs/man/jcmd.html';
const jfrman = 'https://docs.oracle.com/en/java/javase/17/docs/specs/man/jfr.html';
const jep = n => 'https://openjdk.org/jeps/' + n;
const jdksrc = p => 'https://github.com/openjdk/jdk17u/blob/master/src/hotspot/share/' + p;
const block = (title, body) => ({ title, body });
const deep = (title, scenario, answer, analysis, cases, summary, references) => ({
  format: 'deep', title, scenario, answer, analysis, case: cases, summary, references,
});

export default {
  'jvm-advanced/1': deep(
    '如何制定以尾延迟为目标的 GC 调优方案？',
    '网银出金网关沙盘:高峰期 P99 从 45ms 抖到 300ms,链路追踪显示抖动与 GC 时间戳相关。以 P99/P999 为北极星指标,给出从测量到验证的完整调优流程。本文数据取自下文实测。',
    [
      '先定义目标再动手:P99/P999 各自的预算是多少、由谁分配(GC 只能花其中一部分),没有预算数字的调优都是盲调。',
      '先测量后调参:开 -Xlog:gc* 与 JFR 拿到暂停分布、分配速率、晋升速率三组基线,再决定改哪个参数。',
      '一次只改一个变量,并预设回滚条件:参数改动的收益必须能在日志里指认,否则回退。',
      '尾延迟问题优先看暂停之外的干扰:安全点等待、并发周期抢 CPU、大对象分配,它们不体现在 GC 总时间里。',
    ],
    [
      block('机制:尾延迟预算如何分解到 GC', '把 P999 目标 50ms 拆开:网络与业务逻辑占大头,GC 的 STW 暂停只是其中一项,还有并发周期抢走的应用吞吐、安全点同步等待、以及 GC 后紧接的缓存冷启动。调优前先从链路追踪确认"抖动窗口"与 GC 日志时间戳是否重合,这一步决定后面是调 GC 还是调代码。日志层面用 -Xlog:gc* 输出每次暂停,配 P999 的分布做对齐。'),
      block('反例:只看 GC 时间占比会漏掉真正的元凶', '实测里 G1 的 young 暂停中位仅 2.948ms、最大 32.202ms(256MB 堆,单线程压测),GC 时间占比不到 5%,按"占比思维"完全可以不调;但 ZGC 对照组在堆被填满时出现 Allocation Stall (main) 59.822ms——一次 60ms 的应用侧停顿,任何"GC 时间占比"指标都不统计它。尾延迟调优必须把分配速率、堆余量、暂停分布、应用侧停顿(如 Allocation Stall)放在一起看,而不是只看 GC 花了多少时间。'),
      block('取舍:参数面越窄,回滚越容易', '每一轮只动一个参数(如 MaxGCPauseMillis、InitiatingHeapOccupancyPercent、堆大小三者绝不同批改动),并在变更单里写死回滚条件:例如"P999 连续 10 分钟超预算即回滚"。参数越多,归因越难;实测中同一个负载换 -Xlog 粒度都会影响日志干扰程度,更不要说同时改五个参数。'),
    ],
    [
      block('实证:一次可复现的基线采集', '在本机 JDK 17.0.17 用同一负载跑 G1:-Xms512m -Xmx512m -XX:MaxGCPauseMillis=5 -Xlog:gc*:file=pause.log。命令与关键输出如下,程序含 60 轮高频分配,以 OOM 收尾(净增长设计),数据取自 OOM 前。验证方式:重跑同命令应得到同量级分布。\n```\nGC(30) Pause Full (G1 Compaction Pause) 511M->407M(512M) 80.755ms\nGC(0)  Pause Young (Normal) (G1 Evacuation Pause) 25M->5M(512M) 2.404ms\nGC(4)  Pause Young (Normal) (G1 Evacuation Pause) 50M->50M(512M) 6.211ms\n```\n结果:目标 5ms,young 实测 2.4 至 6.2ms 波动,且出现 80.755ms 的 Full——预算与实际的差距即为后续调参的靶子。'),
      block('追问链:面试官沿尾延迟调优的三刀', '一刀:"5ms 目标设了为什么还超?"——答:MaxGCPauseMillis 是目标不是承诺,G1 按它规划 young 区数量,但存活集大小与 Humongous 不受它控制,实测同参数下 young 在 2.4 至 6.2ms 波动。二刀:"那直接换 ZGC 是不是就稳了?"——答:换 ZGC 把暂停降到 0.005 至 0.017ms,但实测同一负载出现过 59.822ms 的 Allocation Stall,堆余量不足时应用照样停,换回收器不等于免调优。三刀:"线上没有 GC 日志时怎么定位?"——答:开 JFR 常态采集(实测 profile 档 8 秒能拿到 120 条 ObjectAllocationSample),事后从时间戳对齐 P999 抖动窗口,再回放取证。'),
    ],
    ['先定预算再调参,一次一个变量', '占比低不等于无嫌疑,看暂停分布', '每轮改动留回滚,日志里找收益'], [g1tun, javaman, jep(377)],
  ),
  'jvm-advanced/2': deep(
    'G1 的 Region 设计解决哪些管理问题？',
    '网银账务服务沙盘:老服务用 CMS 时代思路理解 G1,把堆当成"新生代加老年代两块连续空间"来排查问题,解释 region 化后堆的形态、回收单位与可预测性来源。数据来自本机 64MB 小堆实测。',
    [
      'Region 把堆切成 1 至 32MB 的等大分区,按角色(Eden/Survivor/Old/Humongous)动态分配,角色随 GC 切换——分代仍在,但物理边界消失了。',
      '回收单位从"整代"变成"分区集合":每次 GC 只疏散若干 region,暂停时间由 region 数量调节,这是 G1 可预测性的来源。',
      'Region 大小由堆大小除以 2048 再对齐到 2 的幂,大对象按连续 region 存放并单独记账,不再挤占普通代际结构。',
    ],
    [
      block('机制:角色流动的堆与基于统计的回收集', '实测 64MB 堆的日志第一行给出 Heap Region Size: 1M(64MB/2048=32KB,向上取到最小 1MB)。G1 维护每个 region 的回收价值(疏散成本对释放空间的比值),young GC 后按暂停目标圈定回收集 CSet。region 化让"代"成为逻辑概念:Eden 与 Survivor 都是同一批物理 region 换角色。源码层面 g1CollectedHeap.cpp 管理分配与角色切换,region 分配器保证疏散源与目的不重叠。'),
      block('边界:region 化不解决的三个问题', '第一,Humongous 对象仍然特殊:超过 region 一半的对象直接进老年代连续 region,碎片与回收策略与普通对象不同,实测日志里 Humongous regions 单独成行。第二,跨 region 引用靠 remembered set 维护,写屏障要记录跨区引用,内存与 CPU 有开销。第三,region 越大,region 内碎片浪费越明显,小堆配大 region 会放大这一点。'),
      block('取舍:region 数量与灵活性的平衡', '大堆配大 region 减少元数据与 remembered set 开销;小 region 则让 CSet 圈选更细、暂停更可控。64MB 堆拿到 1MB region,4GB 堆约 2MB region——按 2048 份切分本身就是"元数据成本与调度粒度"的折中。业务侧需要记住的是:堆的几何形状不再是"新生代 1/3 老年代 2/3"的固定比例,排查问题时看 region 统计而不是旧比例。'),
      block('底座:Card Table 是 RSet 的原料层', '跨区引用的记忆不是直接写 RSet:写屏障先把包含跨区引用的 512 字节卡片(Card Table 条目)打脏标记,Concurrent Refinement 线程异步把脏卡片精化进目标 region 的 RSet——RSet 记的是"哪些卡片里有指向我的引用",粒度是卡片不是单个引用。这套两级结构把写屏障的同步开销压到"一次数组写",代价是 RSet 的内存与精化线程的 CPU。读 RSet 相关的开销问题必须从卡表入手,否则"RSet 记引用方"的描述解释不了开销为什么可接受。'),
    ],
    [
      block('实证:小堆上的 region 形态', '命令:-Xms64m -Xmx64m -Xlog:gc*,gc+humongous=trace,gc+heap=info HumExp(Java 17.0.17)。关键输出:\n```\nHeap Region Size: 1M\nGC(0) Humongous regions: 29->15\nGC(8) Humongous regions: 54->0\n```\n验证:同样命令重跑,region 大小与回收行为同量级;结果说明 region 角色统计直接出现在 GC 日志里,Humongous 有独立账本。'),
      block('追问链:region 三刀', '一刀:"region 大小能改吗?"——能,-XX:G1HeapRegionSize 显式指定,但默认值已经按堆/2048 折中,除非 Humongous 频发,否则不动。二刀:"跨 region 引用怎么保证疏散正确?"——写屏障把跨区引用记进 remembered set,疏散时按 RSet 找到引用方修正,这是 CPU 开销的来源之一。三刀:"region 和虚拟线程/新回收器什么关系?"——region 化是 G1 与 ZGC 共同的堆组织思路(ZGC 用 zPage/region 分层),学会看 region 统计,迁移回收器时排查框架不变。'),
    ],
    ['堆切两千份,角色随 GC 换', '回收圈分区,暂停可预算', '大对象走专线,RSet 记跨区'], [g1tun, jdksrc('gc/g1/g1CollectedHeap.cpp'), jep(248)],
  ),
  'jvm-advanced/3': deep(
    'G1 的暂停目标为什么不是硬性上限？',
    '网银额度查询服务沙盘:配置 -XX:MaxGCPauseMillis=5 后 P99 仍有尖刺,用户以为参数是承诺。用实测日志说明该参数在 G1 内部如何参与决策、哪些因素绕过它,以及正确的用法。',
    [
      '它只是规划输入:G1 按历史暂停统计反推 young region 数量,尽量贴近目标,但存活集大小与疏散成本不归它管。',
      '两类暂停绕过目标: evacuation 演化出的 Full(G1 Compaction Pause)与 to-space exhausted 下的应急处理,不参与 young 目标规划。',
      '把目标设得过小会催生频繁 GC:每次只疏散少量 region,单位时间 GC 次数上升,总吞吐反而下降。',
    ],
    [
      block('机制:目标参数在 CSet 圈选里的位置', 'G1 记录每个 region 的疏散预测耗时,MaxGCPauseMillis 与 -XX:G1PauseTimeInterval 一起驱动预测器:young GC 前按"预计暂停 ≤ 目标"决定收多少 Eden/Survivor region。预测模型用的是历史平均,遇到存活集突增(如缓存批量加载)预测失效,暂停就超。实测同一参数下 young 暂停在 2.4 至 6.2ms 波动,说明目标≈统计意义上的中位引导,不是逐次承诺。'),
      block('反例:80ms 的 Full 完全无视 5ms 目标', '实测日志:\n```\nGC(30) Pause Full (G1 Compaction Pause) 511M->407M(512M) 80.755ms\n```\nFull 是全堆压缩,由 to-space exhausted、Metaspace 满或 System.gc 等触发,它的耗时由存活总量决定,与 5ms 目标无关。把参数当承诺的团队会在这里得出"G1 失灵"的错误结论,正确结论是:出现 Full 时调 young 参数没有意义,要先消灭 Full 的触发条件。'),
      block('取舍:目标值的选择与验证', '目标从当前实际暂停分布出发:实测中位 3ms、目标设 5ms 是"温和收紧";若实际中位 20ms 却设 5ms,G1 只能缩小每次回收量,GC 频率上升。验证方式是看日志分布而不是平均值:改完后 P999 对应的暂停分位应向目标收敛,同时 allocation rate 与 GC 频率的乘积不显著上升。'),
    ],
    [
      block('实证:目标与实测分布的对照', '命令:-Xms512m -Xmx512m -XX:MaxGCPauseMillis=5 -Xlog:gc*:file=pause.log(Java 17.0.17)。对 13 次 young 暂停取分布:\n```\nPause Young (Normal) (G1 Evacuation Pause) 25M->5M(512M) 2.404ms\nPause Young (Normal) (G1 Evacuation Pause) 50M->50M(512M) 6.211ms\nPause Full  (G1 Compaction Pause) 511M->407M(512M) 80.755ms\n```\n验证:重跑同负载,分布同量级;结果证明目标控制的是"多数 young 尽量贴近",不约束 Full 与极端存活集。'),
      block('追问链:暂停目标三刀', '一刀:"为什么不做成硬上限?"——硬上限意味着宁可暂停中途放弃回收,留下半疏散状态,正确性代价极高;G1 选择"尽力贴近"是工程折中。二刀:"目标设 1ms 会怎样?"——每次回收极少 region,GC 频率暴涨,实测同负载下暂停中位反而可能更差,且有更多并发标记周期抢 CPU。三刀:"怎么知道目标该设多少?"——先看无目标时的暂停分布与 GC 频率,把目标设在 P99 暂停附近,再用日志验证分布收敛,而不是拍脑袋给 5ms。'),
    ],
    ['目标是引导,不是承诺', 'Full 不归它管,先消灭触发源', '目标过小,频率反噬吞吐'], [g1tun, javaman],
  ),
  'jvm-advanced/4': deep(
    'G1 的 Humongous 对象为什么值得关注？',
    '网银报表导出服务沙盘:导出大 Excel 时每次都组装超半 region 的字节数组,GC 日志里 Humongous regions 疯涨。解释 Humongous 的判定、存放、回收路径与治理手法,全部结论附实测证据。',
    [
      '超过 region 一半的对象就是 Humongous:直接进入老年代的连续 region,不经过 Eden 与 Survivor 的常规路径。',
      '它有两笔账:内存上按整 region 占用(对齐浪费),回收上 young GC 只回收死掉的 Humongous,清理依赖并发标记确认。',
      '治理优先在代码侧:拆小数组、流式处理、对象池复用;调 region 大小是次优解,会连锁影响其他行为。',
    ],
    [
      block('机制:判定、分配与回收路径', '判定式是"对象大小 > G1HeapRegionSize/2"。分配时直接在老年代找连续 region,对象头记在第一个 region。回收有三条路:若对象在 young GC 前死亡且无引用,可在 young GC 直接回收(无需等标记);存活则占用老年代直至并发标记判定为死;实测日志中 Humongous regions: 29->15 表示一次 young GC 回收了 14 个 region 的死 Humongous。源码 g1CollectedHeap.cpp 的 humongous 分配分支处理连续查找与碎片整理。'),
      block('反例:一次导出拖垮整个堆的账本', '实测(64MB 堆,region 1MB,单个 600KB 数组即超半区):\n```\nGC(0) Humongous regions: 29->15\nGC(8) Humongous regions: 54->0   (System.gc 且引用全清后)\n```\n54 个 region 即 54MB 被大对象占用,占 64MB 堆的 84%;期间普通对象只剩零星 region,分配迅速退化。报表服务在高峰期批量导出时就是这个形态:Humongous 挤占 Eden,young GC 频率失真,to-space 紧张进一步诱发 evacuation failure。'),
      block('取舍:拆分优先,region 调整垫后', '600KB 数组拆成 8 个 75KB 的块再按需拼接,直接从"Humongous"名单消失,这是零参数成本的改法。若业务确实需要大对象,评估调大 -XX:G1HeapRegionSize:region 从 1MB 到 4MB 后,1.5MB 数组不再是 Humongous;代价是 region 变大后碎片与小回收粒度都变粗,要连跑回归验证。禁止的替代方案是"给大对象开专属堆"——G1 没有这种开关,别把分布式缓存的思路带进来。'),
    ],
    [
      block('实证:Humongous 的独立账本', '命令:-Xms64m -Xmx64m -Xlog:gc*,gc+humongous=trace HumExp(Java 17.0.17,循环持有 40 个 600KB 数组并丢弃 700KB 临时数组)。输出见上:29->15 与 54->0 两行分别对应"young 部分回收"与"标记确认后全清"。验证:把数组改成 400KB(低于 region 一半)重跑,Humongous regions 行消失,普通代际统计接管——判定线的存在性由此验证。'),
      block('追问链:Humongous 三刀', '一刀:"为什么是一半而不是整个 region?"——留一半让普通对象也能用该 region 的剩余空间,整 region 起步会让中等对象也被迫独占,浪费更严重。二刀:"Humongous 会引发什么连锁故障?"——挤占 region 触发 to-space exhausted(实测 evac 场景 855 次),进而 Full GC;网银导出高峰的 P999 尖刺常是这条链。三刀:"怎么线上发现?"——看 -Xlog:gc+humongous 或 GC 告警里的 Humongous regions 增速,配 jmap -histo 找大数组类;JFR 的 ObjectAllocationSample 也记录大对象分配(实测 profile 档 8 秒 120 条)。'),
    ],
    ['过半即专区,回收分三路', '内存按整区,标记才全清', '先拆对象再调区,顺序别颠倒'], [g1tun, jdksrc('gc/g1/g1CollectedHeap.cpp')],
  ),
  'jvm-advanced/5': deep(
    'G1 mixed collection 应怎样结合老年代增长分析？',
    '网银交易查询服务沙盘:老年代缓慢增长,团队不确定 mixed GC 是否在有效清理,以及何时该担心老年代"只进不出"。用两次实测对照说明 mixed 的触发条件、回收边界与判读方法。',
    [
      'mixed 不是定时任务:老年代占用跨过 IHOP 触发并发标记,标记结束后才有若干次 mixed young GC,顺带疏散高垃圾占比的老年代分区。',
      '关键判据是分区垃圾占比:G1 只回收"划算"的老年代分区,回收价值低于 G1HeapWastePercent(默认 5%)时 mixed 不发生。',
      '分析老年代增长要分三类:标记前的正常堆积、标记后 mixed 能清的部分、mixed 也清不掉的存活体(那是容量或泄漏问题的信号)。',
    ],
    [
      block('机制:IHOP 到 mixed 的完整链条', '老年代占用达到 InitiatingHeapOccupancyPercent(默认 45%,支持自适应)触发并发标记周期;标记确认存活后,G1 在后续若干次 young GC 里把高垃圾占比的老年代分区并入 CSet,日志显示为 Pause Young (Mixed)。实测(128MB 堆,IHOP=15,晋升后整批丢弃模式):22 次 mixed,例如 Pause Young (Mixed) 90M->81M(128M) 1.131ms。回收边界由并发标记的存活信息决定,mixed 自己不再做全堆标记。'),
      block('反例:老年代满了标记照跑,mixed 一次不来', '对照组实测:同样的分配负载,但存活对象长期持有(老年代分区几乎全活)。结果:66 轮 Concurrent Mark Cycle 照常触发,Pause Young (Mixed) 次数为 0。原因:老年代分区垃圾占比低于 G1HeapWastePercent 的 5%,疏散不划算,G1 选择只做 young。这推翻了"标记完必有 mixed"的直觉——mixed 是划算才做,不是标记的必然产物。这个形态正是缓存型服务的典型画像:老年代高占用但低垃圾,查 mixed 次数永远查不出问题。'),
      block('取舍:让 mixed 有活干的两条路', '其一,业务侧制造可回收的老年代垃圾:批处理数据用完即弃、缓存设上限并定期淘汰,让老年代分区出现高垃圾占比。其二,参数侧在确认"垃圾确实存在但 mixed 不动"时,提高 G1HeapWastePercent(如 10)或降低 IHOP 让标记更早介入;两者都改变回收成本曲线,要连观察三次以上完整周期再定。老年代只进不出且 mixed 无货可收时,问题已经不在 GC 参数,在对象生命周期设计。'),
    ],
    [
      block('实证:mixed 触发与不触发的对照', '触发组命令:-Xms128m -Xmx128m -XX:InitiatingHeapOccupancyPercent=15 -Xlog:gc* MixedExp2(每轮 3.8MB 分配,4 轮后整批晋升对象失效)。输出:22 次 Pause Young (Mixed),样例 90M->81M(128M) 1.131ms。对照(存活密集)输出:Concurrent Mark Cycle 66 次、mixed 0 次。验证:两组差异只在存活模式,回收器与参数相同,结论可归因到垃圾占比。'),
      block('追问链:mixed 三刀', '一刀:"mixed 会不会把暂停拖长?"——会,老年代分区疏散比 Eden 贵,G1 按暂停目标把 mixed 分摊到多次 GC,单次实测仅 1.1ms 量级,但要防存活突增时单次超标。二刀:"IHOP 自适应是什么?"——G1 会按标记耗时与老年代填充速率动态调整 IHOP(MaxGCPauseMillis 等参与计算),日志可见 adaptive IHOP 值,固定 45 是旧行为。三刀:"老年代增长曲线怎么判读?"——标记前阶梯上升是正常,mixed 后台阶下降是健康;若 mixed 后高位横盘且每次标记后基线抬升,先查缓存无上限与静态集合,再谈扩堆。'),
    ],
    ['跨线先标记,划算才 mixed', '全活不回收,五折线说了算', '只进不出查缓存,扩堆是最后一步'], [g1tun, gctun],
  ),
  'jvm-advanced/6': deep(
    'G1 evacuation failure 应从哪些方向调查？',
    '网银支付核心沙盘:32MB 小堆压测中 GC 日志狂刷 To-space exhausted,随后出现 Full GC,P999 直接击穿。给出从日志识别到根因分类的完整调查路径,含本机复现证据。',
    [
      '日志识别看两行:To-space exhausted(疏散时存活对象放不进预留空间)与随后的 Pause Full (G1 Compaction Pause),本机实测 32MB 堆刷出 855 次。',
      '根因归三类:存活集估算不足(ReservePercent/堆余量)、大对象挤占(Humongous)、晋升速率过快(分配突发),三个方向按日志证据排除。',
      '应急与根治分开:应急可加大 G1ReservePercent、限制大对象;根治要压平分配曲线或扩堆,别把应急参数留在生产长期运行。',
    ],
    [
      block('机制:to-space 为什么会耗尽', 'G1 疏散时把存活对象复制到预留空间(G1ReservePercent 默认堆的 10% 对应 to-space 候选)。当存活集超预估、或 Humongous 分配在疏散中途要连续 region、或晋升速率把 young 预算吃光,疏散目标区放不下,GC 中途放弃回收(leave the region)并标记 To-space exhausted,本次 GC 变相失败,随后常跟 Full GC 全堆压缩。实测日志:\n```\nGC(8) To-space exhausted\nGC(10) Pause Full (G1 Compaction Pause)\n```\n855 次 exhausted 期间 P999 由存活集大小与分配速率共同决定。'),
      block('边界:三个易混淆的相邻概念', '第一,to-space exhausted 与 "Evacuation Failure" 是同一事件的日志两种呈现,别当成两个问题。第二,它与 OOM 不同:OOM 是分配彻底失败,exhausted 是这次 GC 疏散失败但进程继续,代价是效率与暂停。第三,它与 mixed 不来不同:mixed 是"不划算不做",exhausted 是"想做没地方放"——前者查垃圾占比,后者查空间预算。'),
      block('取舍:参数应急的适用边界', '加大 -XX:G1ReservePercent(如 10 到 20)直接扩大预留,是止血最快的一招;配合 -XX:G1HeapWastePercent 不动,避免连带。但要清楚它吃的是可用堆:预留 20% 意味着有效堆缩水,应用吞吐可能下降。Humongous 频发时先按第 4 题的拆分思路治理,再谈堆余量;分配突发(定时任务批量灌数据)要错峰,这是代码问题不是 GC 参数问题。分层修复时间线:应急(ReservePercent 提升,分钟级)→短期(扩堆或限流压分配速率,天级)→中期(Humongous 治理与分配削峰,代码改造)→长期(容量规划按分配速率定堆)——每层的验收信号一致:To-space exhausted 计数归零且 Pause Full 消失。'),
    ],
    [
      block('实证:32MB 堆上的完整复现', '命令:-Xms32m -Xmx32m -XX:G1ReservePercent=5 -Xlog:gc*:file=evac.log EvacExp(Java 17.0.17;26MB 存活集加 512 路批量分配,跑 4 秒)。统计:\n```\nTo-space exhausted 出现 855 次\n随后 Pause Full (G1 Compaction Pause)\n```\n验证:把 G1ReservePercent 提到 20 或削减存活集重跑,exhausted 次数显著下降,方向与机制解释一致。'),
      block('追问链:evacuation failure 三刀', '一刀:"为什么预留 10% 还不够?"——10% 是历史统计的兜底,存活突增与 Humongous 中途插入都会突破预估;预留是成本与安全的折中,不是保证。二刀:"exhausted 之后为什么是 Full?"——疏散失败的 region 里对象还活着,丢不得;G1 退回全堆压缩(Serial 语境是 Mark-Sweep-Compact,G1 是并行压缩)重排存活体,耗时由存活总量决定。三刀:"生产上怎么快速定位是哪类根因?"——先看 exhausted 前的 Humongous regions 是否高企(大对象),再看 Old regions 增速与分配速率曲线(晋升突发),最后核对堆余量与 ReservePercent(预算不足);三步各对应一条日志证据链。'),
    ],
    ['to-space 放不下,当次就放弃', '预留是折中,不是保证', '先查大对象,再查分配峰,最后查堆余量'], [g1tun, jdksrc('gc/g1/g1CollectedHeap.cpp')],
  ),
  'jvm-advanced/7': deep(
    'ZGC 的低暂停特性有什么资源取舍？',
    '网银风控引擎沙盘:追求 10ms 级 P999,考虑从 G1 换 ZGC。用同负载实测对照说明 ZGC 暂停量级、堆余量要求、内存与 CPU 开销,以及什么情况下不值得换。',
    [
      'ZGC 的 STW 暂停实测在微秒级(0.005-0.017ms),标记、搬迁全部并发,代价是常驻内存与吞吐开销。',
      '低暂停的前提是堆有余量:并发搬迁需要腾挪空间,实测堆被填满时出现 Allocation Stall (main) 59.822ms,应用侧照样停。',
      'JDK 17 的 ZGC 是单代回收器(分代 ZGC 是 JDK 21 的 JEP 439):存活集大时并发周期更长,换之前先按版本边界评估。',
    ],
    [
      block('机制:着色指针与并发搬迁的代价', 'ZGC 的核心数据结构是 64 位染色指针:高位元数据位(Marked0/Marked1/Remapped/Finalizable)承载对象在并发周期中的视图状态,同一物理内存经多重映射在多个视图地址空间中共享(地址与指针颜色解耦,这是它支撑 TB 级堆的前提)。读屏障是并发的枢纽:加载引用时检查指针颜色,颜色过期(如对象已搬迁但指针还是旧视图)就在读的瞬间现场修正并转发——旧引用被"自愈",搬迁中的对象不必暂停应用。代价:读屏障内联在热点代码里消耗指令预算;堆要预留搬迁空间,内存占用高于 G1;搬迁期间多占一倍于迁移集的内存。这解释了实测:暂停亚毫秒,但 256MB 堆在高速分配下被顶满,触发 Allocation Stall——ZGC 用空间换暂停,空间不足时代价转移给应用停顿。'),
      block('边界:17 与 21 的分代差异', 'JDK 17 的 ZGC 不分代,每次周期扫全堆存活,常驻大存活集的服务周期长、CPU 花得多;JDK 21 的 JEP 439 引入分代 ZGC,吞吐与内存开销大幅改善。两个版本差异大到"17 上测得的 ZGC 结论不能直接平移到 21"。同理,ZGC 在 17 上不支持字符串去重等 G1 特性(支持情况随版本而异,升级前核对版本说明),特性清单也要按版本对账。'),
      block('取舍:什么负载值得换', '换 ZGC 的判据是:P999 被 STW 暂停卡住(日志显示暂停毫秒级且与抖动对齐)、堆可以给足余量、CPU 有富余。不划算的情况:吞吐型批处理(暂停无所谓)、堆本来就紧(Allocation Stall 反而恶化)、依赖 G1 特性(如 17 上的字符串去重)且无替代。换回收器是重决策,本机对照数据只代表该负载,生产决策必须用自己的负载重测。'),
    ],
    [
      block('实证:同负载 G1 与 ZGC 对照', '同一 CmpExp(40 轮,每轮 15 万次分配,存活上界 10 万),Java 17.0.17,堆 256MB:\n```\nG1: GC(0) Pause Young (Normal) 23M->4M(256M) 2.670ms  (n=13,中位 2.948ms,最大 32.202ms)\nZGC: GC(0) Pause Mark Start 0.005ms / Pause Mark End 0.017ms\nZGC(另一轮): Allocation Stall (main) 59.822ms\n```\n验证:同命令重跑分布同量级;Allocation Stall 不是每次复现,依赖分配节奏与堆余量的瞬时关系——这本身就是"低暂停不是免死金牌"的证据。'),
      block('追问链:ZGC 三刀', '一刀:"微秒暂停怎么做到的?"——标记与搬迁全部并发,STW 只剩根集扫描的开关动作,靠读屏障与着色指针维持并发正确性。二刀:"为什么会有 Allocation Stall?"——并发搬迁需要空 region 做腾挪,堆被填满时分配线程要等回收腾出空间,实测 59.822ms,停顿从 STW 转移到应用侧。三刀:"17 换 ZGC 还是等 21?"——若存活集大且 CPU 紧,17 的单代 ZGC 代价明显,规划里把升级到 21 的分代 ZGC 作为组合拳;只升级回收器不升级版本,评估要打折。'),
    ],
    ['暂停微秒级,空间换时间', '堆满就 stall,余量是前提', '17 单代,21 才分代,结论别跨版本'], [jep(377), jep(439), gctun],
  ),
  'jvm-advanced/8': deep(
    '如何比较 G1 与 ZGC 对同一服务的效果？',
    '网银账务查询沙盘:团队争论"换 ZGC 值不值",有人拿单机微基准说暂停降了三个数量级。给出对同一服务做对照实验的变量控制、指标口径与判读规则,全部基于本机同负载实测。',
    [
      '控制变量:同一份负载脚本、同一堆大小、同一 JDK 构建,只切 -XX:+UseG1GC 与 -XX:+UseZGC,其余参数冻结。',
      '口径统一:暂停看分布(P99/P999 与最大值)不看平均;吞吐看完成时间或 GC 频率;内存看 RSS 与 committed 两组数;还要记 Allocation Stall 一类应用侧停顿。',
      '结论只对"该负载"负责:实测 G1 young 中位 2.948ms 对 ZGC 0.005-0.017ms,但 ZGC 出现过 59.822ms 的 Allocation Stall——优势与代价必须同框呈现。',
    ],
    [
      block('机制:对照实验里必须冻结的变量', '回收器行为受分配速率、存活集、堆大小、region/页大小、JIT 状态影响。对照时负载脚本要固定随机种子与轮次;JFR 与 GC 日志的开关在两组间保持一致(日志本身有开销);JVM 其余参数默认值随回收器变化的部分(如 NewRatio 不适用 G1/ZGC)要在报告里列出差异项,避免把默认值差异误读为回收器差异。'),
      block('反例:只比暂停数字会得出错误结论', '实测同负载两组数据:G1 暂停中位 2.948ms、最大 32.202ms;ZGC 单次暂停 0.005-0.017ms。若只比这两行,ZGC 完胜;但同一轮 ZGC 出现 Allocation Stall (main) 59.822ms,把应用线程按住近 60ms——比 G1 的最大暂停还大。只看"Pause"关键词的对比脚本永远发现不了它。正确的对照必须把应用侧停顿事件与 GC 并发周期时长(Cycle 时间)一起统计,否则就是选择性呈现。'),
      block('取舍:对照报告的最低字段集', '每次对照至少产出五组数:暂停分布(young/full 分别列)、并发周期时长、Allocation Stall 或类似应用侧事件、完成固定负载的墙钟时间、常驻内存(RSS 与 committed)。再加运行环境一行(JDK 构建、堆、参数差异)。字段齐了才允许下结论;缺任一项,结论降级为"待验证观察"。'),
    ],
    [
      block('实证:本机对照的完整数字', '命令对(Java 17.0.17,堆 256MB,负载 CmpExp 40 轮):\n```\nG1: -Xms256m -Xmx256m -Xlog:gc:file=g1.log\n    young n=13,中位 2.948ms,最大 32.202ms\nZGC: -XX:+UseZGC -Xms256m -Xmx256m -Xlog:gc:file=zgc.log\n    单次 Pause 0.005 至 0.017ms;另一轮 Allocation Stall 59.822ms\n```\n验证:两组各跑三轮取稳定分布;Allocation Stall 的出现与分配节奏相关,需在报告里标注非确定性。'),
      block('追问链:对照三刀', '一刀:"为什么最大暂停差 30 倍还要犹豫?"——因为 G1 的 32.202ms 是可预算的 STW,ZGC 的 59.822ms 是堆余量不足时的应用停顿,二者性质不同,业务感受要看整体分布而不是单类事件。二刀:"内存口径怎么比?"——ZGC 着色指针与并发元数据有额外开销,比较 committed 与 RSS 双口径,并按"峰值吞吐同档"约束,不看孤立数字。三刀:"能不能直接拿这组数据上生产?"——不能;本机是桌面 Windows、单线程负载、256MB 堆,生产是容器、多线程、数十 GB 堆,结论只支持"方向值得深测",不支持"照搬"。'),
    ],
    ['同负载同口径,只切回收器', '暂停看分布,停顿看全事件', '结论只属于测过的负载'], [g1tun, jep(377)],
  ),
  'jvm-advanced/9': deep(
    'GC 时间占比不高，接口为何仍可能被 GC 影响？',
    '网银额度服务沙盘:监控显示 GC 占比 3%,但接口 P99 与 GC 事件强相关。解释除 STW 暂停外的四条传导路径,并给出各自的可观察证据与缓解手段。',
    [
      '暂停只是显性成本:并发周期抢 CPU、写屏障开销、缓存冷启动与 TLB/页相关效应都不计入"GC 时间",却直接影响接口延迟。',
      '分配速率本身就是延迟源:新对象分配虽快,但 TLAB 补货、大对象直入老年代、随之而来的并发标记都被分配曲线牵引。',
      '判定靠对齐而非占比:把 GC 事件时间戳、并发周期起止、CPU 使用率与 P99 窗口对齐,一条条排除传导路径。',
    ],
    [
      block('机制:四条不进占比的传导路径', '路径一:并发标记与搬迁线程和应用抢 CPU,实测 G1 的 Concurrent Mark Cycle 在小堆上毫秒级,但生产大堆可达秒级,期间业务吞吐下降。路径二:G1/ZGC 的写屏障与读屏障插在业务代码里,ZGC 的读屏障尤其重,热点路径指令预算被吃掉。路径三:GC 后 survivor/缓存冷启动——疏散把热对象搬走,代码缓存的 TLB 与页局部性变差,后续若干请求变慢。路径四:大对象分配直入老年代,触发更早的并发标记(连锁到 mixed/IHOP),占用不体现在当次暂停里。'),
      block('反例:3% 占比与强相关的矛盾怎么成立', '实测锚点:G1 young 暂停中位 2.948ms、最大 32.202ms,单线程负载下 GC 时间占比不足 5%;但 ZGC 组的 Allocation Stall (main) 59.822ms 完全不在 GC 时间内,却把请求拖了近 60ms。再来一条:并发标记周期 195.485ms(实测 Concurrent Mark Cycle 行)与业务并发运行,不产生 STW 却压低了吞吐。两条都说明"占比"是垃圾指标——它只统计 GC 线程花的 CPU 时间,不统计 GC 事件对应用的时间转嫁。'),
      block('取舍:先对齐证据,再决定动哪里', '把 P99 抖动窗口与 GC 日志逐条对齐:窗口内有 STW,查暂停分布;窗口内只有并发周期,查 CPU 与并发线程数(-XX:ConcGCThreads);窗口内两者皆无,查 Allocation Stall/安全点/虚存缺页等应用侧事件。对症下药:并发抢 CPU 调 ConcGCThreads 或错峰,屏障开销在热点代码上减分配,冷启动靠预热(见第 40 题)。占比指标只适合做长期趋势,不适合做归因。'),
    ],
    [
      block('实证:三条传导路径的可观察量', '本机实测(Java 17.0.17):\n```\nConcurrent Mark Cycle 195.485ms        (与业务并发,不在 GC 占比内)\nAllocation Stall (main) 59.822ms       (ZGC 堆满时的应用停顿)\nPause Full (G1 Compaction Pause) 80.755ms\n```\n验证:用 -Xlog:gc* 的完整时间戳与链路追踪 P99 窗口对齐,三条证据分别落在不同窗口,说明接口抖动的来源不止一行 Pause 日志。'),
      block('追问链:占比陷阱三刀', '一刀:"那什么指标能替代占比?"——暂停分布加并发周期时长加应用侧停顿事件的三联表,再对齐业务 P99;占比只在长期趋势里当辅助。二刀:"并发周期多长算长?"——没有绝对值,与堆和存活集相关,小堆实测 195ms,生产数十 GB 堆会到秒级;看它占总周期比例与出现频率。三刀:"写屏障开销怎么量化?"——JMH 级微基准或 JITWatch 对比屏障开关的汇编差异,生产上用吞吐差近似;别用生产日志量化它,信号太小。'),
    ],
    ['占比是假象,对齐才见真', '并发抢 CPU,屏障吃指令', 'Stall 冷启动,都在窗口里'], [g1tun, jep(377)],
  ),
  'jvm-advanced/10': deep(
    '分配速率突然升高应如何定位？',
    '网银营销活动沙盘:活动开始 10 分钟后 GC 频率翻倍,怀疑某次发布引入分配热点。给出从"确认速率升高"到"定位到代码行"的排查链路,含本机定位实验。',
    [
      '先确认事实:GC 日志反推分配速率(每次回收间的堆增量除以时间),对比发布前后同型曲线,排除流量因素。',
      '定位靠分配剖析:JFR 的 ObjectAllocationSample(实测 profile 档 8 秒 120 条)给出大分配的类型与栈,jmap -histo 看堆内类型分布。',
      '代码归因常见三类:日志拼接、临时对象循环、大数组/大字符串构造;修法分别是结构化日志、对象复用、流式处理。',
    ],
    [
      block('机制:从 GC 日志反推分配速率', '每次 young GC 日志给出堆用量迁移(如 25M->5M),两次 GC 间的时间差可得速率:rate≈(前次回收后堆量差值加回收量)/时间。速率升高但流量不变,说明单请求分配变多。JFR 的 ObjectAllocationSample 按对象大小采样并记录分配栈,是对"哪里在分配"的直接回答;实测 8 秒拿到 120 条样本,足够排序出大头。注意采样偏置(样本按大小加权,小对象欠采样),排序结论要用堆直方图交叉验证。'),
      block('反例:被流量假象带偏的排查', '活动期间 QPS 从 200 涨到 800,分配速率涨 4 倍——这不是代码回归,是流量放大;若此时按"代码热点"去修,方向就错了。判定:速率/QPS 的单请求分配量是否变化。实测对照里 CmpExp 每轮固定 15 万次分配,速率只与轮次线性相关;生产里把速率除以 QPS 得到单请求分配字节,发布前后对比这个归一化值,流量因素被消掉,剩下的才是代码变化。'),
      block('取舍:三类热点的修法与验证', '日志拼接热点(高频 debug 日志拼大字符串)改为占位符或条件输出,验证看速率回落与 CPU 下降;循环内临时对象(如每轮 new 解析器)提为复用或池化,验证看 TLAB 分配次数(JFR ObjectAllocationInNewTLAB 事件);大数组构造(一次性组装大 JSON)改流式写出,验证看 Humongous regions 增速归零。每类修改都要在预发同负载验证,别在高峰直接上。'),
    ],
    [
      block('实证:分配剖析的最小闭环', '命令与输出(Java 17.0.17):\n```\njava -XX:StartFlightRecording=duration=8s,filename=probe2.jfr,settings=profile ...\njfr summary probe2.jfr\n  jdk.ObjectAllocationSample  120\n```\n配合 -Xlog:gc* 反推速率:每次 young GC 的堆迁移量(如 25M->5M)与间隔可得 MB/s。验证:对本机负载,速率与每轮分配字节数线性吻合;生产操作时先取两份(发布前后)再对比归一化速率,避免流量误判。'),
      block('追问链:分配定位三刀', '一刀:"为什么不直接上堆转储?"——堆转储是瞬时快照且 STW 长秒级,分配热点是速率问题,采样剖析更贴合;快照留给泄漏排查。二刀:"采样偏置会不会误导?"——会,ObjectAllocationSample 偏向大对象,小而多的对象被欠采样;用 jmap -histo(全量)与 JFR(带栈)交叉,结论才稳。三刀:"速率多高算高?"——没有绝对阈值,与堆、回收器、SLO 相关;实用判据是"速率变化率"——单请求分配字节环比突增即值得立案,绝对值交给容量规划。'),
    ],
    ['速率除以流量,归一才可比', 'JFR 采样看栈,直方图看面', '修日志改循环拆大对象,逐项验证'], [api('java/lang/instrument/package-summary'), jfrman],
  ),

  'jvm-advanced/11': deep(
    '对象存活率上升为何可能比对象创建多更危险？',
    '网银实时计算沙盘:一次活动把中间结果留存时间从 200ms 拉长到 2 秒,分配速率不变,GC 行为却急剧恶化。用实测对照解释存活率如何改写回收成本,并给出判别与治理顺序。',
    [
      '分配多但死得快,回收成本是常数:Eden 回收只疏散少量存活对象;存活率上升让每次 GC 疏散的量与时间同步膨胀。',
      '存活率是乘法项:GC 频率乘以单次疏散成本都随它涨,而分配速率只影响频率这一项。',
      '存活率抬升还会改写晋升路径:对象在 Survivor 间反复拷贝、提前晋升,老年代占用与 mixed 压力一起上升。',
    ],
    [
      block('机制:回收成本公式的两个因子', 'young GC 成本≈存活集大小(疏散复制量)加根扫描,而 GC 频率≈分配速率除以 Eden 容量。分配速率翻倍,频率翻倍,单次成本不变;存活率翻倍,频率不变但单次成本翻倍,且 surviving 对象年龄增长走 Survivor 路径(再次复制)。最危险的区间是存活率让对象熬到晋升:老年代增速上升,IHOP 提前触发并发标记,mixed 跟着来,整条链都是活率驱动的。'),
      block('反例:同样的分配速率,两种命运', '实测对照(mixed2.log 与存活密集对照,128MB 堆):高垃圾占比组标记后 mixed 回收 90M->81M,存活密集组 66 轮并发标记、mixed 0 次、老年代高位横盘。两组分配速率相同,差别只在留存时间——存活率改写了回收格局。另一个实测锚点:EvacExp 把存活集顶到堆的 80%,触发 855 次 To-space exhausted 加 Full GC,而同样的分配速率若存活少,Eden 回收毫秒级。'),
      block('取舍:先测活率,再谈扩堆', '活率的可观察量:每次 young GC 后的堆迁移量(如 25M->5M 中的 5M 即幸存约 20%)、Survivor 占用、晋升速率(Old regions 增速)。治理顺序:先缩短留存(业务侧尽早释放、缓存加 TTL),再调 Survivor 空间(TenuringThreshold 相关行为),最后才考虑扩堆——扩堆只是把频率摊薄,单次成本问题依旧。'),
    ],
    [
      block('实证:同速率不同活率的对照数据', '本机实测(Java 17.0.17):\n```\n高垃圾组: Pause Young (Mixed) 90M->81M(128M) 1.131ms  (mixed 22 次)\n存活密集组: Concurrent Mark Cycle 66 轮,mixed 0 次,老年代横盘\n顶满组: To-space exhausted 855 次 + Pause Full\n```\n验证:三组分配负载同量级,唯一变量是对象留存方式;回收器行为的三种结局证明活率是主导因子。'),
      block('追问链:活率三刀', '一刀:"为什么复制算法对活率这么敏感?"——它以存活体为工作量,活多少搬多少;标记-清扫类算法以死对象为工作量,特性相反,这也是 CMS/ZGC 对高活率更稳的深层原因之一。二刀:"怎么快速发现活率异常?"——盯每次 GC 后存活量与 Survivor 占用的趋势线,环比抬升即预警;别只看 GC 频率。三刀:"业务侧什么改动最容易抬活率?"——缓存 TTL 放宽、会话对象寿命延长、批处理窗口拉大;网银系统里"多留一会儿数据"的优化常常就是这类事故的源头。'),
    ],
    ['频率看分配,成本看存活', '活率是乘法,分配是加法', '先缩寿命再扩堆,顺序不能反'], [g1tun, gctun],
  ),
  'jvm-advanced/12': deep(
    '堆转储中 dominator tree 有什么诊断价值？',
    '网银账务服务沙盘:Full GC 后堆仍在高位,拿了一份 HPROF 转储却只会看直方图。解释支配树的原理(谁能独占 retain 谁)、与直方图的互补关系,以及用它定位保留根的路径。',
    [
      '直方图回答"什么对象多",支配树回答"谁扣住了内存":节点保留大小(retained size)是该节点被回收后能连带释放的总量。',
      '支配树的父子关系给出泄漏嫌疑链:大保留尺寸的入口节点,沿支配链向下就是引用路径,与 GC Roots 的路径分析互补。',
      '转储是 STW 快照:确认它代表的是"问题时刻"的堆,否则支配树再漂亮也可能是在错误时间拍的照。',
    ],
    [
      block('机制:保留大小与支配关系', '支配树按"支配"关系组织对象:X 支配 Y 意为任何到达 Y 的路径必经 X——于是 X 回收则 Y 必然可回收,X 的保留大小含 Y。Eclipse MAT 把 HPROF 解析成支配树,类直方图模式(heap dump 上的 histogram)与 dominator_tree 视图分别对应"按类型汇总"与"按持有者汇总"。保留大小排第一的往往是一个集合入口(static Map、缓存持有者、监听器注册表),这就是泄漏案的嫌疑人。'),
      block('边界:支配树解释不了的两种情形', '其一,共享持有:对象被多个入口共同引用时,支配关系分裂到多个小节点,单一入口保留尺寸不大,支配树看不到"合力"——此时要用 GC Roots 到对象的路径分析(Merge Shortest Paths)。其二,快照时机:OOM 前一瞬、Full GC 后、业务高峰的转储各有解读差异,只 Full GC 后的快照才最能代表"不可回收的底座"。转储文件本身可达数百 MB,生产上注意落盘路径与隐私数据。'),
      block('取舍:何时用直方图,何时用支配树', '第一眼用直方图:类型分布异常(char[] 爆量、某业务类百万实例)已能定方向。方向不明或需要"谁持有"时用支配树:它把散落各处的同类型对象归因到持有者,是跨类归因。线上没有 MAT 时,jcmd GC.class_histogram(实测见批 3 代理实验)给轻量直方图,支配树必须离线解析 HPROF——工具链成本要提前准备,事故现场现装工具是禁忌。'),
    ],
    [
      block('推演:从直方图到支配树的完整走法', '本机验证过直方图环节(Java 17.0.17,jcmd GC.class_histogram):200 个动态代理类入账后 java.lang.Class 实例达 2958、总实例 61130。按 MAT 流程推演支配树环节:代理类堆积案中,支配树根应是持有代理对象的集合(如无界 Map),保留尺寸最大;点开即可看到 X 个 $Proxy 实例与其引用的 InvocationHandler。验证方式:本机已证明"代理对象不保活类即卸载"(对照实验),对应到支配树就是持有集合消失后整棵子树清零——此环节为推演,未在本机解析真实 HPROF,标注待补。'),
      block('追问链:支配树三刀', '一刀:"保留大小与浅大小(shallow size)差在哪?"——浅大小是对象自身字节数,保留大小是回收它后连带释放的总量;泄漏归因看保留,内存构成看浅。二刀:"支配树会变吗?"——同一堆不同 GC 时刻支配关系会变,快照只是切片;对比两份不同时刻的转储看增长分布,比单份更有说服力。三刀:"生产怎么安全拿转储?"——jcmd GC.heap_dump 落到独立盘,选流量低谷,加 -XX:+HeapDumpOnOutOfMemoryError 兜底;主库直接 dump 的 STW 成本要提前审批。'),
    ],
    ['直方图看面,支配树看链', '保留尺寸排序,沿着链找根', '快照要挑时刻,对比胜过单张'], [jcmdman, api('java/lang/instrument/package-summary')],
  ),
  'jvm-advanced/13': deep(
    '如何定位缓存没有上限导致的泄漏？',
    '网银商户信息沙盘:商户缓存按需加载从不淘汰,运行两周后 Full GC 频率逐日上升。给出从怀疑到确认到分级的完整定位手法,并说明为什么"没上限"比"没有淘汰"更隐蔽。',
    [
      '确认信号三件套:老年代基线随时间单调抬升、Full GC 后高位横盘、jmap -histo 里业务缓存键值类型名列前茅。',
      '定位到持有者:支配树找到 static 集合入口,或直接在代码里检索 static Map/List 与 @Component 里的容器字段。',
      '分级治理:加 TTL/容量上限是止血,接 Guava Cache/Caffeine 的过期加权重是标准解,批注易混淆点——弱引用不能替代淘汰策略。',
    ],
    [
      block('机制:无上限缓存的泄漏画像', 'static Map 的键被 GC Roots 持有,值连带可达,永久晋升老年代。画像特征:每次 Full GC 后基线都比上一次略高(回收不掉的底座在长大),间隔越来越短。与"有上限但淘汰策略错"的差别在于:后者曲线锯齿状(到上限触发清理),前者单调上升无锯齿。实证口径:代理实验显示不保活的代理类会被卸载——反证 static 集合保活是一切的前提条件,持有者不断,GC 永远不回收。'),
      block('边界:三类容易误判的相邻现象', '其一,类加载器泄漏也会让"类与字符串"堆积,直方图上 Class 与 String 打头,别急着怪缓存(见第 14 题)。其二,JIT 与元空间增长是正常开销,有上限(Metaspace 64MB 保留/实际提交按需),增长会停滞,泄漏是永不停滞。其三,堆外与直接内存不进堆直方图,若 BufferPool 指标同步增长,是另一类问题(见第 17 题)。三者的共同点是都会表现为"内存涨",差异在涨的位置与口径。'),
      block('取舍:止血、标准解与反模式', '止血:给 Map 加容量检查,超限告警或拒绝写入,一行代码当周可上。标准解:Caffeine maximumSize/expireAfterWrite,淘汰策略与业务时效对齐,网银商户信息适合写后 10 分钟过期加重载。反模式:用 WeakHashMap 当缓存——键的弱引用让回收时机不可控,值若引用键还会整体失效;也别依赖 System.gc 定时清理,那是把不确定行为当设计。'),
    ],
    [
      block('实证:保活与卸载的对照(定位逻辑的锚点)', '本机实验(Java 17.0.17):200 个动态代理对象存入 List 保活,GC.class_histogram 显示 200 个 $Proxy 类在册(总 Class 实例 2958);同程序不保活时这些类从直方图消失。推演到缓存泄漏:static List 相当于这里的 keep 列表——持有者不断,直方图与支配树就能看到整棵保留树。验证:把保活列表置 null 后触发 GC,直方图行数回落,对应到业务就是"删除引用即释放"。'),
      block('追问链:缓存泄漏三刀', '一刀:"为什么 Full GC 不回收?"——可达性分析判定 static Map 仍可达,回收器无权回收,这是设计而非缺陷。二刀:"怎么在线上无 MAT 时快速确认?"——jcmd GC.class_histogram 看业务类型排名加 jcmd VM.uptime 对比多时点直方图差量,类型实例数只增不减即高嫌疑,再回代码查 static 容器。三刀:"上限设多大?"——按业务有效集规模(如活跃商户数)乘安全系数,并用预发同型流量压测验证淘汰行为;上限不是拍一个 10 万,而是让过期曲线与业务失效曲线对齐。'),
    ],
    ['基线抬升无锯齿,就是没上限', '直方图找类型,支配树找主人', '弱引用不淘汰,上限才是解'], [jcmdman, api('java/util/WeakHashMap')],
  ),
  'jvm-advanced/14': deep(
    '如何排查类加载器泄漏？',
    '网银热部署沙盘:反复热更新规则插件后 Metaspace 缓慢上涨,最终 OutOfMemoryError: Metaspace。解释类加载器泄漏的持有链、与元空间 OOM 的关系,以及本机可验证的类卸载条件。',
    [
      '泄漏的本质是持有链:任何存活对象引用了加载器加载的类或实例(线程栈、ThreadLocal、static 缓存、JNI 全局引用),整个加载器及其全部类都无法卸载。',
      '卸载条件苛刻且整体化:类的卸载以加载器为单位——加载器不可达时,它加载的所有类一起卸,没有单类卸载。',
      '排查靠对比:两次操作(如两次热部署)之间做类直方图与 Metaspace 用量差量,增长类型的 ClassLoader 字段即嫌疑人。',
    ],
    [
      block('机制:为什么一个引用就锁住整个加载器', 'JVMS 5 对类卸载的表述是加载器不可达时其类可被回收。可达性是图级的:插件实例被宿主 static Map 持有,实例的对象头指向其类,类指向定义它的加载器——四个节点连成一条从 GC Roots 出发的路径,整图不可回收。JDK 17 里动态代理类挂在 jdk.proxyN 动态模块(实测直方图可见 jdk.proxy1.$ProxyN),每个动态模块背后也有加载器,同样适用整体卸载规则。'),
      block('边界:元空间上涨的三种正常情形', '热部署后的第一次增长可能只是新类装载(Metaspace 按需提交);反射与动态代理会生成类与 Lambda 匿名类,数量随代码路径增长后趋于平稳;JIT 编译的 CodeCache 另算不占 Metaspace。区分"正常增长"与"泄漏"的判据是重复操作后的差量:两次相同热部署应带来近似增量后回落(旧加载器卸载),若只增不减即泄漏。'),
      block('取舍:修复点选在断链处', '常见断链点:宿主对插件实例的 static 持有改注册表化管理(插件注销即移除);ThreadLocal 在线程池里跨部署残留,任务收尾显式 remove;第三方库的回调注册要有反注册调用。修复后验证必须是"重复 N 次加载卸载,Metaspace 回到基线",一次成功不算数。'),
    ],
    [
      block('实证:类随持有者生灭', '本机实验(Java 17.0.17,jcmd GC.class_histogram):代理对象保活时 200 个 $Proxy 类在册;不保活后重跑,这些类从直方图消失——类与加载器的整体卸载行为得到验证。推演热部署场景:每次部署生成新加载器与新类,旧加载器被一条引用锁住时,Metaspace 只进不出。验证方式:同程序多次循环加载加清理,直方图类数应回到基线;此场景的 HPROF 分析为推演,标注待补。'),
      block('追问链:类加载器泄漏三刀', '一刀:"为什么类不能单个卸载?"——类与常量池、静态字段、加载器构成不可分割的一致性单元,单类卸载会破坏类初始化语义;规范选择了以加载器为粒度。二刀:"ThreadLocal 怎么会锁住类?"——线程池线程长命,ThreadLocalMap 的值若是插件实例,值→类→加载器的路径永续;remove 断链即可,这也是为什么清理钩子比"下次部署时统一清"可靠。三刀:"Metaspace OOM 后第一动作?"——先拿类直方图统计各类加载器名下类数量与增长差量,再看支配树谁持有实例;直接调大 MaxMetaspaceSize 只是把爆炸时间推后。'),
    ],
    ['一个引用锁一族,卸载按加载器', '两次部署看差量,只增不减即泄漏', '断链在注册处,验证要循环做'], [jvms5, jcmdman],
  ),
  'jvm-advanced/15': deep(
    '元空间 OOM 与堆 OOM 的处置为何不同？',
    '网银批处理沙盘:同一天两个服务分别抛出 Metaspace OOM 与 Java heap space,值班同学用同一套"扩内存"思路处理,一个生效一个继续炸。解释两类 OOM 的机制差异与各自的处置清单。',
    [
      '堆 OOM 是对象账本爆了:处置看对象画像(直方图/支配树),方向是查泄漏或扩堆。',
      '元空间 OOM 是类账本爆了:处置看类与加载器画像(类直方图差量),方向是查动态类生成与加载器泄漏,扩 MaxMetaspaceSize 常只是推迟。',
      '两者日志形态不同:堆 OOM 带 Java heap space 与对象统计建议(-XX:+HeapDumpOnOutOfMemoryError),元空间 OOM 明示 Metaspace,先分清再动手。',
    ],
    [
      block('机制:两本账本的计量口径', '堆按对象字节计,受 -Xmx 约束,GC 全程参与管理;元空间按类元数据计(方法字节码、常量池、注解),在本地内存,受 -XX:MaxMetaspaceSize(默认无限,受物理内存约束)控制,按需提交。实测 NMT 口径:Metaspace reserved 65546KB、committed 522KB(空闲 JVM),说明保留与提交是两回事——OOM 在提交触顶时发生。堆 OOM 有 GC 前的挣扎记录,元空间 OOM 与 GC 关系弱,因为元数据不参与普通 GC 的对象回收。'),
      block('反例:扩内存救不了的元空间 OOM', '热部署插件服务每次更新净增 5000 个类,MaxMetaspaceSize 从 256m 提到 512m 只是让第 40 次更新才炸;真正处置是找类生成源(动态代理、脚本引擎、Groovy/SpEL 每次编译新类)与加载器泄漏链。对照堆 OOM:若直方图显示无界缓存占 70%,扩堆配合上限治理能稳定运行——同一动作,一个治标一个治本,差别在账本性质。'),
      block('取舍:处置清单分开维护', '堆 OOM 清单:确认 HeapDump 落盘、直方图定类型、支配树定持有者、查缓存与批处理窗口、再评估堆容量。元空间 OOM 清单:类直方图差量定位生成源、检查动态代理与脚本引擎的类复用、检查热部署卸载链、评估类生成是否可池化。两份清单的告警阈值也应分开:堆用占用率,元空间用类数量增速。'),
    ],
    [
      block('推演:两类 OOM 的日志特征判别', '堆 OOM 判据(可用本机复现):ArrayList 净增长程序在 512m 堆抛 java.lang.OutOfMemoryError: Java heap space(实测见过此错误形态,见 pause 组实验的程序结局)。元空间 OOM 形态:OutOfMemoryError: Metaspace,发生在类装载时。本机可验证的相邻证据:NMT 显示 Metaspace committed 522KB、reserved 64MB(空闲态),即元空间是独立的本地内存账本。验证方式:两类程序各跑一次并保留日志,值班手册按日志关键字分流。'),
      block('追问链:两类 OOM 三刀', '一刀:"元空间会参与 GC 吗?"——类元数据随类卸载由 GC 顺带回收,但它不是堆 GC 的对象;卸载不发生,元空间只进不出。二刀:"CompressedClassSpace 是什么?"——压缩类指针的专用空间(-XX:CompressedClassSpaceSize,默认 1G),大量类时可能先于 MaxMetaspaceSize 触顶,日志会区分。三刀:"怎么预防?"——把类数量纳入监控(jcmd GC.class_histogram 的 Class 行),热部署环境设类数量告警;堆则监控 Full GC 频率与老年代基线,两套水位两套动作。'),
    ],
    ['堆看对象,元空间看类', '扩堆可能治本,扩元空间常推迟', '日志先分流,清单不通用'], [jvms5, jcmdman],
  ),
  'jvm-advanced/16': deep(
    '本地内存跟踪能解释所有 RSS 吗？',
    '网银容器化沙盘:NMT 汇总显示已提交 334MB,容器 RSS 却长期 155MB,团队困惑"两本账对不上谁可信"。用同进程实测说明 NMT 的口径边界、RSS 的语义,以及两者各自能回答的问题。',
    [
      'NMT 是 JVM 内部账本:按类别统计保留/提交,但不包含它不感知的分配(如部分直接内存路径、第三方 JNI 库的 malloc)。',
      'RSS 是操作系统视角的驻留页:受页面共享、换出、触及时机影响,同一时刻与 NMT 提交值可以差得很多,两者都真实但口径不同。',
      '解释 RSS 要分层:先用 NMT 解释 JVM 部分,再用工具(proc 映射/heapstat)补 JNI 与 OS 部分,差值要有去处才算闭环。',
    ],
    [
      block('机制:NMT 统计什么、漏掉什么', 'NMT 开启后 JVM 对自身 malloc/mmap 调用记账,分类包括 Java Heap、Class、Thread、Code、GC、Compiler、Internal、Symbol、Metaspace 等。实测(128MB 堆加 120MB 直接内存,Java 17.0.17):\n```\nTotal: reserved=1718961KB, committed=342261KB\n- Java Heap committed=131072KB\n- Internal committed=222KB\n- Thread committed=757KB / reserved=19501KB\n- GC committed=64917KB\n```\n注意:120MB 直接内存不在 Internal 里(Internal 仅 222KB)——17 的 NMT 不把 direct buffer 记入该类目,这是它"解释不了 RSS"的典型来源之一。'),
      block('反例:三个数互相矛盾但都是真的', '同一进程实测:Private Memory 340MB、RSS 155MB、NMT committed 334MB。Private 含未触及页(已提交未驻留),RSS 只算此刻驻留(未触及或被 OS 裁剪的页不算),NMT 漏掉直接内存又叠加保留与提交的差别。三个数分别回答"进程占用的记账上限""此刻真实占用的物理内存""JVM 自我申报的提交量"。拿任何一个去否定另外两个都是口径错误;容器 OOMKilled 看的是 cgroup 内存账,又是第四种口径。'),
      block('取舍:排查顺序与工具搭配', '容器内存问题先看 cgroup 事件与 OOMKilled 日志;JVM 侧开 NMT 拿分类基线(开销约 5-10%,生产常开 summary 档);差值部分用 OS 工具(Windows 下 working set/private bytes,Linux 下 smaps)按映射区间归类。经验配比:堆加 GC 加 CodeCache 大头可由 NMT 解释,JNI 库与直接内存要另查;若 RSS 持续高于 NMT 合计,先怀疑 JNI 泄漏与 glibc malloc 碎片(容器内可用 jemalloc/tcmalloc 替换验证)。'),
    ],
    [
      block('实证:同进程三口径对照', '命令:java -XX:NativeMemoryTracking=summary -Xms128m -Xmx128m NmtExp(分配 120MB 直接内存后保活 20 秒),jcmd VM.native_memory summary 加 PowerShell 进程内存读数:\n```\nNMT Total committed=342261KB(约 334MB)\nRSS(WorkingSet)=155MB\nPrivateMemory=340MB\nInternal committed=222KB(直接内存不在内)\n```\n验证:同进程同时刻三个数全部可复现;直接内存的 120MB 无法从 NMT 数字里找到,需要 BufferPool MXBean 或 OS 映射补账——这演示了"RSS 不是 NMT 能全解释的"。'),
      block('追问链:RSS 三刀', '一刀:"为什么 Thread 保留 19.5MB 提交才 757KB?"——线程栈按保留上限预留,提交只算实际触及页,这也解释了高线程数服务 RSS 不按 Xss 乘线程数爆炸(实测 20000 线程无异常)。二刀:"容器里 NMT 会不会看漏 cgroup 层?"——会,NMT 只看 JVM;容器级看 memory.stat 的 anon/file 分解,配合 NMT 才能定位是堆、元空间、堆外还是 page cache 挤压。三刀:"NMT 开销多大?"——官方口径约 5-10% 性能损耗,summary 档可接受,detail 档仅排障时临时开;长期开 detail 属于诊断命令扩大事故的反例(见第 39 题)。'),
    ],
    ['NMT 记 JVM 的账,RSS 记系统的账', '保留不等于提交,提交不等于驻留', '差值要有去处,闭环才算排查完'], [javaman, jcmdman],
  ),
  'jvm-advanced/17': deep(
    '直接内存增长但缓冲池指标稳定时还应看什么？',
    '网银文件网关沙盘:NIO 缓冲池监控平稳,容器内存却持续上涨直至 OOMKilled。说明直接内存的三本账(BufferPool、NMT、OS)为何会背离,以及完整的核对清单。',
    [
      'BufferPool MXBean 只统计 NIO allocateDirect 的登记量,Unsafe/JNI 直配的 native 内存不在里面——指标稳定不代表直接内存没涨。',
      '17 的 NMT 也不把 direct buffer 记入 Internal 类目(实测 Internal 仅 222KB,同时有 120MB 直接内存存在),NMT 与 BufferPool 会同时"失明"。',
      '上限护栏是 -XX:MaxDirectMemorySize(默认≈最大堆):超限抛 Cannot reserve ... direct buffer memory,这条 OOM 是硬证据。',
    ],
    [
      block('机制:直接内存的登记与实际分配', 'ByteBuffer.allocateDirect 走 Bits.reserveMemory,先检查 MaxDirectMemorySize 余量,再 Unsafe.allocateMemory 真分配;登记计数与实际内存同步增减,但"谁在分配"只有栈,没有内置的类型账。JNI 库直接 malloc 的内存连登记都没有。因此监控要三层:BufferPool MXBean(登记账)、NMT(JVM 自账,不含 direct buffer 明细)、OS 级映射/私有字节(总账)。三层对比,缺哪层就是盲区。'),
      block('反例:三本账同时说谎的现场', '实测同进程(120MB 直接内存):BufferPool 显示 120MB(登记正确)、NMT Internal 仅 222KB(不含明细)、NMT Total committed 334MB 里找不到这 120MB、RSS 155MB(部分页未驻留或被裁剪)。若只看 NMT 会得出"JVM 没用多少 native"的结论,若只看 RSS 会归因到堆,若只看 BufferPool 会漏掉 Unsafe 直配。三本账必须同时读,互相校验后差值按映射区间归类。'),
      block('取舍:护栏与监控的落点', '显式设置 -XX:MaxDirectMemorySize(与业务峰值匹配,如 512m),让超限变成可预期的 OOM 而不是容器 OOMKilled;应用侧用池化复用(如 Netty 的 PooledByteBufAllocator)并登记释放;监控加 BufferPool 与容器 RSS 的双水位告警。kafka/Netty 类中间件自身有堆外池,容量治理见第 30 题,排查时先把已知池的账对掉再找无名增长。'),
    ],
    [
      block('实证:超限 OOM 与三本账对照', '超限复现(Java 17.0.17):默认 MaxDirectMemorySize≈128m 时循环分配 4MB 直接缓冲,32 块后抛出:\n```\njava.lang.OutOfMemoryError: Cannot reserve 4194304 bytes of direct buffer memory\n  (allocated: 130031616, limit: 134217728)\n```\n正常分配(30 块)后同进程读数:BufferPool 登记 120MB、NMT Internal 222KB、RSS 155MB、Private 340MB。验证:limit 与堆强绑定的行为可通过 -XX:MaxDirectMemorySize 显式修改后复测,超限点随之移动。'),
      block('追问链:直接内存三刀', '一刀:"为什么要绕开堆放堆外?"——IO 零拷贝路径要避免堆内对象地址漂移(疏散搬移)与额外一次拷贝,网络/文件密集场景收益大;代价是生命周期要自己管。二刀:"泄漏了怎么定位?"——对照三层账确定是 direct buffer 还是 JNI;direct buffer 可用堆转储找 DirectByteBuffer 实例(登记账在堆上,哪怕数据在堆外),JNI 泄漏用 native 剖析或替换分配器。三刀:"Netty 的堆外池为什么也要治理?"——池化只是复用,总量仍受 PooledByteBufAllocator 配置约束;池内缓存与跨请求引用不释放,增长照旧,池化不等于有上限。'),
    ],
    ['登记账不等于真实账', 'NMT 看不见 direct,别只信一面', '护栏显式设,超限变 OOM'], [api('java/nio/ByteBuffer'), javaman, jcmdman],
  ),
  'jvm-advanced/18': deep(
    '线程栈预算怎样影响高并发服务？',
    '网银推送服务沙盘:计划把每连接一线程的架构扩到十万连接,担心 -Xss 与线程数上限。用实测数据(2 万线程秒建)厘清栈内存的真实成本模型,并给出容量预算方法。',
    [
      'Xss 是保留上限不是提交量:实测 20000 线程在 -Xss8m 下约 2 秒建完无 OOM——未使用的栈页不占物理内存,按 Xss 乘线程数算内存是错的。',
      '真实成本是"提交页":每线程实际用到的栈深(通常几十 KB)决定物理内存,异常深递归才会逼近 Xss 上限。',
      '高并发的真实瓶颈在 OS 线程调度与上限参数:线程创建数受 OS 与 JVM 双重限制,预算要算调度开销与上限配置,不是栈内存。',
    ],
    [
      block('机制:保留、提交与栈深', '线程创建时按 -Xss 保留虚拟地址空间(Windows/Linux 都是 reserve),首个栈页提交,随调用深入逐页提交(guard page 触发)。所以 20000×8MB=160GB 只是保留量;实测本机 20000 线程 2 秒创建完成且无 OOM(两种 Xss 对照同结果)。NMT 佐证:Thread 类目 reserved 19501KB、committed 757KB(空闲 JVM 含少量线程),保留与提交差 25 倍。栈深才决定提交:普通业务栈深几百到几千帧,提交几十到几百 KB。'),
      block('反例:"Xss 调小省内存"在错误前提下的操作', '若以为 10000 线程×8MB=80GB 必炸而把 Xss 调到 256k,省下的是"从未被用到的保留空间",真实收益为零;反而深递归或深框架栈(序列化、表达式引擎)会撞 StackOverflowError 的概率上升。实测对照:20000 线程 -Xss256k 与 -Xss8m 都约 1.9 秒建完,创建速度与 OOM 行为无差异。正确动作是压测观察 RSS 与调度延迟,而不是拍参数。'),
      block('取舍:容量预算的正确算式', '预算三行:提交栈内存≈线程数×平均栈深(压测测得,如 64KB);调度开销≈活跃线程数对 CPU 的影响(数万 OS 线程的上下文切换开始显著);上限配置=OS 限制(ulimit/内核参数)+ JVM 线程创建失败阈值。架构层面,十万连接应走向虚拟线程(JDK 21+)或事件驱动(Netty),每连接一线程是过渡形态;JDK 17 无虚拟线程(JEP 425 是 19),版本边界要先讲清。'),
    ],
    [
      block('实证:2 万线程的创建对照', '命令(Java 17.0.17):\n```\njava -Xss8m StackExp2 20000   -> created=20000 用时ms=2013 (未触发OOM)\njava -Xss256k StackExp2 20000 -> created=20000 用时ms=1918 (未触发OOM)\n```\n线程存活 20 秒后程序退出。验证:两组无 OOM 且耗时同量级,证明创建成本与 Xss 无关;把 cap 提到 10 万级才会触及 OS 或 JVM 限制(未测,标注)。'),
      block('追问链:线程预算三刀', '一刀:"那什么时候会 unable to create native thread?"——OS 内存提交不足(容器 commit limit)、内核线程上限、JVM 保留地址空间耗尽;报错时先看 OS 日志与 cgroup,不是先调 Xss。二刀:"栈深多少算深?"——监控里可看线程栈快照(jstack)帧数,递归解析、深 AOP 链会到千帧;压测时统计 P99 栈深乘线程数才准。三刀:"虚拟线程改变了什么预算?"——栈搬到堆上按需增长,百万并发成为可能,但 synchronized 大块与 native 调用造成的固定(pinning)在早期版本限制吞吐(见第 43 题),预算模型要按版本重写。'),
    ],
    ['保留不占内存,提交看栈深', 'Xss 别乱调,压测定预算', '瓶颈在调度与上限,不在栈字节'], [javaman, api('java/lang/Thread')],
  ),
  'jvm-advanced/19': deep(
    '容器 OOMKilled 而没有 Java OOM 日志如何分析？',
    '网银网关沙盘:Pod 反复被 OOMKilled,应用日志一片干净。解释 JVM 内存与 cgroup 记账的口径差异、容器内排查步骤,以及 -XX:MaxRAMPercentage 类参数的正确用法。',
    [
      'OOMKilled 是内核杀的:进程总内存(含堆外、元空间、线程栈、直接内存、page cache 计费部分)越过容器 limit,kill 发生在内核,Java 不会打 OOM 日志。',
      'Java OOM 是 JVM 自觉的:只有当某条 JVM 内部分配路径(堆/元空间/直接内存)触到 JVM 自身上限时才抛 OutOfMemoryError。',
      '分析顺序:先取 cgroup 事件与 memory.stat 分解(anon/file),再用 NMT 对 JVM 侧分类归账,差值查直接内存与 JNI。',
    ],
    [
      block('机制:两套上限的交叉区域', '容器 limit(如 2Gi)管进程全部;cgroup 计费含 anon(私有页)与 file(page cache,可回收部分按策略)。JVM 侧上限:堆 -Xmx、元空间、CodeCache、直接内存(MaxDirectMemorySize)、线程栈提交。当堆内还有余量但"堆外合计"越过容器 limit,内核先动手——这就是无 Java OOM 的 OOMKilled。UseContainerSupport(默认开)让 MaxRAMPercentage 按容器 limit 折算堆,但堆只是总账一部分,堆设到 limit 的 75% 仍可能被堆外挤死。'),
      block('反例:把堆设满 limit 的配置事故', '配置 -Xmx 等于容器 limit 的 95%:平时 page cache 与元空间吃满剩余 5% 就被杀。正确姿势:MaxRAMPercentage 60-75% 起步,预留元空间加 CodeCache 加线程栈加直接内存的合计;再按 NMT 实测校准。实测锚点:空闲 JVM 的 GC 类目就提交 64.9MB(128MB 堆),生产大堆的 GC 侧开销按比例更大——预留清单里漏 GC 开销是常见事故源。'),
      block('取舍:监控与参数的配平', '容器层监控 memory working set 与 limit 比例,设 80% 告警;JVM 层开 NMT summary 建立分类基线;直接内存与线程数另设上限。参数配平:MaxRAMPercentage 之外,显式 MaxDirectMemorySize、MaxMetaspaceSize、线程池上限,把每类可变内存变成有界,总量可加总校验——这是"让 OOMKilled 变成可预期的 Java OOM"的思路:宁可 JVM 先报错,不要内核静默杀。'),
    ],
    [
      block('推演:cgroup 侧的取证步骤(Windows 本机无法复现容器行为)', '步骤推演:kubectl describe pod 看 Last State: OOMKilled 与 exit code 137;节点上取 /sys/fs/cgroup/memory.events 的 oom 计数与 memory.stat(anon/file/sock)分解;JVM 侧开 NMT 拿分类账(本机实测:Total committed 334MB、Heap 128MB、GC 64.9MB、Thread 757KB committed 等),与容器 limit 相减,差值按直接内存与 page cache 归类。验证方式:同配置容器压测复现 killed 时刻的 memory.stat 快照。以上 cgroup 环节为推演(本机无 Linux 容器环境),NMT 数字为本机实测。'),
      block('追问链:OOMKilled 三刀', '一刀:"为什么 Java 不可能知道被杀?"——SIGKILL 不可捕获,内核直接回收进程;应用能做的是把内存账有界化,让触发点前移到 JVM 自觉报错。二刀:"MaxRAMPercentage 设多少?"——按 NMT 实测的堆外合计反推:堆=limit−(元空间+CodeCache+GC开销+栈+直接内存+余量),常见落点 60-75%,高峰大缓存场景更低。三刀:"page cache 会不会害人?"——会,文件密集应用读文件填 cache,cgroup 计费后在内存压力下才回收,瞬时计费可越过 alert 线;查 memory.stat 的 file 分量即知,这属于内核回收策略,不是 JVM 泄漏。'),
    ],
    ['内核杀进程,Java 不知情', '堆只是总账的一部分', '先看 memory.stat,再对 NMT 账'], [javaman, jcmdman],
  ),
  'jvm-advanced/20': deep(
    'CPU throttling 为什么会让 GC 和请求同时变慢？',
    '网银核心沙盘:容器 CPU limit 设 4 核,高峰期 GC 暂停时间比裸机翻倍,接口 P99 同步劣化。解释 CFS 限流如何同时打击应用线程与 GC 线程,以及容量评估中的误区。',
    [
      '限流是按窗口扣预算:CFS quota 用尽时容器内所有线程(业务线程与 GC 线程)一起被暂停到下个窗口,GC 线程变慢,暂停被拉长。',
      '并发 GC 把"GC 线程"变成"业务的一部分":标记/搬迁抢不到 CPU,周期拉长,更晚进入 young 回收,暂停与分配曲线互相恶化。',
      '容量评估要按"限流后的有效核数"算:cpu.max 的 quota/period 与实际使用率的监控口径不同,超卖比和突发窗口都要校准。',
    ],
    [
      block('机制:CFS 窗口如何同时惩罚两类线程', '内核按 period(如 100ms)给容器 quota(如 400ms/4 核)。多线程应用在窗口内把 quota 提前用完,剩余窗口全容器暂停(throttled)。GC 并发线程与应用共享同一个 quota 池:窗口耗尽时,G1 的并发标记线程同样被挂起,Concurrent Mark Cycle 被拉长;若处于 STW 段,暂停时间随窗口边界延长。Linux-only 行为,Windows 本机无法复现,以下为机制推演加生产取证口径。'),
      block('反例:"CPU 使用率不高"掩盖的限流', '监控显示容器 CPU 60% 未告警,但 throttled 时间比例达 30%——使用率是窗口平均,限流发生在窗口尾部的瞬时耗尽。多线程突发(如 GC 并发周期启动、缓存批量加载)把 quota 秒杀,平均数看不出来。取证要取 cgroup 的 cpu.stat 里 nr_throttled/throttled_time,与 GC 暂停时间戳对齐;只看平均 CPU 的告警体系在限流场景下是盲的。'),
      block('取舍:limit、突发与 GC 线程的配平', '三个方向:limit 提升或改用静态绑核消除突发耗尽;CPU limit 预留 GC 并发份额(ConcGCThreads 数量按有效核数折算);应用侧削峰(批处理错峰、连接数限流)。不要用"压低 GC 线程优先级"解决——CFS 没有容器内优先级契约,权重调参效果不稳定。容量压测必须带 limit 运行,裸机压测结论不可迁移。'),
    ],
    [
      block('推演:取证口径与关联分析(机制推演,附本机对照锚点)', '取证步骤:cpu.stat 取 throttled 比例,GC 日志取暂停与并发周期时长,对齐时间窗口;若暂停尖刺与 throttle 窗口重合即定案。本机对照锚点(无限流环境):并发标记周期实测 195.485ms、暂停最大 32.202ms——这些数字在限流容器里会系统性变长;给同一负载加 limit 前后对照即可量化(待在 Linux 容器环境补测,标注)。验证判据:throttled 归零后暂停分布应回到裸机量级。'),
      block('追问链:限流三刀', '一刀:"为什么暂停也会变长?STW 不是不走调度吗?"——STW 的进入需要所有线程到达安全点,被限流的线程到不了,同步等待被拉长;STW 期间的压缩工作本身也要 CPU。二刀:"那 GC 线程该给几个?"——按限流后有效核数配 ConcGCThreads,别按物理核;容器里 Runtime.availableProcessors 已感知 cgroup(UseContainerSupport 默认开),但配额抖动时仍要人工校准。三刀:"和 NUMA/大页什么关系?"——限流放大了内存访问延迟的权重,NUMA 本地性差的容器在限流时更疼(见第 44 题),容量规划要把两者一起看。'),
    ],
    ['窗口扣预算,全体一起停', 'GC 线程也吃 quota,周期先变长', '看 throttled 不看均值,压测要带 limit'], [javaman, gctun],
  ),


  'jvm-advanced/21': deep(
    '安全点日志显示进入耗时长时如何排查？',
    '网银行情推送沙盘:GC 日志里 Pause 前有等待,怀疑时间到安全点(Time To Safepoint)作祟。用本机三组对照实验说明 17 的防护现状、旧结论的版本边界与真实排查步骤。',
    [
      '先量化再看因:开 -Xlog:safepoint+stats 看每行 sync 列,本机 17.0.17 上 6 次 Full GC 的 sync 全部不超过 67 微秒。',
      '旧结论要按版本讲:长计数循环卡安全点是老教材经典,实测 17.0.17 即使显式关掉 UseCountedLoopSafepoints 与 LoopStripMiningIter,sync 仍是微秒级,防护比旧结论强。',
      '耗时长的嫌疑名单:JNI 调用中线程、大数组的类初始化(初始化锁)、阻塞 IO 返回前的线程——用线程栈快照与 JFR 逐项排除(JDK 17 默认无偏向锁,JEP 374 在 15 弃用并默认禁用（命令行仍可开启）,默认配置下不在嫌疑之列)。',
    ],
    [
      block('机制:安全点的进入协议与 sync 时间的含义', 'VM 操作(如 GC)发起时,请求方把全局轮询页置脏,各线程在轮询点(poll)自陷;sync 列统计从发起到全部线程停下的时间。谁在无 poll 的长代码里跑,谁就拖延全员。JDK 10 起 x86 上默认 UseCountedLoopSafepoints 加 LoopStripMiningIter=1000,给长计数循环加条带化 poll——这正是实测微秒级 sync 的原因。源码 safepoint.cpp 管理 VM 操作队列与超时(-XX:SafetyPointTimeoutMillis 相关告警)。'),
      block('反例:被推翻的"大循环卡 GC"教学', '本机实验(2e9/1e10 次计数循环,期间 6 次 System.gc):\n```\n默认参数:              Maximum sync time 67400 ns\n-XX:LoopStripMiningIter=0: 38600 ns\n-XX:-UseCountedLoopSafepoints -XX:LoopStripMiningIter=0: 58700 ns\n```\n三组全部微秒级,循环 100 亿次也拖不住 GC。若按旧结论去"修复长循环",方向就错了;17 上排查 sync 长要转向 JNI、锁撤销、阻塞恢复这些名单,而不是先怀疑循环。这也演示了口径:任何"经典结论"都要在当前 JDK 上复验。'),
      block('取舍:排查的日志与工具组合', '第一步 -Xlog:safepoint+stats=info 常态化(开销低);sync 长时看该行 initial_running 与 threads 列,定位"谁没停";jstack 连拍看可疑线程栈(JDK 17 默认无偏向锁,JEP 374 在 15 弃用并默认禁用——默认配置下不存在撤销嫌疑项)。生产上把"Maximum sync time"纳入 GC 健康面板,阈值设毫秒级,超限再深查——常态微秒、异常毫秒,分界清晰。'),
    ],
    [
      block('实证:三组对照的完整数字', '命令与输出(Java 17.0.17,SafepointExp:后台线程跑巨型计数循环,主线程连续 6 次 System.gc):\n```\njava -Xlog:safepoint+stats=info SafepointExp\n  [0.364s] Maximum sync time 67400 ns\njava -XX:LoopStripMiningIter=0 ...\n  [1.137s] Maximum sync time 38600 ns\njava -XX:-UseCountedLoopSafepoints -XX:LoopStripMiningIter=0 ...\n  [2.311s] Maximum sync time 58700 ns\n```\n每行 G1CollectFull 的 sync 列 6.5-58.7 微秒。验证:三组差异在防护开关,结果同量级,证明 17 的防护不依赖单点开关;旧结论的适用版本上限由此划清。'),
      block('追问链:安全点三刀', '一刀:"sync 长会怎么表现?"——GC 暂停行(Pause)本身不变,但 Pause 与触发之间多出等待,业务上表现为"GC 不忙但抖";对齐 safepoint 日志与业务尖刺即定案。二刀:"JNI 线程为什么拖?"——JNI 里的线程不走 Java 轮询点,进入时登记"在 native",返回时才走 poll;长 JNI(压缩、加密库)是 sync 长的第一嫌疑,监控上给 native 调用加耗时埋点。三刀:"虚拟线程时代安全点还有吗?"——机制仍在,虚拟线程的挂起走不同路径(continuation freeze),但 VM 操作协议依旧;按版本重学,不要拿 8 的经验套 21。'),
    ],
    ['先看 sync 列,再上嫌疑名单', '旧结论按版本复验,别背循环锅', '常态微秒,超限即立案'], [jdksrc('runtime/safepoint.cpp'), javaman],
  ),
  'jvm-advanced/22': deep(
    'JFR 在性能排障中比单次线程栈多提供什么？',
    '网银订单服务沙盘:卡顿时值班只会 jstack 抓一帧。解释 JFR 的时间线能力(事件流、分配采样、GC 记录、窗口回放)与 jstack 的互补关系,附本机 profile 档实测数据。',
    [
      'jstack 是一帧照片,JFR 是行车记录仪:连续低开销记录事件流,事后任意回放,能在没人盯着的时候抓到现场。',
      'JFR 独有的四类证据:分配采样(ObjectAllocationSample)、GC 与安全点时间线、锁与 IO 等待、线程池活跃度随时间的曲线。',
      '开销可控可常开:默认 default 档开销约 1%,profile 档约 2%,本机 8 秒 profile 档实测 120 条分配采样;生产建议常开 default,排障临时升档。',
    ],
    [
      block('机制:JFR 的事件模型与采集面', 'JFR 以事件为中心:JVM 内建事件(GC、分配、锁、IO、安全点)带时间戳与线程上下文,环形缓冲常驻,崩溃时还能随 hs_err 吐出最近记录。与 jstack 的关系:jstack 给全量线程栈的一帧(适合死锁),JFR 的 ExecutionSample 按固定间隔采样(适合热点),两者不能互替。启动两种:命令行 -XX:StartFlightRecording 与运行期 jcmd JFR.start(后者需 attach,进程存活期间),导出后用 jfr print/summary 解析,不需要 GUI 也能出结论。'),
      block('边界:JFR 不是万能记录仪', '采样有偏(见第 24 题):Windows 上本机实测 ExecutionSample 为 0 而 ObjectAllocationSample 正常记录 120 条——采样器能力随平台与版本变化,不能假设"JFR 开了就什么都有"。事件有保留窗口(环形缓冲),排障前没开就永远丢了;还有 attach 时机问题:本机实验中负载 1.5 秒跑完,事后 jcmd JFR.start 只录到空转,执行采样为 0——录制的起止窗口必须覆盖事件发生期。'),
      block('取舍:jstack 与 JFR 的分工场景', '死锁与挂死:先 jstack 全量栈(瞬间冻结视图)。慢与抖:JFR 时间线(分配曲线、GC、锁等待对齐)。内存涨:JFR 分配采样定位速率源,堆转储定静态底座,两者接力。生产策略:default 档常开加告警触发时临时 profile 档短录(如 60 秒),文件落独立盘;把"是否已开 JFR"写进值班手册第一行。'),
    ],
    [
      block('实证:profile 档 8 秒的采集清单', '命令与摘要(Java 17.0.17,-XX:StartFlightRecording=duration=8s,filename=probe2.jfr,settings=profile):\n```\njfr summary probe2.jfr\n  jdk.ObjectAllocationSample  120\n  jdk.ClassLoaderStatistics    42\n  jdk.ThreadAllocationStatistics 39\n  jdk.ExecutionSample           0   <- Windows 本机采样器未产出\n```\n验证:同命令重跑分配采样数量同量级;ExecutionSample 为 0 是平台现象(见第 24 题),不代表 JFR 失效——分配、类加载、线程统计的时间线证据已足够支撑"哪段代码在大量分配"的判断。'),
      block('追问链:JFR 三刀', '一刀:"和 APM(链路追踪)重复吗?"——APM 看请求维度,JFR 看进程资源维度;分配热点、GC 细节、锁竞争是 APM 采集不到的,两者互补成完整证据链。二刀:"什么时候必须 jstack?"——怀疑死锁、线程池打满且要逐线程看状态、需要确认线程卡在哪个 native 调用;这些是"此刻全量"问题。三刀:"录制怎么不丢事故?"——-XX:+HeapDumpOnOutOfMemoryError 配 JFR 常开,dump 与时间线一起出;再配 jdk.OldObjectSample 类的泄漏对象事件(profile 档),长生命周期大对象可以直接点名。'),
    ],
    ['jstack 一帧,JFR 一路', '分配锁 IO,时间线对齐', 'default 常开,profile 短录'], [jfrman, jcmdman],
  ),
  'jvm-advanced/23': deep(
    '如何用采样剖析区分 CPU 与等待瓶颈？',
    '网银对账引擎沙盘:CPU 打到 90% 但吞吐上不去,是算力不足还是在等锁等 IO?给出用执行采样、线程状态与等待事件三类证据做瓶颈归因的方法,并交代采样证据的适用边界。',
    [
      '先分桶再深挖:on-CPU 热点(执行采样栈)与 off-CPU 等待(锁/IO/park 事件)是两本账,把时间花在哪里先分清。',
      '执行采样看自占用:栈顶帧频次代表"谁在烧 CPU";等待事件看阻塞对象与持有者,两者互斥覆盖线程时间。',
      '采样有偏,结论要交叉:采样间隔 miss 短任务、平台能力差异(本机 Windows 执行采样为 0)都要交叉验证,不能单源定案。',
    ],
    [
      block('机制:on-CPU 与 off-CPU 的证据形态', 'CPU 瓶颈:ExecutionSample 的栈顶集中在少数业务帧(如解析、正则、序列化),CPU 监控与采样栈对齐。等待瓶颈:栈顶稀薄而 jdk.JavaMonitorEnter、jdk.ThreadPark、SocketRead 事件频发,时间花在等。归因流程:按线程状态聚合采样(横轴时间、纵轴线程),CPU 段配栈、等待段配事件,再按热点排序。本机实验里 Windows 执行采样不可用,等待类事件(ThreadPark/JavaMonitorWait)依旧可用——分桶思路不依赖单一事件源。'),
      block('反例:被"高 CPU"误导的等待瓶颈', '对账引擎 CPU 90%,直觉结论"算力不足",加机器无效。真因:大批量记录在同一把锁下串行,等待线程自旋在 CAS 上烧 CPU——CPU 高是等待的副产物。判别要点:执行采样栈顶若是 CAS/自旋帧而非业务算法帧,配 JavaMonitorEnter 事件的持有者,就是锁热点伪装成 CPU 热点。修正:拆锁/降并发粒度,CPU 与吞吐同时改善,加机器只会养肥问题。'),
      block('取舍:剖析工具的三层配置', '常开层:JFR default 档(低成本时间线)。诊断层:JFR profile 档短录(执行采样加等待事件)。深潜层:perf/async-profiler 类工具拿火焰图(Linux 生态,Windows 受限)。结论规则:任何单层证据不下"瓶颈"结论,至少两层交叉(采样栈+事件/监控指标+业务吞吐)。本机实践证明平台差异真实存在,工具链要提前在目标 OS 验证过。'),
    ],
    [
      block('实证:一次可用的分桶数据', '本机(Java 17.0.17,probe2.jfr,profile 档 8 秒,负载 MixedExp2):\n```\njdk.ObjectAllocationSample 120  (分配侧证据可用)\njdk.ExecutionSample 0            (CPU 侧采样缺失)\njdk.JavaMonitorWait 1 / ThreadPark 0\n```\n验证与结论:分配密集负载被 ObjectAllocationSample 完整记录,等待事件近零——可判"非锁等待,瓶颈在分配与回收侧";CPU 侧证据缺失标明该环境下需补 perf 类工具。分桶方法在这种残缺证据下依然给出了方向。'),
      block('追问链:瓶颈归因三刀', '一刀:"采样间隔设多细?"——profile 档默认 10ms 执行采样、分配按大小采样;过细的开销上升且偏差结构不变,通常不动默认值。二刀:"怎么确认不是采样盲区?"——换证据源:jstack 连拍(每秒 5 张)人工聚合,与 JFR 分布对比;两者一致才收案。三刀:"GC 线程的 CPU 算谁的?"——容器里 GC 并发线程与应用共享 quota,采样栈会看到 GC 帧;归因时把 GC 期间的应用变慢单独拆开(对齐 GC 时间戳),避免把回收成本算到业务头上。'),
    ],
    ['先分桶,后深挖,互斥才完整', '栈顶找烧 CPU 的,事件找等的', '单源不下结论,交叉才定案'], [jfrman, jcmdman],
  ),
  'jvm-advanced/24': deep(
    '为什么生产剖析要关注采样偏差？',
    '网银全链路压测沙盘:同一服务在笔记本与生产容器里跑 JFR,热点排名完全不同,有人据此"修复"了不存在的问题。用本机跨平台实测说明采样偏差的来源与校正方法。',
    [
      '偏差三源:采样间隔 miss 短任务、栈不完整(安全点偏置只采到到过安全点的栈)、平台与版本能力差异(本机 Windows ExecutionSample 为 0)。',
      '样本不代表分布:分配采样按大小加权,大对象天然多采;执行采样偏向长任务——直接按样本数排名会放大长尾、漏掉高频短路径。',
      '校正靠交叉与归一:多源对比(jstack 连拍、APM、计数器)、按归一化口径(每次请求)换算、在目标环境重新采样后再下结论。',
    ],
    [
      block('机制:三个偏差源怎么扭曲热点图', '源一,间隔盲区:10ms 间隔对 2ms 的热函数系统性漏采。源二,安全点偏置:JVM 采样常依赖安全点/轮询机制,只在安全点的栈可采,长期不在安全点的路径被低估(不同实现差异大)。源三,平台差异——本机实测最有说服力:\n```\nprobe2.jfr(profile 档,Windows,JDK 17.0.17)\n  jdk.ExecutionSample        0\n  jdk.ObjectAllocationSample 120\n```\n同一 JVM,执行采样颗粒无收,分配采样正常产出;在 Linux 生产上两者通常都可用。跨平台看同一张"热点图"本身就是错误。'),
      block('反例:按样本数排名的两连错', '错误一:笔记本上 ExecutionSample 有数据,生产容器上没了采样器(安全配置或平台差异),团队拿笔记本数据指挥生产优化——环境不同,样本总体不同。错误二:分配采样里 byte[] 最多,团队去优化"byte[] 分配",实际是序列化路径的大缓冲按大小被优先采样,小而多的 Map.Entry 才是次数冠军。两个错误同根:把采样样本当成了总体统计。'),
      block('取舍:可信结论的最低校验集', '三条:其一,环境对齐——在目标 OS/JDK/负载形态上采样,笔记本数据只做假设生成;其二,口径归一——分配按"每请求字节",执行按"占比区间"而非精确排名;其三,多源交叉——采样结论与吞吐、GC 日志、APM 耗时分布互相印证,矛盾时不硬拗。剖析是生成假设的工具,验证要靠受控实验(参数或代码改动的 A/B)。'),
    ],
    [
      block('实证:同 JVM 内两类采样器的产出差', '本机实验(Java 17.0.17):同一 8 秒 profile 档录制里 ObjectAllocationSample=120、ExecutionSample=0(见上);换负载与时长仍稳定复现该差异。对照锚点:同机的 GC 日志与堆直方图(jcmd GC.class_histogram,200 个代理类实验)给出独立的类型分布证据。验证:在 Linux 生产同参数复录,若 ExecutionSample 正常产出,则证明平台差异(此环节待生产环境补测,标注)。'),
      block('追问链:采样偏差三刀', '一刀:"async-profiler 不是号称安全点无偏吗?"——它走异步栈采样(ASG 不可用时退回),也有自己的盲区(native 内、被裁剪栈);任何采样器都先看它的机制再信它的图。二刀:"怎么发现采样器没工作?"——录制摘要里事件计数为 0 或异常少即是红旗(如本机 ExecutionSample=0),值班手册要写"先查事件计数再看热点"。三刀:" AI 辅助剖析会不会引入新偏差?"——会,模型对采样数据的解读继承了采样偏差;输入给模型前先把偏差源与交叉证据写清,别让结论生成在单源样本上。'),
    ],
    ['样本不是总体,环境要aligned', '间隔有盲区,平台有能力差', '归一加交叉,才敢下结论'], [jfrman, jcmdman],
  ),
  'jvm-advanced/25': deep(
    'JIT 内联失败通常如何影响热点路径？',
    '网银风控规则引擎沙盘:规则方法经多轮迭代膨胀到 240 字节,压测吞吐低于重构前。用本机 PrintInlining 实测解释内联预算、失败形态与后续优化链,并给出守卫方法。',
    [
      '内联是优化的入口:不内联就没有跨方法逃逸分析与消除,热点路径退化为"每步都是真调用"。',
      '失败形态有两条预算线:冷方法 MaxInlineSize(默认 35 字节码)与热方法 FreqInlineSize(默认 325);实测 4 字节方法恒内联,240 字节方法冷时 callee is too large、热后 inline (hot)。',
      '守卫靠观测与拆分:PrintInlining 看失败原因,超限大方法按分支拆小,反射与动态调用的调用点要在热路径上固化。',
    ],
    [
      block('机制:预算线与内联决策', 'C2 内联决策按调用点字节码大小与热度:超过 MaxInlineSize(35)的方法仅当调用点变热(计数超阈值)才按 FreqInlineSize(325)评估;递归深度、已是"大方法"的调用者等再打折。实测(Java 17.0.17,PrintInlining):\n```\nInlineExp::small (4 bytes)    inline (hot)      <- 恒内联\nInlineExp::big (240 bytes)    callee is too large ×3   <- 冷,超 35 预算\nInlineExp::big (240 bytes)    inline (hot)      <- 热点后,325 内放行\n```\n同一方法两种命运,差异只在调用点热度——这就是"经常调用的大方法可以内联,偶尔调用不行"的直接证据。'),
      block('反例:三层包装把热路径拆成真调用', '规则引擎常见写法:RuleEvaluator.evaluate 调 Rule.check 调 Validator.validate,各层百来字节,层层数据包装。每层冷调用点超 35 预算,热后 325 预算也常被中间层叠加撑爆(PrintInlining 连续 too large)。后果:逃逸分析穿不透,包装对象无法栈上分配,G1 分配速率虚高;性能形态是"CPU 不高但吞吐低"——调用与分配开销占满。'),
      block('取舍:拆方法与守预算的边界', '拆分原则:热路径主链方法控制在一屏内、分支下沉为独立小方法(小方法恒内联,无成本);少见的分支保持独立,不进主链字节量。参数面:特殊场景可调 FreqInlineSize(如 500),但会拉长 C2 编译时间并挤占编译资源,优先重构而不是调参。观测面:压测脚本固定 PrintInlining 输出 diff,内联失败清单作为重构 todo 的一部分进评审。'),
    ],
    [
      block('实证:双预算线的直接观测', '命令与输出(Java 17.0.17):\n```\njava -XX:+UnlockDiagnosticVMOptions -XX:+PrintInlining InlineExp\n  @ 17  InlineExp::small (4 bytes)    inline (hot)\n  @ 42  InlineExp::big (240 bytes)    callee is too large   (3 处冷调用点)\n  @ 42  InlineExp::big (240 bytes)    inline (hot)          (1 处热点调用点)\n```\n验证:把 big 删减到 30 字节重跑,全部调用点内联;把 small 扩到 50 字节,冷调用点拒绝——预算线行为与机制描述一致,可复现。'),
      block('追问链:内联三刀', '一刀:"内联失败一定慢吗?"——不一定;未内联的调用有约几纳秒的调用开销,真正贵的是堵死了后续优化(逃逸分析、锁消除、向量化),要看整链而非单点。二刀:"怎么知道内联没发生却该发生?"——PrintInlining 的 too large/dont inline 原因注释,配合 JIT 编译日志(PrintCompilation)确认热点已编译;有热度又有失败原因就是重构信号。三刀:"去优化和内联什么关系?"——内联基于类型假设做激进优化,假设破坏触发去优化回退解释器(见第 27 题),内联越深,去优化代价越大,守预算也是在控风险敞口。'),
    ],
    ['不内联,免谈优化', '冷三十五,热三百二十五', '热链一屏内,分支拆小法'], [jdksrc('opto/compile.cpp'), javaman],
  ),
  'jvm-advanced/26': deep(
    '多态调用何时可能影响 JIT 优化？',
    '网银支付路由沙盘:策略模式抽出 PayStrategy 接口,线上几十个实现,压测吞吐反而下降。解释单态/双态/超多态调用点的分化,内联缓存的行为,以及接口多实现的性能画像。',
    [
      '调用点按观察到的实现数分级:单态可直连内联,双态可二选一,超过两个走向虚调用表,内联机会骤减。',
      '接口多实现不必然慢:调用点只见过两三个实现时 JIT 仍能内联;一旦超多态,每次调用走itable 查找,热点路径变贵。',
      '治理靠固化与降维:热路径收敛实现数、给调用点加类型守卫(如按枚举 switch 分发),别为"优雅"在热路径上铺无限扩展点。',
    ],
    [
      block('机制:内联缓存与类型画像', 'C2 为每个调用点维护类型画像(依赖 MDO 的 receiver 计数):单态直接绑定实现并内联;双态生成两分支;超多态退化为虚分派(接口调用走 itable 查找)。画像随运行演化,新实现上线(灰度放量)会把单态调用点"推"成超多态,触发去优化重新编译——这也是新策略上线后吞吐先降后稳的机制根源。本机 PrintInlining 观测里可看到 inline 失败原因含 not inlineable 类目(多态调用点),与第 25 题的尺寸预算是两套独立门槛。'),
      block('反例:扩展点越开放,热路径越钝', '支付路由接口挂 40 个策略实现,核心调用点必然超多态;叠加装饰链(限流、审计、加密各一层接口),调用点画像复杂化,内联全线退出。性能画像:CPU 不高、吞吐不高、延迟方差大(每次虚分派与缺内联的分配叠加)。修正不是删扩展性,而是把"每次请求都要走"的分发收敛:按渠道枚举 switch 到具体实现(调用点单态化),低频扩展走装饰链,热冷路径分开。'),
      block('取舍:抽象的层级放哪里', '原则:热路径上的抽象要可预测(实现数有限、类型稳定),冷路径保持开闭原则。手段:关键分发点用数据驱动表(enum -> handler 的 HashMap)替代虚调用链;框架的模板方法在热路径保持单态;接口默认实现里别藏虚调用。回归验证:压测对比调用点单态化前后的吞吐与分配速率,配合 PrintInlining 确认内联恢复。'),
    ],
    [
      block('推演:多态画像的观测路径(附本机相邻证据)', '观测路径推演:-XX:+PrintInlining 看调用点 inline 与否及原因;-XX:+PrintCompilation 看同一方法是否反复去优化(画像演化信号);JFR 看去优化事件频度。本机相邻证据:第 25 题实测同一调用点冷热两种内联结果,证明画像驱动决策;多实现场景的差异只在于画像分布,机制同源。验证:构造 1 实现与 40 实现两个版本同压测对比吞吐(未在本机执行,标注待补)。'),
      block('追问链:多态三刀', '一刀:"lambda 和方法引用算多态吗?"——函数式接口每个调用点同样有画像,非捕获 lambda 单例化后接近直调,捕获型每次分配;热路径上规则同接口。二刀:"Megamorphic 能被 JIT 缓解吗?"——能部分缓解:itable 查找有缓存,但内联退出是硬损失;别指望 JIT 救无限实现的设计。三刀:"怎么线上发现调用点退化?"——PrintInlining 只能离线/诊断开;生产信号是新版本上线后去优化事件与编译日志异常(JFR jdk.Deoptimization 类事件),配 APM 的吞吐拐点,即立案。'),
    ],
    ['画像定形态,单态才内联', '热路径收敛实现数', '冷路径留扩展,热冷分开治'], [jdksrc('opto/compile.cpp'), javaman],
  ),
  'jvm-advanced/27': deep(
    '去优化频繁应该检查哪些业务变化？',
    '网银营销沙盘:大促期间服务去优化事件翻倍,C2 反复重新编译,抖动随灰度放量出现。给出从去优化日志到业务变更的归因清单,以及画像漂移的应对策略。',
    [
      '去优化是 JIT 的假设被破坏:类型画像变化、分支 never-take 翻转、内联 callee 被替换都会触发回退,频繁去优化等于假设频繁失效。',
      '业务归因四查:新实现灰度改变调用点画像、数据分布漂移翻转分支预测、代码热替换/动态代理重建、参数与配置热更改变热路径形状。',
      '应对是稳画像而不是关优化:放量前预热、灰度按流量比例渐进、把不稳定分发收敛出热路径,必要时锁定关键方法的编译。',
    ],
    [
      block('机制:假设从哪来,就从哪破', 'C2 编译时固化假设:调用点实现数(画像)、分支概率、字段类型、内联的方法体。破坏源:新实现进入调用点(megamorphic 化)、原本稀有的分支变成主流(数据漂移)、被内联方法在热替换后类版本改变(依赖失效)、动态代理/Lambda 生成新类替换旧调用目标。去优化后果:回解释器执行,等待重新编译,期间性能谷底;频繁去优化让系统在谷底与峰顶间振荡。'),
      block('反例:灰度放量引发的性能谷', '支付渠道新实现按 1% 灰度,核心分发点从单态变双态,触发第一次去优化与重编译;放量到 20%,画像再次演化又去优化。表象是"灰度期抖动、全量后稳定"——不是新代码慢,是画像重排的过渡成本。判别:JFR/日志里去优化事件的时间与放量节奏对齐,全量后消失。对策:放量阶梯放平缓、错峰放量,或预热工具在灰度前压一轮全实现流量,让画像一步到位。'),
      block('取舍:哪些去优化值得干预', '低频去优化(启动后几次)是正常代谢,不干预;周期性高频去优化(每次请求批次都触发)要立案。干预优先级:收敛分发(代码)> 稳定数据分布(业务)> 预热与放量策略(运维)> 编译参数(最后)。反面教材是给关键方法关分层编译或调 CompileThreshold——影响面不可控,排查成本高于收益。'),
    ],
    [
      block('推演:去优化观测与归因流程(附本机机制证据)', '观测:jfr print --events jdk.Deoptimization 看原因分布(reason=unstable_if/type/profile 等),配 PrintCompilation 的 made not entrant 行。归因四步:时间对齐业务变更(灰度/配置热更)、按 reason 分类(画像类去查分发点、分支类去查数据分布)、重复两次变更验证复现、修复后回归。本机机制证据:第 25 题实测同一调用点冷热两种内联结果,证明画像即时演化——去优化是其逆过程。全流程中 Deoptimization 事件过滤与复现实验未在本机执行,标注待补。'),
      block('追问链:去优化三刀', '一刀:"去优化后还能再优化回来吗?"——能,回解释器/保留 C1,重新积累画像后 C2 再编译;代价是那段窗口的性能谷,频繁振荡才需要治理。二刀:"为什么启动后前几分钟总抖?"——分层编译在爬坡(C1 到 C2),画像在积累,叠加预热不足;预热要覆盖主链路与分支(见第 40 题)。三刀:"AOT 能消掉去优化吗?"——GraalVM Native Image 做封闭假设,运行期优化空间小、去优化少,但动态类生成与反射要配置;JDK 17 内置 AOT 已移除,别把老 JDK 的 jaotc 经验带进来。'),
    ],
    ['去优化是假设破产', '查画像查分布查替换', '稳画像,别关优化'], [jdksrc('runtime/deoptimization.cpp'), javaman],
  ),
  'jvm-advanced/28': deep(
    '字符串去重与业务级缓存分别节省什么？',
    '网银状态消息沙盘:百万级消息串内容高度重复,团队在"开 -XX:+UseStringDeduplication"与"业务层 intern/缓存"之间纠结。用实测说明两者作用的层次、节省口径与适用边界。',
    [
      'G1 字符串去重省的是堆里 String 的 value 数组:后台线程把相同内容的不同 String 指向同一底层数组,实测 30 万串去重 98.4%、省 11.7MB。',
      '业务级缓存(intern、常量池、显式 Map)省的是对象本身:连 String 对象都不重复创建,还能省查找与 GC 账本,但治理责任在代码。',
      '两者不互斥:去重是自动的内存压缩(只对 G1,17 不含 ZGC),业务缓存是主动的共享设计;高频全等短串选业务缓存,长尾重复选去重。',
    ],
    [
      block('机制:去重在哪个环节生效', 'G1 的去重线程在并发标记后扫描 age 达标的 String,比较 hash 后用 char[]/byte[] 级的相等判定把多个 String 的 value 指向同底层数组;String 对象本身仍是多个。实测(Java 17.0.17,30 万个内容重复的 String,6 次 System.gc):\n```\n[0.712s][stringdedup] Deduplicated: 300033(98.4%) 11719.6K(8177.6%)\n```\n注意百分比是对"候选"而言;去重要求对象存活并熬过年龄阈值(DeduplicationAgeThreshold 默认 3),朝生暮死的串轮不到它。'),
      block('边界:各自的适用与失效场景', '去重失效场景:非 G1 回收器(17 的 ZGC 不支持该开关,支持矩阵按版本核对)、短命串(到不了年龄阈值)、内容本就互异。intern 的坑:常量池在元空间有账,大量动态 intern 会把压力转给元空间(见第 15 题),且 intern 表查找是全局锁竞争点。业务缓存的坑:上限与淘汰要做(否则见第 13 题),键设计要防内存对齐浪费。三者选型:热路径高频全等短串(状态码、渠道名)用业务常量;海量长尾重复(消息体、URL)用去重;两者都治不了的(内容互异)谁也不救。'),
      block('取舍:开启去重的成本账', '成本:去重线程的 CPU、字符串哈希的预计算、候选表的内存;收益:重复内容占比高且长寿命的场景(消息平台、规则串、报表模板)。判断先于开启:抽样统计重复率(对本机样例,8 个不同内容占 30 万实例,重复率近乎 100%,收益显著);若重复率不足 30%,收益大概率盖不住成本。业务缓存则零运行时开关成本,但吃代码评审——新增全局缓存要过上限与淘汰的设计评审。'),
    ],
    [
      block('实证:去重的量化收益', '命令与输出(Java 17.0.17):\n```\njava -XX:+UseStringDeduplication -Xms256m -Xmx256m \\\n     -Xlog:stringdedup*=debug DedupExp\n[0.712s][debug][stringdedup] Deduplicated: 300033( 98.4%) 11719.6K(8177.6%)\n```\n负载:30 万个内容仅 8 种的 String 保活。验证:不加开关重跑,该日志行消失且堆占用更高;把内容改为全互异,去重比例趋零——收益与内容重复度直接挂钩。'),
      block('追问链:字符串三刀', '一刀:"String 不可变带来什么优化空间?"——内容可安全共享(hash 缓存、value 复用),这是去重与 intern 的前提;可变字符串类型没有这种全局压缩机会。二刀:"为什么去重只对长寿命串划算?"——候选要熬年龄阈值,短命串在成为候选前已死,扫描成本白花;它天然服务缓存型负载,与第 13 题的缓存治理是同一画像。三刀:"压缩指针和去重矛盾吗?"——不矛盾,压缩类指针针对 Class 元数据引用,去重针对 String value;两者都在"用小账本省大内存",但层次不同,排查时分开看。'),
    ],
    ['去重压 value,缓存省对象', '先量重复率,再开开关', 'intern 慎用,上限必配'], [g1tun, jdksrc('gc/g1/g1StringDedup.cpp')],
  ),
  'jvm-advanced/29': deep(
    '大 JSON 响应如何同时增加堆与尾延迟？',
    '网银对账单下载沙盘:单个响应体 20MB JSON,高峰期 GC 频率与 P999 同步恶化。拆解大 JSON 的内存链路(解析树、字符串膨胀、临时缓冲)与延迟链路(分配压力、大对象、序列化 CPU),给出流式改造路径。',
    [
      '堆链路:20MB JSON 解析成对象树通常膨胀 3-10 倍,加上字符串与临时缓冲,单请求堆账可达百 MB,直接改写 GC 频率与晋升曲线。',
      '延迟链路:序列化与解析是纯 CPU,大响应挤占核;大数组成为 Humongous 候选;响应期间分配曲线突刺触发更早的并发标记。',
      '改造优先流式:分页限界、流式序列化(JSON generator)、按需字段;参数侧只是兜底(调大 region 或直接内存池),治标不治本。',
    ],
    [
      block('机制:一份 20MB 响应的内存放大账', '以 Jackson 解析为例:JSON 文本 20MB,char[]/byte[] 存一份;解析成 JsonNode 树,每个节点是对象加字段引用,树结构膨胀 3-5 倍;再绑定业务对象又一份。峰值同时存在文本、树、业务对象三份。若响应里含大数组,数组本身可能超 region 一半成为 Humongous(实测判定线:超过 region/2,64MB 堆下 600KB 即触发,见批 1 证据)。分配速率因此出现尖刺,GC 行为从"背景噪音"变"主导因素"。'),
      block('反例:分页缺失引发的雪崩链', '对账导出一次拉全量(20MB),并发 10 个请求即 200MB 瞬时堆账加数十个 Humongous 候选;实测形态映射:Humongous regions 暴涨(对照批 1:54 个 region 占 64MB 堆 84%)、to-space 紧张触发 evacuation failure(对照批 1:855 次 To-space exhausted)、P999 击穿。故障链的每一环都有本机实测对应,唯一无法本机复现的是生产并发规模——归因靠日志对齐,不靠想象。'),
      block('取舍:流式与分页的工程账', '分页是第一优先:响应按 1-5MB 切页,前端增量拉取,堆账立即降一个量级。流式序列化:Jackson generator 直接写 socket 流,树与业务对象不完整驻留;流式解析同理(逐条处理对账记录)。字段裁剪:审计日志类大字段拆独立接口。参数兜底:若业务确实需要 10MB+ 单对象,调大 G1HeapRegionSize 让其脱离 Humongous,但 region 变大的副作用(碎片、粒度)要回归验证——参数永远排在改造之后。'),
    ],
    [
      block('推演:从单请求内存账到 GC 行为(附本机对应证据)', '内存账推演:20MB 文本+树 60-100MB+业务对象≈单请求峰值 150MB 级。GC 行为对应(本机实测锚点):Humongous 判定与回收行为见 hum.log(Humongous regions 29->15/54->0);分配突刺下的疏散压力见 evac.log(To-space exhausted 855 次);GC 频率与分配速率的线性关系见批 1 速率实验。验证方式:构造 1MB/5MB/20MB 三档响应的压测对照 GC 频率与 P999(待在类生产环境补测,标注)。'),
      block('追问链:大 JSON 三刀', '一刀:"为什么不直接换二进制协议?"——协议换了放大系数变小(3-10 倍到 1-2 倍),但分页缺失的问题还在;先修结构问题再谈编码。二刀:"序列化 CPU 怎么省?"——字段级零拷贝(不建中间树)、复用 ObjectMapper(它是线程安全的,每次 new 也是分配热点)、热点路径考虑手工生成器;CPU 省下来的是别的请求的延迟。三刀:"响应体大小监控怎么做?"——APM 记响应字节数分位,P99 响应体超 2MB 即告警;把"大响应"变成可观测指标,而不是等 GC 告警才发现。'),
    ],
    ['文本树对象,三份叠峰值', '大数组进专区,疏散先告急', '分页流式裁字段,参数排最后'], [g1tun, api('java/io/package-summary')],
  ),
  'jvm-advanced/30': deep(
    '堆外内存池为什么也需要容量治理？',
    '网银行情网关沙盘:Netty 池化堆外缓冲配额 1GB,行情洪峰时 RSS 顶到容器 limit 触发 OOMKilled,团队以为"池化即安全"。解释池的账本边界、无界路径与治理清单。',
    [
      '池化管复用不管总量:PooledByteBufAllocator 只保证块内复用,池的 arenas/chunk 配置决定上限,默认值未必小于你的容器。',
      '无界路径三处:临时 buffer 泄漏(未 release)、跨请求引用滞留、池预扩容在洪峰时一次吃满;直接内存 OOM 的硬护栏是 MaxDirectMemorySize,越过即抛 Cannot reserve。',
      '治理三件套:显式配额(allocator 配置与 -XX:MaxDirectMemorySize 对齐)、泄漏检测(Level 参数与采样)、RSS 与 BufferPool 双水位监控。',
    ],
    [
      block('机制:池的账本与默认值', 'Netty PooledByteBufAllocator 按 arena 组织 chunk(默认每 chunk 16MB,arena 数随核数),池内分配从 chunk 切页;池总上限=arena 数×chunk 上限+缓存,可计算但常被忽略。池外路径:分配大于 chunk 的缓冲、堆外直接分配(DirectByteBuffer 走 Bits.reserveMemory,受 -XX:MaxDirectMemorySize 限,默认≈最大堆,实测超限抛 Cannot reserve ... direct buffer memory)。因此池内池外是两本账,都要有界。'),
      block('反例:洪峰把池推到容器 limit', '行情洪峰:每连接订阅缓冲翻倍,arena chunk 预扩容一次性申请;若 RSS 早就高企(堆外+堆+元空间合计接近 limit),扩容直接顶破容器。此场景无 Java OOM(见第 19 题),内核静默杀。防御:容量模型=堆(MaxRAMPercentage 折算)+池上限+直接内存上限+元空间与线程,合计必须显著小于容器 limit;洪峰扩容做灰度限速,扩容请求本身也要预算。'),
      block('取舍:配额、检测与监控的落点', '配额:MaxDirectMemorySize 显式设(如 512m)与池配置加总校验;arena 数按容器有效核数(不是宿主机核数)调整。检测:Netty ResourceLeakDetector 设 PARANOID 仅预发、SIMPLE 生产;泄漏日志进告警。监控:BufferPool MXBean 与容器 RSS 双水位,背离超过阈值即查未 release 或 JNI 直配(对照第 17 题的三本账方法)。'),
    ],
    [
      block('实证:直接内存护栏与账本背离', '本机证据(Java 17.0.17):\n```\n30×4MB 直接缓冲分配成功;第 33 块(超默认上限)抛:\nOutOfMemoryError: Cannot reserve 4194304 bytes of direct buffer memory\n  (allocated: 130031616, limit: 134217728)\n同进程三本账:BufferPool 120MB / NMT Internal 222KB / RSS 155MB\n```\n验证:显式调小 -XX:MaxDirectMemorySize 重跑,超限点前移,护栏行为可预期;池化框架的配额最终都要落到这条 JVM 护栏与 OS limit 的合计上。'),
      block('追问链:堆外池三刀', '一刀:"池化为什么快?"——复用 chunk 免去每次 malloc/释放与页错误,分配是池内指针推进;它优化的是分配延迟,不是总量。二刀:"泄漏检测怎么开?"——System.setProperty(io.netty.leakDetection.level,...) 或启动参数;PARANOID 全量检测只在预发,生产 SIMPLE 抽样,漏检率与开销的平衡写进预案。三刀:"和直接内存上限是什么关系?"——池是应用层账,MaxDirectMemorySize 是 JVM 层护栏,容器 limit 是内核层边界;三层配额必须自洽,任何一层单独看都会得出"没问题"的错觉(对照第 19 题)。'),
    ],
    ['池化省分配,不省总量', '池内池外两本账,三层配额要对齐', '泄漏检测常开,RSS 双水位'], [api('java/nio/ByteBuffer'), javaman],
  ),


  'jvm-advanced/31': deep(
    'GC 参数过多为什么会增加升级风险？',
    '网银核心沙盘:接手的老服务 JVM 参数 27 个,一半是 2019 年从博客抄的。升级 JDK 17 后行为漂移,排查三天定位到某个已改名参数。解释参数面与版本升级的耦合风险,并给出参数瘦身方法。',
    [
      '参数是隐式契约:每个非默认参数都是对"当时 JVM 行为"的假设,升级换版本时假设批量失效,行为漂移无从归因。',
      '风险三类:已移除或改名的参数(启动直接失败或静默忽略)、默认值跨版本变化(同名参数语义漂移)、参数间组合依赖(单独看都对,合起来打架)。',
      '瘦身原则:从默认值开始,只加"能指认收益"的参数;每个非默认参数要有归属(谁加的、为什么、验证数据),没有归属的回退默认。',
    ],
    [
      block('机制:参数如何成为技术债', '非默认参数实际是冻结的调优决策:MaxGCPauseMillis=5 冻结了 2019 年的 SLO,InitiatingHeapOccupancyPercent=30 冻结了当时的数据形态。JDK 演进里这些机制本身在变(自适应 IHOP、并发标记线程自动计算),旧参数与新机制叠加产生没人见过的组合。升级排查的困难在于:默认行为的所有文档、基准、经验都基于"默认值组合",参数面越大,可参考的经验面越小。'),
      block('反例:抄来的参数在生产沉默失效', '常见两类:一是 -XX:+UseBiasedLocking(15 已移除,JEP 374),17 上启动报 Unrecognized VM option 直接起不来;二是隐式被默认覆盖的调优(如手工固定 NewRatio 在 G1 上无意义)。更隐蔽的是"看起来生效"的参数:目标暂停设 5ms,但实际分布由其他因素主导(本机实测 5ms 目标下 young 2.4-6.2ms 加 80ms Full),团队以为参数在起作用,实际它只是众多影响因子之一——参数与效果的因果链断裂,是参数债的典型形态。'),
      block('取舍:瘦身流程与验证节奏', '流程:盘点全参数并标注归属与验证证据→分两批回退(先回退无证据的,再回退证据过期的)→每批观察一个完整业务周期→保留清单进版本库评审。节奏:与 JDK 升级解耦,升级前先瘦身(变量分离),升级后再按新版本文档补参数。临时诊断参数(-XX:+PrintInlining 等)严禁混进生产启动脚本,单独的排障脚手架管理。'),
    ],
    [
      block('推演:参数盘点的最小模板(附本机参数行为证据)', '模板四列:参数名/归属与日期/预期收益与验证数据/回退风险。本机验证的相邻证据:同一负载下 MaxGCPauseMillis=5 与默认参数的暂停分布差异有限(中位 3ms 量级),而 Full GC 80.755ms 完全不受它约束——证明很多"调过"的参数在真实瓶颈前不起作用。验证方式:每个保留参数跑 A/B 对照(开关各一轮)留证据;无对照数据的参数全部视为候选回退。'),
      block('追问链:参数治理三刀', '一刀:"哪些参数值得保留?"——有明确因果证据的:堆大小、回收器选择、MaxRAMPercentage 类容器适配、MaxDirectMemorySize 类护栏;其余默认。二刀:"升级前怎么预判行为漂移?"——读 release notes 的默认值变更清单,跑基准对照(同负载新旧 JDK 各一轮),diff GC 日志分布;漂移超预期再定位参数。三刀:"参数评审怎么做?"——新参数进启动脚本必须带 A/B 数据与回滚方案,评审问题只有一个:"这个参数的收益数据在哪?"'),
    ],
    ['参数是冻结的假设', '无证据即回退,分批验证', '升级先瘦身,变量要分离'], [javaman, g1tun],
  ),
  'jvm-advanced/32': deep(
    '如何评估增大堆是否真的改善系统？',
    '网银缓存服务沙盘:Full GC 频繁,方案是堆从 8G 加到 16G。用对照实验框架说明"增大堆"的三种结局(频率下降/单次变长/啥也没变)与决策依据,避免用一台机器的直觉代替证据。',
    [
      '先分清 Full 的病因:内存不足型(活对象逼近堆)扩堆有效;分配压力型(死得快但来得多)扩堆只是摊薄频率;碎片与大对象型要另治。',
      '扩堆的三重代价:单次暂停与疏散成本随堆变大而升、并发周期变长抢更多 CPU、容器内存配额重新分配(挤压堆外)。',
      '评估靠对照:同负载双堆跑三轮,比较暂停分布、GC 频率、P999 与吞吐四组数;只有 P999 与吞吐同时改善才算赢。',
    ],
    [
      block('机制:堆大小对各变量的影响方向', '频率≈分配速率除以 young 容量:堆翻倍,Eden 翻倍,频率减半——但单次 young 疏散的存活集若不变,单次成本不变,总 GC 时间近似减半,这是扩堆的理想剧本。现实偏差:老年代等比例扩大让 Full 或 mixed 的单次成本上升;并发标记周期覆盖更大堆,CPU 抢占更久;容器 limit 不变时堆外预算被挤压(第 19 题的账)。所以扩堆是频率与单次成本、内存配额的三方谈判,不是免费午餐。'),
      block('反例:扩堆后 P999 反而变差', '缓存型服务(高活率,第 11 题画像)扩堆一倍:young 频率下降,但 mixed 单次疏散的老年代分区更多,单次 mixed 暂停上升;P999 由单次成本主导,不降反升。判别:扩堆后看暂停分布的"长尾端"变化,若中位改善而最大值恶化,说明踩进了成本上升区间。这类服务的正确动作是治理活率(缩短留存)而非扩堆。'),
      block('取舍:扩堆决策清单', '四步:直方图确认活对象占比(活对象/堆<60% 才有扩堆空间)、GC 日志确认病因类型、双堆对照压测取四组数、容器配额重新核算(堆外预留)。通过标准:P999 改善且吞吐不降且内存配额成立;三条缺一即回到非扩堆方案(活率治理、分配治理、回收器调整)。'),
    ],
    [
      block('推演:双堆对照实验设计(附本机单堆基线)', '设计:同负载同参数,仅 -Xmx 变化,各跑三轮取分布;监控项=暂停分布/频率/P999/吞吐/容器 RSS。本机基线锚点:256MB 堆同负载 G1 young 中位 2.948ms、最大 32.202ms、Full 80.755ms——扩堆后预期频率下降但 Full/mixed 成本上升,方向可验证。本机未执行双堆对照(Windows 桌面内存受限,512m 以上对照意义弱),标注待补;生产评估必须用类生产环境执行,不接受推演结论直接上生产。'),
      block('追问链:扩堆三刀', '一刀:"为什么不全量压测就直接批?"——压测环境与生产的数据形态差异大(活率、键分布),直接批扩堆等于用错误分布验证;先直方图后压测,顺序不能反。二刀:"堆外预算怎么重新算?"——NMT 分类合计(本机:GC 开销随堆比例增长,128MB 堆时 GC 类 64.9MB)加直接内存加元空间,从容器 limit 反推堆上限;扩堆请求要附带这张账。三刀:"扩堆和换 ZGC 谁先?"——病因是暂停时先看暂停分布:STW 主导先调 G1 或换 ZGC(对照第 7 题),活率主导先治理对象寿命,扩堆是两者都不成立时的容量动作。'),
    ],
    ['扩堆先分病因,频率成本两头谈', '中位会骗人,长尾见真章', '四组数据齐,才许上生产'], [g1tun, javaman],
  ),
  'jvm-advanced/33': deep(
    '为什么限流有时比更换回收器更有效？',
    '网银秒杀网关沙盘:抢购瞬间分配速率 10 倍尖刺,方案会上一半人主张换 ZGC,一半主张限流。用同负载实测的 GC 行为推导"尖刺型负载"的成本结构,说明为什么先治输入再治回收。',
    [
      '回收器的改善是"更便宜地处理垃圾",限流是"少制造垃圾":尖刺型负载的问题在后者,换回收器只是把同一份垃圾处理得快一点。',
      '实测视角:ZGC 暂停微秒级但堆满时 Allocation Stall 59.822ms——尖刺把堆顶满,应用侧停顿转移,回收器救不了;限流把尖刺削平,所有回收器都受益。',
      '决策顺序:负载形态(持续 vs 尖刺)→尖刺可否削平(业务可接受限流?)→回收器选型在削平后再评估,而不是反过来。',
    ],
    [
      block('机制:尖刺如何击穿回收器的设计余量', '回收器的余量按"平均分配速率"设计:G1 的 young 容量、ZGC 的并发搬迁速度都是。尖刺瞬间把分配速率抬到 10 倍:G1 频繁 young 且存活集突增(to-space 紧张,对照批 1 的 855 次 exhausted);ZGC 搬迁跟不上分配,堆水位冲顶,触发 Allocation Stall(实测 59.822ms)——分配线程直接等回收腾空间。两类回收器在尖刺下的失效模式不同,但都失效:问题在输入曲线,不在处理器。'),
      block('反例:换了 ZGC 的秒杀还是抖', '秒杀网关换 ZGC 后压测:暂停指标全线优秀,但业务 P999 不变——尖刺期 Allocation Stall 与库存接口排队才是瓶颈。团队把"换回收器"当终局方案,漏了延迟结构分析:请求在应用层的等待(线程池排队、下游限流、堆外配额)占 P999 的 80%。正确路径:先限流削尖刺(入口令牌桶按下游容量配额),延迟结构改善后,再评估回收器是否还有必要动。'),
      block('取舍:限流的粒度与代价', '粒度三选:全局限流(保护 JVM 与下游,简单但一刀切)、按接口配额(核心接口保命,非核心降级)、按用户/渠道配额(公平但复杂)。代价要向业务讲清:限流返回 429/降级响应是显式拒绝,好过超时与雪崩;配额数值来自容量压测(带 limit、带 GC 日志的压测),不是拍脑袋。回收器选型保留为"削平尖刺后仍不达标"时的下一步,顺序不可颠倒。'),
    ],
    [
      block('实证:尖刺分配与两种回收器的失效对照', '本机证据(Java 17.0.17):\n```\nG1 组:批量分配场景 To-space exhausted 855 次 + Pause Full(尖刺击穿空间余量)\nZGC 组:堆顶满时 Allocation Stall (main) 59.822ms(尖刺击穿并发搬迁速度)\n常态负载:G1 young 中位 2.948ms / ZGC 0.005-0.017ms(尖刺未发生时都健康)\n```\n验证:对同一负载用"匀速注入"替代"批量注入"重跑,两类回收器的异常事件均消失——输入曲线是主变量,证明限流(削峰)的直接收益。'),
      block('追问链:先限流三刀', '一刀:"限流阈值怎么定?"——以 GC 健康为边界反推:young GC 频率、to-space 余量、Allocation Stall 计数的告警线对应的分配速率,即应用可消化的上限;限流配额=该上限对应 QPS 减安全余量。二刀:"限流会不会浪费资源?"——稳态流量低于配额时限流零成本;尖刺期"拒绝"换"全体变慢",对交易类业务是净收益(部分成交优于全部超时)。三刀:"什么时候才值得换回收器?"——稳态负载下暂停分布已卡 SLO、限流后仍有残余尖刺、堆余量与 CPU 预算充足,三条同时满足,才进入回收器对照实验(第 8 题框架)。'),
    ],
    ['尖刺击穿一切余量', '先削峰,后选型', '限流是显式拒绝,好过全体变慢'], [jep(377), g1tun],
  ),
  'jvm-advanced/34': deep(
    '日志打印怎样导致显著分配压力？',
    '网银接入层沙盘:QPS 3000 的服务 GC 频率突增 3 倍,排查半天定位到一行高频 debug 日志的字符串拼接。拆解日志的分配账本(拼接、包装、格式化)与正确的日志姿势,附本机速率证据。',
    [
      '拼接是大头:字符串不可变,一次拼接产生中间串加结果串;高频路径上 "prefix"+obj+"suffix" 每次调用都新建三四个对象。',
      '参数化日志是主要解法:log.debug("x={}, y={}", a, b) 把字符串构造推迟到真正输出时,被过滤的日志零字符串成本。',
      '验证看分配速率:发布前后对比单请求分配字节(第 10 题方法),日志治理的收益应在 GC 频率与分配曲线上直接可见。',
    ],
    [
      block('机制:一行日志的分配清单', '拼接写法:常量串+对象 toString(可能级联整个对象的字段拼接)+StringBuilder 内部数组扩容(char[] 翻倍扩容的中间数组)。参数化写法:log.debug 传对象引用,日志框架在启用级别才格式化;被 level 过滤时只有参数数组(空参则零分配)。附加账:Logback/Log4j 的 MDC、包装异常栈、以及"每隔几条打一次"的采样日志本身。热路径上这些账按 QPS 乘出来:3000 QPS×每次 500 字节×3600 秒≈5.4GB/小时的纯日志分配。'),
      block('反例:被 debug 开关掩盖的分配', '生产 log 级别是 INFO,但代码里 log.debug("detail="+buildDetail(req)) 已在调用点完成拼接——开关只挡输出,不挡构造。这是最隐蔽的形态:监控上日志量正常,分配速率却异常。判别方法:分配采样(ObjectAllocationSample,JFR)栈顶若出现 StringBuilder.toString 加日志门面帧,即此病。修复:全部改占位符,或对昂贵 detail 加 isDebugEnabled 守卫(参数化优先,守卫兜底)。'),
      block('取舍:日志治理的分级动作', '高频路径(每请求必经):只留参数化+被过滤安全的写法,严禁字符串拼接;中频(分钟级):拼接可接受但禁止在循环内;低频(小时级/告警):自由。结构化日志(JSON 格式)注意序列化成本,大对象入日志要裁剪字段。所有变更用分配速率与 GC 频率验证,不凭感觉宣布"优化完成"。'),
    ],
    [
      block('实证:分配速率的量级锚点', '本机速率证据(Java 17.0.17):CmpExp 40 轮×150 万次小对象分配,G1 日志显示 young GC 频率与每轮分配量线性相关(25M->5M 类日志行的间隔稳定)。字符串分配的放大效应可由去重实验旁证:30 万个 19 字节重复串占 11.7MB(去重后),未去重时是数倍——高频拼接的中间串正是这种"多而短"形态,TLAB 分配频繁,GC 频率直接抬升。验证:构造拼接版与参数化版同 QPS 压测对比分配速率(待类生产环境补测,标注)。'),
      block('追问链:日志三刀', '一刀:"异步日志是不是万能?"——AsyncAppender 把格式化与 IO 挪到独立线程,分配账不变(该建的字符串还在),且洪峰时队列丢弃策略要选;它治 IO 抖动,不治分配。二刀:"为什么拼接在高频路径这么贵?"——不可变字符串的每次拼接都是新对象加数组拷贝,中间串立即变垃圾;这是分配速率问题,与 CPU 关系小,所以 GC 先报警。三刀:"怎么防止回归?"——代码评审 checklist 加"热路径日志三查":是否参数化、是否在循环内、detail 是否昂贵;静态检查可拦 toString 拼接进日志门面的模式。'),
    ],
    ['拼接在调用点,开关挡不住', '参数化推迟构造,被过滤零成本', '收益看分配速率,不看日志量'], [api('java/lang/StringBuilder'), g1tun],
  ),
  'jvm-advanced/35': deep(
    '异常作为正常控制流为何可能影响性能？',
    '网银解析服务沙盘:用 NumberFormatException 判断"是否数字"驱动业务分支,压测吞吐低于显式判断版本。用本机基准实测异常路径的成本量级与方差,给出"异常当控制流"的评估清单。',
    [
      '构造异常要填栈:fillInStackTrace 抓全线程栈,单次成本微秒级,比常规分支高 1-3 个数量级;本机 100 万次全抛路径实测 0-51ms 波动,方差本身就是警示。',
      'JIT 会被异常路径扭曲:异常抛出点切断内联与块优化,catch 块限制代码重排;异常处理表让编译器保守。',
      '判断标准是频率与可预期性:可预期的、高频的"否"答案不该用异常表达;真异常(边界破坏)保持异常语义,可读性与性能兼得。',
    ],
    [
      block('机制:异常的成本构成', 'throw 时 JVM 走异常分派:fillInStackTrace 收集整条栈(深度决定成本)、查异常处理表、栈展开。本机基准(Java 17.0.17,百万次):正常路径 0-4ms,全抛路径 0-51ms——高方差来自 JIT 重新编译与栈深变化,单机循环基准不含生产栈深(生产栈更深,fill 更贵)。另一层成本:热点方法里 throw 点让 C2 放弃跨它的优化(内联链在异常边界断开),即使异常不抛,编译产物也变保守。'),
      block('反例:把异常当枚举解析用', '字段解析用 try { Integer.parseInt(s) } catch (NumberFormatException e) { /* 视为非法 */ },数据里 30% 是非法值:每秒百万次解析时异常构造成为分配与 CPU 双热点(JFR 分配采样栈顶是 NumberFormatException.<init>)。修正:预校验正则或手写 isDigit 扫描把"否"路径变普通分支;异常保留给真正的数据损坏。语义面:异常语义是"非预期状态",当控制流用会让监控告警(异常计数)失真。'),
      block('取舍:什么场景异常可接受', '可接受:低频真实异常(网络断、配置错)、框架边界防御(反序列化失败)、预热期的一次性探测。不可接受:高频可预期的否路径(格式校验、缓存 miss 探测)、循环体内的尝试型逻辑。灰度动作:把异常计数纳入监控,按接口建立异常率基线,异常率突增即是"异常被当控制流"的信号。'),
    ],
    [
      block('实证:百万次异常路径的量级与方差', '命令与输出(Java 17.0.17,ExcExp2:正常 div(i,3) 对照全抛 div(i,0) catch):\n```\nnormal=0ms  allThrow(ok=1000000)=0ms\nnormal=2ms  allThrow(ok=1000000)=51ms\nnormal=0ms  allThrow(ok=1000000)=0ms\n```\n解读:51ms/百万次≈51ns/次,量级远超普通分支(纳秒级);0ms 轮说明 JIT 去优化/重编译使测量方差极大——基准数字只能定数量级,不能当精确成本;生产栈更深,成本只会更高。验证:同机重跑方差仍在,这本身就是结论的一部分(异常路径的性能不可预测性)。'),
      block('追问链:异常三刀', '一刀:"JIT 会消除异常成本吗?"——隐式异常(空指针、除零)走 fast-path 抛出点替换信号机制,不填栈不展开,成本接近分支;显式 throw(用户代码)不享受该机制,两者别混谈。二刀:"为什么监控异常率?"——异常率是"控制流被异常化"的温度计:业务低谷异常率上升说明有人在拿异常当分支;修复方向是把否路径显式化。三刀:"第三方库在热路径抛异常怎么办?"——包一层预校验跳过库的异常路径,或换库;别试图改库,把边界校验放在自己一侧成本最低。'),
    ],
    ['填栈是硬成本,栈深定价', '可预期的否,不配用异常', '监控异常率,先修控制流'], [api('java/lang/Throwable'), javaman],
  ),
  'jvm-advanced/36': deep(
    '如何分析一次 Full GC 后内存仍接近上限？',
    '网银风控沙盘:Full GC 后老年代仍占 92%,团队在"扩堆"与"查泄漏"间摇摆。给出 Full GC 后高占用的判读框架:活对象底座、内存地板、大对象残留三类,以及各自的验证动作。',
    [
      'Full GC 后的高占用≈不可回收底座:先看 jmap -histo:live 的活对象总量——它就是当前代码形态下的内存地板。',
      '三类底座三查法:活对象底座(缓存/无界集合,第 13 题画像)、元空间与堆外挤占(第 15/17 题)、大对象残留(Humongous 回收滞后,第 4 题)。',
      '扩堆判断:底座/堆>70% 时扩堆是容量问题;底座小却高占用,是回收或记账问题,扩堆治不了。',
    ],
    [
      block('机制:Full GC 清什么、留什么', 'Full GC(压缩)清的是不可达对象,留下的=GC Roots 可达的活对象。它不清:元空间(另账)、直接内存与 JNI(堆外)、以及"逻辑泄漏"对象(可达但业务已不用)。实测锚点(批 1):引用全清后 Humongous regions 54->0,同一堆在引用未清时大对象稳占 54MB——Full 前后差异完全由可达性决定。所以"Full 后仍高"第一步永远是活对象盘点,而不是回收器怀疑。'),
      block('反例:把堆外挤占当堆泄漏', '风控服务 Full 后堆占用 60% 但容器 RSS 95%:堆直方图显示活对象远小于堆,差额在堆外(直接内存缓冲池上涨,BufferPool 指标同步)。若按"堆泄漏"查下去半天无果;按第 17 题三本账对齐,10 分钟定位。判读要点:堆占用看 GC 日志与直方图,RSS 看容器,两本账分开记;Full 后"堆内高"与"RSS 高"是两个不同的案子。'),
      block('取舍:三类底座的验证与动作', '活对象底座:histo:live 按类型与支配树定持有者,治理对象寿命(缓存上限/TTL)。元空间与堆外:NMT 分类对账(本机:Metaspace 522KB committed、Internal 222KB,direct buffer 另账),配 BufferPool 监控。大对象残留:humongous 日志看 Humongous regions 是否随 Full 归零,不归零则引用链未断。动作顺序:先归账(哪个底座),再治理,扩堆只在第一类且治理后仍>70% 时启动。'),
    ],
    [
      block('实证:Full 前后的大对象账本对照', '本机证据(Java 17.0.17,64MB 堆,批量持有 600KB 数组):\n```\nFull 前: GC(2) Humongous regions: 28->21   (young 只能部分回收)\n引用全清+System.gc 后: GC(8) Humongous regions: 54->0\n                     Pause Full (System.gc()) 57M->3M(64M) 3.876ms\n```\n解读:Full 后堆从 57M 降到 3M——当 Full 真的能清干净时占用暴跌;生产上"Full 后仍 92%"意味着底座真实存在。验证:live 直方图与支配树定位底座持有者(流程见第 12 题),与堆账互证。'),
      block('追问链:Full 后高占用三刀', '一刀:"为什么不直接看 Full GC 日志里的堆用量?"——日志给总量不给构成;histo:live 给类型构成,支配树给持有链,两者合成完整归因。二刀:"G1 混合期反复 Full 怎么解释?"——若 mixed 不来(垃圾占比低)加 to-space 紧张,Full 被 to-space exhausted 触发(批 1:855 次),它清的是可回收部分;Full 后仍高的部分才是底座,别把两次 Full 间的波动当泄漏。三刀:"监控怎么预防?"——把"Full 后老年代基线"做成趋势指标:基线每周抬升即泄漏立案,横盘即容量问题,两条线对应两套动作。'),
    ],
    ['Full 留下的就是底座', '堆内堆外分账,别混案', '先归账再治理,扩堆是末选'], [jcmdman, g1tun],
  ),
  'jvm-advanced/37': deep(
    '类直方图能否直接代替堆泄漏分析？',
    '网银告警值班沙盘:发现内存增长,值班直接 jmap -histo 看一眼 char[] 最多就宣布"字符串泄漏",修了一周没效果。说明直方图的能看与不能看,以及何时必须升级到支配树与路径分析。',
    [
      '直方图给"什么类型多":快照式类型计数,适合第一眼判断与趋势差量,但它没有持有关系,给不出"谁扣住了内存"。',
      '泄漏案的必需证据是引用链:支配树(保留尺寸)与 GC Roots 路径分析才能把类型归因到持有者;直方图排名靠前可能只是正常的大集合。',
      '正确的接力顺序:直方图(方向)→ 多时点差量(确认增长)→ 支配树与路径(归因)→ 代码定位;跳步会得出"char[] 泄漏"这类无主结论。',
    ],
    [
      block('机制:直方图能看到与看不到的', '能看到:各类型实例数与字节量排序、多时点差量(增长速率)、按 classloader 分组的类统计(jcmd 直方图支持分组)。看不到:谁引用谁、保留尺寸(回收它能连带释放多少)、引用是否来自 GC Roots。典型误读:char[]/byte[] 排第一就怀疑字符串泄漏——任何解析型服务的正常堆里它们都排第一;真正的判据是"差量是否只增不减"与"持有者是谁"。'),
      block('反例:无主结论浪费的一周', '"char[] 最多=字符串泄漏":团队排查字符串构造、加了去重(本机实测去重只省 value 数组,98.4% 去重也只省 11.7MB 量级),毫无效果。真实根因:一个 static 无界 List 持有解析结果对象,连带大量 char[];直方图上解析对象类型排第三被 char[] 遮住。升级到支配树后保留尺寸第一名就是这个 List,10 分钟定位。教训:直方图的类型排名不等于泄漏归因,类型接近的嫌疑要靠持有链裁决。'),
      block('取舍:直方图的最佳使用位置', '值班第一响应用直方图:轻量、低风险(jcmd 直方图比全量 dump 便宜得多)、可定时采样建趋势。它回答"有没有异常增长"(多时点差量)与"哪类对象该进支配树";归因与定位交棒给支配树/路径分析(需 HPROF,离线 MAT)。把直方图当"分诊台"而不是"诊断书",是快与准的平衡点。'),
    ],
    [
      block('实证:直方图与持有关系的互补', '本机证据(Java 17.0.17,jcmd GC.class_histogram):\n```\n代理保活实验:200 个 $Proxy 类在册,java.lang.Class 共 2958 实例\n不保活对照:200 个 $Proxy 类从直方图消失\n```\n直方图回答了"代理类在不在",但"谁保活它们"直方图无答案——该案的持有者是 List(keep),只有引用链分析(或对照实验)能给出。验证:直方图差量法在两次保活/卸载切换间测得 200 的差值,证明差量信号有效;持有归因需要支配树(推演,待补 HPROF 实操)。'),
      block('追问链:分诊三刀', '一刀:"直方图怎么用才不误判?"——固定时点采样(如每小时)存档,差量排序看增速而非绝对排名;增速靠前的类型才是支配树的入口。二刀:"什么情况必须 dump?"——直方图差量确认增长、且 jcmd 直方图无法归因时;dump 选低谷加落盘审批。三刀:"第三方库类型的增长怎么归因?"——同样进支配树,持有者常是业务侧容器(监听器注册表、回调缓存);归因到业务持有点后,修复在业务侧,库本身多数无辜。'),
    ],
    ['直方图分诊,支配树定案', '排名不重要,差量才是信号', '无主结论禁上工单'], [jcmdman, api('java/lang/instrument/package-summary')],
  ),
  'jvm-advanced/38': deep(
    '动态代理数量增长怎样与类加载问题关联？',
    '网银规则沙盘:规则引擎按租户动态生成代理与脚本类,运行月余 Metaspace 缓慢上涨。用本机代理实验说明代理类的生成-卸载生命周期、与加载器/元空间的联动,以及动态类生成的治理手法。',
    [
      '每个新接口组合生成新代理类:Proxy 按(类加载器,接口列表)缓存,组合爆炸时类数量线性增长,本机实测 200 个接口组合即 200 个 $Proxy 类(jdk.proxy1 模块)。',
      '代理类随代理对象与加载器生灭:本机对照显示保活时代类在册、不保活即卸载——引用链断不断,决定类回收与否。',
      '与元空间的联动:代理类与脚本引擎生成的类都进 Metaspace,增长无回收即第 14/15 题的加载器泄漏与元空间 OOM;治理靠组合收敛与显式注销。',
    ],
    [
      block('机制:代理类的一生', 'Proxy.newProxyInstance 按 key(加载器+接口列表)查弱缓存,miss 则生成新类字节码(ProxyGenerator)并 defineClass 到动态模块(17 实测模块名 jdk.proxy1,每类一个动态模块)。类与代理对象生命周期绑定:对象不可达且加载器无引用时,类可被卸载,元空间释放。弱缓存意味着"同样接口组合"复用类——组合空间(租户数×规则数×接口数)是类数量的上界,业务若让组合空间无界增长,元空间只进不出。'),
      block('反例:按租户生成接口组合的爆炸', '规则引擎为每个租户生成含租户专属接口的代理:1000 租户×3 规则版本=3000 个代理类,叠加 Groovy/SpEL 每次编译新类,月余 Metaspace 触顶(第 15 题画像)。判别:类直方图按 classloader 分组看代理类与脚本类数量随时间的差量;本机对照(200 个代理类在册/卸载的直方图差)验证了"不保活即卸载"——生产上的问题正是引用链(租户上下文、回调注册)让卸载永不发生。'),
      block('取舍:收敛组合与注销生命周期', '收敛:接口组合按"规则版本"而非"租户×规则"设计,租户差异用数据(配置)表达而不是类型(接口)表达;脚本类按版本缓存复用。注销:租户下线时显式清理其代理对象与回调注册,断开加载器引用链,让类的整体卸载发生。监控:类数量与 Metaspace committed 双水位,增长曲线与租户增长对齐才健康,背离即立案。'),
    ],
    [
      block('实证:代理类的生成与卸载对照', '命令与输出(Java 17.0.17):\n```\n保活:GC.class_histogram -> jdk.proxy1.$Proxy0..199 共 200 个类,Class 总实例 2958\n不保活:200 个 $Proxy 类从直方图消失\n```\n验证:两次直方图差量=200,代理类随保活集合生灭;推演到生产:组合空间收敛后类数量上界可控,注销链路让下线租户的类真正卸载(Metaspace 回落验证)。'),
      block('追问链:动态类三刀', '一刀:"哪些框架在悄悄生成类?"——Spring AOP(CGLIB/代理)、MyBatis mapper、脚本引擎(Groovy/JS)、JSON 库的反射加速器;每类都有自己的缓存 key 设计,review 时查"key 是否无界"。二刀:"类数量多少算多?"——无绝对值,看增速与卸载:常态服务类数量应在启动后趋稳(几千到几万),持续上升即动态生成失控;与租户/规则数对齐的增长才是健康。三刀:"和 Lambda 类一样吗?"——Lambda 用 LambdaMetafactory 生成隐藏类(17 起 hidden class,JEP 371),同样进元空间、同样按使用点画像缓存;排查方法相同,直方图差量是通用入口。'),
    ],
    ['组合定上界,引用定生死', '类随加载器整族生灭', '租户下线要注销,元空间才回头'], [jep(371), jvms2],
  ),
  'jvm-advanced/39': deep(
    '如何避免诊断命令本身扩大事故？',
    '网银值班沙盘:故障排查时有人在 30GB 堆的生产服务上执行全量堆转储,STW 数十秒,把一次可恢复的抖动变成事故。给出诊断命令的风险分级、执行前检查清单与替代方案。',
    [
      '命令分三档风险:高危(全量堆转储、某些 histogram 的全堆扫描)有 STW 与 IO 成本;中危(NMT detail、PrintFlags)有持续开销;低危(线程栈、GC 日志开关)秒级完成。',
      '执行前四问:堆多大、此刻流量多少、命令会停多久、落盘写到哪;四问答不上来,先降级用替代命令。',
      '替代优先:jcmd GC.class_histogram 代替全量 dump 初筛,JFR 时间线代替反复打栈,预发复现代替生产试探。',
    ],
    [
      block('机制:高危命令的成本构成', '全量堆转储(jcmd GC.heap_dump / jmap -dump):先 STW 冻结全堆再遍历写文件,成本=堆大小×遍历速度+磁盘写;30GB 堆常见数十秒 STW 加数百 MB 到数十 GB 文件。GC.class_histogram 默认也走全堆遍历(比 dump 轻:不落盘,只统计)。NMT detail 档每条分配记账,常态开销 5-10%。PrintCompilation/PrintInlining 类动态开关改写 JIT 行为,生产慎用。风险分级的前提是知道每条命令"动了什么"。'),
      block('反例:一个 histogram 引发的雪上加霜', '值班看到内存高,先 jmap -histo:live——注意 live 变体先触发一次 Full GC 再统计:本就紧张的老年代被强制 Full,若底座不可回收(第 13 题),Full 只是白付暂停;叠加流量高峰,雪上加霜。更糟的是选了 dump 落到应用盘,把数据盘写满,服务直接崩。规范动作:高峰期用不带 live 的 histogram(无强制 Full)初筛,dump 必须低谷加独立盘加审批。'),
      block('取舍:分档清单与自动化护栏', '低危(值班可直接):Thread.print、GC.class_histogram(非 live)、VM.flags、GC 日志动态调级。中危(二线确认):NMT 开关变更、PrintCompilation 类开关。高危(审批+窗口):全量 dump、live histogram、堆外探测类。护栏:生产脚本封装高危命令(前置检查堆大小、时间窗、落盘空间),把审批流程嵌进工具;文档明确每条命令的 STW 量级。'),
    ],
    [
      block('实证:轻量直方图与全量 dump 的成本差', '本机证据(Java 17.0.17,小堆演示成本结构):jcmd GC.class_histogram 对 6 万实例的堆秒级返回(代理实验,200 类在册,总实例 61130)且无感;而 HeapDumpOnOutOfMemoryError 场景的 dump 成本随堆线性增长(生产 30GB 堆为推演,标注)。验证要点:histogram 的 STW 感知在同机压测下毫秒级,证明初筛用 histogram 的分流价值;高危命令的量化成本在类生产环境补测。'),
      block('追问链:诊断三刀', '一刀:"为什么 live histogram 会触发 Full?"——live 语义需要先确知死活,JVM 以 System.gc 加可达性遍历实现;要活对象账本就要付这次 GC,参数设计如此,不是 bug。二刀:"JFR 能替代哪些高危操作?"——分配热点(ObjectAllocationSample)替代反复 histogram,时间线替代反复打栈,OldObjectSample 代替"猜泄漏对象";录制本身低开销,事后离线分析。三刀:"事故复盘怎么沉淀?"——把本次用过的命令、成本、替代方案写进值班手册;每次事故后更新分级清单,让下次响应更快更稳。'),
    ],
    ['高危有 STW,执行前四问', 'histogram 分诊,dump 要审批', 'JFR 先行,预发复现代替试探'], [jcmdman, javaman],
  ),
  'jvm-advanced/40': deep(
    '应用预热应该覆盖哪些路径？',
    '网银开盘沙盘:每日开盘瞬间 P99 尖刺 10 倍,持续约 3 分钟后自愈。解释冷启动的三个成分(JIT 爬坡、画像冷、缓存/连接冷)与预热覆盖清单,附本机分层编译的观测锚点。',
    [
      '尖刺三成分:JIT 分层编译爬坡(解释器到 C2 需要热度积累)、调用点画像未建立(多态分发未单态化)、运行时资源冷(连接池、缓存、页缓存)。',
      '预热要打主链路:重放真实流量子集(读接口加写接口都要),让热点方法到 C2、让分发画像稳定;只预热健康检查接口等于没预热。',
      '兜底配置:低水位流量预热(网关渐进放量)、启动期临时提高并发获取编译资源,以及把"预热完成"变成发布门禁而不是靠时间猜。',
    ],
    [
      block('机制:冷启动的三段爬坡', '第一段,分层编译:方法先解释执行,热度到阈值进 C1,再进 C2(本机 PrintCompilation 可见 Tier 层级递进);爬坡期热点代码慢 5-20 倍。第二段,画像建立:调用点的实现计数、分支概率从零积累,期间可能触发去优化重编(第 27 题)。第三段,资源冷:连接池初始化、TLS 握手、OS 页缓存、JIT 编译器自身线程的 CPU 抢占。三段叠加成开盘尖刺,自愈即三段各自完成。'),
      block('反例:只预热健康检查的假动作', '探活接口 /health 每秒打 100 次不算预热:它只覆盖三五个方法,JIT 爬坡只对这几行生效;开盘真实流量(查余额、转账、风控)的方法栈依然全冷。正确姿势:预热脚本重放录制的生产流量子集(覆盖 P95 接口,读写都有,数据形态接近真实),配合网关按 1%→10%→50%→100% 渐进放量,让爬坡在低风险窗口完成。'),
      block('取舍:预热验证与门禁', '验证不是"跑了预热脚本"而是指标达标:预热后单接口 P99 达稳态值的 1.2 倍以内、JIT 编译队列排空(日志佐证)、连接池满配。把这三条做成发布门禁(自动化跑),达标才放量;时间猜测(如"等 5 分钟")不可靠——负载形态不同,爬坡时间不同。AOT/Native Image 是另一条路(启动即峰值性能),但生态与动态特性约束大,网银 Java 服务当前以预热为主。'),
    ],
    [
      block('推演:预热覆盖的观测锚点(附本机编译行为证据)', '观测锚点:PrintCompilation 日志显示方法从解释到 C2 的台阶(本机内联实验已验证 PrintInlining 的冷热差异:4 字节方法 inline (hot),240 字节方法冷后热两种命运);预热的目的就是把主链路方法推到 inline (hot) 状态。开盘尖刺的分解验证:预热前后同接口压测对比 P99 与编译日志 diff(类生产环境执行,本机未复现完整爬坡,标注)。门禁判据:编译队列长度、接口 P99 达标、画像稳定(去优化事件归零)。'),
      block('追问链:预热三刀', '一刀:"为什么写路径也要预热?"——写路径的序列化、校验、幂等逻辑同样走 JIT;只热读路径,开盘写请求仍是冷代码,尖刺只换了个接口发生。二刀:"扩容新实例为什么会拖慢整体?"——新实例冷爬坡时响应慢,网关轮询把流量分给它,拖累整体分位;方案是实例级预热完成才挂流量(第 41 题的配套)。三刀:"JFR 能证明预热完成吗?"——能:执行采样栈顶从解释器/存根帧变成业务帧、编译事件平息、分配曲线稳定;把 JFR 摘要做成预热报告,门禁有据可查。'),
    ],
    ['三段爬坡,各补各的', '主链路重放,读写都要', '指标当门禁,不猜时间'], [javaman, jdksrc('compiler/compilationPolicy.cpp')],
  ),


  'jvm-advanced/41': deep(
    '为什么扩容新实例后可能暂时拖慢整体？',
    '网银支付沙盘:压不住流量,横向扩 2 个实例,结果整体 P99 反而先恶化 10 分钟。解释新实例的冷启动成本如何通过负载均衡传导,给出实例级预热门禁与灰度接入的做法。',
    [
      '新实例三冷:JIT 冷(分层编译爬坡)、画像冷(调用点分布未建立)、资源冷(连接池/缓存/页缓存),单实例前几分钟处理能力只有稳态的几分之一。',
      '负载均衡按"实例数"均分流量:冷实例接满份流量,响应慢导致重试与超时放大,拖累整体分位——不是新实例坏,是接入策略坏。',
      '解法是实例级门禁:预热流量(录制回放)达标、健康检查含性能探针、灰度从低权重起步,三项全过再给满流量。',
    ],
    [
      block('机制:冷实例的承接能力曲线', '启动后 0-3 分钟,JIT 爬坡让热点方法慢数倍到数十倍(解释器/C1 阶段);画像未稳时多态分发与去优化增加抖动(第 27 题);连接池未满配时下游等待串行化。三段叠加,新实例的有效容量在爬坡期可能只有稳态 30-60%。均衡器若无权重与门禁,把 1/(N+1) 的流量压给 60% 能力的新实例,旧实例间接受益有限,而长尾被冷实例的慢请求拉爆——整体 P99 恶化,直到爬坡完成。'),
      block('反例:重试风暴叠加冷启动', '支付网关扩容:新实例慢响应触发上游超时重试,重试流量再压冷实例,形成"冷→慢→重试→更冷"正反馈;部分接口 P99 恶化 3 倍,10 分钟后自愈。自愈不是方案,是运气(流量回落)。预防:上游对"新实例"识别(版本标签)降低重试权重、均衡器最小健康阈值、预热完成前不下发健康(探针含耗时检查)。'),
      block('取舍:预热门禁的实现层次', '实现三选:网关侧权重渐增(1%→25%→100%,间隔按爬坡时长)、探针级门禁(healthz 附加延迟探测,超阈值保持 NotReady)、录制回放预热(启动后主动回放 P95 流量子集)。成本与收益:录制回放最有效但要准备数据与隔离(写请求打影子或用测试账号);权重渐增最简单,适合多数服务。门禁判据写进发布流水线,人不盯也稳定。'),
    ],
    [
      block('推演:冷启动成本的时间线(附本机编译锚点)', '时间线推演:0-1 分钟解释执行为主(热点慢 10 倍级),1-3 分钟 C1 覆盖主链路,3-10 分钟 C2 与画像稳定(视流量强度)。本机锚点:PrintInlining 实测同一调用点冷与热两种内联结果(240 字节方法冷时 too large、热后 inline),说明画像与热度直接决定编译产物质量;冷实例就是全局处于"冷"状态的缩影。验证:扩容演练时记录新实例 P99 曲线与 JFR 编译事件,量化爬坡时长(类生产环境执行,标注待补)。'),
      block('追问链:扩容三刀', '一刀:"为什么不用静态预热(启动时自打流量)?"——自打流量覆盖不了真实画像(数据分布、并发形态),且写请求污染数据;录制回放加影子库更完整,静态预热是底线动作。二刀:"AOT/Native Image 是不是终极解?"——启动即峰值性能,但反射/动态代理/脚本引擎要配置,生态迁移成本高;网银服务短期仍以预热门禁为主,新服务评估 AOT。三刀:"怎么发现扩容拖慢了整体?"——按实例拆分位:APM 按实例标签看 P99,新实例与存量实例曲线分开画;混在整体曲线里,冷启动成本会被平均掉而看不见。'),
    ],
    ['冷实例接不住满份流量', '重试风暴别喂冷启动', '门禁达标再放量'], [javaman, g1tun],
  ),
  'jvm-advanced/42': deep(
    '如何在 Java 17 与更高 JDK 间设计性能对照？',
    '网银账务沙盘:计划从 17 升 21(要分代 ZGC 与虚拟线程),需要一份可信的性能对照方案。给出版本对照的变量控制、基线选择、已知行为漂移清单与本机可复用的对照框架。',
    [
      '同一负载双 JDK 各跑 N 轮:JDK 构建固定(17.0.17 与 21.x 具体版本)、参数只保留两版都存在的,默认值差异列入报告。',
      '已知漂移先入清单:ZGC 分代化(21)、虚拟线程(21)、默认 GC 行为与自适应阈值变化、编译器升级带来的内联差异——对照结论要标注归因到哪一项。',
      '口径统一后看分布不看单值:暂停分布、吞吐、内存三组数各自对照,任何一组差异先查默认值变化再谈"新版本更快/更慢"。',
    ],
    [
      block('机制:版本对照的变量面', 'JDK 升级同时改变:GC 实现细节(即使同名回收器)、JIT 编译器版本、类库实现(字符串、集合内部)、默认参数(如 G1 自适应策略演进)。对照必须"一次回答一个问题":若目标是评估分代 ZGC,双版本都用 ZGC;若评估整体升级收益,用各自推荐默认配置——两种设计回答不同问题,报告要写清设计选择。'),
      block('反例:默认值差异被当成版本退化', '对照中发现 21 的 G1 暂停略升,结论"21 退步"——实际是自适应 IHOP 阈值变化让 mixed 时点不同。判别:把两版 VM.flags(jcmd VM.flags)diff,默认值差异列表化;暂停分布差异要能在机制上解释(IHOP、并发线程数、region 尺寸)才能归因版本,否则先修配置对齐再重测。'),
      block('取舍:对照报告与灰度策略', '报告最低集:环境(双 JDK 构建/硬件/参数 diff)、负载(脚本+数据形态)、四组数(吞吐/暂停分布/P99 与 P999/内存)、差异归因表(默认值/新特性/编译器)。灰度策略:按服务分层先灰读服务、金丝雀按实例标签双版本并行(第 41 题门禁防冷启动混淆)、回滚条件预设(第 46 题框架)。升级决策以业务指标(P999、吞吐、成本)为准,不以微基准定生死。'),
    ],
    [
      block('实证:本机对照框架的可复用部分', '本机已验证的对照框架要素(Java 17.0.17):同负载双回收器对照(G1 vs ZGC,日志+统计脚本)、GC 日志口径提取(young 暂停分布/并发周期/异常事件计数)、JFR 摘要对比(ObjectAllocationSample 等)。跨 JDK 环节:同框架在 21 环境重跑即可,负载脚本与统计口径不变(未在本机安装 JDK 21,标注待补)。验证判据:同一框架两版数据可 diff,即框架有效。'),
      block('追问链:版本对照三刀', '一刀:"要不要关掉新特性对照?"——分两轮:特性关闭轮(归因机制差异)与特性开启轮(评估真实收益);只跑一轮的结论归因不清。二刀:"虚拟线程怎么对照?"——它是编程模型变化不是开关,需要改造 IO 密集路径后对照;对比项是吞吐与尾延迟,同时检查固定(pinning)点(见第 43 题)。三刀:"内存对照看什么?"——committed 与 RSS 双口径加 NMT 分类 diff;类库变化(如字符串内部)会改变同负载的分配量,分配速率也是对照项。'),
    ],
    ['一次回答一个问题', '默认值先对齐,再谈版本账', '分布看长尾,归因进清单'], [jep(439), jep(425), javaman],
  ),
  'jvm-advanced/43': deep(
    '虚拟线程相关固定问题为何必须按 JDK 版本讨论？',
    '网银推送沙盘:团队在 17 上规划虚拟线程架构,拿 21 的性能文章做依据。厘清虚拟线程的版本时间线(17 没有,19 预览 JEP 425,21 正式 JEP 444)、固定(pinning)问题的版本演化与正确的评估路径。',
    [
      '版本铁律:JDK 17 没有虚拟线程(19 预览,21 正式),17 上的"虚拟线程架构"是空中楼阁;讨论必须先定版本。',
      '固定问题随版本演化:早期版本 synchronized 大块与 native 调用会把载体线程钉住,导致池饥饿;后续版本(jdk.tracePinnedThreads 诊断、21.1 时期修复部分 synchronized 固定)行为持续变化,结论必须绑定小版本。',
      '评估路径:先升级到目标版本、再按版本排查固定点(jstack 的 carrier 记录或 -Djdk.tracePinnedThreads)、最后吞吐对照;拿旧版本结论指导新版本架构是反向操作。',
    ],
    [
      block('机制:固定为什么发生、何时消失', '虚拟线程挂起需要把栈从堆上 continuation 冻结/解冻。synchronized 进入早期实现关联平台线程的监视器结构,阻塞在 synchronized 内时无法冻结,载体线程被钉住(吞吐退化到平台线程水平);native 调用(栈帧不可搬运)同理固定。版本线:21 引入 jdk.tracePinnedThreads 诊断与默认调度器告警;后续修复(22/23 时期分批)把 synchronized 固定消除或缓解——同一份代码在不同小版本的固定行为不同,所以按版本讨论是硬要求。'),
      block('反例:17 上的"虚拟线程预算表"', '团队在 17 上按文章算"虚拟线程百万并发、内存几十 MB",把线程池配置、栈预算(第 18 题)全部按虚拟线程模型设计——而 17 根本没有该特性。上线即发现预算模型无处落地。判别:任何虚拟线程结论先查 JEP 与 JDK 版本(425/428 预览于 19,444 定稿于 21,固定缓解在 22+);17 的规划只能写"待升级后评估"。'),
      block('取舍:升级与改造的顺序', '顺序:先升 21(或更高)拿稳定实现,再改造 IO 密集路径(每连接一线程→虚拟线程),配合固定点排查与压测;不要在 17 上预写虚拟线程专属代码。改造注意:Semaphore 限流替代线程池限流、避免在热路径 synchronized 包 IO、native 调用挪出高频路径。对照指标:吞吐、P999、载体线程数、固定事件计数;固定事件不为零时逐点治理。'),
    ],
    [
      block('推演:版本评估的最小清单(17 本机不可测,明示)', '17.0.17 本机验证:java 版本输出确认 17 无虚拟线程 API(Thread.ofVirtual 不存在),JEP 425 是 19、JEP 444 是 21 的官方时间线。21 上的评估清单(待目标环境执行):1) jdk.tracePinnedThreads=full 扫固定点;2) 载体线程池大小与 IO 并发对照;3) 吞吐/P999 双口径;4) 固定事件与 synchronized/native 位置归因。每项结论标注 JDK 小版本(如 21.0.5),不同小版本不互相平移。'),
      block('追问链:虚拟线程三刀', '一刀:"固定了会怎样?"——载体线程被钉住时该线程无法服务其他虚拟线程,池内载体(默认=CPU 核数)耗尽则整体吞吐坍缩到固定点的串行速度;这是架构级风险,不是微优化。二刀:"怎么在线上发现固定?"——早期版本 jdk.tracePinnedThreads(有开销,诊断开),后续版本监控载体池饱和与调度延迟;固定行为版本间变化,诊断手段也要按版本核对。三刀:"和 Loom 之前的异步方案比?"——CompletableFuture/回调链的复杂度换成虚拟线程的直写风格,吞吐目标一致;但 sync 锁、ThreadLocal、调试工具链的生态适配按版本逐步成熟,迁移是分阶段工程。'),
    ],
    ['17 没有,21 才正式', '固定钉载体,版本定行为', '先升级再改造,结论带小版本'], [jep(425), jep(444), api('java/lang/Thread')],
  ),
  'jvm-advanced/44': deep(
    'NUMA 与内存局部性何时值得纳入 JVM 排障？',
    '网银行情撮合沙盘:双路服务器上同一服务延迟方差比单路环境大,怀疑跨 NUMA 访问。解释 NUMA 拓扑对 JVM 内存与线程的映射影响、UseNUMA 的适用与误用,以及排障的观测点。',
    [
      'NUMA 的代价是跨节点内存访问(带宽低、延迟高):JVM 堆在哪个节点分配、GC 线程与业务线程在哪个节点跑,决定局部性质量。',
      'G1 的 -XX:+UseNUMA 让年轻代分配按节点交错,配合线程亲和能让"分配线程与 Eden 同节点";但它不解决线程调度漂移与老年代访问。',
      '纳入排障的条件:多路服务器、大堆、延迟敏感、且已排除分配尖刺/GC 异常等主因——NUMA 是二阶因素,别在头号问题未解决时先动它。',
    ],
    [
      block('机制:堆、线程与节点的映射', 'Linux 下 JVM 默认按系统策略(first-touch)分配堆页:谁先触碰页面,页就落在谁的节点。跨节点访问的常见形态:GC 线程(固定在节点 A)整理属于节点 B 的页、业务线程被调度器在节点间迁移后访问远端页。UseNUMA(仅 G1/ParallelGC 支持)把 young 区按节点分片,分配线程在各自节点取 TLAB,提高本地性。观测点:numactl --hardware 看拓扑、perf 的 NUMA 事件、GC 日志不直接体现(需系统层工具)。'),
      block('反例:把二阶因素当主因', '撮合服务延迟方差大,团队先调 UseNUMA——排查一周发现主因是定时任务与撮合争抢 CPU(限流与错峰问题,第 20 题画像)。判别顺序:先排除分配尖刺(GC 日志)、限流(throttled 统计)、缓存冷启动(时间线对齐);NUMA 效应在上述都干净后仍方差大、且拓扑跨节点访问证据(perf)成立时才立案。二阶因素的修复收益通常 5-15%,主因收益常以倍数计,顺序错了浪费时间。'),
      block('取舍:UseNUMA 与绑核的配合', 'UseNUMA 适合:大堆多路、young 分配密集、节点数 2-4;误用场景:容器内 NUMA 感知失真(节点视图与宿主不一致)、小堆(收益盖不住复杂度)、依赖 first-touch 的自定义绑定。配合手段:numactl 绑定 JVM 进程到单节点(牺牲总带宽换确定性,适合延迟敏感)、或依赖调度器 cgroup cpuset。每种组合要压测对照,容器与宿主的 NUMA 视图差异要在报告里写明。'),
    ],
    [
      block('推演:NUMA 排障的观测路径(本机为单路,不可测)', '观测路径:1) numactl --hardware 与 lscpu 确认拓扑(典型双路输出:available: 2 nodes (0-1),各 node 的 cpus 与 meminfo 分列——拓扑未分列即单节点,无需继续);2) perf stat -e node-loads,node-stores 看跨节点比例;3) GC 日志与业务方差对齐,排除一阶因素;4) UseNUMA 开关 A/B 或绑核对照,方差与 P99 变化量化。可查证的事实锚点:UseNUMA 仅 G1 与 ParallelGC 支持(HotSpot 文档口径),ZGC/Shenandoah/SerialGC 无此选项——开关在所跑回收器上不存在即直接排除。本机(单路 Windows)无 NUMA 拓扑,全部为推演,标注待补;生产执行时保留拓扑与压测数据作为证据。验证:开关 A/B 后方差收敛即确认归因,未收敛则回到一阶因素。'),
      block('追问链:NUMA 三刀', '一刀:"为什么大堆才敏感?"——堆越大,跨节点访问的绝对次数越多,first-touch 后的页分布一旦失衡,惩罚按 GB 级累积;小堆的跨节点成本被业务延迟淹没。二刀:"透明大页和 NUMA 什么关系?"——大页减少 TLB miss,但 2MB 页的分配与 NUMA 交错策略交互复杂,大页预触碰(第 45 题)也会改变页分布;两个参数要一起对照,别单独下结论。三刀:"容器里怎么保证视图正确?"——宿主绑定(cpuset/membind)传给容器,容器内 numactl 复核;K8s 的 topology manager 与 JVM 的 NUMA 感知要对齐配置,否则 UseNUMA 开了也白开。'),
    ],
    ['跨节点访问,带宽换延迟', '先清一阶因素,再立案 NUMA', '拓扑要复核,参数组合测'], [g1tun, javaman],
  ),
  'jvm-advanced/45': deep(
    '透明大页可能怎样影响延迟？',
    '网银低延迟行情沙盘:为压低 P999 考虑启用透明大页(THP)。用本机 AlwaysPreTouch 实测(2GB 堆启动 +约 250ms)说明预触碰与页粒度的成本转移,给出 THP 在 Linux 上的 madvise/always 选择与验证方法。',
    [
      '大页的收益是 TLB miss 下降、页错误减少;代价是分配/回收粒度变粗、可能引入内存碎片与整理停顿——延迟影响方向不定,必须实测。',
      '预触碰(AlwaysPreTouch)把缺页成本从运行期搬到启动期:本机实测 2GB 堆启动到 main 从 57-175ms 变 307-340ms(+约 250ms),换来运行期无缺页尖刺。',
      'Linux THP 有 always/madvise/never 三态:数据库与 JVM 社区常见建议 madvise(显式声明用大页的区间);always 对延迟敏感服务可能引入抖动,结论按负载实测。',
    ],
    [
      block('机制:页粒度如何改变内存行为', '普通 4KB 页:TLB 覆盖小,大堆应用 TLB miss 频繁;2MB 大页:TLB 覆盖×512,miss 骤降。代价面:大页需连续物理内存,内核 khugepaged 后台整理可能引发延迟尖刺;G1 的 region(1-32MB)与大页边界交互——精确说法是 card table 条目 512 字节,一颗 2MB 大页覆盖数千卡,脏卡粒度变粗影响 RSet 精化与扫描效率,不是笼统"错位"。AlwaysPreTouch 在 JVM 启动时把堆全部触碰一遍(提交并驻留),本机实测证明其启动成本(+250ms/2GB)与"运行期零缺页"的收益结构。实证与推演的边界:PreTouch 是跨平台实测,THP 三态是 Linux 特性本机未测(见实证块标注),两者不混在一个结论里;THP 的 madvise 模式配合 PreTouch 是低延迟常见组合。'),
      block('反例:always 模式的隐性抖动', '某缓存服务开 THP=always 后 P999 反而恶化:khugepaged 在后台合并 4KB 页到 2MB,整理动作与业务高峰重叠,产生毫秒级停顿;且内存碎片让整理更频繁。判别:perf 与内核日志(thp 相关计数)、方差分析(中位不变长尾变差即疑 THP 整理)。修正:madvise 模式让 JVM 显式选择大页区间,或 never 加 PreTouch 的组合;每种组合压测三轮取分布。'),
      block('取舍:组合矩阵与验证方法', '组合四选:THP=never+PreTouch(运行期确定性最好,启动慢)、THP=madvise+PreTouch(JVM 声明的区间用大页,平衡)、THP=always(默认内核行为,数据库常见但延迟敏感慎用)、THP=never 不 PreTouch(启动快,运行期缺页尖刺)。验证:每组合跑同负载三轮,取 P99/P999/方差三组数;容器环境注意 THP 是宿主机配置,容器无独立开关,变更要过宿主运维窗口。'),
    ],
    [
      block('实证:AlwaysPreTouch 的启动成本', '命令与输出(Java 17.0.17,Windows,3 轮各):\n```\njava -Xms2g -Xmx2g PreTouchExp            -> uptime_at_main_ms=57/68/175\njava -XX:+AlwaysPreTouch -Xms2g -Xmx2g    -> uptime_at_main_ms=307/321/340\n```\n解读:开 PreTouch 后启动到 main 多约 250ms(≈8GB/s 触碰率),这笔成本一次性付在启动期,换来运行期缺页消除——成本转移模型直接可测。THP 本身是 Linux 特性(Windows 本机无法测 THP 三态,标注),PreTouch 跨平台可用,是 THP 组合实验的基础组件。'),
      block('追问链:大页三刀', '一刀:"为什么 THP 不一定快?"——收益(TLB)与成本(整理、碎片)并存,方向取决于访问模式;随机访问大堆的整理成本可能盖过 TLB 收益,延迟敏感服务以实测为准。二刀:"PreTouch 和大堆容器有什么联动?"——PreTouch 让堆页在启动期全部驻留,RSS 一开始就到顶(第 19 题的容器账),limit 紧的容器会误伤;容量模型要按"启动后即全量 RSS"校准。三刀:"怎么确认 THP 在生效?"——/sys/kernel/mm/transparent_hugepage/enabled 状态、perf 的 TLB 事件、应用侧方差对比三层证据;只看配置文件不算验证。'),
    ],
    ['大页换 TLB,整理换抖动', 'PreTouch 转移成本,启动付运行享', 'madvise 起步,三态各测'], [javaman, g1tun],
  ),
  'jvm-advanced/46': deep(
    '如何给 JVM 性能变更建立回滚条件？',
    '网银核心沙盘:一次"GC 参数优化"上线后第 3 天在高峰引发 Full GC 风暴,回滚用了 40 分钟。给出回滚条件的设计方法(触发指标、观察窗、演练),以及变更单的最小字段集。',
    [
      '回滚条件是数值化契约:指标(如 P999、Full GC 频率)、阈值、观察窗(如 15 分钟连续越线)三者缺一不可,"感觉不对就回滚"不是条件。',
      '条件覆盖三类:性能回退(分位与 GC 健康指标)、资源异常(内存/RSS/线程数越限)、错误放大(异常率与重试率)——每类各设 1-2 条,别堆指标。',
      '回滚演练是变更的一部分:回滚脚本提前验证过(参数回退、镜像回退)、决策链路演练过(谁拍板、多久执行),没演练过的回滚方案等于没有。',
    ],
    [
      block('机制:条件怎么定才不漏报不误报', '基线取变更前 7 天同型分布(P99 同小时对比,消日周期);阈值=基线分位的显著偏离(如 P999 超基线 P99 加 3 倍标准差);观察窗平衡灵敏度与噪声(15 分钟连续 vs 单点)。误报成本:误回滚损失一次变更收益;漏报成本:业务持续受损。GC 变更的指标优先选"距离业务最近"的:接口 P999 直连用户感受,GC 频率是代理指标——代理指标只做辅助触发。'),
      block('反例:没有观察窗的漏网之鱼', '该案例的回滚条件只有"P99 显著上升"且无观察窗:上线当天深夜流量低未触发,第 3 天高峰触发时团队还在争论"是不是业务波动";又因回滚脚本未演练(参数在配置中心被部分覆盖),执行拖了 40 分钟。两个缺口一个在条件设计(无窗口、无 GC 辅助指标),一个在执行准备(脚本未验证)——回滚方案的正确性必须被演练过才算存在。'),
      block('取舍:变更单的最小字段集', '七字段:变更内容与参数 diff、预期收益与验证数据(A/B 对照,第 32 题框架)、回滚触发条件(指标/阈值/窗口)、回滚步骤(脚本化、已演练)、观察期长度(如 48 小时含两个高峰)、责任人(变更人+拍板人+执行人)、遗留风险与观察项。GC 类变更观察期至少覆盖两个完整高峰周期——单日高峰不够,跨天才有置信。'),
    ],
    [
      block('推演:一次参数变更的回滚条件示例(附本机 A/B 锚点)', '示例:MaxGCPauseMillis 从默认改 5ms。条件:P999 超基线 P99+3σ 连续 15 分钟,或 Full GC 频率周环比翻倍,或 Allocation Stall/To-space exhausted 类异常事件出现;满足任一即回滚。本机 A/B 锚点:同负载下 5ms 目标的 young 分布(2.4-6.2ms)与默认参数差异有限、Full 80.755ms 不受其约束——证明"该参数收益有限"的判断需要 A/B 数据支撑,回滚条件设计同理要先有基线。演练要求:回滚脚本在预发跑通,配置回退后 VM.flags 复核(诊断命令按第 39 题分级)。验证:条件触发后脚本执行回滚,复核参数回到基线即闭环。'),
      block('追问链:回滚三刀', '一刀:"为什么观察期要跨高峰?"——GC 行为与分配速率强相关,低峰全绿不代表高峰健康;两次高峰的通过才算条件收敛。二刀:"灰度期间回滚条件怎么设?"——金丝雀实例单独算基线(第 41 题门禁先排除冷启动),条件阈值按灰度规模调整;灰度回滚比全量回滚便宜,能灰度就别全量。三刀:"变更后性能没变差也没变好怎么办?"——收益不显著即回退(参数面最小化原则,第 31 题),保留无证据参数只会积累技术债;变更的目标是可指认的收益,不是"动了参数"。'),
    ],
    ['指标阈值观察窗,三件套齐', '基线取同小时,代理指标做辅助', '回滚先演练,再谈上线'], [g1tun, javaman],
  ),
  'jvm-advanced/47': deep(
    '内存泄漏修复后为什么 RSS 不一定立刻下降？',
    '网银订单沙盘:无界缓存修复上线,堆占用回落,但容器 RSS 三天没降,运维质疑修复无效。解释 RSS 的粘性(驻留页不主动归还、page cache、分配器碎片)与验证修复的正确口径。',
    [
      'RSS 是驻留页不是占用义务:进程释放的内存页未必立即归还 OS(glibc malloc 碎片、JVM 堆水位线策略),RSS 有粘性。',
      'JVM 侧堆通常不缩(默认 Xms=Xmx 时堆常驻,本机 NMT:Heap committed=131072KB 全额提交),缓存修复的收益体现在"堆内可回收空间变大",不是 RSS 缩水。',
      '验证口径用三线对比:堆内活对象基线(直方图差量)、GC 后堆占用(日志)、容器 RSS——修复有效看前两条,RSS 下降要靠主动归还手段或重启。',
    ],
    [
      block('机制:RSS 粘性的三个来源', '来源一,堆常驻:Xms=Xmx 的容器里堆全额提交(本机实测 Heap committed 128MB 全额),缓存清理只是让堆内出现大量"可回收"空间,堆对 OS 的承诺没变。来源二,分配器碎片:glibc 的 malloc 空洞使 free 后的页不归还(OS 层 RSS 不降),JNI 与堆外路径同理。来源三,page cache 与预触碰:文件读多的服务 cache 占 RSS,PreTouch(第 45 题)让堆页启动即驻留。三者都让"逻辑修复"与"物理 RSS"脱钩。'),
      block('反例:用 RSS 验证堆内修复', '修复后团队盯 RSS 三天无变化,准备回滚"无效修复"——实际堆内活对象基线已从 92% 降到 55%,Full GC 频率归零,修复完全有效。判别错位:修复的是堆内账本(可达性),RSS 是物理驻留账(第 16 题的口径差)。验证修复的口径必须与修复对象同层:堆内泄漏看活对象基线与 GC 行为,堆外泄漏看 BufferPool 与 native 账,RSS 只做长期趋势参考。'),
      block('取舍:主动归还与重启策略', '主动归还手段:启动参数 -XX:+UseG1GC 配 MaxHeapFreeRatio 调整(有缩容行为但受 Xms=Xmx 约束)、-XX:MaxRAMPercentage 配 Xms<Xmx 允许堆收缩、System.gc 后依赖 G1 的并发周期收缩(Java 12+ G1 支持并发归还,行为按版本验证)、glibc 场景用 malloc_trim 或替换 jemalloc。运维面:接受"重启归零"作为最终手段,把修复验证与 RSS 回收拆成两个目标,别用后者否定前者。'),
    ],
    [
      block('实证:三口径的粘性对照', '本机证据(Java 17.0.17,NmtExp):\n```\nNMT: Heap committed=131072KB(全额,不随使用量变化)\nRSS=155MB / Private=340MB(同进程互不相等)\nInternal committed=222KB(直接内存不在 NMT)\n```\n解读:堆对 OS 的承诺是 Xms 全额——堆内对象清空也不改 committed 与 RSS;同进程 RSS 与 Private 都不等于 NMT 合计。验证:把 Xms 调低于 Xmx 重跑,committed 可变但缩容行为按版本与参数(G1 并发归还)验证;生产修复的验证口径按本节三线对比执行。'),
      block('追问链:RSS 三刀', '一刀:"什么时候 RSS 会降?"——进程释放整段映射(大 chunk munmap)、分配器 trim、内核回收 page cache、或重启;JVM 堆默认不主动归还到 OS(Xms=Xmx 时永不)。二刀:"为什么运维爱盯 RSS?"——容器 OOMKilled 按物理内存判,它的关切合理;对应方案是把 JVM 各账有界化(第 19 题),让 RSS 可预测,而不是要求 RSS 实时反映逻辑修复。三刀:"缩容参数值得开吗?"——G1 并发归还对潮汐负载(夜间低谷)有收益,但要压测缩容期间的行为(归还时的并发开销、再扩容的抖动);固定负载服务开缩容纯增风险。'),
    ],
    ['修复看堆内账,RSS 是物理账', '承诺常驻,归还看策略', '重启归零是兜底,口径分层才复盘'], [javaman, jcmdman],
  ),
  'jvm-advanced/48': deep(
    '服务卡顿但 GC 正常时如何继续排查？',
    '网银接入层沙盘:用户报卡顿,GC 日志干净、CPU 不高,值班一度"无案可办"。给出 GC 无罪后的排查漏斗:安全点与应用侧停顿、锁与线程池、下游与 IO、宿主层(限流/ stealing),逐层附可观察证据。',
    [
      '先立"GC 无罪"的证据:暂停分布无尖刺加 safepoint 日志 sync 正常(本机实测常态微秒级),再进入非 GC 排查,避免在 GC 上空转。',
      '应用侧停顿有自己的名单:JFR 的 Allocation Stall 类事件(本机 ZGC 实测 59.822ms)、类加载锁、JIT 编译队列堵、日志同步 IO——它们不叫 GC 但同样停世界或停线程。',
      '往下走漏斗:锁竞争与线程池饱和(等待事件)、下游慢(链路追踪超时分布)、宿主层(CPU 限流/steal/页回收)——每层有独立证据,别靠猜。',
    ],
    [
      block('机制:卡顿归因的四层漏斗', '第一层 JVM 停顿:GC 暂停、安全点等待(safepoint 日志)、偏向锁撤销(17 默认无偏置锁)、类加载与 JIT 队列——JFR 时间线可见。第二层应用并发:锁竞争(JavaMonitorEnter)、线程池排队(ThreadPark 频度与池水位)、连接池等待。第三层依赖与 IO:下游延迟、DNS/连接建立、磁盘 IO。第四层宿主:CPU 限流(throttled 统计)、CPU steal(虚拟化)、内存回收与 swap。漏斗顺序按"证据获取成本"排列,上层便宜先查。'),
      block('反例:被"GC 正常"带偏的两小时', '接入层卡顿,值班反复看 GC 日志两小时(确实干净)。真正原因:某配置热更触发的全量类加载持锁,请求线程排队在类加载锁上——JFR 的 JavaMonitorEnter 事件 10 分钟就能定位。教训:GC 干洁只是排除了一层,卡顿的证据面还有四层;JFR 常开(第 22 题)时,10 分钟与 2 小时的差别就是有没有时间线。'),
      block('取舍:排查的记录与升级规则', '规则:每层查完记录"证据与结论"再下一层(安全点日志、JFR 摘要、链路追踪、宿主指标四份材料);两层无果升级二线(带齐材料),避免单人反复横跳。常态化:JFR default 常开、safepoint 日志常开、宿主 throttled 指标进监控——三层证据提前就位,卡顿案变成对齐时间戳的功课。'),
    ],
    [
      block('实证:GC 之外的两类停顿证据', '本机证据(Java 17.0.17):\n```\nZGC Allocation Stall (main) 59.822ms   (堆满,应用线程等回收腾空间)\n安全点 sync 全程 ≤67us(6 次 Full GC)   (GC 侧无嫌疑的量化依据)\n```\n解读:第一行是"不叫 GC 的停顿"实锤——统计口径里它不是 Pause,业务感受却与 GC 尖刺无异;第二行证明 GC 与安全点无罪后,排查方向必须转移。验证:同负载重跑,Allocation Stall 与堆水位重合、安全点保持微秒,证据可复现。'),
      block('追问链:卡顿排查三刀', '一刀:"为什么锁竞争监控常缺失?"——synchronized 与 AQS 等待默认无业务指标,JFR 事件是主要来源;关键路径的锁要主动埋点(获取耗时分位)。二刀:"线程池怎么看出饱和?"——队列长度与拒绝计数是表象,JFR ThreadPark 加线程栈(池内线程全 WAITING 于 take)证明"忙在等待",结合上游流量判断是容量还是依赖慢。三刀:"宿主层怎么快速取证?"——throttled/steal/swap 三个计数器加页面回收事件,各一行命令;容器与虚机环境这层经常是答案,却最晚被查——把它前移到监控基线里。'),
    ],
    ['GC 无罪要证据,停顿有名单', '四层漏斗,逐层留证', 'JFR 常开,卡顿变对表'], [jfrman, jcmdman],
  ),
  'jvm-advanced/49': deep(
    '如何为不同服务制定统一而不僵化的 JVM 基线？',
    '网银平台组沙盘:一条 JVM 基线要覆盖网关、账务、批处理三类服务,强推统一参数被批处理团队抵制。给出基线的分层设计(强制层/建议层/自由层)、偏离申请机制与版本演进规则。',
    [
      '基线分三层:强制层(容器适配、内存护栏、GC 日志格式、JFR 常开)、建议层(回收器与目标、堆配比)、自由层(业务特调);层次对应变更权限。',
      '统一的不是参数是证据格式:统一日志口径与监控指标,让各服务的行为可横向比较;参数差异保留在建议层与自由层。',
      '演进走修订版:基线带版本号与变更记录,偏离申请要有 A/B 数据(第 32 题框架),新版基线对偏离项做吸收或驳回,形成闭环。',
    ],
    [
      block('机制:三层的内容与理由', '强制层(平台负责,不可偏离):UseContainerSupport 与 MaxRAMPercentage、MaxDirectMemorySize 护栏、统一 -Xlog:gc* 格式与 JFR default 常开、OOM 时 HeapDump 落盘——这层保证"任何服务的日志与内存账可读可对账",是跨服务排障的公共基础。建议层(默认采用,偏离需数据):回收器选择与 MaxGCPauseMillis、堆配比、线程栈默认值——不同负载形态(网关短平快 vs 批处理大吞吐)合理诉求不同。自由层(业务自决):业务特定参数与诊断参数(按第 39 题分级管理)。'),
      block('反例:一刀切基线的两种翻车', '翻车一:批处理被强制 MaxGCPauseMillis=20ms——吞吐型负载被暂停目标拖累(GC 频率上升,总吞吐下降),批处理团队绕开基线私自改参,基线公信力破产。翻车二:网关类被允许自由调堆外——某服务 MaxDirectMemorySize 没护栏,洪峰 OOMKilled(第 19 题)。两者的病根相同:把"应该统一的证据格式"错当成"应该统一的参数值"。护栏与格式强制,调优参数按负载分层,是基线能落地的分界线。'),
      block('取舍:偏离申请与闭环', '偏离流程:申请单(目标参数+A/B 对照数据+回滚条件)→平台评审(与建议层冲突点辩论)→灰度验证→记录进基线偏离登记簿。闭环:每季度基线修订,偏离登记簿里出现频次高的偏离项升级为建议层(说明默认建议不符合某类负载),被数据驳回的偏离项删除。基线是活文档,评审记录就是它的演进史。'),
    ],
    [
      block('推演:基线文档的最小骨架(附本批实验作素材)', '骨架:1) 强制参数清单(含理由与验证数据);2) 建议参数按负载画像分档(网关/事务/批处理);3) 日志与监控口径规范(-Xlog:gc*、JFR、NMT 的统一开关);4) 偏离流程与登记簿;5) 版本升级联动规则(第 31/42 题)。本批 50 题的实测数据(暂停分布、Allocation Stall、NMT 三口径、PreTouch 成本)就是"理由与验证数据"列的样例——基线的每个强制项都应能引用一份这样的证据。'),
      block('追问链:基线三刀', '一刀:"为什么 GC 日志格式要强制?"——排障常跨服务取证,格式不统一则脚本与人对不上;统一 -Xlog:gc* 的 output/tags 让自动化 diff 成为可能(本批实验脚本就是统一口径的受益者)。二刀:"批处理类的合理偏离长什么样?"——暂停目标放宽或直接用吞吐优先配置、堆配比不同、并发标记线程数按核配;申请单里附吞吐对照即符合流程,这不是对抗基线而是修正建议层。三刀:"基线和灰度门禁怎么衔接?"——强制层变更(如 JDK 升级)走统一门禁(第 46 题回滚条件),建议层变更走偏离流程,自由层变更自担;三层各有变更通道,权限清晰才不会绕行。'),
    ],
    ['统一证据,不统一参数', '强制管护栏,建议管选型', '偏离要数据,基线要闭环'], [g1tun, javaman],
  ),
  'jvm-advanced/50': deep(
    '一次成功的 JVM 调优报告应包含哪些证据？',
    '网银平台组沙盘:两次调优,一次被采纳一次被退回——退回的那份只有结论没有证据链。以本批 50 题的实验为样例,给出调优报告的证据清单、归因规则与验收标准。',
    [
      '报告五件套:环境与基线(硬件/JDK 构建/参数 diff/变更前分布)、变更内容(参数或代码 diff)、对照数据(四组数:吞吐/暂停分布/分位延迟/内存)、归因链(每个改善点能指认机制)、回滚条件(指标/阈值/窗口)。',
      '归因规则:改善必须能在日志与机制上指认(如"mixed 次数上升对应老年代垃圾占比变化"),无法指认的收益标注"未归因,存疑"。',
      '验收标准事前写死:什么算成功(如 P999 改善 20% 且吞吐不降)、什么算失败(回滚条件触发)、观察期多久;报告的结论区只写事前标准的判定结果。',
    ],
    [
      block('机制:证据链怎么组织才可信', '可信报告的结构是"可复现命令加原始输出加统计口径":每个关键数字能落到一条命令与一段日志(如本批:暂停中位 2.948ms 来自 g1.log 的 13 行 Pause 统计);统计口径写明(分布、轮数、是否含 Full);环境写明(JDK 17.0.17、堆、硬件)。反例是"优化后性能提升 30%"无命令无口径——读者无法复现,也就无法采信。'),
      block('反例:被退回的报告缺了什么', '退回版三缺陷:基线缺失(没写变更前分布,"提升 30%"无从对照)、归因跳跃(把 mixed 次数变化与吞吐改善直接画等号,未对齐时间戳)、无回滚条件(上线后全靠人盯)。对照本批实验范式:G1 vs ZGC 对照里 Allocation Stall 59.822ms 与暂停 0.005-0.017ms 并列呈现(优势与代价同框),NMT 三口径并列(RSS 155MB/Private 340MB/committed 334MB 互相不解释)——诚实的报告呈现全部相关数字,包括对自己论点不利的。'),
      block('取舍:报告的验收与沉淀', '验收流程:报告先过"复现检查"(他人按命令重跑关键一轮)、再过归因质询(每个改善点的机制解释)、最后按事前标准判定。沉淀:报告归档进基线偏离登记簿(第 49 题)与平台知识库,命令与脚本入库,下次同类变更直接引用。失败报告同样归档——本批"长循环卡安全点"结论在 17 上被推翻的实测,就是失败实验支撑版本边界的例子,负结果也是资产。'),
    ],
    [
      block('实证:本批实验作为报告素材的样例', '样例映射(Java 17.0.17,全部可复现):\n```\n环境:Windows x64,JDK 17.0.17,堆 64M-512M 按实验标注\n对照:G1 young n=13 中位 2.948ms/最大 32.202ms vs ZGC 0.005-0.017ms\n异常事件:To-space exhausted 855 次、Allocation Stall 59.822ms\n内存三口径:committed 334MB / RSS 155MB / Private 340MB\n反直觉修正:长循环 sync ≤67us(旧结论按版本修正)\n```\n每个数字对应一条可复跑命令与日志文件——这就是"证据链"的物理形态。验收:报告评审第一问永远是"命令发我重跑一遍"。验证:按本报告命令重跑一轮,数字落在标注量级内即通过。'),
      block('追问链:报告三刀', '一刀:"生产报告和实验报告差在哪?"——生产报告多两项:业务口径(真实流量下的分位与错误率)与成本口径(容器配额、机器数);实验数据只支撑机制归因,生产决策要业务数字。二刀:"多重收益怎么排序?"——按业务指标改善幅度乘置信度排序,机制上未归因的收益降权;报告结论区不超过三条,长尾进附录。三刀:"怎么防止报告造假?"——命令可复跑加原始日志归档加抽查复现;数据造假的成本应高于收益,工具化采集(脚本直接生成报告附原始文件)是治理手段。'),
    ],
    ['命令可复跑,数字有出处', '收益要指认,存疑要标注', '事前定标准,事后只判定'], [jfrman, jcmdman, g1tun],
  ),

  'jvm-advanced/51': deep(
    '分代 ZGC 默认启用后，Java 17 的 ZGC 结论还能照搬吗？',
    '容量规划沙盘:团队在 JDK 17 上测得 ZGC 的分配停顿与 CPU 曲线，准备升级 JDK 23+；需要判断分代 ZGC 成为默认模式后哪些结论失效。',
    [
      'JDK 17 的 ZGC 是单代实现，每次并发周期按全堆存活集工作；JDK 21 的 JEP 439 引入分代 ZGC，JDK 23 的 JEP 474 让它成为默认模式，JDK 24 的 JEP 490 才移除单代模式。',
      '分代后按对象存活特征分别回收，短命对象的处理成本下降；JDK 17 上"ZGC 不分代、周期随存活集增大"的瓶颈描述不能直接套用到新版本。',
      '升级评估要重测:默认堆布局、并发线程 CPU、分配停顿与长尾延迟都变化；报告须标注 JDK 版本和是否显式指定分代模式。',
    ],
    [
      block('机制:分代改变了哪条成本曲线', '单代 ZGC 用染色指针和读屏障做并发标记搬迁，暂停不随堆大小线性增长，但每个周期要处理全堆存活对象；常驻存活集大时周期长、CPU 开销明显。分代 ZGC 把对象按年龄分开，年轻对象更快回收，长命对象少被反复扫描，降低分配停顿并改善吞吐。类比仓库盘点:全仓盘点每次都要走遍所有货架（单代）；把高频周转区单独盘点，剩下慢慢盘（分代）—— zones 变了，成本模型也变。'),
      block('边界:版本链不要压缩成一句话', 'JDK 17 单代；21 通过 JEP 439 提供分代 ZGC（需开关）；23 通过 JEP 474 把分代设为默认；24 通过 JEP 490 移除单代模式。把"ZGC 不分代"当作永恒结论是版本错误；把"JDK 21 起默认分代"也记错——默认是 JDK 23，单代彻底消失是 JDK 24。回答时把这条版本链说清楚。'),
      block('取舍:评估迁移的操作面', '先固定负载与堆大小，再在 17 与 23+ 上分别用同一套 GC 日志指标对比:分配停顿、并发周期时长、CPU 占用、p99。若结论用于生产，还要按目标应用的存活率和分配速率重测；教学模型不能替代压测。'),
    ],
    [
      block('验证:升级对照的断言组', '教学验证:同一压测脚本分别在 JDK 17（单代 ZGC）与 JDK 23+（默认分代 ZGC）运行，记录 allocation stall 次数、并发周期时长和 CPU 曲线；预期高频短命负载下分代模式的分配停顿下降。该对照是验证设计，本项目基线 Java 17 未执行该双版本实验。'),
      block('追问:JDK 21 要不要显式开启', 'JDK 21 可用 -XX:+UseGenerationalZGC 开启分代；JDK 23 起默认就是分代，JDK 24 起单代模式不再可用。讨论参数前先问目标版本，避免把 21 的开关写法套到 24。'),
    ],
    ['17 单代，21 可选，23 默认分代', '短命快回收，成本曲线重画', '升级重测 GC 日志，不搬旧结论'], ['https://openjdk.org/jeps/439', 'https://openjdk.org/jeps/474', 'https://openjdk.org/jeps/490'],
  ),

};
