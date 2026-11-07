import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { markdown } from '../lib/markdown';
import { renderAnswer } from '../lib/answer';
import { useQuestionEditor } from './useQuestionEditor';
import { useQuestionList } from './useQuestionList';
import ModuleNavigator from '../components/ModuleNavigator.vue';
import GlobalSearch from '../components/GlobalSearch.vue';
import { readSetting, saveSetting, readScrollPositions, saveScrollPositions } from '../lib/storage';
import { copyCodeButton } from '../lib/clipboard';
import { confirmAction } from '../lib/confirm';
import { api, ApiError } from '../lib/api';
import { normalizePage, pageWithinTotal, PAGE_SIZE } from '../lib/navigation';
import type { Question, QuestionSummary, Category, Page, IdResponse } from '../lib/types';
import { useSession } from './useSession';
import { useLearning } from './useLearning';
export function useWorkbench() {
  const { user, restore, authenticate, signOut } = useSession();
  const imageDialog = ref<HTMLDialogElement>();
  const imageUrl = ref('');
  const imageAlt = ref('');
  const moduleNavigation = ref<InstanceType<typeof ModuleNavigator>>();
  const globalSearch = ref<InstanceType<typeof GlobalSearch>>();
  const ready = ref(false);
  const tab = ref('questions');
  const username = ref('');
  const password = ref('');
  const error = ref('');
  const notice = ref('');
  const busy = ref(false);
  const loading = ref(false);
  const categories = ref<Category[]>([]);
  const {
    items,
    total,
    page,
    search,
    searchDraft,
    category,
    searched,
    searchGroups,
    questionPreviews,
  } = useQuestionList();
  const selected = ref<Question | null>(null);
  const { practice } = useLearning();
  watch(selected, (question) => {
    if (question && user.value) {
      saveSetting(
        'zhixu-resume-' + user.value.id,
        JSON.stringify({ id: question.id, title: question.title }),
      );
    }
  });
  const tabTitles: Record<string, string> = {
    questions: '题库',
    knowledge: '知识库',
    modules: '模块管理',
    accounts: '账号管理',
    password: '密码设置',
  };
  watch(
    [tab, selected],
    ([current, question]) => {
      document.title = question
        ? question.title + ' · 知序'
        : (tabTitles[current] ?? '知识与问答') + ' · 知序';
    },
    { immediate: true },
  );
  const extraDirty = ref(false);
  const {
    editor,
    editing,
    title,
    moduleId,
    answer,
    baseline,
    difficulty,
    draftRestored,
    questionUploading,
    answerUploading,
    titleExpanded,
    uploading,
    dirty,
    startEdit,
    clearDraft,
  } = useQuestionEditor(category, categories);
  const sidebarCollapsed = ref(readSetting('zhixu-sidebar') === 'collapsed');
  const acceptedHash = ref(window.location.hash || '#/catalog');
  const admin = computed(() => user.value?.role === 'ADMIN');
  const currentModule = computed(() =>
    categories.value.find((c) => String(c.id) === category.value),
  );
  const renderedQuestion = computed(() => markdown(selected.value?.title || ''));
  const rendered = computed(() => renderAnswer(selected.value?.answer || ''));
  const answerOutline = computed(() => {
    if (
      (selected.value?.answer.length || 0) < 400 &&
      !rendered.value.includes('explanation-content')
    ) {
      return [];
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = rendered.value;
    const headings = Array.from(wrapper.querySelectorAll('h1,h2,h3')).map((h) => ({
      id: h.id,
      label: h.textContent || '',
      level: Number(h.tagName[1]),
    }));
    return headings.length >= 2 ? headings : [];
  });
  let historyIndex = Number(history.state?.zhixuIndex) || 0;
  let routeSequence = 0;
  let listSequence = 0;
  let routeController: AbortController | undefined;
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  const scrollPositions = readScrollPositions();
  watch(notice, (v) => {
    clearTimeout(noticeTimer);
    if (v) {
      noticeTimer = setTimeout(() => (notice.value = ''), 4000);
    }
  });
  function plain(s: string) {
    const element = document.createElement('div');
    element.innerHTML = markdown(s);
    element.querySelectorAll('.code-header').forEach((h) => h.remove());
    element.querySelectorAll('img').forEach((i) => i.replaceWith(i.alt));
    return (element.textContent || '').replace(/\s+/g, ' ').trim();
  }
  async function adoptAi(text: string) {
    const q = selected.value;
    const token = routeSequence;
    if (!q) {
      return;
    }
    if (text.length > 200000) {
      error.value = 'AI 回答超过 200,000 个字符，请精简后再采用。';
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
    if (token !== routeSequence || selected.value?.id !== q.id) return;
    await edit(q);
    if (routeSequence === token + 1 && editor.value && editing.value?.id === q.id) {
      answer.value = text;
    }
  }
  function success(text: string) {
    notice.value = text;
  }
  function remember() {
    scrollPositions[acceptedHash.value] = window.scrollY;
    saveScrollPositions(scrollPositions);
  }
  function params(p = page.value) {
    const q = new URLSearchParams();
    if (category.value) {
      q.set('module', category.value);
    }
    if (search.value.trim()) {
      q.set('search', search.value.trim());
    }
    if (p > 1) {
      q.set('page', String(p));
    }
    return q;
  }
  function listLink(p = page.value) {
    const q = params(p);
    if (category.value) q.delete('module');
    const source = new URL(acceptedHash.value, location.origin);
    const weak = source.searchParams.get('weak') === '1';
    const global = source.searchParams.get('global') === '1';
    if (weak) q.set('weak', '1');
    if (global) q.set('global', '1');
    return (
      (weak
        ? '#/search'
        : category.value
          ? '#/module/' + category.value
          : search.value.trim()
            ? '#/search'
            : '#/catalog') + (q.size ? '?' + q : '')
    );
  }
  function questionLink(id: number, p = page.value) {
    const q = params(p);
    const source = new URL(acceptedHash.value, location.origin);
    if (!category.value && search.value.trim()) q.set('global', '1');
    if (source.searchParams.get('weak') === '1') q.set('weak', '1');
    if (source.searchParams.get('global') === '1') q.set('global', '1');
    return '#/question/' + id + (q.size ? '?' + q : '');
  }
  async function leave() {
    if (!(dirty.value || extraDirty.value || uploading.value)) {
      return true;
    }
    const discard = await confirmAction(
      '放弃未保存的修改？',
      '离开后，本次修改不会保存。',
      '放弃修改',
      true,
    );
    if (discard && editor.value) {
      clearDraft();
    }
    return discard;
  }
  async function go(hash: string, replace = false) {
    if (!(await leave())) {
      return;
    }
    remember();
    moduleNavigation.value?.close();
    if (replace) {
      history.replaceState({ zhixuIndex: historyIndex }, '', hash);
    } else if (hash !== acceptedHash.value) {
      history.pushState({ zhixuIndex: ++historyIndex }, '', hash);
    }
    await applyRoute(hash);
  }
  async function browserRoute() {
    const hash = window.location.hash || '#/catalog';
    if (hash === acceptedHash.value) {
      return;
    }
    if (!(await leave())) {
      const targetIndex = history.state?.zhixuIndex;
      if (typeof targetIndex === 'number' && targetIndex !== historyIndex) {
        history.go(historyIndex - targetIndex);
      } else {
        history.pushState({ zhixuIndex: historyIndex }, '', acceptedHash.value);
      }
      return;
    }
    remember();
    if (typeof history.state?.zhixuIndex === 'number') {
      historyIndex = history.state.zhixuIndex;
    }
    await applyRoute(hash);
  }
  async function applyRoute(hash: string) {
    const token = ++routeSequence;
    routeController?.abort();
    routeController = new AbortController();
    const routeSignal = routeController.signal;
    ++listSequence;
    acceptedHash.value = hash;
    moduleNavigation.value?.close();
    extraDirty.value = false;
    const url = new URL(hash.slice(1) || '/catalog', location.origin);
    loading.value = true;
    error.value = '';
    selected.value = null;
    editor.value = false;
    items.value = [];
    searched.value = false;
    category.value = url.searchParams.get('module') || '';
    search.value = url.searchParams.get('search') || '';
    searchDraft.value = search.value;
    page.value = normalizePage(url.searchParams.get('page'));
    try {
      const cats = await api<Category[]>('/categories', 'GET', undefined, undefined, routeSignal);
      if (token !== routeSequence) {
        return;
      }
      categories.value = cats;
      const match = url.pathname.match(/^\/question\/(\d+)(\/edit)?$/);
      const moduleMatch = url.pathname.match(/^\/module\/(\d+)$/);
      if (
        (url.pathname === '/accounts' ||
          url.pathname === '/modules' ||
          url.pathname === '/knowledge' ||
          url.pathname === '/new' ||
          match?.[2]) &&
        !admin.value
      ) {
        history.replaceState({ zhixuIndex: historyIndex }, '', '#/catalog');
        await applyRoute('#/catalog');
        return;
      }
      if (url.pathname === '/knowledge') {
        tab.value = 'knowledge';
      } else if (url.pathname === '/modules') {
        tab.value = 'modules';
      } else if (url.pathname === '/accounts') {
        tab.value = 'accounts';
      } else if (url.pathname === '/password') {
        tab.value = 'password';
      } else {
        tab.value = 'questions';
        if (moduleMatch) {
          category.value = moduleMatch[1];
        }
        searched.value = url.pathname === '/search' || url.searchParams.get('weak') === '1';
        if (!match && category.value && !cats.some((c) => String(c.id) === category.value)) {
          throw new Error('模块不存在或已删除，请返回知识目录。');
        }
        if (match) {
          const q = await api<Question>(
            '/questions/' + match[1],
            'GET',
            undefined,
            undefined,
            routeSignal,
          );
          if (token !== routeSequence) {
            return;
          }
          selected.value = q;
          if (url.searchParams.get('global') !== '1' && url.searchParams.get('weak') !== '1') {
            category.value = String(q.category_id);
          } else {
            category.value = '';
            searched.value = url.searchParams.get('weak') === '1';
          }
          // Links can outlive edits, moves and deletions. Resolve against today's list,
          // including when an old URL supplied a now-stale page number.
          {
            const locationScope = new URLSearchParams({
              size: String(PAGE_SIZE),
              search: search.value,
              global: String(url.searchParams.get('global') === '1'),
              weak: String(url.searchParams.get('weak') === '1'),
            });
            if (category.value) locationScope.set('category', category.value);
            const isWeakRoute = url.searchParams.get('weak') === '1';
            let location;
            try {
              location = await api<{ page: number; index: number; total: number }>(
                '/questions/' + q.id + '/location?' + locationScope,
                'GET',
                undefined,
                undefined,
                routeSignal,
              );
            } catch (e) {
              if (token !== routeSequence) return;
              if (!(e instanceof ApiError) || e.status !== 404) throw e;
              if (isWeakRoute) {
                throw new Error('这道题已不在待复习队列中，请返回列表继续。');
              }
              category.value = String(q.category_id);
              search.value = searchDraft.value = '';
              location = await api<{ page: number; index: number; total: number }>(
                '/questions/' + q.id + '/location?size=' + PAGE_SIZE + '&category=' + q.category_id,
                'GET',
                undefined,
                undefined,
                routeSignal,
              );
            }
            if (token !== routeSequence) {
              return;
            }
            page.value = location.page;
          }
          if (match[2]) {
            startEdit(q);
            const canonical = questionLink(q.id).replace(
              '/question/' + q.id,
              '/question/' + q.id + '/edit',
            );
            acceptedHash.value = canonical;
            history.replaceState({ zhixuIndex: historyIndex }, '', canonical);
          }
        }
        if (url.pathname === '/new') {
          startEdit(null);
        }
        const weakOnly = url.searchParams.get('weak') === '1';
        const globalSearch = url.pathname === '/search' && !!search.value && !weakOnly;
        if (!editor.value && (category.value || searched.value || match)) {
          const listQuery = () => {
            const query = new URLSearchParams({
              size: String(PAGE_SIZE),
              page: String(page.value),
              search: search.value,
            });
            if (weakOnly) query.set('weak', 'true');
            if (globalSearch) query.set('global', 'true');
            if (category.value) query.set('category', category.value);
            return '/questions?' + query;
          };
          let result = await api<Page<QuestionSummary>>(
            listQuery(),
            'GET',
            undefined,
            undefined,
            routeSignal,
          );
          if (token !== routeSequence) {
            return;
          }
          const validPage = pageWithinTotal(page.value, result.total);
          if (!match && validPage !== page.value) {
            page.value = validPage;
            result = await api<Page<QuestionSummary>>(
              listQuery(),
              'GET',
              undefined,
              undefined,
              routeSignal,
            );
            if (token !== routeSequence) return;
          }
          items.value = result.items;
          total.value = result.total;
          // Keep reload, browser history and scroll keys aligned with the corrected scope.
          const canonical = match ? questionLink(Number(match[1])) : listLink();
          if (canonical !== hash) {
            acceptedHash.value = canonical;
            history.replaceState({ zhixuIndex: historyIndex }, '', canonical);
          }
        }
      }
    } catch (e) {
      if (token === routeSequence) {
        error.value = e instanceof Error ? e.message : '内容加载失败';
      }
    } finally {
      if (token === routeSequence) {
        loading.value = false;
        await nextTick();
        if (token === routeSequence) window.scrollTo(0, scrollPositions[acceptedHash.value] || 0);
      }
    }
  }
  async function action(fn: () => Promise<void>, msg = '') {
    if (busy.value) {
      return;
    }
    error.value = '';
    busy.value = true;
    const token = routeSequence;
    try {
      await fn();
      if (msg) {
        success(msg);
      }
    } catch (e) {
      if (token === routeSequence) {
        error.value = e instanceof Error ? e.message : '操作失败，请重试';
      }
    } finally {
      busy.value = false;
    }
  }
  async function login() {
    await action(async () => {
      await authenticate(username.value, password.value);
      password.value = '';
      if (!window.location.hash) {
        history.replaceState({ zhixuIndex: historyIndex }, '', '#/catalog');
      }
      await applyRoute(window.location.hash);
    });
  }
  async function logout() {
    if (!(await leave())) {
      return;
    }
    await action(async () => {
      await signOut();
      editor.value = false;
      selected.value = null;
      history.replaceState({ zhixuIndex: historyIndex }, '', '#/catalog');
      acceptedHash.value = '#/catalog';
    });
  }
  async function navigate(next: string) {
    await go(next === 'questions' ? '#/catalog' : '#/' + next);
  }
  async function chooseModule(c: Category) {
    await go('#/module/' + c.id);
  }
  async function moduleHome() {
    await go('#/catalog');
  }
  async function filter() {
    const term = searchDraft.value.trim();
    const path = category.value ? '#/module/' + category.value : term ? '#/search' : '#/catalog';
    await go(path + (term ? '?' + new URLSearchParams({ search: term }) : ''));
  }
  async function paginate(delta: number) {
    if (new URL(acceptedHash.value, location.origin).searchParams.get('weak') === '1') {
      await go('#/search?weak=1&page=' + (page.value + delta));
      return;
    }
    await go(listLink(page.value + delta));
  }
  async function open(id: number, p = page.value) {
    await go(questionLink(id, p));
  }
  async function returnToList() {
    const source = new URL(acceptedHash.value, location.origin);
    if (source.searchParams.get('weak') === '1') {
      const query = new URLSearchParams({ weak: '1', page: String(page.value) });
      await go('#/search?' + query);
      return;
    }
    if (source.searchParams.get('global') === '1') {
      const query = new URLSearchParams({ global: '1', page: String(page.value) });
      if (search.value) query.set('search', search.value);
      await go('#/search?' + query);
      return;
    }
    await go(listLink());
  }
  async function openSelectedModule() {
    if (selected.value) await go('#/module/' + selected.value.category_id);
  }
  async function startReview() {
    await go('#/search?weak=1');
  }
  async function updateProgress(
    question: Question,
    patch: Partial<Pick<Question, 'mastery' | 'favorite' | 'note'>>,
    reviewed = false,
    message = '学习记录已保存',
  ) {
    await action(async () => {
      await api('/questions/' + question.id + '/progress', 'PUT', {
        mastery: patch.mastery ?? question.mastery,
        favorite: patch.favorite ?? question.favorite,
        note: patch.note ?? question.note,
        reviewed,
      });
      if (selected.value?.id === question.id) Object.assign(selected.value, patch);
      if (
        acceptedHash.value.includes('weak=1') &&
        patch.mastery &&
        patch.mastery !== 'NO' &&
        patch.mastery !== 'PARTIAL'
      ) {
        const index = items.value.findIndex((item) => item.id === question.id);
        if (index >= 0) {
          items.value.splice(index, 1);
          total.value = Math.max(0, total.value - 1);
        }
      }
    }, message);
  }
  async function rateQuestion(mastery: string) {
    const question = selected.value;
    if (question) await updateProgress(question, { mastery }, true, '自评已保存');
  }
  async function updateFavorite(favorite: boolean) {
    const question = selected.value;
    if (question)
      await updateProgress(question, { favorite }, false, favorite ? '已加入收藏' : '已取消收藏');
  }
  async function updateNote(note: string) {
    const question = selected.value;
    if (question && note !== question.note)
      await updateProgress(question, { note }, false, '笔记已保存');
  }
  async function searchAll(term: string) {
    const value = term.trim();
    if (value) {
      await go('#/search?search=' + encodeURIComponent(value));
    }
  }
  async function openSearchQuestion(q: QuestionSummary, term: string, p = 1) {
    await go('#/question/' + q.id + '?global=1&page=' + p + '&search=' + encodeURIComponent(term));
  }
  async function showSearch() {
    await nextTick();
    if (globalSearch.value) {
      await globalSearch.value.open();
    } else {
      error.value = '搜索尚未就绪，请稍后重试';
    }
  }
  async function toggleSidebar() {
    if (window.innerWidth <= 900) {
      await nextTick();
      moduleNavigation.value?.open();
    } else {
      sidebarCollapsed.value = !sidebarCollapsed.value;
      saveSetting('zhixu-sidebar', sidebarCollapsed.value ? 'collapsed' : 'expanded');
    }
  }
  async function edit(q: Question | null) {
    const query = params();
    if (!category.value && search.value.trim()) {
      query.set('global', '1');
    }
    await go(
      q
        ? '#/question/' + q.id + '/edit' + (query.size ? '?' + query : '')
        : '#/new' + (category.value ? '?module=' + category.value : ''),
    );
  }
  async function cancel() {
    await go(editing.value ? questionLink(editing.value.id) : listLink());
  }
  /** 版本冲突后的重载：用户已明确选择，跳过放弃确认并保留本地草稿供恢复。 */
  async function reloadEditor() {
    history.replaceState({ zhixuIndex: historyIndex }, '', acceptedHash.value);
    await applyRoute(acceptedHash.value);
  }
  function discardEditorDraft() {
    clearDraft();
    startEdit(editing.value);
  }
  async function save() {
    if (uploading.value || !title.value.trim()) {
      return;
    }
    await action(async () => {
      const token = routeSequence;
      const q = editing.value;
      const result = await api<IdResponse>(
        q ? '/admin/questions/' + q.id : '/admin/questions',
        q ? 'PUT' : 'POST',
        {
          title: title.value.trim(),
          categoryId: Number(moduleId.value),
          answer: answer.value,
          difficulty: difficulty.value,
          sortOrder: q?.sort_order || 0,
          tags: q?.tags || [],
          version: q?.version,
        },
      );
      if (token !== routeSequence) {
        return;
      }
      editor.value = false;
      clearDraft();
      category.value = moduleId.value;
      search.value = '';
      page.value = 1;
      await go('#/question/' + (q?.id || result.id) + '?module=' + moduleId.value, true);
    }, '题目已保存');
  }
  async function removeQuestion() {
    const q = selected.value;
    if (
      !q ||
      !(await confirmAction('删除这道题目？', '题目及其回答将从题库中移除。', '删除题目', true))
    ) {
      return;
    }
    await action(async () => {
      await api('/admin/questions/' + q.id, 'DELETE');
      if (selected.value?.id !== q.id) {
        return;
      }
      if (items.value.length === 1 && page.value > 1) {
        page.value--;
      }
      await go(listLink(), true);
    }, '题目已删除');
  }
  async function removeAnswer() {
    const q = selected.value;
    if (
      !q ||
      !(await confirmAction('删除回答？', '题目会保留，可以重新编写回答。', '删除回答', true))
    ) {
      return;
    }
    await action(async () => {
      await api('/admin/questions/' + q.id, 'PUT', {
        title: q.title,
        categoryId: q.category_id,
        difficulty: q.difficulty,
        answer: '',
        sortOrder: q.sort_order,
        tags: q.tags,
        version: q.version,
      });
      if (selected.value?.id === q.id) {
        await applyRoute(acceptedHash.value);
      }
    }, '回答已删除');
  }
  async function stepQuestion(delta: number) {
    if (loading.value || busy.value) return;
    const index = items.value.findIndex((q) => q.id === selected.value?.id);
    if (index < 0) return;
    const next = items.value[index + delta];
    if (next) {
      await open(next.id);
      return;
    }
    const nextPage = page.value + delta;
    if (nextPage < 1 || (nextPage - 1) * PAGE_SIZE >= total.value) {
      return;
    }
    await action(async () => {
      const token = routeSequence;
      const query = new URLSearchParams({ size: String(PAGE_SIZE), page: String(nextPage) });
      if (search.value) query.set('search', search.value);
      const currentUrl = new URL(acceptedHash.value, location.origin);
      if (currentUrl.searchParams.get('weak') === '1') query.set('weak', 'true');
      else if (currentUrl.searchParams.get('global') === '1') query.set('global', 'true');
      else if (category.value) query.set('category', category.value);
      const r = await api<Page<QuestionSummary>>(
        '/questions?' + query,
        'GET',
        undefined,
        undefined,
        routeController?.signal,
      );
      if (token === routeSequence && r.items.length) {
        await open(delta > 0 ? r.items[0].id : r.items[r.items.length - 1].id, nextPage);
      }
    });
  }
  const questionIndex = computed(() => items.value.findIndex((q) => q.id === selected.value?.id));
  async function copyCode(e: MouseEvent) {
    const image = (e.target as Element).closest<HTMLImageElement>('.markdown img');
    if (image) {
      imageUrl.value = image.src;
      imageAlt.value = image.alt;
      await nextTick();
      imageDialog.value?.showModal();
      return;
    }
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-copy-code]');
    if (!b) {
      return;
    }
    await copyCodeButton(b);
  }
  function jumpTo(id: string) {
    const heading = document.getElementById(id);
    if (!heading) return;
    heading.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
  function unload(e: BeforeUnloadEvent) {
    if (dirty.value || extraDirty.value || uploading.value) {
      e.preventDefault();
      e.returnValue = '';
    }
  }
  function expired() {
    routeController?.abort();
    routeSequence++;
    listSequence++;
    user.value = null;
    loading.value = false;
  }
  function shortcut(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !e.isComposing && user.value) {
      e.preventDefault();
      if (document.querySelector('dialog[open]')) {
        return;
      }
      void showSearch();
    }
  }
  function knowledgeRouteChanged() {
    if (
      tab.value === 'knowledge' &&
      !loading.value &&
      window.location.hash.startsWith('#/knowledge')
    ) {
      acceptedHash.value = window.location.hash;
    }
  }
  onMounted(async () => {
    history.scrollRestoration = 'manual';
    history.replaceState({ zhixuIndex: historyIndex }, '', window.location.href);
    window.addEventListener('beforeunload', unload);
    window.addEventListener('session-expired', expired);
    window.addEventListener('hashchange', browserRoute);
    window.addEventListener('keydown', shortcut);
    window.addEventListener('knowledge-route-changed', knowledgeRouteChanged);
    try {
      await restore();
      if (!window.location.hash) {
        history.replaceState({ zhixuIndex: historyIndex }, '', '#/catalog');
      }
      await applyRoute(window.location.hash);
    } catch {
    } finally {
      ready.value = true;
    }
  });
  onBeforeUnmount(() => {
    routeController?.abort();
    routeSequence++;
    listSequence++;
    clearTimeout(noticeTimer);
    window.removeEventListener('beforeunload', unload);
    window.removeEventListener('session-expired', expired);
    window.removeEventListener('hashchange', browserRoute);
    window.removeEventListener('keydown', shortcut);
    window.removeEventListener('knowledge-route-changed', knowledgeRouteChanged);
  });
  return {
    imageDialog,
    imageUrl,
    imageAlt,
    moduleNavigation,
    globalSearch,
    ready,
    tab,
    username,
    password,
    error,
    notice,
    busy,
    loading,
    categories,
    items,
    total,
    page,
    search,
    searchDraft,
    category,
    selected,
    practice,
    openSelectedModule,
    rateQuestion,
    updateFavorite,
    updateNote,
    startReview,
    extraDirty,
    editor,
    editing,
    title,
    moduleId,
    answer,
    difficulty,
    draftRestored,
    questionUploading,
    answerUploading,
    titleExpanded,
    uploading,
    sidebarCollapsed,
    searched,
    acceptedHash,
    admin,
    currentModule,
    dirty,
    renderedQuestion,
    rendered,
    answerOutline,
    searchGroups,
    plain,
    adoptAi,
    success,
    go,
    login,
    logout,
    navigate,
    chooseModule,
    moduleHome,
    filter,
    paginate,
    open,
    returnToList,
    searchAll,
    openSearchQuestion,
    showSearch,
    toggleSidebar,
    edit,
    cancel,
    reloadEditor,
    discardEditorDraft,
    save,
    removeQuestion,
    removeAnswer,
    stepQuestion,
    questionIndex,
    copyCode,
    questionPreviews,
    jumpTo,
    user,
  };
}
