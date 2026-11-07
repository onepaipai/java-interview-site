# equals 与 hashCode 的契约为何会影响领域对象设计？

<!-- source: senior-v1/java-language/1 -->

Java 17 · [契约](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Object.html#hashCode()) · [可变键边界](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Map.html)

## 参考回答

1. equals 定义业务相等；hashCode 用于哈希定位。
2. 对象相等，哈希必须相同；哈希相同，对象未必相等。
3. 重写 equals 时同步重写 hashCode，保持字段规则一致。
4. 缓存键使用稳定身份；多租户场景同时包含租户 ID。

## 参考分析

1. 哈希容器先缩小查找范围，再判断键是否相等；碰撞不等于覆盖。
2. 修改键的相等性字段后，Map 不再保证相关行为；容器可能找不到原条目。
3. 手机号等可变属性适合作为值；tenantId、accountId 可组成不可变键。
4. 实体入库前可能没有 ID；赋 ID 前后不能随意切换已入集合对象的相等规则。
5. record 的引用字段仍可能指向可变对象；并发容器也不能修复不稳定的键。

## 案例

1. 场景：账户缓存用手机号参与键计算，修改手机号后缓存无法命中。
2. 修复：提取不可变身份，把手机号放进缓存值。

```java
record AccountKey(long tenantId, long accountId) {}

var cache = new java.util.HashMap<AccountKey, String>();
cache.put(new AccountKey(10, 1), "账户信息");

System.out.println(cache.get(new AccountKey(10, 1))); // 账户信息
System.out.println(cache.get(new AccountKey(20, 1))); // null：租户不同
```

3. 验证：等价新键能命中；不同租户不串数据；修改手机号不改变缓存身份。
4. 迁移：清理旧键，检查命中率和条目数量，防止遗留无效缓存。

## 总结点

1. 相等必同哈希，同哈希未必相等。
2. 身份作键，可变属性作值。
3. 身份含租户，缓存不串户。
