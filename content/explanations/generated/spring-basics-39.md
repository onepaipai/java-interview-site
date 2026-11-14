<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Google SRE · 1](https://sre.google/sre-book/addressing-cascading-failures/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银运维沙盘:actuator health 返回 status UP 够吗——健康检查的信息粒度 UP DOWN 整体加组件级 DB Redis MQ 加详情内部信息是否暴露。

1. 健康检查的分层 Liveness 进程活着 K8s liveness probe 重启信号;Readiness 服务可接流量 K8s readiness probe 摘流量信号;Detail 组件级 DB Redis MQ 磁盘自定义——三种探针的语义不同。
2. 暴露原则 Liveness 最少信息 UP DOWN 不暴露内部;Readiness 依赖状态依赖不可用摘流量;Detail 组件级管理端点权限保护——按暴露面分级。
3. 自定义健康指示器 CompositeHealthContributor 组合多个 HealthIndicator 加自定义 HealthIndicator 业务健康缓存命中率队列水位。

## 参考分析

### 机制:三种探针的信息分级

Liveness:进程是否活着(重启信号——最简信息,不暴露内部)。Readiness:是否可接流量(依赖状态——DB/Redis/MQ 连通性)。Detail:组件级健康(各依赖的详细状态——管理端点权限保护)。三层的信息量递增,暴露面递减——按权限分级暴露(第 44 题 distributed)。

### 反例:Detail 全量暴露的信息泄露

沙盘:/actuator/health 返回完整组件详情(DB 连接串/Redis 地址)——攻击者获取内部拓扑(第 44 题 distributed)。修复:show-details=when-authorized(认证后才显示详情)+管理端口隔离(management.server.port 独立)。

### 取舍:健康检查的性能

健康检查自身不能成为瓶颈:DB 检查用轻查询(SELECT 1)、Redis 用 ping、MQ 用连接状态——禁重查询(全表扫描/聚合)。超时:健康检查带超时(3 秒)——超时视为 DOWN(不挂死探针)。频率:K8s 每 10 秒探一次——健康检查的缓存(避免每次真实查询)。

## 案例

### 验证:健康检查的断言组

验证:分层断言(liveness 与 readiness 的端点分离 K8s 配置);组件级断言(DB Redis MQ 各自的状态 CompositeHealthContributor);安全断言(detail 端点需认证)——三组固化健康检查的暴露纪律。

### 追问链:Actuator 三刀

一刀:Actuator 的安全 management 端点的暴露加端口隔离管理端口与业务端口分离加认证管理端的认证。二刀:健康检查的依赖 HealthIndicator 查 DB 轻查询 Redis ping MQ 连接状态健康检查自身不能成为性能瓶颈轻查询加超时。三刀:指标与健康的关系 Metrics Prometheus 的指标数据 vs Health 二值状态指标看趋势健康看当前互补不替代。

## 总结点

1. liveness 管活 readiness 管流量
2. detail 按权限分级暴露
3. 健康检查自身要轻量
