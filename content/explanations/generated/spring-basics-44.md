<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [OWASP 交易授权 · 1](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-controller/ann-methods/multipart-forms.html)

</details>

## 参考回答

1. 上传前检查身份、资源权限、请求与文件大小、数量及内容策略；客户端文件名和 MIME 都不可信，不能直接用于服务器路径。
2. 生成独立存储键并隔离存储与执行环境，下载同样执行资源授权，设置合适类型和下载响应头。

## 参考分析

1. 扩展名、声明类型、文件签名和实际解析结果应按允许的业务类型组合验证，单个检查不能证明任意文件安全。
2. 文件系统或对象存储不和普通数据库事务自动原子提交，需临时状态、确认与孤儿回收；还要考虑压缩炸弹和解析资源上限。

## 案例

1. 教学场景：头像上传带 ../ 路径名、伪装图片内容、超大文件，以及属于其他用户的目标资源。

2. 使用随机存储键和受控临时区，限制解析及像素等资源；确认数据库引用后发布，失败记录可回收状态。

3. 验证不能穿越路径、越权上传下载或执行内容；模拟元数据写失败，临时文件可回收且不会误删他人文件。

## 总结点

1. 文件名和声明类型都不可信。
2. 上传下载权限与存储恢复分开。
