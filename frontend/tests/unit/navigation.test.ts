import { describe, expect, it } from 'vitest';
import { normalizePage, pageWithinTotal } from '../../src/lib/navigation';
import { categoryGroup, categoryName } from '../../src/lib/display';

describe('bookmark and module metadata boundaries', () => {
  it('rejects fractional, negative and malformed page numbers', () => {
    for (const input of [null, '', '0', '-1', '1.5', 'NaN', 'Infinity', 'hello'])
      expect(normalizePage(input)).toBe(1);
    expect(normalizePage('2')).toBe(2);
    expect(normalizePage('100001')).toBe(100000);
  });
  it('clamps pages when deletions or filters reduce the result count', () => {
    expect(pageWithinTotal(4, 0)).toBe(1);
    expect(pageWithinTotal(4, 15)).toBe(1);
    expect(pageWithinTotal(4, 16)).toBe(2);
    expect(pageWithinTotal(2, 40)).toBe(2);
  });
  it('uses concrete technical groups and preserves custom names', () => {
    expect(categoryName('四、🔴 专家级：系统设计与架构')).toBe('系统设计案例');
    expect(categoryGroup('四、🔴 专家级：系统设计与架构')).toBe('业务与系统设计');
    expect(categoryGroup('1.4 ⭐ JVM 基础')).toBe('Java 核心');
    expect(categoryName('3.5 AI 落地')).toBe('AI 应用工程');
    expect(categoryName('3.5 我的检索实验')).toBe('我的检索实验');
    expect(categoryGroup('3.5 我的检索实验')).toBe('AI 应用');
    expect(categoryGroup('四、架构实战')).toBe('业务与系统设计');
    expect(categoryName('constructor')).toBe('constructor');
    expect(categoryGroup('自定义专题')).toBe('自定义模块');
  });
});
