<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程、ScopedValue 与历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/security/SecureRandom.html)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银安全沙盘:验证码用 Random(可预测!—48 位种子可枚举)——安全场景必须 SecureRandom;业务随机(抽签)用 Random/ThreadLocalRandom;UUID 用 SecureRandom 的类型 4。按安全等级选随机源。

1. 随机源的谱系:Random(48 位 LCG 种子——可预测[已知输出可推种子])、ThreadLocalRandom(线程隔离的 Random——同样可预测)、SecureRandom(CSPRNG——加密安全,不可预测)、UUID.randomUUID()(SecureRandom 的类型 4 UUID)。
2. 安全等级:验证码/密钥/令牌→SecureRandom 必选(Random 的验证码可被推算[种子枚举]);业务随机(抽奖/随机展示)→Random 足够;UUID→randomUUID()(内部 SecureRandom)。
3. SecureRandom 的工程注意:熵源阻塞(/dev/urandom 替代)、实例复用(创建贵——复用单例)、线程竞争(多实例缓解)。

## 参考分析

### 第二步扩展① 机制:Random 的可预测性与 SecureRandom

- Random 的可预测:48 位种子+LCG 算法——已知两个输出可反推种子(48 位空间可枚举)——验证码用 Random=攻击者可推下一个码。
- SecureRandom:OS 熵源(/dev/urandom/Windows CryptoAPI)+加密强度哈希——不可预测(CSPRNG 的定义)。
- 性能:Random 快(LCG 计算)vs SecureRandom 慢(熵混合+哈希)——安全与性能的取舍(安全场景性能不是理由)。

### 第二步扩展② 反例:随机源误用的两种事故

- 事故一,验证码用 Random:攻击者知道时间戳(种子来源)——枚举种子推验证码——验证码失效。
- 事故二,令牌用 UUID.randomUUID() 的字符串截断:UUID 类型 4 是 CSPRNG 安全——但截断(取前 8 位)后空间缩小(暴力可行)——截断降低安全强度(令牌用完整 UUID 或专用生成器)。
- 两条的正解:安全场景 SecureRandom+完整熵空间。
- Random 只用于"可预测无影响"的场景。

### 第二步扩展③ 取舍:随机数的业务分类

- 分类:安全随机(验证码/密钥/令牌/会话 ID——SecureRandom)、业务随机(抽奖/AB 测试/随机展示——Random/ThreadLocalRandom)、确定性随机(种子化的可复现随机——模拟/测试——new Random(seed))。
- 三类不可混用:安全场景禁非安全源,确定性场景禁非种子源——随机源的类型安全(第 25 题类型边界的运行时形态)。

## 案例

### 第三步发散·验证与推演 验证:随机源的断言组

- 验证:可预测性断言(Random 的种子枚举——已知输出推下一个[演示级])。
- SecureRandom 断言(SecureRandom 的输出不可推[CSPRNG 的定义——实测不可枚举])。
- 分布断言(SecureRandom 的均匀分布——卡方检验)——三组固化随机源分类。
- 安全扫描(Random 在安全场景的扫描告警)进 CI(第 24 题)。

### 第三步发散·追问扩展 追问链:随机三刀

- **Q1：熵源阻塞?**
  - 答：/dev/random 的熵池阻塞(Linux)——SecureRandom 的 getInstanceStrong 用 /dev/random(阻塞)——默认 getInstance 用 urandom(非阻塞)——getInstanceStrong 的阻塞风险(启动挂起)。
- **Q2：UUID 的排序?**
  - 答：UUID v4(随机,无序——第 40 题 distributed 索引效率)vs UUID v7(时间有序)——UUID 的排序与索引效率的版本选择。
- **Q3：种子管理?**
  - 答：Random(seed) 的固定种子(测试可复现——但生产禁固定种子)——种子管理的测试与生产分离。

## 总结点

1. 验证码密钥令牌,SecureRandom 必选
2. Random 可预测,安全场景禁用
3. 熵源阻塞,urandom 替代
