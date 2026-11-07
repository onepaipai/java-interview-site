<script setup lang="ts">
import { defineAsyncComponent, h } from 'vue';
import { useWorkbench } from './composables/useWorkbench';
import ModuleNavigator from './components/ModuleNavigator.vue';
import GlobalSearch from './components/GlobalSearch.vue';
import Icon from './components/Icon.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import PasswordSettings from './components/PasswordSettings.vue';
import QuestionDetail from './components/QuestionDetail.vue';
import CatalogHome from './components/CatalogHome.vue';
import { categoryName, masteryLabels } from './lib/display';
import { PAGE_SIZE } from './lib/navigation';
import { trapDialogTab } from './lib/dialog';
import { useTheme } from './lib/theme';
import './styles/ai.css';
const Loading = () => h('div', { class: 'loading-state', role: 'status' }, '正在加载界面…');
const LoadError = () =>
  h('div', { class: 'component-load-error', role: 'alert' }, [
    h('p', '界面加载失败，请刷新后重试。'),
    h('button', { onClick: () => location.reload() }, '刷新页面'),
  ]);
function lazy(loader: () => Promise<any>) {
  return defineAsyncComponent({
    loader,
    loadingComponent: Loading,
    errorComponent: LoadError,
    delay: 80,
    timeout: 20000,
  });
}
const ModuleManager = lazy(() => import('./components/ModuleManager.vue')),
  AccountManager = lazy(() => import('./components/AccountManager.vue')),
  KnowledgeManager = lazy(() => import('./components/KnowledgeManager.vue')),
  QuestionForm = lazy(() => import('./components/QuestionForm.vue'));
const {
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
} = useWorkbench();
const {
  mode: themeMode,
  effective: themeEffective,
  labels: themeLabels,
  cycle: cycleTheme,
} = useTheme();
</script>
<template>
  <div v-if="!ready" class="loading">正在加载…</div>
  <main v-else-if="!user" class="login">
    <form class="login-card" @submit.prevent="login">
      <div class="eyebrow">知识有序，回答有据</div>
      <h1>知序</h1>
      <p class="muted">按模块整理题目，随时查看与完善回答。</p>
      <label
        >账号<input v-model="username" autocomplete="username" required maxlength="40" />
      </label>
      <label
        >密码<input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          maxlength="64"
        />
      </label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button class="primary" :disabled="busy">登录</button>
    </form>
  </main>
  <div v-else :class="{ 'reader-open': !!selected && !editor }">
    <header>
      <div class="header-inner">
        <a class="brand" href="#" @click.prevent="navigate('questions')">
          <span class="brand-icon"> <Icon name="layers" :size="20" /> </span>知序</a
        >
        <button class="navigation-toggle" aria-label="打开模块目录" @click="toggleSidebar">
          <Icon name="list" :size="20" />
        </button>
        <nav aria-label="主导航">
          <button :class="{ active: tab === 'questions' }" @click="navigate('questions')">
            题库
          </button>
          <button v-if="admin" :class="{ active: tab === 'modules' }" @click="navigate('modules')">
            知识模块
          </button>
          <button
            v-if="admin"
            :class="{ active: tab === 'accounts' }"
            @click="navigate('accounts')"
          >
            账号管理
          </button>
          <button
            v-if="admin"
            :class="{ active: tab === 'knowledge' }"
            @click="navigate('knowledge')"
          >
            AI 知识库
          </button>
        </nav>
        <button class="search-launcher" aria-label="搜索全部内容 Ctrl K" @click="showSearch">
          <Icon name="search" :size="17" />
          <span>搜索题目与答案</span>
          <kbd>Ctrl K</kbd>
        </button>
        <button
          class="theme-toggle"
          :aria-label="'配色：' + themeLabels[themeMode] + '，点击切换'"
          :title="'配色：' + themeLabels[themeMode]"
          @click="cycleTheme"
        >
          <Icon :name="themeEffective === 'dark' ? 'sun' : 'moon'" :size="17" />
          <span class="theme-toggle-label">{{ themeLabels[themeMode] }}</span>
        </button>
        <div class="user-menu">
          <button @click="navigate('password')">{{ user.username }}</button>
          <button @click="logout">退出</button>
        </div>
      </div>
    </header>
    <div class="workspace" :class="{ collapsed: sidebarCollapsed }">
      <ModuleNavigator
        ref="moduleNavigation"
        :categories="categories"
        :active="selected ? String(selected.category_id) : category"
        :collapsed="sidebarCollapsed"
        :admin="admin"
        @select="chooseModule"
        @home="moduleHome"
        @manage="navigate(&#39;modules&#39;)"
        @collapse="toggleSidebar"
      />
      <main class="page">
        <div v-if="error && !editor" class="error feedback" role="alert">
          {{ error }}
          <div class="actions">
            <button @click="go(acceptedHash, true)">重试</button>
            <button @click="moduleHome">返回目录</button>
            <button @click="error = ''">关闭</button>
          </div>
        </div>
        <div v-if="notice" class="success-toast" role="status">
          <Icon name="check" :size="17" />{{ notice
          }}<button aria-label="关闭提示" @click="notice = ''">
            <Icon name="close" :size="15" />
          </button>
        </div>
        <button
          v-if="tab === 'questions' && !selected && !editor && !loading && (category || searched)"
          class="mobile-module-switch"
          @click="toggleSidebar"
        >
          <Icon name="layers" :size="17" />
          <span>{{ currentModule ? categoryName(currentModule.name) : '选择知识模块' }}</span>
          <small>切换模块</small>
          <Icon name="right" :size="16" />
        </button>
        <div v-if="loading" class="panel loading-state" role="status">
          <span class="loading-dot"> </span>正在加载内容…
        </div>
        <QuestionForm
          v-else-if="editor"
          v-model:title="title"
          v-model:answer="answer"
          v-model:module-id="moduleId"
          v-model:difficulty="difficulty"
          v-model:title-expanded="titleExpanded"
          :editing="editing"
          :categories="categories"
          :error="error"
          :dirty="dirty"
          :busy="busy"
          :uploading="uploading"
          :draft-restored="draftRestored"
          @save="save"
          @cancel="cancel"
          @reload="reloadEditor"
          @discard-draft="discardEditorDraft"
          @question-uploading="questionUploading = $event"
          @answer-uploading="answerUploading = $event"
        />
        <section v-else-if="tab === 'questions'">
          <QuestionDetail
            v-if="selected"
            :selected="selected"
            v-model:practice="practice"
            :scope-label="category ? categoryName(selected.category) : '搜索结果'"
            :back-label="!category && search ? '返回搜索结果' : '返回题目列表'"
            :admin="admin"
            :busy="busy"
            :page="page"
            :question-index="questionIndex"
            :total="total"
            :review-mode="acceptedHash.includes('weak=1')"
            :favorite="selected.favorite"
            :note="selected.note"
            :rendered-question="renderedQuestion"
            :rendered="rendered"
            :answer-outline="answerOutline"
            @home="moduleHome"
            @back="returnToList"
            @module="openSelectedModule"
            @rate="rateQuestion"
            @favorite="updateFavorite"
            @note="updateNote"
            @edit="edit(selected)"
            @remove-answer="removeAnswer"
            @remove-question="removeQuestion"
            @code="copyCode"
            @jump="jumpTo"
            @adopt="adoptAi"
            @step="stepQuestion"
          />
          <CatalogHome
            v-else-if="!category && !searched"
            :categories="categories"
            :user-id="user.id"
            :admin="admin"
            @select="chooseModule"
            @open="open"
            @create="edit(null)"
            @review="startReview"
          />
          <template v-else>
            <div class="breadcrumbs">
              <button @click="moduleHome">知识目录</button>
              <span>/</span>
              <span>{{ currentModule ? categoryName(currentModule.name) : '搜索结果' }}</span>
            </div>
            <div class="section-head">
              <div>
                <h1>
                  {{
                    acceptedHash.includes('weak=1')
                      ? '待复习'
                      : currentModule
                        ? categoryName(currentModule.name)
                        : '搜索结果'
                  }}
                </h1>
                <p class="muted">
                  {{
                    acceptedHash.includes('weak=1')
                      ? `当前待复习队列共 ${total} 道题目`
                      : `${category ? '本模块' : '搜索匹配'}共 ${total} 道题目`
                  }}
                </p>
              </div>
              <button v-if="admin" class="primary" @click="edit(null)">＋ 新增题目</button>
            </div>
            <div class="study-purpose" role="group" aria-label="学习方式">
              <button :aria-pressed="!practice" @click="practice = false">阅读学习</button>
              <button :aria-pressed="practice" @click="practice = true">先答再看</button>
              <span>{{ practice ? '隐藏答案摘要，作答后再揭示题解' : '查看题目与答案摘要' }}</span>
            </div>
            <form class="filters" @submit.prevent="filter">
              <label class="search-label">
                <span class="sr-only">搜索题目</span>
                <input
                  v-model="searchDraft"
                  type="search"
                  maxlength="3000"
                  placeholder="搜索题目或回答"
                />
              </label>
              <label>
                <span class="sr-only">筛选知识模块</span>
                <select v-model="category" @change="filter">
                  <option value="">全部知识模块</option>
                  <option v-for="c in categories" :key="c.id" :value="String(c.id)">
                    {{ categoryName(c.name) }}
                  </option>
                </select>
              </label>
              <button type="submit">搜索</button>
            </form>
            <section v-if="category" class="panel question-list">
              <div class="list-heading">
                <strong>{{
                  category
                    ? categoryName(categories.find((c) => String(c.id) === category)?.name || '')
                    : '全部题目'
                }}</strong>
                <span class="muted">{{ total }} 道题目</span>
              </div>
              <button v-for="q in items" :key="q.id" class="question-row" @click="open(q.id)">
                <div class="question-row-main">
                  <span class="question-number">{{
                    String((page - 1) * PAGE_SIZE + items.indexOf(q) + 1).padStart(2, '0')
                  }}</span>
                  <div>
                    <div class="row-title">{{ plain(q.title) }}</div>
                    <div class="question-row-labels">
                      <span class="question-level">{{ q.difficulty }}</span
                      ><span
                        v-if="q.mastery && q.mastery !== 'NEW'"
                        class="question-mastery"
                        :class="'mastery-' + q.mastery"
                        >{{ masteryLabels[q.mastery] }}</span
                      ><span v-if="q.tags.includes('senior-v1')" class="experience-badge"
                        >扩展题</span
                      >
                    </div>
                    <p v-if="!practice && questionPreviews.get(q.id)" class="row-preview">
                      {{ questionPreviews.get(q.id) }}
                    </p>
                  </div>
                </div>
                <span class="row-end">
                  <span class="answer-state" :class="q.answered ? 'answered' : 'pending'">{{
                    q.answered ? '含题解' : '待补充'
                  }}</span>
                  <Icon name="right" :size="17" />
                </span>
              </button>
              <p v-if="!items.length" class="empty">
                {{
                  acceptedHash.includes('weak=1')
                    ? '当前没有待复习题目。'
                    : '没有找到题目。试试其他关键词或模块。'
                }}
              </p>
            </section>
            <div v-else class="grouped-search-list">
              <section v-for="group in searchGroups" :key="group.name" class="panel question-list">
                <div class="list-heading">
                  <strong>{{ categoryName(group.name) }}</strong>
                </div>
                <button
                  v-for="q in group.items"
                  :key="q.id"
                  class="question-row"
                  @click="open(q.id)"
                >
                  <div>
                    <div class="row-title">{{ plain(q.title) }}</div>
                    <div class="question-row-labels">
                      <span class="question-level">{{ q.difficulty }}</span
                      ><span
                        v-if="q.mastery && q.mastery !== 'NEW'"
                        class="question-mastery"
                        :class="'mastery-' + q.mastery"
                        >{{ masteryLabels[q.mastery] }}</span
                      ><span v-if="q.tags.includes('senior-v1')" class="experience-badge"
                        >扩展题</span
                      >
                    </div>
                  </div>
                  <span class="row-status">{{ q.answered ? '含题解' : '待补充' }} →</span>
                </button>
              </section>
              <div v-if="!items.length" class="panel empty">没有匹配的题目。</div>
            </div>
            <div class="pagination">
              <span class="muted"
                >第 {{ page }} / {{ Math.max(1, Math.ceil(total / PAGE_SIZE)) }} 页</span
              >
              <div class="actions">
                <button :disabled="page === 1 || busy" @click="paginate(-1)">上一页</button>
                <button :disabled="page * PAGE_SIZE >= total || busy" @click="paginate(1)">
                  下一页
                </button>
              </div>
            </div>
          </template>
        </section>
        <KnowledgeManager v-else-if="tab === 'knowledge' && admin" />
        <ModuleManager
          v-else-if="tab === 'modules' && admin"
          :categories="categories"
          @refresh="categories = $event"
          @open="chooseModule"
          @dirty="extraDirty = $event"
        />
        <AccountManager
          v-else-if="tab === 'accounts' && admin"
          :user-id="user!.id"
          @password="navigate('password')"
          @success="success"
          @dirty="extraDirty = $event"
        />
        <PasswordSettings
          v-else-if="tab === 'password'"
          :username="user.username"
          @success="success"
          @dirty="extraDirty = $event"
        />
      </main>
    </div>
    <footer>知序 · 专注题目与回答</footer>
  </div>
  <GlobalSearch
    v-if="user"
    ref="globalSearch"
    :categories="categories"
    :practice="practice"
    @question="openSearchQuestion"
    @module="chooseModule"
    @results="searchAll"
  />
  <ConfirmDialog />
  <dialog
    ref="imageDialog"
    class="image-lightbox"
    aria-label="图片查看"
    @click="
      (e) => {
        if (e.target === e.currentTarget) imageDialog?.close();
      }
    "
  >
    <button type="button" aria-label="关闭图片" @click="imageDialog?.close()">
      <Icon name="close" :size="22" />
    </button>
    <img :src="imageUrl" :alt="imageAlt" />
  </dialog>
</template>
