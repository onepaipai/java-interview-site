<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [Redis 官方文档 · 1](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/)
- [Redis 官方文档 · 2](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 17 / Redis 7 Cluster 教学场景：Multi-key 命令报 CROSSSLOT 错误、Lua 脚本跨槽失败。理解 CRC16(key) mod 16384 的槽分配规则、hash tag 的用法与"同槽聚合"的双刃剑。

1. 槽分配规则：slot = CRC16(key) mod 16384——key 到槽的映射是确定性的，业务无法选择（除非 hash tag）；key 的归属决定它落在哪个分片，从而决定"哪些 key 能在同一原子操作中"。
2. hash tag：key 中 `{...}` 内的部分作为哈希输入（如 {user1000}.profile 与 {user1000}.orders 同槽）——Multi-key 操作与 Lua 的前提。代价：同槽的 key 集中在同一分片，tag 设计不当会制造热点分片。
3. 设计纪律：需要原子/事务/Lua 的 key 组用 hash tag 显式聚合；无此需求的 key 保持自然分布（避免人为倾斜）；tag 的粒度按"原子操作的 key 组"划，不按业务大类划。

## 参考分析

### 第二步扩展① 机制：槽是"原子操作的物理边界"

- Redis Cluster 的原子命令、事务、Lua 都只在单槽（单实例）内有效——跨槽即 CROSSSLOT。
- 类比分行系统：同分行的转账即时到账，跨行走清算流程——业务设计要按"哪些操作需要原子"决定账户开在哪个分行。
- hash tag 就是"开户行选择"。

### 第二步扩展② 反例：大粒度 tag 的热点分片

- 把 {order} 作为全部订单的 tag：所有订单 key 落同一分片——16384 个槽只用一个，Cluster 退化单机且该分片过载。
- 修正：tag 粒度到 {order:1000}（具体订单/用户级），同订单的关联 key 同槽、不同订单自然分散。
- tag 粒度=原子操作范围，不是业务大类。

### 第二步扩展③ 取舍：slot 迁移的运维感知

- 槽在分片间迁移（扩缩容）时，迁移中的 key 访问有 ASK 重定向开销，大键迁移阻塞（第 7 题联动）。
- 业务侧表现为偶发延迟。
- 治理：迁移安排低峰、大键预先拆分、客户端使用支持 MOVED/ASK 的智能驱动。
- 槽机制把"扩缩容"变成可在线操作的能力——这是 Cluster 相对客户端分片的本质优势。

## 案例

### 第三步发散·验证与推演 对照操作：CROSSSLOT 与 hash tag 的对照

- 教学验证：MSET key1 key2（跨槽报错）→ 改 {tag}key1 {tag}key2（成功）。
- 再用 Lua 跨槽脚本验证失败、同槽成功。
- 实验可复跑，把"槽边界=原子边界"变成亲手触发的错误。

### 第三步发散·追问① 追问：为什么"每实例一个 slot 范围"比"客户端按业务分片"好

- 客户端分片的映射在应用代码里（扩缩容要改代码重分片）。
- Cluster 的槽映射在数据层且支持在线迁移（扩容只搬槽不动代码）。
- 业务无感的弹性是槽机制的核心价值——hash tag 与 MULTI-key 约束是为了原子性付出的最小代价。

## 总结点

1. 槽是原子的物理边界
2. hash tag 粒度到原子操作组
3. 大粒度 tag 制造热点分片
