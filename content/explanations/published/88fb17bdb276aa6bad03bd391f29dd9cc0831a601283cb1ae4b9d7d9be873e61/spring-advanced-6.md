<details class="explanation-references">
<summary>适用范围与模块参考资料</summary>

Spring Framework 6.2 / Boot 3；新 API 按正文标注版本，代理与回滚前提见正文。

- [Spring Framework 6.2 参考 · 1](https://docs.spring.io/spring-framework/reference/)
- [Spring Framework 6.2 参考 · 2](https://docs.spring.io/spring-framework/docs/6.2.19/javadoc-api/)

</details>

## 参考回答

<!-- explanation:deep -->

> 场景与约束：网银额度沙盘:@Transactional 写在方法上,调用后查询日志里却没有 BEGIN;同一段代码换个入口又有事务。用实测汇总"注解无效"的全部成因与排查顺序。

1. 四大成因按概率:自调用绕过代理(实测事务生效=0)、方法非 public(代理不覆写)、类不是 Spring bean 或被 new 出来、异常被捕获且按规则不回滚(事务有,但回滚不符合预期)。
2. 排查顺序:先确认调用方持有的对象是代理 getClass().getName() 是否含 CGLIB/$Proxy,再查可见性与调用路径,最后查事务管理器是否绑定对的数据源。
3. 实测锚点:同一容器内,this 调用事务标志 0 次,经注入代理调用 1 次——注解本身永远是对的,错的在调用路径。

## 参考分析

### 第二步扩展① 机制:注解生效的四个前提

- 前提一,调用经过代理:事务是 AOP 拦截器实现的(第 1 题)。
- 前提二,方法是 public:Spring 的事务方法可见性规则要求 public(CGLIB 覆写不了非 public,注解元数据也不读 protected/package)。
- 前提三,bean 由容器管理:new 出来的对象没有代理。
- 前提四,事务管理器与数据源匹配(第 7 题)——事务"存在"但管错了库,等价于没事务。
- 前提五,事务基础设施已启用:Boot 自动配置通常已开,纯 Framework 项目漏配 @EnableTransactionManagement 或未注册 TransactionManager 时注解被完全忽略——无日志无报错,最安静的失效形态。
- 五者任缺,注解即摆设。

### 第二步扩展② 实证:代理身份与调用路径的对照

- 本机实验(Spring 6.2.19 + H2):同一 OrderService,self 调用与经 facade 代理调用的事务活跃标志:
```
Q1 自调用事务生效=0 代理调用生效=1
```
- 配合第 28 题的实测:PostConstruct 捕获的是裸类,容器中是 $$SpringCGLIB$$0 代理——"拿到的是不是代理"可以直接用类名判断。
- 排查动作序列:打印 this.getClass()→非代理即查自调用或 new。
- 是代理再查方法可见性与事务管理器绑定。

### 第二步扩展③ 取舍:让失效不再发生的工程手段

- 静态检查:ArchUnit 禁止同类内调用 @Transactional 方法、禁止 new 带事务注解的类。
- 约定:事务方法只做边界(薄),业务下沉到无注解的内部方法——边界薄了,自调用场景自然少。
- 显式边界:边界复杂的场景直接 TransactionTemplate(第 12 题),注解省掉的隐式性正是失效之源。
- 评审清单项:@Transactional 方法是否 public、调用方是否 bean、事务管理器是否唯一明确。

## 案例

### 第三步发散·验证与推演 验证:在排查入口打印 this.getClass().getNam

- 验证:在排查入口打印 this.getClass().getName():名称含 CGLIB 或 $Proxy 即代理路径,否则是自调用或 new 出来的裸对象——四个成因按"代理身份、方法可见性、bean 来源、管理器绑定"顺序逐项排除,每项一个可打印证据。

### 第三步发散·追问扩展 追问链:注解无效三刀

- **Q1：@Transactional 加在类上和方法上有什么区别?**
  - 答：类级对全部 public 方法生效,方法级覆盖类级;接口上的注解在类代理(CGLIB)模式下不生效——注解放实现类。
- **Q2：private 方法加注解 IDE 会报错吗?**
  - 答：Spring 6 起启动日志有 warn(非 public 方法的事务注解会被忽略),但很多团队日志级别看不到;静态检查更可靠。
- **Q3：事务管理器选错了会怎样?**
  - 答：事务"正常开关"但管的是另一个数据源,业务库裸奔——最难排查的形态,多数据源必须显式绑定(第 7 题)。

## 总结点

1. 注解永远没错,错在调用路径
2. 代理/public/bean/管理器,四查
3. 边界要薄,检查要进 CI
