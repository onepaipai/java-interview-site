import { categoryName } from './display';
import type { Category } from './types';

type ModuleProfile = { description: string; topics: string[]; icon: string };
const profiles: Record<string, ModuleProfile> = {
  'Java 语言': {
    description: '从类型、对象与 API 边界建立语言基础。',
    topics: ['泛型与类型', '对象设计', '异常处理'],
    icon: 'book',
  },
  'Java 集合': {
    description: '把数据结构、操作成本与并发边界串起来。',
    topics: ['Map 与 Set', '复杂度', '并发容器'],
    icon: 'grid',
  },
  'Java 并发基础': {
    description: '理解线程协作、可见性与原子性。',
    topics: ['内存模型', '锁与协作', '线程本地状态'],
    icon: 'layers',
  },
  'JVM 内存与 GC': {
    description: '理解对象分配、运行时内存与回收机制。',
    topics: ['内存区域', '类加载', '垃圾回收'],
    icon: 'chart',
  },
  'Java 并发实战': {
    description: '用资源预算与失败路径分析并发方案。',
    topics: ['线程池', '任务取消', '并发协议'],
    icon: 'clock',
  },
  'JVM 诊断与调优': {
    description: '从运行证据定位内存和停顿问题。',
    topics: ['GC 日志', '内存排查', '性能对照'],
    icon: 'chart',
  },
  'Spring 核心': {
    description: '沿着容器、代理与依赖边界理解框架。',
    topics: ['Bean 生命周期', '依赖注入', 'AOP'],
    icon: 'layers',
  },
  'MySQL 基础': {
    description: '建立索引、SQL 与事务的基本判断。',
    topics: ['索引访问', 'SQL', '事务隔离'],
    icon: 'grid',
  },
  'Spring 事务与扩展': {
    description: '辨别事务边界、传播行为与扩展时机。',
    topics: ['事务代理', '传播与回滚', '扩展点'],
    icon: 'layers',
  },
  'MySQL 性能与事务': {
    description: '结合执行计划与并发顺序解释数据库行为。',
    topics: ['执行计划', '锁与快照', '性能诊断'],
    icon: 'chart',
  },
  'Redis 与消息队列': {
    description: '比较缓存与消息方案的收益和一致性成本。',
    topics: ['缓存回源', '消息可靠性', '消费语义'],
    icon: 'grid',
  },
  计算机网络: {
    description: '从协议交互解释连接、超时与传输行为。',
    topics: ['TCP', 'HTTP', '连接与超时'],
    icon: 'layers',
  },
  分布式系统: {
    description: '围绕身份、状态与故障建立分布式判断。',
    topics: ['幂等与重试', '协调协议', '一致性'],
    icon: 'layers',
  },
  数据结构与算法: {
    description: '从不变式与边界条件推导解题过程。',
    topics: ['复杂度', '数据结构', '算法推导'],
    icon: 'code',
  },
  稳定性与故障排查: {
    description: '先保留证据，再定位、止损与验证恢复。',
    topics: ['故障时间线', '资源隔离', '可观测性'],
    icon: 'chart',
  },
  架构设计与工程实践: {
    description: '在约束、职责和演进成本之间做选择。',
    topics: ['模块边界', 'API 契约', '架构取舍'],
    icon: 'grid',
  },
  支付与账务: {
    description: '从资金不变式分析交易状态与恢复。',
    topics: ['账务模型', '支付状态', '对账与恢复'],
    icon: 'file',
  },
  系统设计案例: {
    description: '把需求澄清、容量与失败推演组合成方案。',
    topics: ['约束澄清', '容量估算', '故障推演'],
    icon: 'layers',
  },
  大模型基础: {
    description: '理解模型能力、上下文与生成边界。',
    topics: ['模型概念', '上下文', '生成与限制'],
    icon: 'book',
  },
  'RAG 检索与评测': {
    description: '以证据召回与回答质量检验检索方案。',
    topics: ['切分与召回', '重排', '评测'],
    icon: 'search',
  },
  'AI 应用工程': {
    description: '把权限、成本与故障保护纳入 AI 应用。',
    topics: ['租户权限', '工具边界', '生产保护'],
    icon: 'code',
  },
};
export function moduleProfile(name: string): ModuleProfile {
  const label = categoryName(name);
  return Object.hasOwn(profiles, label)
    ? profiles[label]
    : {
        description: '按专题整理题目，结合原理与案例逐步学习。',
        topics: ['自定义专题'],
        icon: 'book',
      };
}

const paths = [
  {
    id: 'core',
    title: 'Java 基础与运行机制',
    audience: '建立基础',
    description: '先掌握语言与数据结构，再理解并发和运行时。',
    names: ['Java 语言', 'Java 集合', '数据结构与算法', 'Java 并发基础', 'JVM 内存与 GC'],
  },
  {
    id: 'backend',
    title: '框架与数据库',
    audience: '后端开发',
    description: '从框架使用走向事务边界与数据访问机制。',
    names: ['Spring 核心', 'MySQL 基础', 'Spring 事务与扩展', 'MySQL 性能与事务'],
  },
  {
    id: 'distributed',
    title: '高并发与稳定性',
    audience: '工程进阶',
    description: '将资源预算、协议与故障排查连成一条线。',
    names: [
      '计算机网络',
      'Java 并发实战',
      'Redis 与消息队列',
      '分布式系统',
      'JVM 诊断与调优',
      '稳定性与故障排查',
    ],
  },
  {
    id: 'design',
    title: '架构与业务设计',
    audience: '综合应用',
    description: '从业务约束出发，练习方案比较与故障推演。',
    names: ['架构设计与工程实践', '支付与账务', '系统设计案例'],
  },
  {
    id: 'ai',
    title: 'AI 应用开发',
    audience: '专题拓展',
    description: '先理解模型边界，再检验检索证据与生产保护。',
    names: ['大模型基础', 'RAG 检索与评测', 'AI 应用工程'],
  },
];

/** Suggested paths only use modules that exist; custom modules stay in the full catalog. */
export function learningPaths(categories: Category[]) {
  return paths
    .map((path) => ({
      ...path,
      modules: path.names.flatMap((name) =>
        categories.filter((c) => categoryName(c.name) === name),
      ),
    }))
    .filter((path) => path.modules.length);
}
