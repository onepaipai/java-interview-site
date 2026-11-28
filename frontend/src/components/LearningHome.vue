<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { api } from '../lib/api';
import { readSetting } from '../lib/storage';
import { plainContent } from '../lib/knowledge';
import type { Category, LearningSummary, Page, QuestionSummary } from '../lib/types';

const props = defineProps<{ userId: number; startModule?: Category }>();
const emit = defineEmits<{
  open: [number];
  loaded: [LearningSummary];
  begin: [Category];
  review: [];
}>();
const resume = ref<{ id: number; title: string }>();
try {
  const value = JSON.parse(readSetting('zhixu-resume-' + props.userId, 'null'));
  if (Number.isSafeInteger(value?.id) && value.id > 0 && typeof value.title === 'string')
    resume.value = value;
} catch {}
const stats = ref<LearningSummary>();
const weak = ref<QuestionSummary[]>([]);
const weakTotal = ref(0);
const statsError = ref('');
const weakError = ref('');
const statsLoading = ref(true);
const weakLoading = ref(true);
let statsController = new AbortController();
let weakController = new AbortController();
async function loadStats() {
  statsController.abort();
  statsController = new AbortController();
  const signal = statsController.signal;
  statsLoading.value = true;
  statsError.value = '';
  try {
    stats.value = await api<LearningSummary>('/stats', 'GET', undefined, undefined, signal);
    emit('loaded', stats.value);
  } catch (e) {
    if (!signal.aborted) statsError.value = (e as Error).message;
  } finally {
    if (!signal.aborted) statsLoading.value = false;
  }
}
async function loadWeak() {
  weakController.abort();
  weakController = new AbortController();
  const signal = weakController.signal;
  weakLoading.value = true;
  weakError.value = '';
  try {
    const result = await api<Page<QuestionSummary>>(
      '/questions?weak=true&size=6',
      'GET',
      undefined,
      undefined,
      signal,
    );
    weak.value = result.items;
    weakTotal.value = result.total;
  } catch (e) {
    if (!signal.aborted) weakError.value = (e as Error).message;
  } finally {
    if (!signal.aborted) weakLoading.value = false;
  }
}
onMounted(() => {
  void loadStats();
  void loadWeak();
});
onBeforeUnmount(() => {
  statsController.abort();
  weakController.abort();
});
// 与后端排期同一口径：未排期（存量弱项）或排期时间已到即为今日到期
function isDue(nextReview: string | null): boolean {
  return !nextReview || new Date(nextReview).getTime() <= Date.now();
}
</script>
<template>
  <section class="learning-home panel" aria-label="我的学习">
    <div class="learning-overview">
      <div>
        <h2>我的学习</h2>
        <p class="muted">
          {{
            stats
              ? `已掌握 ${stats.mastered} 题 · 今日到期 ${stats.due} 题 · 待复习 ${stats.weak} 题`
              : '自评后，会在这里整理需要复习的题目。'
          }}
        </p>
      </div>
      <button v-if="resume" class="resume-question" @click="emit('open', resume.id)">
        <small>继续上次阅读 →</small><strong>{{ plainContent(resume.title) }}</strong>
      </button>
      <button
        v-else-if="startModule"
        class="primary learning-start"
        @click="emit('begin', startModule)"
      >
        开始学习 <span aria-hidden="true">→</span>
      </button>
    </div>
    <div v-if="statsError" class="inline-error" role="alert">
      学习统计加载失败：{{ statsError }}<button @click="loadStats">重试统计</button>
    </div>
    <div v-if="weakError" class="inline-error" role="alert">
      待复习列表加载失败：{{ weakError }}<button @click="loadWeak">重试列表</button>
    </div>
    <p v-if="weakLoading" class="muted" role="status">正在加载待复习题目…</p>
    <div v-else-if="weak.length" class="review-questions">
      <span class="muted">待复习 · 显示 {{ weak.length }} / {{ weakTotal }} 题</span>
      <button v-for="q in weak" :key="q.id" @click="emit('open', q.id)">
        <span>{{ plainContent(q.title) }}</span
        ><small
          >{{ isDue(q.next_review) ? '今日到期 · ' : ''
          }}{{ q.mastery === 'NO' ? '不会' : '模糊' }} →</small
        >
      </button>
      <button class="primary" @click="emit('review')">开始复习全部 {{ weakTotal }} 题 →</button>
    </div>
    <p v-else-if="!weakError && !weakLoading && weakTotal === 0" class="learning-empty">
      还没有待复习题目。读完一题后自评，把薄弱点留给下一次练习。
    </p>
  </section>
</template>
