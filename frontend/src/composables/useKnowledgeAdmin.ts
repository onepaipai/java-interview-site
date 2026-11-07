import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue';
import { api } from '../lib/api';
import { confirmAction } from '../lib/confirm';
import { markdown } from '../lib/markdown';
import { copyCodeButton } from '../lib/clipboard';
import { renderAnswer } from '../lib/answer';
import { readKnowledgeRoute, knowledgeLink } from '../lib/knowledgeRoute';
import { groupKnowledgeSources, knowledgeKindLabels } from '../lib/knowledge';
import type { KnowledgeKind } from '../lib/knowledge';
import type {
  KnowledgeStatus,
  KnowledgeDocument,
  KnowledgeSource,
  KnowledgeLibrary,
  KnowledgeLibrarySource,
  KnowledgeSourceDetail,
} from '../lib/types';

type Operation = '' | 'load' | 'upload' | 'delete' | 'search' | 'index';
type View = 'search' | 'library' | 'settings';

/** Admin knowledge workspace: search, source library, upload and vector indexing. */
export function useKnowledgeAdmin() {
  const status = ref<KnowledgeStatus | null>(null);
  const documents = ref<KnowledgeDocument[]>([]),
    results = ref<KnowledgeSource[]>([]);
  const initialRoute = readKnowledgeRoute(location.hash);
  const views: { key: View; label: string; icon: string }[] = [
    { key: 'search', label: '检索资料', icon: 'search' },
    { key: 'library', label: '知识来源', icon: 'book' },
    { key: 'settings', label: '服务设置', icon: 'settings' },
  ];
  const activeView = ref<View>(initialRoute.view);
  const query = ref(initialRoute.query),
    committedQuery = ref(initialRoute.query),
    resultQuery = ref(''),
    searched = ref(false);
  const sourceFilter = ref<'all' | KnowledgeKind>('all');
  const operation = ref<Operation>(''),
    error = ref(''),
    notice = ref('');
  const upload = ref<HTMLInputElement>(),
    searchInput = ref<HTMLInputElement>();
  const busy = computed(() => operation.value !== '');
  const controller = new AbortController();
  let searchController: AbortController | undefined;
  let sequence = 0,
    alive = true;
  const library = ref<KnowledgeLibrary | null>(null);
  const libraryQuery = ref(initialRoute.name),
    libraryKind = ref<'all' | KnowledgeKind>(initialRoute.kind),
    libraryPage = ref(initialRoute.page),
    libraryLoading = ref(false);
  const previewDialog = ref<HTMLDialogElement>(),
    preview = ref<KnowledgeSourceDetail | null>(null),
    previewLoading = ref(false),
    previewError = ref('');
  const previewTitle = ref('');
  let libraryController: AbortController | undefined,
    previewController: AbortController | undefined;
  let librarySequence = 0,
    previewSequence = 0,
    libraryTimer: ReturnType<typeof setTimeout> | undefined;
  const sourceCount = computed(() =>
    library.value
      ? Object.values(library.value.counts).reduce((sum, count) => sum + count, 0)
      : null,
  );
  const libraryPages = computed(() => Math.max(1, Math.ceil((library.value?.total || 0) / 12)));
  const libraryFilters = computed(() => [
    { key: 'all' as const, label: '全部', count: sourceCount.value ?? 0 },
    ...(['question', 'reference', 'upload'] as const).map((key) => ({
      key,
      label: knowledgeKindLabels[key],
      count: library.value?.counts[key] ?? 0,
    })),
  ]);
  const previewHtml = computed(() => {
    if (!preview.value) return '';
    let content = preview.value.content;
    if (preview.value.questionId && content.startsWith(preview.value.title + '\n'))
      content = content.slice(preview.value.title.length + 1);
    const heading = content.match(/^#{1,6}\s+([^\r\n]+)\r?\n/);
    if (heading?.[1]?.trim() === preview.value.title.trim())
      content = content.slice(heading[0].length);
    return renderAnswer(content, { media: 'local' });
  });

  const groups = computed(() => groupKnowledgeSources(results.value));
  const fragmentCount = computed(() =>
    groups.value.reduce((total, group) => total + group.chunks.length, 0),
  );
  const visibleGroups = computed(() =>
    groups.value.filter(
      (group) => sourceFilter.value === 'all' || group.kind === sourceFilter.value,
    ),
  );
  const sourceFilters = computed(() => [
    { key: 'all' as const, label: '全部来源', count: groups.value.length },
    ...(['question', 'upload', 'reference'] as const)
      .map((key) => ({
        key,
        label: knowledgeKindLabels[key],
        count: groups.value.filter((group) => group.kind === key).length,
      }))
      .filter((filter) => filter.count),
  ]);
  const pendingVectors = computed(() =>
    Math.max(0, (status.value?.chunks || 0) - (status.value?.vectors || 0)),
  );
  const vectorPercent = computed(() =>
    !status.value?.chunks
      ? 0
      : Math.min(100, Math.floor((status.value.vectors / status.value.chunks) * 100)),
  );

  function clearSearch() {
    sequence++;
    searchController?.abort();
    results.value = [];
    searched.value = false;
    resultQuery.value = '';
    sourceFilter.value = 'all';
  }
  watch(query, () => {
    clearSearch();
    error.value = '';
    if (!query.value.trim()) committedQuery.value = '';
  });
  watch(
    [activeView, libraryQuery, libraryKind, libraryPage, committedQuery],
    () => {
      if (!alive) return;
      const hash = knowledgeLink({
        view: activeView.value,
        query: committedQuery.value,
        name: libraryQuery.value,
        kind: libraryKind.value,
        page: libraryPage.value,
      });
      history.replaceState(history.state, '', hash);
      window.dispatchEvent(new Event('knowledge-route-changed'));
    },
    { flush: 'post' },
  );
  // Browser back/forward: restore workspace state from the hash the user navigated to.
  function syncFromRoute() {
    if (!alive || !location.hash.startsWith('#/knowledge')) return;
    const route = readKnowledgeRoute(location.hash);
    if (
      route.view === activeView.value &&
      route.query === committedQuery.value &&
      route.name === libraryQuery.value &&
      route.kind === libraryKind.value &&
      route.page === libraryPage.value
    )
      return;
    activeView.value = route.view;
    libraryQuery.value = route.name;
    libraryKind.value = route.kind;
    libraryPage.value = route.page;
    if (route.query !== committedQuery.value) {
      query.value = route.query;
      committedQuery.value = route.query;
      if (route.query.trim()) void search();
    }
  }
  window.addEventListener('hashchange', syncFromRoute);
  onBeforeUnmount(() => {
    window.removeEventListener('hashchange', syncFromRoute);
    alive = false;
    clearSearch();
    controller.abort();
    clearTimeout(libraryTimer);
    libraryController?.abort();
    previewController?.abort();
    previewDialog.value?.close();
  });

  async function load() {
    const [s, d] = await Promise.all([
      api<KnowledgeStatus>('/ai/status', 'GET', undefined, undefined, controller.signal),
      api<KnowledgeDocument[]>('/admin/knowledge', 'GET', undefined, undefined, controller.signal),
      loadLibrary(),
    ]);
    if (alive) {
      status.value = s;
      documents.value = d;
    }
  }

  async function loadLibrary() {
    if (!alive) return;
    libraryController?.abort();
    libraryController = new AbortController();
    const signal = libraryController.signal;
    const token = ++librarySequence;
    libraryLoading.value = true;
    error.value = '';
    try {
      const value = await api<KnowledgeLibrary>(
        '/admin/knowledge/sources?' +
          new URLSearchParams({
            kind: libraryKind.value,
            query: libraryQuery.value.trim(),
            page: String(libraryPage.value),
            size: '12',
          }),
        'GET',
        undefined,
        undefined,
        signal,
      );
      if (!alive || token !== librarySequence) return;
      library.value = value;
      if (libraryPage.value > Math.max(1, Math.ceil(value.total / 12))) {
        libraryPage.value = Math.max(1, Math.ceil(value.total / 12));
        await loadLibrary();
      }
    } catch (e) {
      if (alive && token === librarySequence && !signal.aborted) {
        library.value = null;
        error.value = e instanceof Error ? e.message : '来源加载失败';
      }
    } finally {
      if (alive && token === librarySequence) libraryLoading.value = false;
    }
  }
  watch([libraryQuery, libraryKind], () => {
    clearTimeout(libraryTimer);
    libraryController?.abort();
    librarySequence++;
    libraryPage.value = 1;
    libraryLoading.value = true;
    libraryTimer = setTimeout(loadLibrary, 250);
  });
  async function turnLibraryPage(delta: number) {
    if (busy.value || libraryLoading.value) return;
    libraryPage.value = Math.min(libraryPages.value, Math.max(1, libraryPage.value + delta));
    await loadLibrary();
  }
  function switchView(view: View) {
    activeView.value = view;
  }
  async function tabKey(event: KeyboardEvent, index: number) {
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % views.length
        : event.key === 'ArrowLeft'
          ? (index + views.length - 1) % views.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? views.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    switchView(views[next]!.key);
    await nextTick();
    document.getElementById('knowledge-tab-' + views[next]!.key)?.focus();
  }
  async function openSource(source: Pick<KnowledgeLibrarySource, 'key' | 'title'>) {
    previewController?.abort();
    previewController = new AbortController();
    const token = ++previewSequence;
    preview.value = null;
    previewTitle.value = source.title;
    previewError.value = '';
    previewLoading.value = true;
    await nextTick();
    if (!alive || token !== previewSequence) return;
    if (!previewDialog.value?.open) previewDialog.value?.showModal();
    try {
      const value = await api<KnowledgeSourceDetail>(
        '/admin/knowledge/source?key=' + encodeURIComponent(source.key),
        'GET',
        undefined,
        undefined,
        previewController.signal,
      );
      if (alive && token === previewSequence) preview.value = value;
    } catch (e) {
      if (alive && token === previewSequence)
        previewError.value = e instanceof Error ? e.message : '资料加载失败';
    } finally {
      if (alive && token === previewSequence) previewLoading.value = false;
    }
  }
  function closePreview() {
    previewSequence++;
    previewController?.abort();
    previewLoading.value = false;
    previewDialog.value?.close();
  }
  function previewBackdrop(event: MouseEvent) {
    if (event.target !== previewDialog.value) return;
    const box = previewDialog.value.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      closePreview();
  }
  function sourceDocument(source: KnowledgeLibrarySource) {
    return source.kind === 'upload'
      ? documents.value.find((doc) => 'upload:' + doc.id === source.key)
      : undefined;
  }

  async function run(kind: Operation, work: () => Promise<void>, current = () => true) {
    if (busy.value || !alive) return;
    operation.value = kind;
    error.value = '';
    notice.value = '';
    try {
      await work();
    } catch (e) {
      if (alive && current()) error.value = e instanceof Error ? e.message : '操作失败，请重试';
    } finally {
      if (alive) operation.value = '';
    }
  }
  async function refresh() {
    if (libraryLoading.value) return;
    await run('load', async () => {
      await load();
    });
  }
  onMounted(async () => {
    await refresh();
    if (alive && initialRoute.query && query.value === initialRoute.query) await search();
  });

  async function add(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = '';
    if (!file || busy.value) return;
    notice.value = '';
    error.value = '';
    if (!/\.(md|txt)$/i.test(file.name) || file.size === 0 || file.size > 1_500_000) {
      error.value = '请上传不超过 1.5MB 的非空 UTF-8 Markdown/TXT 文件';
      return;
    }
    if (documents.value.length >= 50) {
      error.value = '知识库最多上传 50 份文档，请先删除不再使用的文档';
      return;
    }
    await run('upload', async () => {
      const form = new FormData();
      form.append('file', file);
      await api('/admin/knowledge/upload', 'POST', form, undefined, controller.signal);
      libraryKind.value = 'upload';
      libraryQuery.value = '';
      libraryPage.value = 1;
      await nextTick();
      clearTimeout(libraryTimer);
      libraryController?.abort();
      librarySequence++;
      libraryLoading.value = false;
      await load();
      clearSearch();
      activeView.value = 'library';
      notice.value = '文档已加入知识库，可立即检索。';
    });
  }

  async function remove(id: number) {
    if (
      busy.value ||
      !(await confirmAction(
        '删除知识文档？',
        '该文档及检索片段将移除，题库不受影响。',
        '删除文档',
        true,
      ))
    )
      return;
    await run('delete', async () => {
      await api('/admin/knowledge/' + id, 'DELETE', undefined, undefined, controller.signal);
      await load();
      clearSearch();
      notice.value = '文档已删除';
    });
  }

  async function search() {
    const term = query.value.trim();
    if (busy.value || !term) return;
    committedQuery.value = term;
    clearSearch();
    const token = sequence;
    searchController = new AbortController();
    const signal = searchController.signal;
    await run(
      'search',
      async () => {
        const rows = await api<KnowledgeSource[]>(
          '/ai/search?query=' + encodeURIComponent(term),
          'GET',
          undefined,
          undefined,
          signal,
        );
        if (alive && token === sequence) {
          results.value = rows;
          resultQuery.value = term;
          searched.value = true;
        }
      },
      () => token === sequence,
    );
  }

  async function example(term: string) {
    if (busy.value) return;
    query.value = term;
    await nextTick();
    searchInput.value?.focus();
    await search();
  }
  function documentDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '日期未知' : date.toLocaleDateString('zh-CN');
  }
  function renderFragment(content: string) {
    return markdown(content, { media: false });
  }
  async function copyFragment(event: MouseEvent) {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-copy-code]');
    if (button) await copyCodeButton(button);
  }
  async function index() {
    await run('index', async () => {
      const result = await api<{ indexed: number; remaining: number }>(
        '/admin/knowledge/index',
        'POST',
        {},
        120000,
        controller.signal,
      );
      await load();
      notice.value = result.remaining
        ? `本批完成 ${result.indexed} 个片段，还剩 ${result.remaining} 个待构建，可继续下一批。`
        : '向量已全部构建完成，AI 问答可使用混合检索。';
    });
  }

  return {
    busy,
    operation,
    error,
    notice,
    status,
    documents,
    upload,
    searchInput,
    refresh,
    add,
    switchView,
    sourceCount,
    views,
    activeView,
    tabKey,
    query,
    search,
    searched,
    results,
    resultQuery,
    example,
    groups,
    fragmentCount,
    sourceFilter,
    sourceFilters,
    visibleGroups,
    openSource,
    copyFragment,
    renderFragment,
    libraryLoading,
    libraryFilters,
    libraryKind,
    libraryQuery,
    library,
    sourceDocument,
    remove,
    documentDate,
    turnLibraryPage,
    libraryPages,
    libraryPage,
    vectorPercent,
    pendingVectors,
    index,
    closePreview,
    previewBackdrop,
    previewDialog,
    preview,
    previewTitle,
    previewLoading,
    previewError,
    previewHtml,
  };
}
