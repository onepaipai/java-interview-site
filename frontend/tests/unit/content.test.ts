import { describe, expect, it } from 'vitest';
import { plainContent, answerPreview, knowledgeExcerpt } from '../../src/lib/knowledge';
import { readKnowledgeRoute, knowledgeLink } from '../../src/lib/knowledgeRoute';

describe('learning text and search excerpts', () => {
  const answer =
    '<details class="explanation-references"><summary>参考资料</summary>[Raft](https://raft.test)</details>\n## 参考回答\n\n1. HashMap 并发写缺少同步。\n2. 组合更新仍需原子协议。\n\n## 案例\n实际命中在这里：merge 保护单键累计。';
  it('removes publication metadata, hidden HTML and link targets', () => {
    expect(plainContent(answer)).not.toMatch(/Raft|details|summary|https/);
    expect(
      plainContent('<script>alert(1)</script><img src=x> **结论** [说明](https://hidden.test)'),
    ).toBe('结论 说明');
  });
  it('shows answer points without replacing them with reference boilerplate', () => {
    expect(answerPreview(answer)).toBe('HashMap 并发写缺少同步。');
    expect(answerPreview('## 参考回答\n1、先给结论。\n2、补充边界。\n\n## 案例\n验证')).toBe(
      '先给结论。',
    );
    expect(answerPreview(answer)).not.toContain('案例');
    expect(
      answerPreview(
        '## 参考回答\n\n<!-- explanation:deep -->\n\n> 场景与约束：用于推演的前提。\n\n1. 超时表示结果未知。\n2. 保留原业务键查询。\n\n## 参考分析\n正文',
      ),
    ).toBe('超时表示结果未知。');
  });
  it('extracts real matched context beyond the first 600 characters', () => {
    const text = '前文'.repeat(500) + ' 独有检索词 ' + '后文'.repeat(100);
    expect(knowledgeExcerpt(text, '独有检索词', 70)).toContain('独有检索词');
    expect(knowledgeExcerpt(text, '独有检索词', 70).length).toBeLessThanOrEqual(72);
    expect(answerPreview(answer, 'merge')).toContain('merge');
  });
});

describe('knowledge workspace bookmarks', () => {
  it('round trips the view, committed query, source type, title and page', () => {
    const state = {
      view: 'library' as const,
      query: 'Raft & 日志',
      name: '事务/代理',
      kind: 'question' as const,
      page: 3,
    };
    expect(readKnowledgeRoute(knowledgeLink(state))).toEqual(state);
    expect(knowledgeLink({ view: 'search', query: '', name: '', kind: 'all', page: 1 })).toBe(
      '#/knowledge',
    );
  });
  it('normalizes untrusted bookmarks without retaining arbitrary state', () => {
    expect(readKnowledgeRoute('#/knowledge?view=invalid&kind=SQL&page=-2')).toEqual({
      view: 'search',
      query: '',
      name: '',
      kind: 'all',
      page: 1,
    });
    expect(
      readKnowledgeRoute('#/knowledge?page=999999&query=' + 'x'.repeat(4000)).query.length,
    ).toBe(3000);
    expect(readKnowledgeRoute('#/knowledge?page=999999').page).toBe(100000);
  });
});
