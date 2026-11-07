<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import LearningHome from './LearningHome.vue';
import Icon from './Icon.vue';
import { categoryGroup, categoryName, moduleGroups } from '../lib/display';
import { learningPaths, moduleProfile } from '../lib/catalog';
import { readSetting, saveSetting } from '../lib/storage';
import { matchesModule } from '../lib/moduleSearch';
import type { Category, LearningSummary } from '../lib/types';

const props = defineProps<{ categories: Category[]; userId: number; admin: boolean }>();
const emit = defineEmits<{ select: [Category]; open: [number]; create: []; review: [] }>();
const view = ref(readSetting('zhixu-catalog-view') === 'paths' ? 'paths' : 'modules');
watch(view, (value) => saveSetting('zhixu-catalog-view', value));
const query = ref('');
const group = ref('全部');
const summary = ref<LearningSummary>();
const progress = computed(
  () => new Map((summary.value?.categories || []).map((c) => [c.name, c.mastered])),
);
const total = computed(() => props.categories.reduce((sum, c) => sum + c.question_count, 0));
const filters = computed(() =>
  moduleGroups.filter((name) => props.categories.some((c) => categoryGroup(c.name) === name)),
);
const matching = computed(() =>
  props.categories.filter((c) => {
    return (
      (group.value === '全部' || categoryGroup(c.name) === group.value) &&
      matchesModule(c, query.value)
    );
  }),
);
const groups = computed(() =>
  moduleGroups
    .map((name) => ({ name, items: matching.value.filter((c) => categoryGroup(c.name) === name) }))
    .filter((g) => g.items.length),
);
const paths = computed(() => learningPaths(props.categories));
function mastered(c: Category) {
  return Math.min(c.question_count, Math.max(0, progress.value.get(c.name) || 0));
}
function percentage(c: Category) {
  return c.question_count ? (mastered(c) / c.question_count) * 100 : 0;
}
</script>
<template>
  <div class="catalog-home">
    <div class="catalog-intro">
      <div>
        <p class="catalog-eyebrow">面试准备 · 系统学习</p>
        <h1>知识目录</h1>
        <p>循序学习一个模块，或从上次的薄弱点继续。</p>
      </div>
      <div class="catalog-intro-side">
        <span
          ><strong>{{ categories.length }}</strong> 个模块 <i>·</i>
          <strong>{{ total }}</strong> 道题目</span
        ><button v-if="admin" class="catalog-create" @click="emit('create')">
          <Icon name="plus" :size="15" />新增题目
        </button>
      </div>
    </div>
    <LearningHome
      :user-id="userId"
      :start-module="categories[0]"
      @open="emit('open', $event)"
      @begin="emit('select', $event)"
      @loaded="summary = $event"
      @review="emit('review')"
    />
    <div class="catalog-browse-heading">
      <div class="catalog-view-switch" role="group" aria-label="目录展示方式">
        <button :aria-pressed="view === 'modules'" @click="view = 'modules'">
          <Icon name="grid" :size="16" />全部模块</button
        ><button :aria-pressed="view === 'paths'" @click="view = 'paths'">
          <Icon name="layers" :size="16" />学习路线
        </button>
      </div>
      <p>
        {{ view === 'paths' ? '建议顺序，可按薄弱项自由跳转' : '选择模块，逐步理解原理与实践' }}
      </p>
    </div>
    <template v-if="view === 'modules'">
      <div class="catalog-search panel">
        <Icon name="search" :size="18" /><input
          v-model="query"
          aria-label="查找知识模块"
          placeholder="筛选模块或知识点，例如：事务、线程池、索引"
        /><button v-if="query" aria-label="清除模块筛选" @click="query = ''">
          <Icon name="close" :size="16" /></button
        ><span>{{ matching.length }} / {{ categories.length }} 个模块</span>
      </div>
      <div class="catalog-group-filters" role="group" aria-label="知识领域">
        <button :aria-pressed="group === '全部'" @click="group = '全部'">全部</button
        ><button
          v-for="name in filters"
          :key="name"
          :aria-pressed="group === name"
          @click="group = name"
        >
          {{ name }}
        </button>
      </div>
      <section v-for="g in groups" :key="g.name" class="catalog-group">
        <div class="catalog-group-heading">
          <h2>{{ g.name }}</h2>
          <span>{{ g.items.length }} 个模块</span>
        </div>
        <div class="module-grid">
          <button v-for="c in g.items" :key="c.id" class="module-card" @click="emit('select', c)">
            <span class="catalog-card-heading"
              ><span class="module-card-icon"
                ><Icon :name="moduleProfile(c.name).icon" :size="19" /></span
              ><strong>{{ categoryName(c.name) }}</strong
              ><Icon name="right" :size="16"
            /></span>
            <span class="catalog-card-description">{{ moduleProfile(c.name).description }}</span>
            <span class="catalog-card-topics"
              ><span v-for="topic in moduleProfile(c.name).topics" :key="topic">{{
                topic
              }}</span></span
            >
            <span
              class="catalog-card-progress"
              role="progressbar"
              :aria-label="categoryName(c.name) + '掌握进度'"
              :aria-valuemin="0"
              :aria-valuemax="Math.max(1, c.question_count)"
              :aria-valuenow="summary ? mastered(c) : undefined"
              :aria-valuetext="
                summary ? `已掌握 ${mastered(c)} / ${c.question_count} 题` : '正在加载学习进度'
              "
              ><span :style="{ width: percentage(c) + '%' }"></span
            ></span>
            <span class="module-card-bottom"
              ><span>{{ c.question_count }} 道题目</span
              ><span>{{ summary ? '已掌握 ' + mastered(c) + ' 题' : '加载进度…' }}</span></span
            >
          </button>
        </div>
      </section>
      <div v-if="!groups.length" class="empty panel">
        没有匹配的模块。<button
          @click="
            query = '';
            group = '全部';
          "
        >
          清除筛选
        </button>
      </div>
    </template>
    <section v-else class="learning-paths" aria-label="建议学习路线">
      <article v-for="(path, index) in paths" :key="path.id" class="learning-path panel">
        <div class="path-heading">
          <span class="path-number">{{ String(index + 1).padStart(2, '0') }}</span>
          <div>
            <span class="path-audience">{{ path.audience }}</span>
            <h2>{{ path.title }}</h2>
            <p>{{ path.description }}</p>
          </div>
        </div>
        <ol>
          <li v-for="c in path.modules" :key="c.id">
            <button @click="emit('select', c)">
              <span>{{ categoryName(c.name) }}</span
              ><small>{{ c.question_count }} 题 <Icon name="right" :size="14" /></small>
            </button>
          </li>
        </ol>
      </article>
      <p v-if="!paths.length" class="empty panel">
        当前模块尚未配置学习路线，可在全部模块中选择专题。
      </p>
    </section>
  </div>
</template>
