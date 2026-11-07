import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { markdown } from '../lib/markdown';
import { renderAnswer } from '../lib/answer';
import { useQuestionEditor } from './useQuestionEditor';
import { useQuestionList } from './useQuestionList';
import ModuleNavigator from '../components/ModuleNavigator.vue';
import GlobalSearch from '../components/GlobalSearch.vue';
import { readSetting, saveSetting, readScrollPositions, saveScrollPositions } from '../lib/storage';
import { copyCodeButton } from '../lib/clipboard';
import { api, ApiError } from '../lib/api';
import { normalizePage, pageWithinTotal, PAGE_SIZE } from '../lib/navigation';
import type { Question, QuestionSummary, Category, Page } from '../lib/types';
import { useSession } from './useSession';
import { useLearning } from './useLearning';
import { createLinks } from './workbench/links';
import { buildOutline, jumpTo, plain } from './workbench/render';
import { createQuestionActions } from './workbench/questionActions';
import { createEditorActions } from './workbench/editorActions';
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
  const answerOutline = computed(() =>
    buildOutline(rendered.value, selected.value?.answer.length || 0),
  );
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
  const routeToken = () => routeSequence;
  const routeSignal = () => routeController?.signal;
  const { params, listLink, questionLink } = createLinks({ category, search, page, acceptedHash });
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
        notice.value = msg;
      }
    } catch (e) {
      if (token === routeSequence) {
        error.value = e instanceof Error ? e.message : '操作失败，请重试';
      }
    } finally {
      busy.value = false;
    }
  }
  function success(text: string) {
    notice.value = text;
  }
  const questions = createQuestionActions({
    acceptedHash,
    search,
    category,
    page,
    total,
    items,
    selected,
    loading,
    busy,
    go,
    action,
    listLink,
    questionLink,
    routeToken,
    routeSignal,
  });
  const editorActions = createEditorActions({
    acceptedHash,
    category,
    search,
    page,
    total,
    items,
    selected,
    error,
    editor,
    editing,
    title,
    answer,
    moduleId,
    difficulty,
    dirty,
    uploading,
    extraDirty,
    go,
    applyRoute,
    action,
    startEdit,
    clearDraft,
    listLink,
    questionLink,
    params,
    routeToken,
  });
  const { leave } = editorActions;
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
  function remember() {
    scrollPositions[acceptedHash.value] = window.scrollY;
    saveScrollPositions(scrollPositions);
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
  /** 版本冲突后的重载：用户已明确选择，跳过放弃确认并保留本地草稿供恢复。 */
  async function reloadEditor() {
    history.replaceState({ zhixuIndex: historyIndex }, '', acceptedHash.value);
    await applyRoute(acceptedHash.value);
  }
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
    openSelectedModule: questions.openSelectedModule,
    rateQuestion: questions.rateQuestion,
    updateFavorite: questions.updateFavorite,
    updateNote: questions.updateNote,
    startReview: questions.startReview,
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
    adoptAi: editorActions.adoptAi,
    success,
    go,
    login,
    logout,
    navigate,
    chooseModule,
    moduleHome,
    filter,
    paginate: questions.paginate,
    open: questions.open,
    returnToList: questions.returnToList,
    searchAll: questions.searchAll,
    openSearchQuestion: questions.openSearchQuestion,
    showSearch,
    toggleSidebar,
    edit: editorActions.edit,
    cancel: editorActions.cancel,
    reloadEditor,
    discardEditorDraft: editorActions.discardEditorDraft,
    save: editorActions.save,
    removeQuestion: editorActions.removeQuestion,
    removeAnswer: editorActions.removeAnswer,
    stepQuestion: questions.stepQuestion,
    questionIndex: questions.questionIndex,
    copyCode,
    questionPreviews,
    jumpTo,
    user,
  };
}
