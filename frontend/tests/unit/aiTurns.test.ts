import { describe, expect, it } from 'vitest';
import { normalizeTurns, renderTurns, trimTurns, type AiTurn } from '../../src/lib/aiTurns';

const turn = (id: string, role: AiTurn['role'], content: string): AiTurn => ({ id, role, content });

describe('aiTurns', () => {
  it('裁剪到最近 max 轮', () => {
    const all = Array.from({ length: 15 }, (_, index) =>
      turn('id-' + index, 'user', '内容' + index),
    );
    expect(trimTurns(all, 12)).toHaveLength(12);
    expect(trimTurns(all, 12)[0].id).toBe('id-3');
  });

  it('兼容没有 id 的旧 sessionStorage 数据', () => {
    const value = [
      { role: 'user', content: '问题' },
      { role: 'assistant', content: '回答' },
      { role: 'other', content: '无效' },
    ];
    const result = normalizeTurns(value);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBeTruthy();
    expect(result[1].role).toBe('assistant');
  });

  it('只对新增 assistant 轮次渲染，已渲染的按 id 复用', () => {
    const cache = new Map<string, string>();
    let calls = 0;
    const render = (content: string) => {
      calls++;
      return '<p>' + content + '</p>';
    };
    const first = [turn('a', 'user', '问'), turn('b', 'assistant', '答一')];
    expect(renderTurns(first, render, cache)).toEqual([
      { ...first[0], html: '' },
      { ...first[1], html: '<p>答一</p>' },
    ]);
    expect(calls).toBe(1);

    const second = [...first, turn('c', 'user', '追问'), turn('d', 'assistant', '答二')];
    const rendered = renderTurns(second, render, cache);
    expect(calls).toBe(2);
    expect(rendered[1].html).toBe('<p>答一</p>');
    expect(rendered[3].html).toBe('<p>答二</p>');
  });

  it('裁剪后清理失效的 html 缓存', () => {
    const cache = new Map<string, string>([['old', '<p>旧</p>']]);
    renderTurns([turn('new', 'assistant', '新')], (content) => '<p>' + content + '</p>', cache);
    expect(cache.has('old')).toBe(false);
    expect(cache.has('new')).toBe(true);
  });
});
