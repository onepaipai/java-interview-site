import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useQuestionEditor } from '../../src/composables/useQuestionEditor';
import { useQuestionList } from '../../src/composables/useQuestionList';
import type { Question } from '../../src/lib/types';

describe('question state boundaries', () => {
  it('preserves the original edit version and detects unsaved changes', () => {
    const editor = useQuestionEditor(ref('2'), ref([]));
    const question = {
      id: 7,
      category_id: 2,
      title: '原题',
      answer: '原答案',
      version: 12,
    } as Question;
    editor.startEdit(question);
    expect(editor.dirty.value).toBe(false);
    editor.answer.value = '本地草稿';
    expect(editor.dirty.value).toBe(true);
    expect(editor.editing.value?.version).toBe(12);
    expect(question.answer).toBe('原答案');
    editor.startEdit(null);
    expect(editor.answer.value).toBe('');
    expect(editor.dirty.value).toBe(false);
  });
  it('uses server excerpts without requiring full answers or notes', () => {
    const list = useQuestionList();
    list.items.value = [
      {
        id: 1,
        title: 'Raft',
        category_id: 2,
        category: '分布式',
        preview: '日志匹配',
        answered: true,
      } as never,
    ];
    expect(list.questionPreviews.value.get(1)).toBe('日志匹配');
    expect(list.searchGroups.value[0].name).toBe('分布式');
    expect(list.items.value[0]).not.toHaveProperty('answer');
  });
});
