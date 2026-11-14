<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Google SRE · 1](https://sre.google/sre-book/addressing-cascading-failures/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银登录沙盘:攻击者预取 Session ID,诱导受害者用该 ID 登录——身份绑定到攻击者已知的 ID,攻击者用同一 ID 冒充受害者(会话固定)。登录成功后更换 Session ID 是标准防御。

1. 攻击链:攻击者获取未登录的空 Session ID→发给受害者(链接携带)→受害者用该 ID 登录→身份绑定到攻击者已知的 ID→攻击者用同一 ID 访问冒充。防御:登录成功后 invalidate 旧 Session,创建新 Session。
2. Spring Security 默认由 SessionAuthenticationStrategy 自动处理(sessionFixation=changeSessionId);自定义认证流程需手动处理。
3. 匿名 Session 的迁移:登录时迁移匿名 Session 数据(购物车合并)+换 ID——匿名到认证的过渡处理。

## 参考分析

### 机制:会话固定的攻击链

攻击链:攻击者先访问登录页获取空 Session ID→构造钓鱼链接携带该 JSESSIONID→受害者点击并用该 ID 登录→服务端把身份绑定到攻击者已知的 ID→攻击者用同一 ID 访问,冒充受害者。防御:Spring Security 的 SessionFixationProtectionStrategy 在认证成功后自动换 ID(changeSessionId);自定义认证流程(手写 filter)需手动处理。

### 反例:无会话固定防御的事故

沙盘:网银登录不换 Session ID;攻击者发钓鱼链接携带预取的 Session ID;受害者登录;攻击者用同一 ID 访问,执行资金操作。修复:启用 SessionFixationProtectionStrategy 自动换 ID;自定义认证流程需手动调用 changeSessionId 或重建 Session。

### 取舍:会话固定防御的粒度

changeSessionId:保留 Session 数据(购物车等),只换 ID——体验好,默认推荐。invalidate+create:销毁旧 Session 全部重建——更安全但丢失匿名数据。选择:有匿名数据的先迁移再换 ID;无匿名数据直接 invalidate+create。

## 案例

### 验证:会话固定的断言组

验证:固定断言——登录前后 Session ID 相同(复现攻击面);防御断言——changeSessionId 后 ID 变化,旧 ID 不可用;Spring Security 断言——默认策略生效,认证后 ID 变化。三组固化会话固定防御。

### 追问链:会话固定三刀

一刀:Token 类的会话固定——攻击者预取 refresh token;refresh token 的生成必须随机(CSPRNG)+绑定用户。二刀:匿名 Session——购物车等匿名数据在登录时迁移合并+换 ID。三刀:多设备会话——同一用户多设备登录产生多个独立 Session,会话固定的防御按 Session 独立。

## 总结点

1. 登录换 ID,旧 ID 失效
2. Spring Security 默认处理
3. 匿名迁移数据换新 ID
