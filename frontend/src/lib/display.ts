export const moduleGroups = [
  'Java 核心',
  '框架与数据存储',
  '网络与分布式',
  '工程与架构',
  '业务与系统设计',
  'AI 应用',
  '自定义模块',
];

// Preserve stored category names and source identities; alias only known built-in names.
const builtInModules: Record<string, { name: string; group: string }> = {
  '1.1 Java 语言': { name: 'Java 语言', group: 'Java 核心' },
  '1.2 集合': { name: 'Java 集合', group: 'Java 核心' },
  '1.3 并发基础': { name: 'Java 并发基础', group: 'Java 核心' },
  '1.4 ⭐ JVM 基础': { name: 'JVM 内存与 GC', group: 'Java 核心' },
  '1.5 ⭐ Spring 基础': { name: 'Spring 核心', group: '框架与数据存储' },
  '1.6 ⭐ 数据库基础': { name: 'MySQL 基础', group: '框架与数据存储' },
  '1.7 网络与其他': { name: '计算机网络', group: '网络与分布式' },
  '1.8 AI 基础': { name: '大模型基础', group: 'AI 应用' },
  '2.1 并发进阶': { name: 'Java 并发实战', group: 'Java 核心' },
  '2.2 ⭐ JVM 进阶': { name: 'JVM 诊断与调优', group: 'Java 核心' },
  '2.3 ⭐ Spring 进阶': { name: 'Spring 事务与扩展', group: '框架与数据存储' },
  '2.4 ⭐ 数据库进阶': { name: 'MySQL 性能与事务', group: '框架与数据存储' },
  '2.5 缓存与消息队列': { name: 'Redis 与消息队列', group: '框架与数据存储' },
  '2.6 手写与算法': { name: '数据结构与算法', group: '工程与架构' },
  '2.7 AI 进阶': { name: 'RAG 检索与评测', group: 'AI 应用' },
  '3.1 网银业务核心': { name: '支付与账务', group: '业务与系统设计' },
  '3.2 分布式与高并发': { name: '分布式系统', group: '网络与分布式' },
  '3.3 线上稳定性': { name: '稳定性与故障排查', group: '工程与架构' },
  '3.4 架构与工程': { name: '架构设计与工程实践', group: '工程与架构' },
  '3.5 AI 落地': { name: 'AI 应用工程', group: 'AI 应用' },
  '四、🔴 专家级：系统设计与架构': { name: '系统设计案例', group: '业务与系统设计' },
};

export function categoryName(s: string) {
  return (
    (Object.hasOwn(builtInModules, s) ? builtInModules[s]!.name : undefined) ??
    s
      .replace(/^\d+\.\d+\s*/, '')
      .replace(/^[一二三四五六七八]、\s*/, '')
      .replace(/[⭐🟢🟡🟠🔴🔵]/gu, '')
      .trim()
  );
}
export function categoryGroup(s: string) {
  if (Object.hasOwn(builtInModules, s)) return builtInModules[s]!.group;
  const prefix = s.match(/^(\d+\.\d+\s|四、)/)?.[0];
  return prefix
    ? (Object.entries(builtInModules).find(([name]) => name.startsWith(prefix))?.[1].group ??
        '自定义模块')
    : '自定义模块';
}
export const masteryLabels: Record<string, string> = {
  NEW: '未自测',
  NO: '不会',
  PARTIAL: '模糊',
  YES: '已掌握',
};
