<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；代理与回滚前提见正文。

- [OWASP 交易授权 · 1](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/reference/6.2/data-access/transaction/event.html)

</details>

## 参考回答

1. 本地数据库事务通常不包含文件或对象存储，需要处理文件成功、元数据失败等窗口。
2. 先暂存受控文件，事务保存引用或待确认状态，完成后发布，并用持久任务回收孤儿和恢复确认。

## 参考分析

1. 先写数据库也有反向窗口，应定义可解释状态，下载只开放已确认资源。
2. 补偿依据可信存储键和引用关系，不能按客户端路径删除；重复执行不能误删其他请求已经使用的对象。

## 案例

1. 教学场景：上传后提交失败留下孤儿，另一请求提交元数据后退出未完成发布。

2. 记录独立存储键和状态，在两个窗口注入故障，再重启恢复与执行受限回收。

3. 验证已发布引用不指向缺失文件，孤儿可回收，重复补偿不误删合法对象；不使用日常文件测试。

## 总结点

1. 文件与数据库不自动原子。
2. 持久状态管理确认和补偿。
