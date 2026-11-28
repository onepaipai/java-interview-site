<script setup lang="ts">
import Icon from './Icon.vue';
import { knowledgeExcerpt, knowledgeKindLabels } from '../lib/knowledge';
import { trapDialogTab } from '../lib/dialog';
import { useKnowledgeAdmin } from '../composables/useKnowledgeAdmin';
import '../styles/knowledge.css';

const {
  activeView,
  add,
  busy,
  closePreview,
  copyFragment,
  documentDate,
  documents,
  error,
  example,
  fragmentCount,
  groups,
  index,
  indexProgress,
  stopIndex,
  library,
  libraryFilters,
  libraryKind,
  libraryLoading,
  libraryPage,
  libraryPages,
  libraryQuery,
  notice,
  openSource,
  operation,
  pendingVectors,
  preview,
  previewBackdrop,
  previewDialog,
  previewError,
  previewHtml,
  previewLoading,
  previewTitle,
  query,
  refresh,
  remove,
  renderFragment,
  resultQuery,
  searched,
  search,
  searchInput,
  results,
  sourceCount,
  sourceDocument,
  sourceFilter,
  sourceFilters,
  status,
  switchView,
  tabKey,
  turnLibraryPage,
  upload,
  vectorPercent,
  visibleGroups,
  views,
} = useKnowledgeAdmin();
</script>

<template>
  <section class="knowledge-page" :aria-busy="busy">
    <div class="knowledge-heading">
      <div>
        <div class="knowledge-eyebrow">知识与资料</div>
        <h1>AI 知识库</h1>
        <p>查找题库与项目资料，让回答有据可查。</p>
      </div>
      <div class="knowledge-heading-actions">
        <button class="knowledge-refresh" :disabled="busy || libraryLoading" @click="refresh">
          <Icon name="undo" :size="14" />{{ operation === 'load' ? '刷新中…' : '刷新' }}
        </button>
        <button
          class="primary"
          :disabled="busy || !status || documents.length >= 50"
          @click="upload?.click()"
        >
          <Icon name="plus" :size="16" />{{ operation === 'upload' ? '上传中…' : '添加资料' }}
        </button>
      </div>
      <input ref="upload" type="file" accept=".md,.txt" hidden @change="add" />
    </div>

    <div v-if="error" class="error feedback" role="alert">{{ error }}</div>
    <p v-if="notice" class="knowledge-notice" role="status">{{ notice }}</p>

    <div class="knowledge-status-strip" aria-label="知识库状态">
      <span class="knowledge-status-item"
        ><span
          class="knowledge-state-dot"
          :class="{ ready: !!status?.chunks }"
          aria-hidden="true"
        ></span
        >{{ status ? (status.chunks ? '资料检索可用' : '暂无可检索资料') : '正在读取状态' }}</span
      >
      <span class="knowledge-status-item"
        ><Icon name="book" :size="14" /><template v-if="sourceCount !== null"
          >已收录 <strong>{{ sourceCount.toLocaleString() }}</strong> 个来源</template
        ><template v-else>来源加载中</template></span
      >
      <button class="knowledge-model-link" @click="switchView('settings')">
        <span
          class="knowledge-state-dot"
          :class="{ ready: status?.enabled }"
          aria-hidden="true"
        ></span
        >{{ status ? (status.enabled ? 'AI 问答已连接' : 'AI 问答未连接') : '服务状态待加载'
        }}<Icon name="right" :size="12" />
      </button>
    </div>

    <div class="knowledge-workspace panel">
      <div class="knowledge-views" role="tablist" aria-label="知识库工作区">
        <button
          v-for="(view, index) in views"
          :id="'knowledge-tab-' + view.key"
          :key="view.key"
          role="tab"
          :aria-selected="activeView === view.key"
          :aria-controls="'knowledge-panel-' + view.key"
          :tabindex="activeView === view.key ? 0 : -1"
          :class="{ active: activeView === view.key }"
          @click="switchView(view.key)"
          @keydown="tabKey($event, index)"
        >
          <Icon :name="view.icon" :size="16" />{{ view.label }}
        </button>
      </div>

      <section
        v-show="activeView === 'search'"
        id="knowledge-panel-search"
        class="knowledge-search knowledge-pane"
        role="tabpanel"
        aria-labelledby="knowledge-tab-search"
      >
        <div class="knowledge-pane-heading">
          <div>
            <h2>查找你需要的知识</h2>
            <p>搜索题库回答、参考资料和已上传的文档。</p>
          </div>
          <span class="knowledge-search-mode">本地检索</span>
        </div>
        <form class="knowledge-search-form" @submit.prevent="search">
          <label
            ><span class="sr-only">搜索知识</span><Icon name="search" :size="20" /><input
              ref="searchInput"
              v-model="query"
              type="search"
              maxlength="3000"
              placeholder="输入问题或知识点，例如：Spring 事务为什么失效？"
              aria-describedby="knowledge-search-help"
          /></label>
          <button class="primary" :disabled="busy || !query.trim()">
            {{ operation === 'search' ? '查找中…' : '查找资料' }}<Icon name="right" :size="15" />
          </button>
        </form>
        <p id="knowledge-search-help" class="knowledge-search-help">
          这里查资料，不生成 AI 回答。需要追问时，可从题目页打开 AI 学习助手。
        </p>
        <div v-if="!searched && operation !== 'search'" class="knowledge-examples">
          <span>常用知识点</span
          ><button
            v-for="term in ['G1 垃圾回收', 'Spring 事务', '缓存一致性']"
            :key="term"
            :disabled="busy"
            @click="example(term)"
          >
            {{ term }}<Icon name="right" :size="12" />
          </button>
        </div>

        <div v-if="operation === 'search'" class="knowledge-empty" role="status">
          正在查找相关资料…
        </div>
        <div v-else-if="searched && !results.length" class="knowledge-empty" role="status">
          <span class="knowledge-empty-icon"><Icon name="search" :size="24" /></span
          ><strong>没有找到“{{ resultQuery }}”</strong>
          <p>换个关键词试试，或添加相关资料后再查找。</p>
          <button class="text-button" @click="switchView('library')">
            查看已有知识来源 <span aria-hidden="true">→</span>
          </button>
        </div>
        <template v-else-if="searched">
          <div class="knowledge-result-toolbar">
            <p class="knowledge-result-count" role="status">
              找到 <strong>{{ groups.length }}</strong> 个相关来源
              <span>共 {{ fragmentCount }} 个命中片段</span>
            </p>
            <span class="knowledge-result-limit">最多展示 6 个相关片段</span>
          </div>
          <div class="knowledge-source-filters" aria-label="筛选当前检索结果">
            <button
              v-for="filter in sourceFilters"
              :key="filter.key"
              :class="{ active: sourceFilter === filter.key }"
              :aria-pressed="sourceFilter === filter.key"
              @click="sourceFilter = filter.key"
            >
              {{ filter.label }}<span>{{ filter.count }}</span>
            </button>
          </div>
          <details
            v-for="(group, n) in visibleGroups"
            :key="resultQuery + ':' + group.key"
            class="knowledge-result"
            :open="n === 0"
          >
            <summary>
              <span class="knowledge-result-rank" aria-hidden="true">{{
                String(n + 1).padStart(2, '0')
              }}</span
              ><span class="knowledge-result-title"
                ><span class="knowledge-source-kind"
                  >{{ knowledgeKindLabels[group.kind] }} ·
                  {{ group.chunks.length }} 个命中片段</span
                ><strong>{{ group.title }}</strong
                ><span class="knowledge-result-preview">{{
                  knowledgeExcerpt(group.chunks[0].content, resultQuery)
                }}</span></span
              ><Icon name="down" :size="16" />
            </summary>
            <div class="knowledge-result-body">
              <div v-for="source in group.chunks" :key="source.id" class="knowledge-fragment">
                <small>原文片段 {{ source.chunk + 1 }}</small>
                <div
                  class="markdown knowledge-fragment-content"
                  @click="copyFragment"
                  v-html="renderFragment(source.content)"
                ></div>
              </div>
              <div class="knowledge-result-actions">
                <button class="text-button" @click="openSource(group)">
                  预览完整资料 <Icon name="right" :size="13" /></button
                ><a
                  v-if="group.questionId"
                  :href="'#/question/' + group.questionId"
                  target="_blank"
                  rel="noopener"
                  >在题库中打开 ↗</a
                >
              </div>
            </div>
          </details>
        </template>
        <div v-else class="knowledge-start-guide">
          <div>
            <span class="knowledge-guide-icon"><Icon name="layers" :size="20" /></span
            ><strong>题库已自动收录</strong>
            <p>题目与回答更新后，检索资料同步更新。</p>
          </div>
          <div>
            <span class="knowledge-guide-icon"><Icon name="file" :size="20" /></span
            ><strong>项目经验也能加入</strong>
            <p>上传规范、排查记录，补充自己的知识。</p>
          </div>
          <button @click="switchView('library')">
            浏览全部知识来源<Icon name="right" :size="16" />
          </button>
        </div>
      </section>

      <section
        v-show="activeView === 'library'"
        id="knowledge-panel-library"
        class="knowledge-docs knowledge-pane"
        role="tabpanel"
        aria-labelledby="knowledge-tab-library"
        :aria-busy="libraryLoading"
      >
        <div class="knowledge-pane-heading">
          <div>
            <h2>知识来源</h2>
            <p>题库与参考资料自动收录，上传文档用于补充。点击名称预览内容。</p>
          </div>
          <span class="knowledge-upload-count">已上传 {{ documents.length }} / 50 份</span>
        </div>
        <div class="knowledge-library-tools">
          <div class="knowledge-library-filters" aria-label="来源类型">
            <button
              v-for="filter in libraryFilters"
              :key="filter.key"
              :class="{ active: libraryKind === filter.key }"
              :aria-pressed="libraryKind === filter.key"
              :disabled="busy"
              @click="libraryKind = filter.key"
            >
              {{ filter.label }}<span>{{ filter.count.toLocaleString() }}</span>
            </button>
          </div>
          <label class="knowledge-document-filter"
            ><Icon name="search" :size="16" /><span class="sr-only">筛选知识来源</span
            ><input
              v-model="libraryQuery"
              :disabled="busy"
              type="search"
              maxlength="200"
              placeholder="按名称查找来源"
          /></label>
        </div>
        <div
          v-if="libraryLoading || (operation === 'load' && !library)"
          class="knowledge-empty"
          role="status"
        >
          正在加载知识来源…
        </div>
        <div v-else-if="!library" class="knowledge-empty">
          <strong>暂时无法加载来源</strong>
          <p>请刷新重试，已有资料不会丢失。</p>
        </div>
        <div v-else-if="!library.items.length" class="knowledge-empty">
          <span class="knowledge-empty-icon"><Icon name="file" :size="24" /></span
          ><strong>{{
            libraryQuery
              ? '没有匹配的来源'
              : libraryKind === 'upload'
                ? '还没有上传文档'
                : '暂时没有这类来源'
          }}</strong>
          <p>
            {{
              libraryKind === 'upload' && !libraryQuery
                ? '题库和参考资料仍可检索；有项目资料时再添加即可。'
                : '可以换个名称，或切换来源类型。'
            }}
          </p>
          <button
            v-if="libraryKind === 'upload' && !libraryQuery"
            class="text-button"
            :disabled="busy || documents.length >= 50"
            @click="upload?.click()"
          >
            添加第一份资料 <Icon name="plus" :size="13" />
          </button>
        </div>
        <div v-else class="knowledge-source-list">
          <div class="knowledge-list-labels" aria-hidden="true">
            <span>来源名称</span><span>类型 / 资料量</span><span>操作</span>
          </div>
          <div
            v-for="source in library.items"
            :key="source.key"
            class="knowledge-source-row knowledge-doc"
          >
            <button class="knowledge-source-open" @click="openSource(source)">
              <span class="knowledge-source-icon" :class="'kind-' + source.kind"
                ><Icon :name="source.kind === 'question' ? 'book' : 'file'" :size="19" /></span
              ><span
                ><strong>{{ source.title }}</strong
                ><small v-if="sourceDocument(source)"
                  >{{ sourceDocument(source)!.characters.toLocaleString() }} 字符 · 上传于
                  {{ documentDate(sourceDocument(source)!.created_at) }}</small
                ><small v-else>{{
                  source.kind === 'question' ? '来自题库，随回答同步更新' : '已收录的参考资料'
                }}</small></span
              >
            </button>
            <div class="knowledge-source-meta">
              <span>{{ knowledgeKindLabels[source.kind] }}</span
              ><small>{{ source.chunks }} 个片段</small>
            </div>
            <div class="knowledge-source-actions">
              <button
                v-if="source.kind === 'upload'"
                class="danger"
                :disabled="busy"
                :aria-label="'删除文档：' + source.title"
                @click="remove(Number(source.key.split(':')[1]))"
              >
                <Icon name="trash" :size="15" /><span>删除</span></button
              ><a
                v-else-if="source.questionId"
                :href="'#/question/' + source.questionId"
                target="_blank"
                rel="noopener"
                :aria-label="'在题库中打开：' + source.title"
                >原题 ↗</a
              ><button v-else class="knowledge-preview-link" @click="openSource(source)">
                预览
              </button>
            </div>
          </div>
        </div>
        <div v-if="library && library.total" class="knowledge-library-pagination">
          <span>共 {{ library.total.toLocaleString() }} 个来源</span>
          <div>
            <button
              :disabled="busy || libraryLoading || libraryPage <= 1"
              @click="turnLibraryPage(-1)"
            >
              <Icon name="left" :size="14" /><span>上一页</span></button
            ><span>{{ library.page }} / {{ libraryPages }}</span
            ><button
              :disabled="busy || libraryLoading || libraryPage >= libraryPages"
              @click="turnLibraryPage(1)"
            >
              <span>下一页</span><Icon name="right" :size="14" />
            </button>
          </div>
        </div>
        <p class="knowledge-file-hint">
          支持 UTF-8 Markdown / TXT，每份不超过 1.5MB、50 万字符，最多上传 50 份。
        </p>
      </section>

      <section
        v-show="activeView === 'settings'"
        id="knowledge-panel-settings"
        class="knowledge-settings knowledge-pane"
        role="tabpanel"
        aria-labelledby="knowledge-tab-settings"
      >
        <div class="knowledge-pane-heading">
          <div>
            <h2>服务设置</h2>
            <p>资料检索可独立使用；连接模型后，可在题目页继续追问。</p>
          </div>
        </div>
        <div class="knowledge-service-grid">
          <section class="knowledge-service-card">
            <div class="knowledge-service-heading">
              <span class="knowledge-guide-icon"><Icon name="book" :size="19" /></span>
              <h3>AI 问答</h3>
              <span class="knowledge-service-state" :class="{ enabled: status?.enabled }">{{
                status ? (status.enabled ? '已连接' : '未连接') : '状态未知'
              }}</span>
            </div>
            <p v-if="status?.enabled" class="knowledge-model-name">当前模型：{{ status.model }}</p>
            <p v-else class="knowledge-service-copy">
              当前可以浏览和检索资料。连接对话模型后，可使用题目页的 AI 学习助手。
            </p>
            <p class="knowledge-service-footnote">AI 生成的回答仍需结合来源核对。</p>
          </section>
          <section class="knowledge-service-card">
            <div class="knowledge-service-heading">
              <span class="knowledge-guide-icon"><Icon name="search" :size="19" /></span>
              <h3>语义检索</h3>
              <span
                class="knowledge-service-state"
                :class="{ enabled: status?.enabled && status.embeddingConfigured }"
                >{{ status?.enabled && status.embeddingConfigured ? '已配置' : '未配置' }}</span
              >
            </div>
            <template v-if="status?.enabled && status.embeddingConfigured"
              ><div class="knowledge-index-numbers">
                <span
                  >{{ status.vectors.toLocaleString() }} /
                  {{ status.chunks.toLocaleString() }} 个片段</span
                ><strong>{{ vectorPercent }}%</strong>
              </div>
              <progress
                :value="status.vectors"
                :max="Math.max(1, status.chunks)"
                aria-label="向量构建进度"
              ></progress>
              <p class="knowledge-service-copy">
                {{
                  pendingVectors
                    ? pendingVectors.toLocaleString() +
                      ' 个片段待处理；期间仍可使用本地关键词检索。'
                    : '当前资料已构建完成，AI 问答可使用混合检索。'
                }}
              </p>
              <button
                class="knowledge-index-button"
                :disabled="busy || (!pendingVectors && operation !== 'index')"
                @click="index"
              >
                {{
                  operation === 'index'
                    ? indexProgress
                      ? '正在构建… 已处理 ' +
                        indexProgress.indexed.toLocaleString() +
                        '，剩余 ' +
                        indexProgress.remaining.toLocaleString()
                      : '正在构建…'
                    : pendingVectors
                      ? '构建向量索引'
                      : '索引已就绪'
                }}</button
              ><button v-if="operation === 'index'" class="knowledge-index-stop" @click="stopIndex">
                停止</button
              ><small class="knowledge-service-footnote"
                >自动分批构建直到完成，每批 16 个片段；期间仍可使用关键词检索。</small
              ></template
            >
            <p v-else class="knowledge-service-copy">
              连接向量模型后，可按语义补充相关来源。不影响当前本地关键词检索。
            </p>
          </section>
        </div>
        <details class="knowledge-setup">
          <summary>
            <Icon name="settings" :size="16" />模型连接说明<span>供部署维护使用</span
            ><Icon name="down" :size="15" />
          </summary>
          <div class="knowledge-setup-body">
            <p>在服务器 .env 中填写配置，再重启后端。这里展示连接方式，不保存或显示密钥。</p>
            <dl>
              <div>
                <dt>AI_ENABLED</dt>
                <dd>设为 true，启用模型服务</dd>
              </div>
              <div>
                <dt>AI_BASE_URL</dt>
                <dd>模型兼容接口前缀</dd>
              </div>
              <div>
                <dt>AI_MODEL</dt>
                <dd>对话模型名称</dd>
              </div>
              <div>
                <dt>AI_API_KEY</dt>
                <dd>服务密钥；本地 Ollama 可留空</dd>
              </div>
              <div>
                <dt>AI_EMBEDDING_MODEL</dt>
                <dd>可选，向量模型名称</dd>
              </div>
            </dl>
            <p>启用后，题目、回答、追问及检索片段会发送到所配置的模型服务。</p>
          </div>
        </details>
      </section>
    </div>

    <dialog
      ref="previewDialog"
      class="knowledge-preview-dialog"
      aria-labelledby="knowledge-preview-title"
      @cancel.prevent="closePreview"
      @click="previewBackdrop"
      @keydown.capture="(event) => trapDialogTab(event, previewDialog)"
    >
      <div class="knowledge-preview-heading">
        <div>
          <span>资料预览</span>
          <h2 id="knowledge-preview-title">{{ preview?.title || previewTitle }}</h2>
        </div>
        <button aria-label="关闭资料预览" @click="closePreview">
          <Icon name="close" :size="20" />
        </button>
      </div>
      <div class="knowledge-preview-scroll">
        <p v-if="previewLoading" class="knowledge-empty" role="status">正在加载原文…</p>
        <p v-else-if="previewError" class="error" role="alert">{{ previewError }}</p>
        <div
          v-else
          class="markdown knowledge-preview-content"
          @click="copyFragment"
          v-html="previewHtml"
        ></div>
      </div>
      <div class="knowledge-preview-footer">
        <span>只读预览</span
        ><a
          v-if="preview?.questionId"
          :href="'#/question/' + preview.questionId"
          target="_blank"
          rel="noopener"
          >在题库中打开 ↗</a
        ><button @click="closePreview">关闭预览</button>
      </div>
    </dialog>
  </section>
</template>
