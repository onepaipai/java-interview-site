import { describe, expect, it } from 'vitest';
import { learningPaths, moduleProfile } from '../../src/lib/catalog';
import type { Category } from '../../src/lib/types';

const category = (id: number, name: string) => ({ id, name, question_count: 5 }) as Category;
describe('catalog learning paths', () => {
  it('orders available modules without assuming database ids or creating missing steps', () => {
    const paths = learningPaths([
      category(82, '1.2 集合'),
      category(17, '1.1 Java 语言'),
      category(93, '自定义专题'),
      category(6, '1.5 ⭐ Spring 基础'),
    ]);
    expect(paths.map((p) => p.id)).toEqual(['core', 'backend']);
    expect(paths[0].modules.map((c) => c.id)).toEqual([17, 82]);
    expect(paths.flatMap((p) => p.modules).some((c) => c.id === 93)).toBe(false);
    expect(learningPaths([])).toEqual([]);
  });
  it('uses existing aliases and safe descriptions for unknown module names', () => {
    expect(moduleProfile('2.1 并发进阶').topics).toContain('线程池');
    expect(moduleProfile('constructor').topics).toEqual(['自定义专题']);
    expect(moduleProfile('我的 JVM 专题').description).toContain('按专题');
  });
});
