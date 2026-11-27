<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银测试沙盘:MockMvc 模拟 MVC 管道(不启 HTTP 服务器,无网络层)vs TestRestTemplate 真实 HTTP(含网络层、序列化、连接管理)——MockMvc 测 MVC 逻辑,真实网络测集成行为。

1. MockMvc 的覆盖:MVC 管道(参数绑定、校验、异常处理、拦截器)——不覆盖 HTTP 连接管理、Tomcat 行为、HTTPS、网络超时;真实网络的覆盖:全链路(HTTP 连接、Tomcat Filter、MVC)。
2. MockMvc 的优势:快(无服务器启动)+断言丰富(jsonPath、header)——适合 MVC 逻辑的密集测试;真实网络的优势:全链路真实性——适合关键路径冒烟与端到端。
3. 分工:MockMvc 密集测 Controller 逻辑,真实网络稀疏测关键路径——两层互补,按故障后果分配(资金路径真实网络,展示路径 MockMvc)。

## 参考分析

### 第二步扩展① 机制:MockMvc 与真实网络的覆盖差异

- MockMvc 覆盖 MVC 管道:参数绑定、校验、异常处理、拦截器——不覆盖 HTTP 连接管理、Tomcat 行为、HTTPS、网络超时。
- 真实网络覆盖全链路:HTTP 连接、Tomcat Filter、MVC——包括 MockMvc 覆盖不到的网络层。
- MockMvc 的优势是快与断言丰富。
- 真实网络的优势是全链路真实性。

### 第二步扩展② 反例:MockMvc 局限的事故

- 沙盘:MockMvc 测试全绿,但生产出现 Content-Type 编码问题——MockMvc 不走真实 HTTP 连接,编码与头处理不受测。
- 修复:关键路径用真实网络测试(TestRestTemplate)补充 MockMvc 的盲区。

### 第二步扩展③ 取舍:两层测试的分配

- MockMvc 密集测 Controller 逻辑(快、断言丰富)。
- 真实网络稀疏测关键路径(全链路真实性)。
- 分配按故障后果(第 22 题 distributed):资金路径真实网络,展示路径 MockMvc。

## 案例

### 第三步发散·验证与推演 验证:MockMvc 的断言组

- 验证:MVC 断言(MockMvc 测参数绑定校验异常处理)。
- 网络断言(真实 HTTP 测 ContentType 编码连接管理)。
- 互补断言(MockMvc 通过但真实网络发现的问题——互补价值)——三组固化两层测试的分工。

### 第三步发散·发散要点 追问链:测试三刀

- **追问①**：MockMvc 与安全——WithMockUser 模拟认证,不测真实认证流程,真实认证用集成测试
- **追问②**：运行速度——MockMvc 毫秒级,真实网络秒级,测试套件按此分层
- **追问③**：MockMvc 的 session——mockSession 模拟会话状态,Session 相关测试用 MockMvc 的 session 管理

## 总结点

1. MockMvc 测 MVC 逻辑,真实网络测集成
2. MockMvc 快,真实网络全
3. 两层互补,密集加稀疏
