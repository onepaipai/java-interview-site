<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Java 示例以 17 为基准；虚拟线程及历史实现按正文版本区分。

- [MIT 6.006 算法课程 · 1](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)

</details>

## 参考回答

1. 用不可达初值并从合法前驱转移，目标仍不可达则返回无解。
2. 区分最少硬币数和方案数，两者状态及循环顺序不同。

## 参考分析

1. 不可达不是合法的零硬币解，转移前需判前驱可达。
2. 最少数量与方案数量是不同状态，不能照抄同一循环解释。

## 案例

1. 场景（教学示例）：币种只有 2，目标金额 3。

2. 处理：dp[0]=0，其他为不可达；只从合法前驱加一，最后仍不可达返回 -1。

```java
int amount = 3, unreachable = amount + 1;
int[] dp = new int[amount + 1];
java.util.Arrays.fill(dp, unreachable); dp[0] = 0;
for (int s = 1; s <= amount; s++) {
    for (int c : new int[]{2}) {
        if (s >= c && dp[s-c] != unreachable)
            dp[s] = Math.min(dp[s], dp[s-c] + 1);
    }
}
System.out.println(dp[amount] == unreachable ? -1 : dp[amount]); // -1
```

3. 验证：3 无解返回 -1；0 返回 0，币种需为正，时间 O(金额×币种数)。

## 总结点

1. 不可达要有明确哨兵。
2. 转移只从合法前驱来。
