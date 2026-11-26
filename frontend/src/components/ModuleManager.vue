<script setup lang="ts">
import { ref, computed, onBeforeUnmount, nextTick, watch, onMounted } from 'vue';
import { api } from '../lib/api';
import { categoryName, categoryGroup } from '../lib/display';
import Icon from './Icon.vue';
import { confirmAction } from '../lib/confirm';
import { trapDialogTab } from '../lib/dialog';
import { bulkMoveQuestions, moduleQuestionIds } from '../lib/bulkMove';
import type { Category, ArchivedCategory } from '../lib/types';
const props = defineProps<{ categories: Category[] }>();
const emit = defineEmits<{ refresh: [Category[]]; open: [Category]; dirty: [boolean] }>();
const deleting = ref(false),
  processing = computed(() => saving.value || deleting.value);
const query = ref(''),
  filter = ref('all'),
  dialog = ref<HTMLDialogElement>(),
  editing = ref<Category | null>(null),
  name = ref(''),
  saving = ref(false),
  formError = ref(''),
  error = ref(''),
  notice = ref(''),
  modalOpen = ref(false);
const archived = ref<ArchivedCategory[]>([]);
const archivedLoading = ref(false);
const moveDialog = ref<HTMLDialogElement>();
const moveSource = ref<Category | null>(null);
const moveTarget = ref('');
const moveBusy = ref(false);
const moveError = ref('');
const namePrefix = computed(
  () => editing.value?.name.match(/^(\d+\.\d+\s*|[一二三四五六七八]、\s*)/)?.[0] || '',
);
const maxNameLength = computed(() => 200 - namePrefix.value.length);
watch(name, () => (formError.value = ''));
watch([name, modalOpen], () =>
  emit(
    'dirty',
    modalOpen.value &&
      name.value.trim() !== (editing.value ? categoryName(editing.value.name) : ''),
  ),
);
let timer: ReturnType<typeof setTimeout> | undefined;
const visible = computed(() => {
  if (filter.value === 'archived') return [];
  return props.categories.filter(
    (c) =>
      categoryName(c.name).toLowerCase().includes(query.value.trim().toLowerCase()) &&
      (filter.value !== 'empty' || Number(c.question_count) === 0),
  );
});
const questionCount = computed(() =>
  props.categories.reduce((sum, c) => sum + Number(c.question_count), 0),
);
function success(text: string) {
  notice.value = text;
  clearTimeout(timer);
  timer = setTimeout(() => (notice.value = ''), 4000);
}
async function edit(c: Category | null) {
  if (processing.value) return;
  editing.value = c;
  name.value = c ? categoryName(c.name) : '';
  formError.value = '';
  await nextTick();
  dialog.value?.showModal();
  modalOpen.value = true;
}
async function close() {
  if (saving.value) return;
  const initial = editing.value ? categoryName(editing.value.name) : '';
  if (
    name.value.trim() !== initial &&
    !(await confirmAction('放弃本次修改？', '模块名称尚未保存。', '放弃修改', true))
  )
    return;
  dialog.value?.close();
  modalOpen.value = false;
}
async function save() {
  if (processing.value) return;
  const clean = name.value.trim();
  if (!clean) {
    formError.value = '请输入模块名称';
    return;
  }
  if (clean.length > maxNameLength.value) {
    formError.value = '模块名称最多 ' + maxNameLength.value + ' 个字符';
    return;
  }
  if (
    props.categories.some(
      (c) =>
        c.id !== editing.value?.id && categoryName(c.name).toLowerCase() === clean.toLowerCase(),
    )
  ) {
    formError.value = '已存在同名模块，请使用其他名称';
    return;
  }
  saving.value = true;
  formError.value = '';
  try {
    const old = editing.value;
    await api('/admin/categories' + (old ? '/' + old.id : ''), old ? 'PUT' : 'POST', {
      name: namePrefix.value + clean,
      sortOrder: old?.sort_order || 0,
    });
    const rows = await api<Category[]>('/categories');
    emit('refresh', rows);
    if (!old) {
      query.value = '';
      filter.value = 'all';
    }
    dialog.value?.close();
    modalOpen.value = false;
    success(old ? '模块名称已更新' : '新模块已创建');
  } catch (e) {
    formError.value = e instanceof Error ? e.message : '保存失败，请重试';
  } finally {
    saving.value = false;
  }
}
async function remove(c: Category) {
  if (processing.value) return;
  error.value = '';
  if (Number(c.question_count) > 0) {
    await confirmAction(
      '这个模块还有题目',
      '「' +
        categoryName(c.name) +
        '」内有 ' +
        c.question_count +
        ' 道题目，请先进入模块，将题目修改为其他所属模块后再归档。',
      '知道了',
    );
    return;
  }
  if (
    !(await confirmAction(
      '归档「' + categoryName(c.name) + '」？',
      '这个模块当前没有题目，归档后将从知识目录移除，可在“已归档”中恢复。',
      '归档模块',
      true,
    ))
  )
    return;
  if (processing.value) return;
  deleting.value = true;
  try {
    await api('/admin/categories/' + c.id, 'DELETE');
    emit('refresh', await api<Category[]>('/categories'));
    await loadArchived();
    success('模块已归档');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '归档失败，请重试';
  } finally {
    deleting.value = false;
  }
}

async function openMove(c: Category) {
  if (processing.value || Number(c.question_count) === 0) return;
  moveSource.value = c;
  moveTarget.value = '';
  moveError.value = '';
  await nextTick();
  moveDialog.value?.showModal();
}

function closeMove() {
  if (moveBusy.value) return;
  moveDialog.value?.close();
  moveSource.value = null;
}

async function moveQuestions() {
  const source = moveSource.value;
  if (!source || moveBusy.value) return;
  const target = Number(moveTarget.value);
  if (!target) {
    moveError.value = '请选择目标模块';
    return;
  }
  if (target === source.id) {
    moveError.value = '目标模块不能与当前模块相同';
    return;
  }
  moveBusy.value = true;
  moveError.value = '';
  try {
    const ids = await moduleQuestionIds(source.id);
    if (!ids.length) {
      moveError.value = '当前模块没有可移动的题目';
      return;
    }
    const result = await bulkMoveQuestions(ids, target);
    emit('refresh', await api<Category[]>('/categories'));
    closeMove();
    success('已移动 ' + result.moved + ' 道题目');
  } catch (e) {
    moveError.value = e instanceof Error ? e.message : '批量移动失败，请重试';
  } finally {
    moveBusy.value = false;
  }
}

async function loadArchived() {
  archivedLoading.value = true;
  try {
    archived.value = await api<ArchivedCategory[]>('/admin/categories/archived');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '已归档模块加载失败';
  } finally {
    archivedLoading.value = false;
  }
}

async function restore(a: ArchivedCategory) {
  if (processing.value) return;
  error.value = '';
  if (
    !(await confirmAction(
      '恢复「' + a.archived_name + '」？',
      '模块将以原名称重新出现在知识目录；若已有同名模块则会失败。',
      '取消归档',
    ))
  )
    return;
  deleting.value = true;
  try {
    await api('/admin/categories/' + a.id + '/unarchive', 'POST');
    emit('refresh', await api<Category[]>('/categories'));
    archived.value = archived.value.filter((item) => item.id !== a.id);
    success('模块已恢复');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '恢复失败，请重试';
  } finally {
    deleting.value = false;
  }
}

watch(filter, (value) => {
  if (value === 'archived') loadArchived();
});
onMounted(() => {
  loadArchived();
});
onBeforeUnmount(() => {
  clearTimeout(timer);
  emit('dirty', false);
});
</script>
<template>
  <section class="module-manager">
    <div class="module-manager-heading">
      <div>
        <h1>知识模块</h1>
        <p>每个模块都是一组题目的归属，整理、查找和维护更方便。</p>
      </div>
      <button class="primary" :disabled="processing" @click="edit(null)">
        <Icon name="plus" :size="18" />新建模块
      </button>
    </div>
    <div class="module-manager-tools">
      <div class="module-manager-search">
        <Icon name="search" :size="19" /><input
          v-model="query"
          aria-label="搜索模块"
          placeholder="搜索模块名称"
        /><button v-if="query" aria-label="清空模块搜索" @click="query = ''">
          <Icon name="close" :size="16" />
        </button>
      </div>
      <div class="module-manager-filter" aria-label="模块筛选">
        <button :class="{ active: filter === 'all' }" @click="filter = 'all'">
          全部模块 <span>{{ categories.length }}</span></button
        ><button :class="{ active: filter === 'empty' }" @click="filter = 'empty'">
          空模块
          <span>{{ categories.filter((c) => Number(c.question_count) === 0).length }}</span></button
        ><button :class="{ active: filter === 'archived' }" @click="filter = 'archived'">
          已归档 <span>{{ archived.length }}</span>
        </button>
      </div>
      <span class="module-manager-total">共 {{ questionCount }} 道题目</span>
    </div>
    <div v-if="notice" class="module-manager-notice" role="status">
      <Icon name="check" :size="16" />{{ notice }}
    </div>
    <div
      v-if="filter === 'archived' && archivedLoading"
      class="module-manager-notice"
      role="status"
    >
      正在加载已归档模块…
    </div>
    <div v-if="error" class="error feedback" role="alert">
      {{ error }}<button @click="error = ''">关闭</button>
    </div>
    <div
      v-if="visible.length || (filter === 'archived' && archived.length)"
      class="managed-module-grid"
    >
      <article v-for="c in visible" :key="c.id" class="managed-module-card">
        <button
          class="managed-module-open"
          :aria-label="'查看' + categoryName(c.name) + '模块题目'"
          @click="emit('open', c)"
        >
          <div class="managed-module-top">
            <span class="managed-module-icon" :class="'tone-' + (c.id % 3)"
              ><Icon name="layers" :size="22" /></span
            ><span class="managed-module-label">{{ categoryGroup(c.name) }}</span
            ><Icon class="managed-module-arrow" name="right" :size="17" />
          </div>
          <h2>{{ categoryName(c.name) }}</h2>
          <p>
            <strong>{{ c.question_count }}</strong
            ><span>道题目</span
            ><span v-if="!Number(c.question_count)" class="managed-module-empty">等待添加</span>
          </p>
        </button>
        <div class="managed-module-card-footer">
          <button :disabled="processing" @click="edit(c)">
            <Icon name="edit" :size="14" />重命名</button
          ><button
            v-if="Number(c.question_count) > 0"
            :aria-label="'批量移动' + categoryName(c.name) + '模块的题目'"
            :disabled="processing || moveBusy"
            @click="openMove(c)"
          >
            <Icon name="right" :size="14" />批量移动</button
          ><button
            class="managed-module-delete"
            :aria-label="'归档' + categoryName(c.name) + '模块'"
            :disabled="processing"
            @click="remove(c)"
          >
            <Icon name="trash" :size="14" />归档
          </button>
        </div>
      </article>
      <article
        v-for="a in archived"
        v-show="filter === 'archived'"
        :key="'archived-' + a.id"
        class="managed-module-card"
      >
        <div class="managed-module-open archived-module">
          <div class="managed-module-top">
            <span class="managed-module-icon" :class="'tone-' + (a.id % 3)"
              ><Icon name="layers" :size="22" /></span
            ><span class="managed-module-label">已归档</span>
          </div>
          <h2>{{ a.archived_name }}</h2>
          <p><span>道题目（历史）</span></p>
        </div>
        <div class="managed-module-card-footer">
          <button
            :aria-label="'恢复' + a.archived_name + '模块'"
            :disabled="processing"
            @click="restore(a)"
          >
            <Icon name="check" :size="14" />取消归档
          </button>
        </div>
      </article>
      <button
        v-if="filter === 'all' && !query"
        class="managed-module-add"
        :disabled="processing"
        @click="edit(null)"
      >
        <span><Icon name="plus" :size="23" /></span><strong>创建一个新模块</strong
        ><small>整理新的知识内容</small>
      </button>
    </div>
    <div v-else class="managed-module-no-results">
      <span><Icon name="layers" :size="32" /></span>
      <h2>
        {{
          query
            ? '没有找到对应模块'
            : filter === 'empty'
              ? '所有模块都有题目了'
              : filter === 'archived'
                ? '还没有归档的模块'
                : '从第一个模块开始'
        }}
      </h2>
      <p>
        {{
          query
            ? '尝试缩短关键词，或清空搜索。'
            : filter === 'empty'
              ? '可以切换到全部模块继续管理。'
              : filter === 'archived'
                ? '归档的空模块会出现在这里，可随时恢复。'
                : '例如 Java 基础、JVM、数据库。'
        }}
      </p>
      <button
        v-if="query || filter === 'empty' || filter === 'archived'"
        @click="
          query = '';
          filter = 'all';
        "
      >
        查看全部模块</button
      ><button v-else class="primary" :disabled="processing" @click="edit(null)">新建模块</button>
    </div>
    <div class="module-manager-hint">
      <Icon name="info" :size="15" /><span>点击卡片查看题目；模块有题目时，先转移题目再归档。</span
      ><span>{{ visible.length }} / {{ categories.length }} 个模块</span>
    </div>
    <dialog
      ref="dialog"
      class="module-edit-dialog"
      :aria-labelledby="'module-dialog-title'"
      @keydown.capture="(e) => trapDialogTab(e, dialog)"
      @cancel.prevent="close"
    >
      <form @submit.prevent="save">
        <div class="module-edit-dialog-top">
          <span><Icon name="layers" :size="24" /></span
          ><button type="button" aria-label="关闭模块编辑" :disabled="saving" @click="close">
            <Icon name="close" :size="20" />
          </button>
        </div>
        <h2 id="module-dialog-title">{{ editing ? '重命名模块' : '新建知识模块' }}</h2>
        <p>
          {{
            editing
              ? '修改名称不会影响模块中的题目和回答。'
              : '起一个明确的名称，方便整理和查找题目。'
          }}
        </p>
        <label
          >模块名称<input
            v-model="name"
            :disabled="saving"
            required
            autofocus
            :maxlength="maxNameLength"
            autocomplete="off"
            placeholder="例如：Java 基础、JVM、数据库"
        /></label>
        <div class="module-name-counter">{{ name.length }} / {{ maxNameLength }}</div>
        <div v-if="formError" class="module-form-error" role="alert">{{ formError }}</div>
        <div class="module-dialog-actions">
          <button type="button" :disabled="saving" @click="close">取消</button
          ><button class="primary" :disabled="saving || !name.trim()">
            {{ saving ? '保存中…' : editing ? '保存修改' : '创建模块' }}
          </button>
        </div>
      </form>
    </dialog>
    <dialog
      ref="moveDialog"
      class="module-edit-dialog"
      @keydown.capture="(e) => trapDialogTab(e, moveDialog)"
      @cancel.prevent="closeMove"
    >
      <form @submit.prevent="moveQuestions">
        <div class="module-edit-dialog-top">
          <span><Icon name="layers" :size="24" /></span
          ><button type="button" aria-label="关闭批量移动" :disabled="moveBusy" @click="closeMove">
            <Icon name="close" :size="20" />
          </button>
        </div>
        <h2>批量移动题目</h2>
        <p v-if="moveSource">
          将「{{ categoryName(moveSource.name) }}」的
          {{ moveSource.question_count }}
          道题目整体移动到目标模块，题目的回答、标签与学习进度保持不变。
        </p>
        <label
          >目标模块<select v-model="moveTarget" :disabled="moveBusy" required>
            <option value="" disabled>请选择模块</option>
            <option
              v-for="c in categories.filter((item) => item.id !== moveSource?.id)"
              :key="c.id"
              :value="String(c.id)"
            >
              {{ categoryName(c.name) }}
            </option>
          </select></label
        >
        <div v-if="moveError" class="module-form-error" role="alert">{{ moveError }}</div>
        <div class="module-dialog-actions">
          <button type="button" :disabled="moveBusy" @click="closeMove">取消</button
          ><button class="primary" :disabled="moveBusy || !moveTarget">
            {{ moveBusy ? '移动中…' : '确认移动' }}
          </button>
        </div>
      </form>
    </dialog>
  </section>
</template>
