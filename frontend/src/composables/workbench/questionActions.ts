import { computed } from 'vue';
import type { Ref } from 'vue';
import { api } from '../../lib/api';
import { PAGE_SIZE } from '../../lib/navigation';
import type { Page, Question, QuestionSummary } from '../../lib/types';

export interface QuestionActionScope {
  acceptedHash: Ref<string>;
  search: Ref<string>;
  category: Ref<string>;
  page: Ref<number>;
  total: Ref<number>;
  items: Ref<QuestionSummary[]>;
  selected: Ref<Question | null>;
  loading: Ref<boolean>;
  busy: Ref<boolean>;
  go: (hash: string, replace?: boolean) => Promise<void>;
  action: (fn: () => Promise<void>, msg?: string) => Promise<void>;
  listLink: (p?: number) => string;
  questionLink: (id: number, p?: number) => string;
  routeToken: () => number;
  routeSignal: () => AbortSignal | undefined;
}

/** List navigation, progress tracking and sibling-question stepping. */
export function createQuestionActions(scope: QuestionActionScope) {
  const questionIndex = computed(() =>
    scope.items.value.findIndex((q) => q.id === scope.selected.value?.id),
  );
  async function open(id: number, p = scope.page.value) {
    await scope.go(scope.questionLink(id, p));
  }
  async function updateProgress(
    question: Question,
    patch: Partial<Pick<Question, 'mastery' | 'favorite' | 'note'>>,
    reviewed = false,
    message = '学习记录已保存',
  ) {
    await scope.action(async () => {
      await api('/questions/' + question.id + '/progress', 'PUT', {
        mastery: patch.mastery ?? question.mastery,
        favorite: patch.favorite ?? question.favorite,
        note: patch.note ?? question.note,
        reviewed,
      });
      if (scope.selected.value?.id === question.id) Object.assign(scope.selected.value, patch);
      if (
        scope.acceptedHash.value.includes('weak=1') &&
        patch.mastery &&
        patch.mastery !== 'NO' &&
        patch.mastery !== 'PARTIAL'
      ) {
        const index = scope.items.value.findIndex((item) => item.id === question.id);
        if (index >= 0) {
          scope.items.value.splice(index, 1);
          scope.total.value = Math.max(0, scope.total.value - 1);
        }
      }
    }, message);
  }
  async function rateQuestion(mastery: string) {
    const question = scope.selected.value;
    if (question) await updateProgress(question, { mastery }, true, '自评已保存');
  }
  async function updateFavorite(favorite: boolean) {
    const question = scope.selected.value;
    if (question)
      await updateProgress(question, { favorite }, false, favorite ? '已加入收藏' : '已取消收藏');
  }
  async function updateNote(note: string) {
    const question = scope.selected.value;
    if (question && note !== question.note)
      await updateProgress(question, { note }, false, '笔记已保存');
  }
  async function searchAll(term: string) {
    const value = term.trim();
    if (value) {
      await scope.go('#/search?search=' + encodeURIComponent(value));
    }
  }
  async function openSearchQuestion(q: QuestionSummary, term: string, p = 1) {
    await scope.go(
      '#/question/' + q.id + '?global=1&page=' + p + '&search=' + encodeURIComponent(term),
    );
  }
  async function startReview() {
    await scope.go('#/search?weak=1');
  }
  async function openSelectedModule() {
    if (scope.selected.value) await scope.go('#/module/' + scope.selected.value.category_id);
  }
  async function paginate(delta: number) {
    if (new URL(scope.acceptedHash.value, location.origin).searchParams.get('weak') === '1') {
      await scope.go('#/search?weak=1&page=' + (scope.page.value + delta));
      return;
    }
    await scope.go(scope.listLink(scope.page.value + delta));
  }
  async function returnToList() {
    const source = new URL(scope.acceptedHash.value, location.origin);
    if (source.searchParams.get('weak') === '1') {
      const query = new URLSearchParams({ weak: '1', page: String(scope.page.value) });
      await scope.go('#/search?' + query);
      return;
    }
    if (source.searchParams.get('global') === '1') {
      const query = new URLSearchParams({ global: '1', page: String(scope.page.value) });
      if (scope.search.value) query.set('search', scope.search.value);
      await scope.go('#/search?' + query);
      return;
    }
    await scope.go(scope.listLink());
  }
  async function stepQuestion(delta: number) {
    if (scope.loading.value || scope.busy.value) return;
    const index = scope.items.value.findIndex((q) => q.id === scope.selected.value?.id);
    if (index < 0) return;
    const next = scope.items.value[index + delta];
    if (next) {
      await open(next.id);
      return;
    }
    const nextPage = scope.page.value + delta;
    if (nextPage < 1 || (nextPage - 1) * PAGE_SIZE >= scope.total.value) {
      return;
    }
    await scope.action(async () => {
      const token = scope.routeToken();
      const query = new URLSearchParams({ size: String(PAGE_SIZE), page: String(nextPage) });
      if (scope.search.value) query.set('search', scope.search.value);
      const currentUrl = new URL(scope.acceptedHash.value, location.origin);
      if (currentUrl.searchParams.get('weak') === '1') query.set('weak', 'true');
      else if (currentUrl.searchParams.get('global') === '1') query.set('global', 'true');
      else if (scope.category.value) query.set('category', scope.category.value);
      const r = await api<Page<QuestionSummary>>(
        '/questions?' + query,
        'GET',
        undefined,
        undefined,
        scope.routeSignal(),
      );
      if (token === scope.routeToken() && r.items.length) {
        await open(delta > 0 ? r.items[0].id : r.items[r.items.length - 1].id, nextPage);
      }
    });
  }
  return {
    questionIndex,
    open,
    updateProgress,
    rateQuestion,
    updateFavorite,
    updateNote,
    searchAll,
    openSearchQuestion,
    startReview,
    openSelectedModule,
    paginate,
    returnToList,
    stepQuestion,
  };
}
