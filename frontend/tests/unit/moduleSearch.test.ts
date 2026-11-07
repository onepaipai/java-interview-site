import { describe, expect, it } from 'vitest';
import { matchesModule, moduleSearchText } from '../../src/lib/moduleSearch';
import type { Category } from '../../src/lib/types';

const concurrent = {
  id: 1,
  name: '2.1 并发进阶',
  question_count: 8,
} as Category;

describe('module search', () => {
  it('matches aliases, descriptions, and topics consistently', () => {
    expect(matchesModule(concurrent, '线程池')).toBe(true);
    expect(matchesModule(concurrent, '资源预算')).toBe(true);
    expect(matchesModule(concurrent, 'Java 并发实战')).toBe(true);
    expect(moduleSearchText(concurrent)).toContain('线程池');
  });

  it('trims whitespace and ignores case', () => {
    expect(matchesModule(concurrent, '  THREADPOOL  ')).toBe(false);
    expect(matchesModule(concurrent, '  并发  ')).toBe(true);
    expect(matchesModule(concurrent, '   ')).toBe(true);
  });
});
