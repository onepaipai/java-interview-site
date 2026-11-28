<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import AiPanel from './AiPanel.vue';
import Icon from './Icon.vue';
import { categoryName } from '../lib/display';
import { readSetting, saveSetting } from '../lib/storage';
import { PAGE_SIZE } from '../lib/navigation';
import type { Question } from '../lib/types';
const props = defineProps<{
  selected: Question;
  practice: boolean;
  scopeLabel: string;
  backLabel: string;
  admin: boolean;
  busy: boolean;
  page: number;
  questionIndex: number;
  total: number;
  reviewMode: boolean;
  favorite: boolean;
  note: string;
  renderedQuestion: string;
  rendered: string;
  answerOutline: {
    id: string;
    label: string;
    level: number;
  }[];
}>();
const activeHeading = ref('');
const readingProgress = ref(0);
const savedMode = readSetting('zhixu-reading-mode');
const readingMode = ref<'full' | 'spoken' | 'quiz'>(
  savedMode === 'spoken' || savedMode === 'quiz' ? (savedMode as 'spoken' | 'quiz') : 'full',
);
const quizRevealed = ref(false);
function revealQuiz() {
  quizRevealed.value = true;
  document.getElementById('reference-answer')?.focus({ preventScroll: true });
}
const revealed = ref(false);
const answerVisible = computed(() => !props.practice || revealed.value);
const structuredAnswer = computed(() => props.rendered.includes('class="explanation-content'));
const position = computed(() =>
  props.questionIndex < 0 ? 0 : (props.page - 1) * PAGE_SIZE + props.questionIndex + 1,
);
const noteDraft = ref(props.note);
const notePending = ref(false);
const noteHasDraft = ref(false);
let noteTimer: ReturnType<typeof setTimeout> | undefined;
function noteDraftKey() {
  return 'zhixu-note-draft-' + props.selected.id;
}
function readNoteDraft() {
  try {
    return localStorage.getItem(noteDraftKey());
  } catch {
    return null;
  }
}
function writeNoteDraft(value: string) {
  try {
    if (value && value !== props.note) {
      localStorage.setItem(noteDraftKey(), value);
      noteHasDraft.value = true;
    } else {
      localStorage.removeItem(noteDraftKey());
      noteHasDraft.value = false;
    }
  } catch {}
}
function flushNote() {
  clearTimeout(noteTimer);
  noteTimer = undefined;
  if (notePending.value) {
    notePending.value = false;
    emit('note', noteDraft.value);
  }
}
function onNoteInput(event: Event) {
  noteDraft.value = (event.target as HTMLTextAreaElement).value;
  notePending.value = noteDraft.value !== props.note;
  writeNoteDraft(noteDraft.value);
  clearTimeout(noteTimer);
  noteTimer = setTimeout(flushNote, 800);
}
watch(
  () => props.note,
  (value) => {
    if (value === noteDraft.value) {
      clearTimeout(noteTimer);
      noteTimer = undefined;
      notePending.value = false;
      writeNoteDraft('');
    }
  },
);
watch(
  () => props.selected.id,
  () => {
    clearTimeout(noteTimer);
    noteTimer = undefined;
    notePending.value = false;
    const draft = readNoteDraft();
    noteDraft.value = draft && draft !== props.note ? draft : props.note;
    noteHasDraft.value = !!draft && draft !== props.note;
  },
);
const deepAnswer = computed(() => props.rendered.includes('explanation-deep'));
// Parse the rendered HTML once and derive every DOM-backed value from that single tree.
const renderedDom = computed(() => {
  const source = document.createElement('div');
  source.innerHTML = props.rendered;
  return source;
});
const questionScenario = computed(() => {
  if (!deepAnswer.value) return '';
  return (
    renderedDom.value
      ?.querySelector('.explanation-answer blockquote')
      ?.textContent?.trim()
      .replace(/^场景与约束：/, '')
      .trim() || ''
  );
});
const readingMinutes = computed(() => {
  return Math.max(1, Math.ceil((renderedDom.value?.textContent?.length || 0) / 450));
});
const visibleOutline = computed(() => {
  if (!answerVisible.value) return [];
  if (!structuredAnswer.value || readingMode.value === 'full') return props.answerOutline;
  const ids = new Set(
    Array.from(
      renderedDom.value?.querySelectorAll('.explanation-answer h2,.explanation-summary h2') ?? [],
    ).map((node) => node.id),
  );
  return props.answerOutline.filter((heading) => ids.has(heading.id));
});
const mobileToc = ref<HTMLDetailsElement>();
const outlineNumbers = computed(() => {
  let section = 0,
    child = 0;
  return new Map(
    props.answerOutline.map((heading) => {
      if (heading.level < 3) {
        section++;
        child = 0;
      } else child++;
      return [heading.id, child ? `${section}.${child}` : String(section).padStart(2, '0')];
    }),
  );
});
const previousDisabled = computed(
  () => props.busy || props.questionIndex < 0 || (props.page === 1 && props.questionIndex === 0),
);
const nextDisabled = computed(
  () =>
    props.busy ||
    props.questionIndex < 0 ||
    (props.page - 1) * PAGE_SIZE + props.questionIndex + 1 >= props.total,
);
function closeMobileToc(event?: PointerEvent) {
  if (!event || !mobileToc.value?.contains(event.target as Node)) {
    if (mobileToc.value) mobileToc.value.open = false;
  }
}
const activeIndex = computed(() =>
  Math.max(
    0,
    visibleOutline.value.findIndex((heading) => heading.id === activeHeading.value),
  ),
);
let scrollFrame = 0;
function updateActiveHeading() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  readingProgress.value = scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0;
  const headings = visibleOutline.value
    .map((item) => document.getElementById(item.id))
    .filter((item): item is HTMLElement => !!item);
  if (!headings.length) return;
  let current = headings[0]!;
  for (const heading of headings) {
    if (heading.getBoundingClientRect().top <= 160) current = heading;
  }
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4)
    current = headings.at(-1)!;
  activeHeading.value = current.id;
}
function scheduleOutlineUpdate() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    updateActiveHeading();
  });
}
function navigateTo(id: string, event?: MouseEvent) {
  activeHeading.value = id;
  const details = (event?.currentTarget as HTMLElement | null)?.closest('details');
  if (details) details.open = false;
  emit('jump', id);
}
async function revealAnswer() {
  revealed.value = true;
  await nextTick();
  document.getElementById('reference-answer')?.focus({ preventScroll: true });
}
watch(
  () => [props.selected.id, props.rendered],
  async () => {
    activeHeading.value = props.answerOutline[0]?.id || '';
    await nextTick();
    updateActiveHeading();
  },
  { flush: 'post' },
);
watch(
  () => props.selected.id,
  () => {
    revealed.value = false;
    quizRevealed.value = false;
  },
);
watch(
  () => props.practice,
  () => {
    revealed.value = false;
  },
);
watch(answerVisible, async () => {
  await nextTick();
  updateActiveHeading();
});
watch(readingMode, async () => {
  saveSetting('zhixu-reading-mode', readingMode.value);
  if (readingMode.value === 'quiz') quizRevealed.value = false;
  await nextTick();
  updateActiveHeading();
});
onMounted(() => {
  const draft = readNoteDraft();
  noteDraft.value = draft && draft !== props.note ? draft : props.note;
  noteHasDraft.value = !!draft && draft !== props.note;
  updateActiveHeading();
  window.addEventListener('scroll', scheduleOutlineUpdate, { passive: true });
  window.addEventListener('resize', scheduleOutlineUpdate);
  document.addEventListener('pointerdown', closeMobileToc);
});
onBeforeUnmount(() => {
  window.removeEventListener('scroll', scheduleOutlineUpdate);
  window.removeEventListener('resize', scheduleOutlineUpdate);
  document.removeEventListener('pointerdown', closeMobileToc);
  cancelAnimationFrame(scrollFrame);
  clearTimeout(noteTimer);
});
const emit = defineEmits<{
  home: [];
  back: [];
  module: [];
  rate: [string];
  favorite: [boolean];
  note: [string];
  'update:practice': [boolean];
  edit: [];
  removeAnswer: [];
  removeQuestion: [];
  code: [MouseEvent];
  jump: [string];
  adopt: [string];
  step: [number];
}>();
</script>
<template>
  <div class="breadcrumbs reader-breadcrumbs">
    <button @click="emit('home')">知识目录</button>
    <span>/</span>
    <button @click="emit('module')">{{ categoryName(selected.category) }}</button>
    <span>/</span>
    <span>题目详情</span>
  </div>
  <nav class="reader-navigation" aria-label="当前题目导航">
    <button @click="emit('back')">{{ backLabel }}</button>
    <span>{{ scopeLabel }} · {{ position }} / {{ total }}</span>
    <div v-if="reviewMode" class="actions">
      <button class="primary" @click="emit('step', 1)">继续下一题 →</button>
    </div>
    <div v-else class="actions">
      <button :disabled="previousDisabled" @click="emit('step', -1)">上一题</button>
      <button :disabled="nextDisabled" @click="emit('step', 1)">下一题 →</button>
    </div>
  </nav>
  <div class="reading-progress" aria-hidden="true">
    <span :style="{ width: readingProgress + '%' }"></span>
  </div>
  <div class="reading-layout">
    <div class="reading-column">
      <article class="panel reader">
        <section class="question-section">
          <div class="question-toolbar">
            <div class="question-meta">
              <span class="question-topic">{{ categoryName(selected.category) }}</span
              ><span v-if="selected.tags.includes('senior-v1')" class="question-audience"
                >进阶题库</span
              >
            </div>
            <div v-if="admin" class="actions reader-actions">
              <button :disabled="busy" @click="emit('edit')">
                <Icon name="edit" :size="14" />{{ selected.answer ? '编辑题解' : '添加回答' }}
              </button>
              <details class="more-menu">
                <summary aria-label="更多题目操作">更多</summary>
                <div>
                  <button v-if="selected.answer" :disabled="busy" @click="emit('removeAnswer')">
                    删除回答
                  </button>
                  <button class="danger" :disabled="busy" @click="emit('removeQuestion')">
                    删除题目
                  </button>
                </div>
              </details>
            </div>
          </div>
          <div
            class="question-markdown markdown"
            role="heading"
            aria-level="1"
            @click="emit('code', $event)"
            v-html="renderedQuestion"
          ></div>
          <details v-if="questionScenario" class="question-scenario">
            <summary>场景与约束 · 作答前展开</summary>
            <p>{{ questionScenario }}</p>
          </details>
        </section>
        <div class="study-purpose reader-purpose" role="group" aria-label="学习方式">
          <button :aria-pressed="!practice" @click="emit('update:practice', false)">
            阅读学习
          </button>
          <button :aria-pressed="practice" @click="emit('update:practice', true)">先答再看</button>
          <span>{{ practice ? '先组织自己的回答，再核对题解' : '阅读后可记录掌握情况' }}</span>
        </div>
        <div v-if="!answerVisible" class="practice-prompt panel">
          <h2>先试着回答这道题</h2>
          <p>说出结论、理由和适用条件。需要时展开场景约束。</p>
          <button class="primary" @click="revealAnswer">查看参考答案</button>
        </div>
        <section v-if="answerVisible" id="reference-answer" tabindex="-1" class="answer-section">
          <div v-if="structuredAnswer" class="answer-reading-tools">
            <div role="group" aria-label="答案阅读方式" class="answer-mode-switch">
              <button :aria-pressed="readingMode === 'full'" @click="readingMode = 'full'">
                完整解析
              </button>
              <button :aria-pressed="readingMode === 'spoken'" @click="readingMode = 'spoken'">
                口述复习
              </button>
              <button :aria-pressed="readingMode === 'quiz'" @click="readingMode = 'quiz'">
                自测卡
              </button>
            </div>
            <span>{{
              readingMode === 'full'
                ? '约 ' + readingMinutes + ' 分钟 · ' + (deepAnswer ? '深入题解' : '分层题解')
                : readingMode === 'quiz'
                  ? '先凭回忆作答，再对照要点并自评'
                  : '结论与关键判断'
            }}</span>
          </div>
          <div class="answer-divider">
            <span class="answer-emblem">答</span>
            <strong>参考回答</strong>
          </div>
          <div
            v-if="structuredAnswer && readingMode === 'quiz'"
            class="quiz-card"
            role="group"
            aria-label="自测卡"
          >
            <template v-if="!quizRevealed">
              <p class="quiz-hint">先按总结点回忆口述与关键机制，再对照参考回答。</p>
              <button class="primary" @click="revealQuiz">回忆完成，对照参考回答</button>
            </template>
            <template v-else>
              <p class="quiz-hint">对照后给自己记一笔：</p>
              <div class="actions quiz-rate" role="group" aria-label="自测结果">
                <button :disabled="busy" @click="emit('rate', 'YES')">想起来了</button>
                <button :disabled="busy" @click="emit('rate', 'PARTIAL')">模糊</button>
                <button class="danger" :disabled="busy" @click="emit('rate', 'NO')">
                  没想起来
                </button>
              </div>
            </template>
          </div>
          <details v-if="visibleOutline.length" class="mobile-answer-outline">
            <summary>
              <Icon name="layers" :size="15" />本题目录 <span>{{ visibleOutline.length }} 节</span>
            </summary>
            <button
              v-for="(h, index) in visibleOutline"
              :key="h.id"
              :aria-current="activeHeading === h.id ? 'location' : undefined"
              @click="navigateTo(h.id, $event)"
            >
              <span>{{ outlineNumbers.get(h.id) }}</span
              >{{ h.label }}
            </button>
          </details>
          <div
            v-if="selected.answer"
            class="markdown answer-content"
            :class="{
              'answer-spoken-only': structuredAnswer && readingMode === 'spoken',
              'answer-quiz-hidden': structuredAnswer && readingMode === 'quiz' && !quizRevealed,
              'answer-quiz-open': structuredAnswer && readingMode === 'quiz' && quizRevealed,
            }"
            @click="emit('code', $event)"
            v-html="rendered"
          ></div>
          <p v-else class="empty">暂无回答，等待补充。</p>
          <p v-if="selected.answer && !structuredAnswer" class="muted reader-format-note">
            本题为自由格式题解，按原文完整展示。
          </p>
        </section>
      </article>
      <section v-if="answerVisible" class="self-assessment panel" aria-label="本题学习记录">
        <div>
          <strong>记录本题学习情况</strong>
          <span>不会或模糊的题目会收进待复习列表。</span>
        </div>
        <div class="actions personal-actions">
          <button :aria-pressed="favorite" :disabled="busy" @click="emit('favorite', !favorite)">
            {{ favorite ? '★ 已收藏' : '☆ 收藏题目' }}
          </button>
          <button v-if="reviewMode" :disabled="busy" @click="emit('step', 1)">继续下一题 →</button>
        </div>
        <details class="personal-note" :open="noteHasDraft">
          <summary>
            个人笔记<span v-if="noteHasDraft" class="note-draft-flag">· 有未保存草稿</span>
          </summary>
          <textarea
            :value="noteDraft"
            maxlength="30000"
            aria-label="个人复习笔记"
            placeholder="记录遗漏条件、项目例子或下次回答要点"
            @input="onNoteInput"
            @blur="flushNote"
          ></textarea>
          <span class="note-count">{{ noteDraft.length }} / 30000 · 停止输入后自动保存</span>
        </details>
        <div class="actions" role="group" aria-label="掌握程度">
          <button
            v-for="rating in [
              { value: 'NO', label: '不会' },
              { value: 'PARTIAL', label: '模糊' },
              { value: 'YES', label: '已掌握' },
            ]"
            :key="rating.value"
            :aria-pressed="selected.mastery === rating.value"
            :disabled="busy"
            @click="emit('rate', rating.value)"
          >
            {{ rating.label }}
          </button>
        </div>
      </section>
      <AiPanel
        v-if="answerVisible"
        :key="selected.id"
        :question-id="selected.id"
        :admin="admin"
        @adopt="emit('adopt', $event)"
      />
    </div>
    <aside v-if="visibleOutline.length" class="answer-outline" aria-label="本题目录">
      <div class="outline-heading">
        <strong>本题目录</strong
        ><span
          >{{ String(activeIndex + 1).padStart(2, '0') }} /
          {{ String(visibleOutline.length).padStart(2, '0') }}</span
        >
      </div>
      <ol>
        <li v-for="(h, index) in visibleOutline" :key="h.id">
          <button
            :class="{ nested: h.level === 3 }"
            :aria-current="activeHeading === h.id ? 'location' : undefined"
            @click="navigateTo(h.id)"
          >
            <span class="outline-number">{{ outlineNumbers.get(h.id) }}</span
            ><span>{{ h.label }}</span>
          </button>
        </li>
      </ol>
      <div class="outline-track" aria-hidden="true">
        <span :style="{ width: ((activeIndex + 1) / visibleOutline.length) * 100 + '%' }"></span>
      </div>
    </aside>
  </div>
  <nav class="reader-mobile-tools" aria-label="阅读快捷操作">
    <button :disabled="previousDisabled" @click="emit('step', -1)">
      <Icon name="left" :size="15" />上一题
    </button>
    <details
      v-if="visibleOutline.length"
      ref="mobileToc"
      class="reader-mobile-toc"
      @keydown.esc.prevent="
        closeMobileToc();
        mobileToc?.querySelector('summary')?.focus();
      "
    >
      <summary>
        <Icon name="list" :size="15" />目录<span
          >{{ activeIndex + 1 }}/{{ visibleOutline.length }}</span
        >
      </summary>
      <div class="reader-mobile-toc-menu">
        <strong>本题目录</strong
        ><button
          v-for="h in visibleOutline"
          :key="h.id"
          :aria-label="'跳转到' + h.label"
          :aria-current="activeHeading === h.id ? 'location' : undefined"
          @click="navigateTo(h.id, $event)"
        >
          {{ h.label }}
        </button>
      </div>
    </details>
    <button @click="emit('back')">
      {{ backLabel === '返回搜索结果' ? '搜索结果' : '题目列表' }}
    </button>
    <button :disabled="nextDisabled" @click="emit('step', 1)">
      下一题<Icon name="right" :size="15" />
    </button>
  </nav>
</template>
