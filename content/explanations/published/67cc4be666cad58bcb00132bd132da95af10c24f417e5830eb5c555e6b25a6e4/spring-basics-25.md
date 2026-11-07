<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-security/reference/6.5/features/authentication/password-storage.html)

</details>

## 参考回答

1. 登录验证只需比较密码，不需要恢复明文。专用密码哈希配合随机盐和可调工作成本，提高泄库后的离线猜测成本。
2. 可逆加密一旦密钥泄露可批量恢复密码；普通快速摘要即使加盐，也不等于专用密码哈希的抗猜测设计。

## 参考分析

1. 通过 PasswordEncoder.encode 和 matches 验证；带随机盐时，同一密码多次编码通常不同，不能重新编码后直接字符串比较。
2. 工作参数应在目标设备评估登录延迟和容量，并支持算法升级；密码日志、传输及在线尝试限制仍需单独保护。

## 案例

1. 教学场景：数据库原先存可解密密码，客服工具还会读取明文。

2. 改为专用 PasswordEncoder 并通过 matches 校验；设计旧密码登录后升级或强制重置，不把解密接口继续暴露。

3. 验证正确密码通过、错误密码失败，同一密码多次编码仍可验证；审计日志和响应不出现明文密码。

## 总结点

1. 验证密码不需要恢复明文。
2. 随机盐配合专用工作成本。
