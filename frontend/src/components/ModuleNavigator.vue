<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import Icon from './Icon.vue';
import type { Category } from '../lib/types';
import { categoryName, categoryGroup, moduleGroups } from '../lib/display';
import { matchesModule } from '../lib/moduleSearch';
import { trapDialogTab } from '../lib/dialog';
const props = defineProps<{
  categories: Category[];
  active: string;
  collapsed: boolean;
  admin: boolean;
}>();
const emit = defineEmits<{ select: [Category]; home: []; manage: []; collapse: [] }>();
const railQuery = ref(''),
  pickerQuery = ref(''),
  pickerGroup = ref('全部'),
  expanded = ref(new Set(['Java 核心'])),
  dialog = ref<HTMLDialogElement>();
let startY: number | null = null;
let originalOverflow: string | undefined;
const stages = moduleGroups;
const groups = computed(() =>
  stages
    .map((name) => ({
      name,
      items: props.categories.filter(
        (c) => categoryGroup(c.name) === name && matchesModule(c, railQuery.value),
      ),
    }))
    .filter((g) => g.items.length),
);
const pickerStages = computed(() =>
  stages.filter((name) => props.categories.some((c) => categoryGroup(c.name) === name)),
);
const pickerItems = computed(() =>
  props.categories.filter(
    (c) =>
      (pickerGroup.value === '全部' || categoryGroup(c.name) === pickerGroup.value) &&
      matchesModule(c, pickerQuery.value),
  ),
);
watch(
  () => props.active,
  (id) => {
    const active = props.categories.find((c) => String(c.id) === id);
    if (active) {
      expanded.value = new Set([categoryGroup(active.name)]);
      if (railQuery.value && !matchesModule(active, railQuery.value)) railQuery.value = '';
    }
  },
  { immediate: true },
);
watch(railQuery, (value) => {
  if (value.trim()) expanded.value = new Set(groups.value.map((g) => g.name));
});
watch(pickerQuery, (value) => {
  if (value.trim()) pickerGroup.value = '全部';
});
function toggle(group: string) {
  const values = new Set(expanded.value);
  if (values.has(group)) values.delete(group);
  else values.add(group);
  expanded.value = values;
}
function close() {
  dialog.value?.close();
  startY = null;
  if (originalOverflow !== undefined) {
    document.body.style.overflow = originalOverflow;
    originalOverflow = undefined;
  }
}
onBeforeUnmount(close);
async function open() {
  pickerQuery.value = '';
  const current = props.categories.find((c) => String(c.id) === props.active);
  pickerGroup.value = current ? categoryGroup(current.name) : '全部';
  await nextTick();
  if (!dialog.value || dialog.value.open) return;
  originalOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  dialog.value.showModal();
  dialog.value.querySelector<HTMLButtonElement>('.picker-close')?.focus();
}
function select(c: Category) {
  close();
  emit('select', c);
}
function backdrop(e: MouseEvent) {
  if (e.target !== e.currentTarget) return;
  const box = dialog.value?.getBoundingClientRect();
  if (
    box &&
    (e.clientY < box.top || e.clientY > box.bottom || e.clientX < box.left || e.clientX > box.right)
  )
    close();
}
function touchStart(e: TouchEvent) {
  startY = e.touches[0]?.clientY ?? null;
}
function touchEnd(e: TouchEvent) {
  if (startY !== null && (e.changedTouches[0]?.clientY || 0) - startY > 75) close();
  startY = null;
}
defineExpose({ open, close });
</script>
<template>
  <aside v-if="collapsed" class="module-rail-mini" aria-label="收起的模块目录">
    <button
      class="rail-expand"
      aria-label="展开模块目录"
      title="展开模块目录"
      @click="emit('collapse')"
    >
      <Icon name="right" :size="20" /><span>展开</span></button
    ><button class="mini-home" aria-label="知识目录" title="知识目录" @click="emit('home')">
      <Icon name="layers" :size="21" /><span>目录</span></button
    ><button
      v-if="admin"
      class="mini-manage"
      aria-label="管理模块"
      title="管理模块"
      @click="emit('manage')"
    >
      <Icon name="settings" :size="20" /><span>管理</span>
    </button>
  </aside>
  <aside v-else class="module-rail workspace-sidebar">
    <div class="rail-top">
      <button class="rail-title" @click="emit('home')">
        <Icon name="layers" :size="18" />模块目录</button
      ><button
        class="rail-collapse"
        aria-label="收起模块目录"
        title="收起目录"
        @click="emit('collapse')"
      >
        <Icon name="left" :size="18" />
      </button>
    </div>
    <label class="rail-search"
      ><Icon name="search" :size="16" /><input
        v-model="railQuery"
        aria-label="筛选侧边模块"
        placeholder="查找模块" /><button
        v-if="railQuery"
        aria-label="清空侧边搜索"
        @click="railQuery = ''"
      >
        <Icon name="close" :size="14" /></button
    ></label>
    <div class="rail-groups">
      <section v-for="group in groups" :key="group.name" class="rail-group">
        <button
          class="rail-group-toggle"
          :aria-expanded="expanded.has(group.name)"
          @click="toggle(group.name)"
        >
          <span>{{ group.name }}</span
          ><small>{{ group.items.length }}</small
          ><span class="rail-chevron" :class="{ open: expanded.has(group.name) }">›</span>
        </button>
        <div v-if="expanded.has(group.name)" class="rail-links">
          <button
            v-for="c in group.items"
            :key="c.id"
            class="sidebar-module rail-module"
            :class="{ active: String(c.id) === active }"
            :aria-current="String(c.id) === active ? 'page' : undefined"
            @click="select(c)"
          >
            <span class="rail-marker"></span><span>{{ categoryName(c.name) }}</span
            ><small>{{ c.question_count }}</small>
          </button>
        </div>
      </section>
      <p v-if="!groups.length" class="rail-empty">没有匹配的模块</p>
    </div>
    <div class="rail-bottom">
      <button v-if="admin" @click="emit('manage')">
        <Icon name="settings" :size="16" />管理模块</button
      ><span>{{ categories.length }} 个模块</span>
    </div>
  </aside>
  <dialog
    ref="dialog"
    class="module-picker"
    aria-label="模块目录"
    @cancel.prevent="close"
    @click="backdrop"
    @keydown.capture="(e) => trapDialogTab(e, dialog)"
  >
    <div class="picker-heading" @touchstart.passive="touchStart" @touchend.passive="touchEnd">
      <div>
        <h2>切换知识模块</h2>
        <p>选择模块，查看其中的题目</p>
      </div>
      <button class="picker-close" aria-label="关闭模块目录" @click="close">
        <Icon name="close" :size="22" />
      </button>
    </div>
    <label class="picker-search"
      ><Icon name="search" :size="19" /><input
        v-model="pickerQuery"
        aria-label="搜索模块目录"
        type="search"
        placeholder="搜索模块名称"
    /></label>
    <div class="picker-tabs" aria-label="模块分组">
      <button :class="{ active: pickerGroup === '全部' }" @click="pickerGroup = '全部'">全部</button
      ><button
        v-for="stage in pickerStages"
        :key="stage"
        :class="{ active: pickerGroup === stage }"
        @click="pickerGroup = stage"
      >
        {{ stage }}
      </button>
    </div>
    <div class="picker-list">
      <button
        v-for="c in pickerItems"
        :key="c.id"
        class="picker-module"
        :class="{ active: String(c.id) === active }"
        @click="select(c)"
      >
        <span
          ><strong>{{ categoryName(c.name) }}</strong
          ><small>{{ categoryGroup(c.name) }} · {{ c.question_count }} 道题目</small></span
        ><Icon :name="String(c.id) === active ? 'check' : 'right'" :size="19" />
      </button>
      <p v-if="!pickerItems.length" class="empty">没有匹配的模块，试试其他关键词。</p>
    </div>
    <div class="picker-footer"><button @click="close">关闭</button></div>
  </dialog>
</template>
