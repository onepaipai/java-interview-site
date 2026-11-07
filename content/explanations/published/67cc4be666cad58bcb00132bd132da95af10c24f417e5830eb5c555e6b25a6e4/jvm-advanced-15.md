<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/25/troubleshoot/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：Java 服务抛出 Metaspace 或 Compressed class space OOM，但 heap 使用并不高。区分类元数据、类加载器生命周期和动态类生成。

1. Metaspace 保存类元数据，属于 native memory；堆 OOM 的 Xmx 调整不能解决类加载器泄漏或动态类生成失控。
2. 先采集类加载数量、加载器统计、Metaspace/Compressed class space、NMT 和 heap dump，再判断容量不足还是生命周期错误。
3. 修复类卸载、代理生成、热部署和注册表引用后验证类数、Metaspace、GC 与发布循环稳定，不能只把上限调大。

## 参考分析

### 资源边界

Java heap、Metaspace、Compressed class space、Code Cache 和 direct memory 是不同区域；RSS 或容器限制还会叠加影响。 需要结合目标 JDK、固定负载、采样窗口和重复运行验证，不能只凭一次快照或单次压力结果下结论。类比仓库与图纸室是两个房间：爆的是哪个房间，处置完全不同——先看错误名字，再进对应房间对账。

### 泄漏与容量

框架确实可能加载大量类，但持续创建旧 ClassLoader、代理或脚本类而无法卸载更像生命周期问题。要看增长斜率和引用链。 需要结合目标 JDK、固定负载、采样窗口和重复运行验证，不能只凭一次快照或单次压力结果下结论。

### 止损与修复

提高 MaxMetaspaceSize 只能延后失败并增加 native 压力；短期摘流/重启要保留证据，长期清理线程、注册表和动态生成策略。 需要结合目标 JDK、固定负载、采样窗口和重复运行验证，不能只凭一次快照或单次压力结果下结论。

## 案例

### OOM 诊断

分别制造堆对象增长和类加载器增长，记录错误类型、GC、Metaspace、heap、NMT 与容器 RSS。预期两类故障证据不同。 需要结合目标 JDK、固定负载、采样窗口和重复运行验证，不能只凭一次快照或单次压力结果下结论。

### 恢复验收

修复后重复热部署并检查旧加载器、类数量和 Metaspace 是否回收；同时验证 Java heap 未被错误调参掩盖。 需要结合目标 JDK、固定负载、采样窗口和重复运行验证，不能只凭一次快照或单次压力结果下结论。

## 总结点

1. 先看错误名字，再进对应房间
2. 先定义边界和不变式
3. 证据优先于直觉判断
4. 验证恢复与异常路径
