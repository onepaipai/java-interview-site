<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [Java 17 规范与 API · 1](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ThreadLocal.html)

</details>

## 参考回答

1. ThreadLocal 为每个线程保存独立关联值，不按请求或任务自动重置；池线程可把旧租户状态带入下一任务。
2. ThreadLocalMap 弱引用键而强引用值，弱键失效不保证立即清理值；长寿命线程、无界大值和漏清理需共同检查。
3. 任务边界安装上下文，finally remove 或恢复旧值；嵌套调用需保留外层上下文，不能无条件清空后声称恢复完毕。

## 案例

1. 场景（教学示例）：同一线程已有外层租户 A，嵌套调用暂时切到 B，随后回到 A。

2. 保存执行线程旧值，嵌套 finally 按是否存在旧值选择恢复或 remove。

```java
var tenant=new ThreadLocal<String>(); tenant.set("A");
try {
    var old=tenant.get();
    try { tenant.set("B"); System.out.println(tenant.get()); }
    finally { if(old==null) tenant.remove(); else tenant.set(old); }
    System.out.println(tenant.get());
} finally { tenant.remove(); }
```

3. 预期：B、A；外层结束后再 remove，既不泄漏本次租户，也不破坏合法嵌套上下文。

## 总结点

1. 复用线程必须清理任务状态。
2. 嵌套上下文需要恢复旧值。
