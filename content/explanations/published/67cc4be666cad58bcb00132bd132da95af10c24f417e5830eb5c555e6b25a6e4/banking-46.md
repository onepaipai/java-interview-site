<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

教学设计场景；容量、一致性和恢复承诺需按实际约束验证。

- [TigerBeetle 账务建模 · 1](https://docs.tigerbeetle.com/coding/financial-accounting/)
- [Google SRE · 2](https://sre.google/sre-book/handling-overload/)

</details>

## 参考回答

1. 进程启动和数据库可连接不代表账务正确，应核对关键不变式、对账与未决交易。
2. 恢复点和恢复时间要用实际演练测量。

## 参考分析

1. 进程和接口恢复不证明账务正确。
2. RPO 与 RTO 要以余额、流水、在途交易及外部渠道一起验证。

## 案例

1. 场景（教学示例）：主机房失效后切换灾备，新实例可登录。

2. 处理：隔离旧主写入，核对已确认交易与复制进度，抽查及全量规则验证守恒，登记未决单。

3. 验证：没有双主扣款，恢复点和时长可证明；差异进入处置，而非只看 HTTP 200。

## 总结点

1. 灾备按业务不变量验收。
2. 旧主必须阻断写入。
