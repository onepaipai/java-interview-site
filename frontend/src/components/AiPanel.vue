<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { api } from '../lib/api';
import { markdown } from '../lib/markdown';
import { copyCodeButton } from '../lib/clipboard';
import type { KnowledgeStatus } from '../lib/types';
import Icon from './Icon.vue';
const props = defineProps<{ questionId: number; admin: boolean }>();
const emit = defineEmits<{ adopt: [string] }>();
type Source = {
  id: number;
  title: string;
  questionId: number | null;
  chunk: number;
  content: string;
};
type Turn = { role: 'user' | 'assistant'; content: string; sources?: Source[] };
const opened = ref(false),
  enabled = ref(false),
  rag = ref(true),
  busy = ref(false),
  prompt = ref(''),
  error = ref(''),
  turns = ref<Turn[]>([]),
  model = ref('');
const chatKey = 'zhixu-ai-chat-' + props.questionId;
const renderedTurns = computed(() =>
  turns.value.map((turn) => ({
    ...turn,
    html: turn.role === 'assistant' ? markdown(turn.content, { media: false }) : '',
  })),
);
watch(
  turns,
  (value) => {
    try {
      sessionStorage.setItem(chatKey, JSON.stringify(value));
    } catch {}
  },
  { deep: true },
);
function loadTurns() {
  try {
    const value = JSON.parse(sessionStorage.getItem(chatKey) || 'null');
    if (Array.isArray(value)) {
      turns.value = value.filter(
        (t): t is Turn =>
          !!t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string',
      );
    }
  } catch {}
}
let disposed = false;
const statusLoading = ref(true),
  statusError = ref(''),
  controller = new AbortController();
async function loadStatus() {
  statusLoading.value = true;
  statusError.value = '';
  try {
    const s = await api<KnowledgeStatus>(
      '/ai/status',
      'GET',
      undefined,
      undefined,
      controller.signal,
    );
    if (!disposed) {
      enabled.value = s.enabled;
      model.value = s.model;
    }
  } catch (e) {
    if (!disposed) statusError.value = (e as Error).message;
  } finally {
    if (!disposed) statusLoading.value = false;
  }
}
onMounted(() => {
  loadStatus();
  loadTurns();
});
onBeforeUnmount(() => {
  disposed = true;
  controller.abort();
});
async function ask(text = prompt.value) {
  if (busy.value || !enabled.value || statusLoading.value || !text.trim()) return;
  if (text.length > 3000) {
    error.value = '问题不能超过 3000 个字符';
    return;
  }
  error.value = '';
  busy.value = true;
  const history = turns.value
    .slice(-8)
    .map((t) => ({ role: t.role, content: t.content.slice(0, 8000) }));
  try {
    const result = await api<{ answer: string; sources: Source[] }>(
      '/questions/' + props.questionId + '/ai',
      'POST',
      { prompt: text, history, rag: rag.value },
      120000,
      controller.signal,
    );
    if (disposed) return;
    turns.value.push(
      { role: 'user', content: text },
      { role: 'assistant', content: result.answer, sources: result.sources },
    );
    if (prompt.value === text) prompt.value = '';
  } catch (e) {
    if (!disposed) error.value = (e as Error).message;
  } finally {
    if (!disposed) busy.value = false;
  }
}
async function copy(e: MouseEvent) {
  const b = (e.target as Element).closest<HTMLButtonElement>('[data-copy-code]');
  if (b) await copyCodeButton(b);
}
</script>
<template>
  <section class="ai-panel">
    <button
      class="ai-panel-toggle"
      :aria-expanded="opened"
      :aria-controls="'ai-panel-body-' + questionId"
      @click="opened = !opened"
    >
      <span class="ai-panel-intro"
        ><span class="ai-panel-icon"><Icon name="book" :size="18" /></span
        ><span
          ><strong>AI 学习助手</strong><small>解释原理 · 补充示例 · 练习追问</small></span
        ></span
      ><span class="ai-panel-state"
        ><span>{{
          statusLoading ? '检查中' : statusError ? '连接异常' : enabled ? '继续追问' : '暂未启用'
        }}</span
        ><Icon name="right" :size="15"
      /></span>
    </button>
    <div v-if="opened" :id="'ai-panel-body-' + questionId" class="ai-panel-body">
      <p v-if="statusLoading" class="ai-setup" role="status">正在检查 AI 服务…</p>
      <p v-else-if="statusError" class="inline-error" role="alert">
        {{ statusError }}<button @click="loadStatus">重试连接</button>
      </p>
      <p v-else-if="!enabled" class="ai-setup">
        AI 追问暂未启用。启用后可围绕本题继续提问。<button @click="loadStatus">重新检查</button>
      </p>
      <template v-else
        ><div class="ai-options">
          <label><input v-model="rag" type="checkbox" :disabled="busy" />使用知识库</label
          ><span>{{ model }}</span
          ><button :disabled="busy || !turns.length" @click="turns = []">清空对话</button>
        </div>
        <div class="ai-shortcuts">
          <button :disabled="busy" @click="ask('请解释本题的核心原理，给出简短例子和常见误区。')">
            解释这道题</button
          ><button :disabled="busy" @click="ask('请为本题生成结构清晰的参考回答，注明知识来源。')">
            生成参考回答</button
          ><button :disabled="busy" @click="ask('请给出本题的常见面试追问及对应回答。')">
            常见追问
          </button>
        </div>
        <div class="ai-turns" aria-live="polite">
          <article v-for="(turn, i) in renderedTurns" :key="i" :class="'ai-turn ' + turn.role">
            <strong>{{ turn.role === 'user' ? '我的问题' : 'AI 回答' }}</strong>
            <p v-if="turn.role === 'user'">{{ turn.content }}</p>
            <div v-else class="markdown" @click="copy" v-html="turn.html"></div>
            <details v-if="turn.sources?.length" class="ai-sources">
              <summary>知识来源 · {{ turn.sources.length }} 个片段</summary>
              <details v-for="(s, n) in turn.sources" :key="s.id">
                <summary>[{{ n + 1 }}] {{ s.title }} · 片段 {{ s.chunk + 1 }}</summary>
                <p>{{ s.content }}</p>
                <a
                  v-if="s.questionId"
                  :href="'#/question/' + s.questionId"
                  target="_blank"
                  rel="noopener noreferrer"
                  >新标签页查看原题 →</a
                >
              </details>
            </details>
            <p v-else-if="turn.role === 'assistant'" class="muted">
              本次没有检索来源，回答需自行核对。
            </p>
            <button
              v-if="turn.role === 'assistant' && admin"
              :disabled="busy"
              @click="emit('adopt', turn.content)"
            >
              编辑并保存为回答
            </button>
          </article>
        </div>
        <p v-if="busy" role="status" class="ai-loading">正在检索与生成回答…</p>
        <form class="ai-compose" @submit.prevent="ask()">
          <label
            >向 AI 提问<textarea
              v-model="prompt"
              rows="3"
              maxlength="3000"
              :disabled="busy"
              placeholder="例如：为什么这样设计？给一个 Java 代码示例。"
            ></textarea></label
          ><button class="primary" :disabled="busy || !prompt.trim()">发送</button>
        </form>
        <p class="ai-caption">
          回答由模型生成，请核对后采用。对话按题目暂存，关闭标签页后清除。
        </p></template
      >
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </div>
  </section>
</template>
