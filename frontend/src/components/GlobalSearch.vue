<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { api } from '../lib/api';
import type { QuestionSummary, Category, Page } from '../lib/types';
import { categoryName } from '../lib/display';
import { trapDialogTab } from '../lib/dialog';
import Icon from './Icon.vue';
import { plainContent, answerPreview } from '../lib/knowledge';
import { matchesModule } from '../lib/moduleSearch';
const props = defineProps<{ categories: Category[]; practice?: boolean }>();
const emit = defineEmits<{
  question: [QuestionSummary, string, number];
  module: [Category];
  results: [string];
}>();
const dialog = ref<HTMLDialogElement>(),
  query = ref(''),
  items = ref<QuestionSummary[]>([]),
  total = ref(0),
  loading = ref(false),
  error = ref('');
let sequence = 0,
  timer: ReturnType<typeof setTimeout> | undefined,
  controller: AbortController | undefined;
const modules = computed(() =>
  query.value.trim()
    ? props.categories.filter((c) => matchesModule(c, query.value)).slice(0, 5)
    : [],
);
function plain(s: string) {
  return plainContent(s);
}
function highlighted(s: string) {
  const term = query.value.trim();
  if (!term) return [{ text: s, match: false }];
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return s
    .split(new RegExp(`(${escaped})`, 'ig'))
    .filter(Boolean)
    .map((text) => ({
      text,
      match: text.toLocaleLowerCase() === term.toLocaleLowerCase(),
    }));
}
async function fetchResults(token: number) {
  controller?.abort();
  controller = new AbortController();
  loading.value = true;
  error.value = '';
  try {
    const r = await api<Page<QuestionSummary>>(
      '/questions?size=30&search=' + encodeURIComponent(query.value.trim()),
      'GET',
      undefined,
      undefined,
      controller.signal,
    );
    if (token === sequence) {
      items.value = r.items;
      total.value = r.total;
    }
  } catch (e) {
    if (token === sequence) error.value = e instanceof Error ? e.message : '搜索失败';
  } finally {
    if (token === sequence) loading.value = false;
  }
}
watch(query, () => {
  sequence++;
  controller?.abort();
  clearTimeout(timer);
  items.value = [];
  total.value = 0;
  error.value = '';
  if (!query.value.trim()) {
    loading.value = false;
    return;
  }
  loading.value = true;
  const token = sequence;
  timer = setTimeout(() => fetchResults(token), 220);
});
async function open() {
  query.value = '';
  items.value = [];
  error.value = '';
  await nextTick();
  dialog.value?.showModal();
}
function close() {
  sequence++;
  controller?.abort();
  clearTimeout(timer);
  dialog.value?.close();
}
function question(q: QuestionSummary) {
  const term = query.value.trim();
  close();
  emit('question', q, term, Math.floor(items.value.findIndex((item) => item.id === q.id) / 15) + 1);
}
function module(c: Category) {
  close();
  emit('module', c);
}
function results() {
  const term = query.value.trim();
  if (!term) return;
  close();
  emit('results', term);
}
function arrow(e: KeyboardEvent) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const nodes = Array.from(
    dialog.value?.querySelectorAll<HTMLButtonElement>('.search-result') || [],
  );
  if (!nodes.length) return;
  e.preventDefault();
  const index = nodes.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    index < 0
      ? e.key === 'ArrowDown'
        ? 0
        : nodes.length - 1
      : (index + (e.key === 'ArrowDown' ? 1 : -1) + nodes.length) % nodes.length;
  nodes[next]?.focus();
}
onBeforeUnmount(() => {
  sequence++;
  controller?.abort();
  clearTimeout(timer);
});
defineExpose({ open });
</script>
<template>
  <dialog
    ref="dialog"
    class="search-dialog"
    aria-label="全局搜索"
    @cancel.prevent="close"
    @keydown.capture="
      (e) => {
        trapDialogTab(e, dialog);
        arrow(e);
      }
    "
  >
    <form class="global-search-input" @submit.prevent="results">
      <Icon name="search" :size="21" />
      <input
        v-model="query"
        autofocus
        aria-label="全局搜索关键词"
        type="search"
        maxlength="3000"
        placeholder="搜索题目、回答或模块"
      />
      <button type="button" aria-label="关闭搜索" @click="close">
        <Icon name="close" :size="20" />
      </button>
    </form>
    <div class="global-search-results" :aria-busy="loading">
      <p v-if="!query.trim()" class="search-empty">输入关键词，在所有模块中查找题目与回答。</p>
      <div v-if="modules.length" class="search-group">
        <h3>知识模块</h3>
        <button v-for="c in modules" :key="c.id" class="search-result" @click="module(c)">
          <Icon name="layers" :size="17" /><strong>{{ categoryName(c.name) }}</strong
          ><small>{{ c.question_count }} 道题目</small>
        </button>
      </div>
      <p v-if="loading" class="search-empty" role="status">正在搜索…</p>
      <div v-if="error" class="inline-error" role="alert">
        {{ error }}<button @click="fetchResults(++sequence)">重试</button>
      </div>
      <section v-if="items.length" class="search-group">
        <h3>题目与回答 · 按相关性排序</h3>
        <button v-for="q in items" :key="q.id" class="search-result" @click="question(q)">
          <Icon name="file" :size="17" />
          <span
            ><strong
              ><template v-for="(part, index) in highlighted(plain(q.title))" :key="index"
                ><mark v-if="part.match">{{ part.text }}</mark
                ><template v-else>{{ part.text }}</template></template
              ></strong
            ><small
              >{{ categoryName(q.category)
              }}<template v-if="q.answered && !practice"> · {{ q.preview }}</template></small
            ></span
          >
        </button>
      </section>
      <p
        v-if="query.trim() && !loading && !error && !items.length && !modules.length"
        class="search-empty"
      >
        没有匹配的内容，试试其他关键词。
      </p>
    </div>
    <div class="global-search-footer">
      <span>↑ ↓ 选择 · 输入框 Enter 查看全部 · 选中结果 Enter 打开 · Esc 关闭</span
      ><button v-if="total" @click="results">查看全部 {{ total }} 条结果</button>
    </div>
  </dialog>
</template>
