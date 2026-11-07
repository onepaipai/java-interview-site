import type { Ref } from 'vue';
import { api } from '../../lib/api';
import { confirmAction } from '../../lib/confirm';
import type { IdResponse, Question, QuestionSummary } from '../../lib/types';

export interface EditorActionScope {
  acceptedHash: Ref<string>;
  category: Ref<string>;
  search: Ref<string>;
  page: Ref<number>;
  total: Ref<number>;
  items: Ref<QuestionSummary[]>;
  selected: Ref<Question | null>;
  error: Ref<string>;
  editor: Ref<boolean>;
  editing: Ref<Question | null>;
  title: Ref<string>;
  answer: Ref<string>;
  moduleId: Ref<string>;
  difficulty: Ref<string>;
  dirty: Ref<boolean>;
  uploading: Ref<boolean>;
  extraDirty: Ref<boolean>;
  go: (hash: string, replace?: boolean) => Promise<void>;
  applyRoute: (hash: string) => Promise<void>;
  action: (fn: () => Promise<void>, msg?: string) => Promise<void>;
  startEdit: (q: Question | null) => void;
  clearDraft: () => void;
  listLink: (p?: number) => string;
  questionLink: (id: number, p?: number) => string;
  params: (p?: number) => URLSearchParams;
  routeToken: () => number;
}

/** Editor lifecycle: entering, saving, deleting and the unsaved-changes guard. */
export function createEditorActions(scope: EditorActionScope) {
  async function leave() {
    if (!(scope.dirty.value || scope.extraDirty.value || scope.uploading.value)) {
      return true;
    }
    const discard = await confirmAction(
      '放弃未保存的修改？',
      '离开后，本次修改不会保存。',
      '放弃修改',
      true,
    );
    if (discard && scope.editor.value) {
      scope.clearDraft();
    }
    return discard;
  }
  async function adoptAi(text: string) {
    const q = scope.selected.value;
    const token = scope.routeToken();
    if (!q) {
      return;
    }
    if (text.length > 200000) {
      scope.error.value = 'AI 回答超过 200,000 个字符，请精简后再采用。';
      return;
    }
    if (
      q.answer &&
      !(await confirmAction(
        '使用 AI 回答进行编辑？',
        '已有回答会保留到你点击保存为止。',
        '进入编辑',
      ))
    ) {
      return;
    }
    if (token !== scope.routeToken() || scope.selected.value?.id !== q.id) return;
    await edit(q);
    if (
      scope.routeToken() === token + 1 &&
      scope.editor.value &&
      scope.editing.value?.id === q.id
    ) {
      scope.answer.value = text;
    }
  }
  async function edit(q: Question | null) {
    const query = scope.params();
    if (!scope.category.value && scope.search.value.trim()) {
      query.set('global', '1');
    }
    await scope.go(
      q
        ? '#/question/' + q.id + '/edit' + (query.size ? '?' + query : '')
        : '#/new' + (scope.category.value ? '?module=' + scope.category.value : ''),
    );
  }
  async function cancel() {
    await scope.go(
      scope.editing.value ? scope.questionLink(scope.editing.value.id) : scope.listLink(),
    );
  }
  function discardEditorDraft() {
    scope.clearDraft();
    scope.startEdit(scope.editing.value);
  }
  async function save() {
    if (scope.uploading.value || !scope.title.value.trim()) {
      return;
    }
    await scope.action(async () => {
      const token = scope.routeToken();
      const q = scope.editing.value;
      const result = await api<IdResponse>(
        q ? '/admin/questions/' + q.id : '/admin/questions',
        q ? 'PUT' : 'POST',
        {
          title: scope.title.value.trim(),
          categoryId: Number(scope.moduleId.value),
          answer: scope.answer.value,
          difficulty: scope.difficulty.value,
          sortOrder: q?.sort_order || 0,
          tags: q?.tags || [],
          version: q?.version,
        },
      );
      if (token !== scope.routeToken()) {
        return;
      }
      scope.editor.value = false;
      scope.clearDraft();
      scope.category.value = scope.moduleId.value;
      scope.search.value = '';
      scope.page.value = 1;
      await scope.go(
        '#/question/' + (q?.id || result.id) + '?module=' + scope.moduleId.value,
        true,
      );
    }, '题目已保存');
  }
  async function removeQuestion() {
    const q = scope.selected.value;
    if (
      !q ||
      !(await confirmAction('删除这道题目？', '题目及其回答将从题库中移除。', '删除题目', true))
    ) {
      return;
    }
    await scope.action(async () => {
      await api('/admin/questions/' + q.id, 'DELETE');
      if (scope.selected.value?.id !== q.id) {
        return;
      }
      if (scope.items.value.length === 1 && scope.page.value > 1) {
        scope.page.value--;
      }
      await scope.go(scope.listLink(), true);
    }, '题目已删除');
  }
  async function removeAnswer() {
    const q = scope.selected.value;
    if (
      !q ||
      !(await confirmAction('删除回答？', '题目会保留，可以重新编写回答。', '删除回答', true))
    ) {
      return;
    }
    await scope.action(async () => {
      await api('/admin/questions/' + q.id, 'PUT', {
        title: q.title,
        categoryId: q.category_id,
        difficulty: q.difficulty,
        answer: '',
        sortOrder: q.sort_order,
        tags: q.tags,
        version: q.version,
      });
      if (scope.selected.value?.id === q.id) {
        await scope.applyRoute(scope.acceptedHash.value);
      }
    }, '回答已删除');
  }
  return { leave, adoptAi, edit, cancel, discardEditorDraft, save, removeQuestion, removeAnswer };
}
