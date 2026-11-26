import { describe, expect, it } from 'vitest';
import {
  importPayload,
  isImportMode,
  previewCounts,
  validImportFile,
} from '../../src/lib/adminTransfer';
import type { Preview } from '../../src/lib/types';

const preview: Preview = {
  questions: [
    {
      sourceKey: 'a'.repeat(64),
      title: '题目',
      category: '基础',
      difficulty: '基础',
      answer: '答案',
      sortOrder: 0,
      tags: [],
    },
  ],
  documents: [{ title: '资料', content: '正文' }],
  warnings: [],
};

describe('adminTransfer', () => {
  it('只接受 skip 与 update', () => {
    expect(isImportMode('skip')).toBe(true);
    expect(isImportMode('update')).toBe(true);
    expect(isImportMode('replace')).toBe(false);
    expect(isImportMode('')).toBe(false);
  });

  it('只接受不超过 6MB 的非空 md 文件', () => {
    expect(validImportFile('bank.md', 1024)).toBe(true);
    expect(validImportFile('bank.MD', 1024)).toBe(true);
    expect(validImportFile('bank.txt', 1024)).toBe(false);
    expect(validImportFile('bank.md', 0)).toBe(false);
    expect(validImportFile('bank.md', 6_000_001)).toBe(false);
  });

  it('按 mode 构造完整导入请求体', () => {
    const payload = importPayload(preview, 'update');
    expect(payload.mode).toBe('update');
    expect(payload.questions).toBe(preview.questions);
    expect(payload.documents).toBe(preview.documents);
    expect(() => importPayload(preview, 'merge')).toThrow();
  });

  it('统计预览数量', () => {
    expect(previewCounts(preview)).toEqual({ questions: 1, documents: 1 });
    expect(previewCounts(null)).toEqual({ questions: 0, documents: 0 });
  });
});
