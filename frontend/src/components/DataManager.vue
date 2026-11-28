<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { api } from '../lib/api';
import { confirmAction } from '../lib/confirm';
import { trapDialogTab } from '../lib/dialog';
import { downloadText } from '../lib/download';
import type { Preview, PublicationStatus, ReviewSummary, ReviewItem } from '../lib/types';
import {
  allDocumentIndexes,
  importPayload,
  previewCounts,
  toggleDocument,
  validImportFile,
  type ImportMode,
} from '../lib/adminTransfer';
import Icon from './Icon.vue';

const MAX_IMPORT_BYTES = 6_000_000;
const REVIEW_STATUSES: ReviewItem['status'][] = ['pending', 'verified', 'rejected', 'stale'];
const STATUS_LABELS: Record<ReviewItem['status'], string> = {
  pending: '待审核',
  verified: '已核验',
  rejected: '已退回',
  stale: '已失效',
};

const busy = ref('');
const error = ref('');
const notice = ref('');
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
const controller = new AbortController();

const status = ref<PublicationStatus | null>(null);
const statusLoading = ref(false);

const reviews = ref<ReviewSummary | null>(null);
const reviewFilter = ref<'all' | ReviewItem['status']>('all');
const reviewPage = ref(1);
const REVIEW_PAGE_SIZE = 20;
const reviewPages = computed(() =>
  Math.max(1, Math.ceil((reviews.value?.total ?? 0) / REVIEW_PAGE_SIZE)),
);
const reviewLoading = ref(false);
const reviewDialog = ref<HTMLDialogElement>();
const reviewEditing = ref<ReviewItem | null>(null);
const reviewStatus = ref<ReviewItem['status']>('pending');
const reviewVersion = ref('');
const reviewReviewer = ref('');
const reviewEvidence = ref('');
const reviewError = ref('');
const reviewBusy = ref(false);

const visibleReviews = computed(() => reviews.value?.items ?? []);

const fileInput = ref<HTMLInputElement>();
const previewDialog = ref<HTMLDialogElement>();
const preview = ref<Preview | null>(null);
const previewLoading = ref(false);
const mode = ref<ImportMode>('skip');
const selectedDocuments = ref<number[]>([]);
let previewController: AbortController | undefined;
let previewSequence = 0;

const counts = computed(() => previewCounts(preview.value));
const questionCount = computed(() => counts.value.questions);
const documentCount = computed(() => counts.value.documents);
const allDocumentsSelected = computed(
  () =>
    !!preview.value &&
    selectedDocuments.value.length === preview.value.documents.length &&
    preview.value.documents.length > 0,
);

function success(message: string) {
  notice.value = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (notice.value = ''), 5000);
}

async function run(label: string, task: () => Promise<void>) {
  if (busy.value) return;
  busy.value = label;
  error.value = '';
  try {
    await task();
  } catch (e) {
    error.value = e instanceof Error ? e.message : label + '失败';
  } finally {
    busy.value = '';
  }
}

async function loadStatus() {
  statusLoading.value = true;
  error.value = '';
  try {
    status.value = await api<PublicationStatus>(
      '/admin/publications/status',
      'GET',
      undefined,
      undefined,
      controller.signal,
    );
  } catch (e) {
    if (!controller.signal.aborted)
      error.value = e instanceof Error ? e.message : '发布状态加载失败';
  } finally {
    statusLoading.value = false;
  }
}

async function loadReviews() {
  reviewLoading.value = true;
  try {
    reviews.value = await api<ReviewSummary>(
      '/admin/reviews?' +
        new URLSearchParams({
          status: reviewFilter.value,
          page: String(reviewPage.value),
          size: String(REVIEW_PAGE_SIZE),
        }),
      'GET',
      undefined,
      undefined,
      controller.signal,
    );
  } catch (e) {
    if (!controller.signal.aborted)
      error.value = e instanceof Error ? e.message : '审核列表加载失败';
  } finally {
    reviewLoading.value = false;
  }
}

watch(reviewFilter, () => {
  reviewPage.value = 1;
  loadReviews();
});

async function turnReviewPage(delta: number) {
  if (reviewLoading.value) return;
  reviewPage.value = Math.min(reviewPages.value, Math.max(1, reviewPage.value + delta));
  await loadReviews();
}

function backupFilename() {
  const day = new Date().toISOString().slice(0, 10);
  return 'java-interview-backup-' + day + '.json';
}

async function exportBackup() {
  await run('完整备份', () =>
    downloadText('/admin/backup', backupFilename(), 'application/json;charset=utf-8'),
  );
}

async function exportBank() {
  await run('导出题库', () =>
    downloadText('/admin/export', 'java-interview.md', 'text/markdown;charset=utf-8'),
  );
}

async function exportDocuments() {
  await run('导出资料', () =>
    downloadText(
      '/admin/export/documents',
      'reference-documents.json',
      'application/json;charset=utf-8',
    ),
  );
}

async function exportProgress() {
  await run('导出学习记录', () =>
    downloadText('/me/export', 'learning-progress.json', 'application/json;charset=utf-8'),
  );
}

async function chooseFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || busy.value) return;
  if (!validImportFile(file.name, file.size, MAX_IMPORT_BYTES)) {
    error.value = '请选择不超过 6MB 的非空 Markdown（.md）文件';
    return;
  }
  error.value = '';
  const token = ++previewSequence;
  previewController?.abort();
  previewController = new AbortController();
  preview.value = null;
  selectedDocuments.value = [];
  previewLoading.value = true;
  mode.value = 'skip';
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  if (!previewDialog.value?.open) previewDialog.value?.showModal();
  try {
    const form = new FormData();
    form.append('file', file);
    const result = await api<Preview>(
      '/admin/import/preview',
      'POST',
      form,
      undefined,
      previewController.signal,
    );
    if (token === previewSequence) {
      preview.value = result;
      selectedDocuments.value = allDocumentIndexes(result);
    }
  } catch (e) {
    if (token === previewSequence && !previewController.signal.aborted)
      error.value = e instanceof Error ? e.message : '预览失败';
  } finally {
    if (token === previewSequence) previewLoading.value = false;
  }
}

function closePreview() {
  previewSequence++;
  previewController?.abort();
  previewDialog.value?.close();
}

function previewBackdrop(event: MouseEvent) {
  const rect = previewDialog.value?.getBoundingClientRect();
  if (!rect) return;
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    closePreview();
}

function toggleAllDocuments() {
  selectedDocuments.value = allDocumentsSelected.value ? [] : allDocumentIndexes(preview.value);
}

async function commitImport() {
  const current = preview.value;
  if (!current || busy.value) return;
  if (!questionCount.value) {
    error.value = '没有可导入的题目';
    return;
  }
  const ok = await confirmAction(
    '确认导入？',
    `将导入 ${questionCount.value} 道题、${selectedDocuments.value.length} 份资料；模式：${mode.value === 'update' ? '更新已存在题目' : '跳过已存在题目'}。`,
    '确认导入',
  );
  if (!ok) return;
  busy.value = '导入';
  error.value = '';
  try {
    const payload = importPayload(current, mode.value, selectedDocuments.value);
    const result = await api<{ added: number; updated: number; skipped: number }>(
      '/admin/import/commit',
      'POST',
      payload,
    );
    closePreview();
    success(`导入完成：新增 ${result.added}，更新 ${result.updated}，跳过 ${result.skipped}`);
    await loadStatus();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '导入失败';
  } finally {
    busy.value = '';
  }
}

function openReview(item: ReviewItem) {
  reviewEditing.value = item;
  reviewStatus.value = item.status;
  reviewVersion.value = item.applicableVersion;
  reviewReviewer.value = item.reviewer;
  reviewEvidence.value = item.evidence.join('\n');
  reviewError.value = '';
  reviewDialog.value?.showModal();
}

function closeReview() {
  if (reviewBusy.value) return;
  reviewDialog.value?.close();
  reviewEditing.value = null;
}

async function saveReview() {
  const item = reviewEditing.value;
  if (!item || reviewBusy.value) return;
  const evidence = reviewEvidence.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (
    reviewStatus.value === 'verified' &&
    (!reviewVersion.value.trim() || !reviewReviewer.value.trim() || !evidence.length)
  ) {
    reviewError.value = '已核验需填写适用版本、审核人与至少一条证据';
    return;
  }
  reviewBusy.value = true;
  reviewError.value = '';
  try {
    await api('/admin/reviews/' + encodeURIComponent(item.sourceKey), 'PUT', {
      status: reviewStatus.value,
      applicableVersion: reviewVersion.value.trim(),
      reviewer: reviewReviewer.value.trim(),
      evidence,
    });
    reviewDialog.value?.close();
    reviewEditing.value = null;
    success('审核结论已保存');
    await loadReviews();
  } catch (e) {
    reviewError.value = e instanceof Error ? e.message : '审核结论保存失败';
  } finally {
    reviewBusy.value = false;
  }
}

onMounted(() => {
  loadStatus();
  loadReviews();
});
onBeforeUnmount(() => {
  controller.abort();
  previewController?.abort();
  clearTimeout(noticeTimer);
});
</script>

<template>
  <section class="data-manager">
    <header class="data-manager-heading">
      <div>
        <h1>数据管理</h1>
        <p>
          备份与迁移题库、查看解析发布状态、维护业务库审核结论。导入导出不会无损还原版本、标签与归档状态。
        </p>
      </div>
    </header>

    <p v-if="notice" class="notice feedback" role="status">{{ notice }}</p>
    <p v-if="error" class="error feedback" role="alert">{{ error }}</p>

    <div class="data-manager-grid">
      <section class="data-card">
        <h2>导出</h2>
        <p class="muted">下载题库、参考资料、学习记录或完整备份 JSON。</p>
        <div class="data-actions">
          <button :disabled="!!busy" @click="exportBank">
            <Icon name="download" :size="15" />{{
              busy === '导出题库' ? '导出中…' : '题库 Markdown'
            }}
          </button>
          <button :disabled="!!busy" @click="exportDocuments">
            <Icon name="download" :size="15" />{{
              busy === '导出资料' ? '导出中…' : '参考资料 JSON'
            }}
          </button>
          <button :disabled="!!busy" @click="exportProgress">
            <Icon name="download" :size="15" />{{
              busy === '导出学习记录' ? '导出中…' : '学习记录 JSON'
            }}
          </button>
          <button :disabled="!!busy" @click="exportBackup">
            <Icon name="download" :size="15" />{{
              busy === '完整备份' ? '导出中…' : '完整备份 JSON'
            }}
          </button>
        </div>
        <p class="data-hint">
          完整备份含活动/归档模块、全部题目（含回收站）、标签、资料与发布对账；学习进度仅限当前管理员，不含账号密码、上传图片与
          AI 向量。物理级一致备份仍用 deploy/backup.sh。
        </p>
      </section>

      <section class="data-card">
        <h2>导入</h2>
        <p class="muted">上传 Markdown 预览后确认导入。支持 UTF-8、不超过 6MB。</p>
        <input ref="fileInput" hidden type="file" accept=".md" @change="chooseFile" />
        <button class="primary" :disabled="!!busy" @click="fileInput?.click()">
          <Icon name="upload" :size="15" />选择文件并预览
        </button>
        <p class="data-hint">
          导出→导入不是无损备份：sourceKey 随题号变化，标签、版本、收藏笔记与归档状态不会还原。
        </p>
      </section>

      <section class="data-card">
        <div class="data-card-head">
          <h2>解析发布状态</h2>
          <button :disabled="statusLoading || !!busy" @click="loadStatus">刷新</button>
        </div>
        <div v-if="statusLoading" class="muted" role="status">加载中…</div>
        <template v-else-if="status">
          <dl class="status-stats">
            <div>
              <dt>解析包</dt>
              <dd>{{ status.packVersion || '未发布' }}</dd>
            </div>
            <div>
              <dt>已发布</dt>
              <dd>{{ status.published }}</dd>
            </div>
            <div>
              <dt>归档</dt>
              <dd>{{ status.archived }}</dd>
            </div>
            <div>
              <dt>人工改动</dt>
              <dd>{{ status.manualChanges }}</dd>
            </div>
          </dl>
          <p v-if="!status.items.length" class="muted">没有人工改动的题目。</p>
          <ul v-else class="status-items">
            <li v-for="item in status.items" :key="item.questionId">
              <a class="status-title" :href="'#/question/' + item.questionId">{{ item.title }}</a>
              <span class="muted"
                >#{{ item.questionId }} · v{{ item.version }} · {{ item.publication }}</span
              >
            </li>
          </ul>
        </template>
      </section>

      <section class="data-card">
        <div class="data-card-head">
          <h2>题解审核</h2>
          <button :disabled="reviewLoading || !!busy" @click="loadReviews">刷新</button>
        </div>
        <p class="muted">
          业务库审核工作区，与仓库内发布台账相互独立；结论写入 explanation_reviews 表。
        </p>
        <div v-if="reviewLoading" class="muted" role="status">加载中…</div>
        <template v-else-if="reviews">
          <dl class="status-stats">
            <div v-for="key in REVIEW_STATUSES" :key="key">
              <dt>{{ STATUS_LABELS[key] }}</dt>
              <dd>{{ reviews.counts[key] }}</dd>
            </div>
          </dl>
          <div class="review-filter">
            <button :class="{ active: reviewFilter === 'all' }" @click="reviewFilter = 'all'">
              全部
            </button>
            <button
              v-for="key in REVIEW_STATUSES"
              :key="key"
              :class="{ active: reviewFilter === key }"
              @click="reviewFilter = key"
            >
              {{ STATUS_LABELS[key] }}
            </button>
          </div>
          <ul class="status-items">
            <li v-for="item in visibleReviews" :key="item.sourceKey">
              <div class="review-row">
                <span class="status-title">{{ item.title }}</span>
                <span class="review-badge" :data-status="item.status">{{
                  STATUS_LABELS[item.status]
                }}</span>
              </div>
              <div class="review-row-actions">
                <a class="status-title" :href="'#/question/' + item.questionId">查看题目</a>
                <span class="muted"
                  >{{ item.sourceKey.slice(0, 12) }}… ·
                  {{ item.applicableVersion || '未填版本' }}</span
                >
                <button :disabled="reviewBusy" @click="openReview(item)">编辑结论</button>
              </div>
            </li>
          </ul>
          <div v-if="reviewPages > 1" class="pagination">
            <span class="muted"
              >第 {{ reviews?.page ?? 1 }} / {{ reviewPages }} 页 · 共
              {{ reviews?.total ?? 0 }} 条</span
            >
            <div class="actions">
              <button
                :disabled="(reviews?.page ?? 1) <= 1 || reviewLoading"
                @click="turnReviewPage(-1)"
              >
                上一页
              </button>
              <button
                :disabled="(reviews?.page ?? 1) >= reviewPages || reviewLoading"
                @click="turnReviewPage(1)"
              >
                下一页
              </button>
            </div>
          </div>
        </template>
      </section>
    </div>

    <dialog
      ref="previewDialog"
      class="data-preview-dialog"
      @cancel.prevent="closePreview"
      @click="previewBackdrop"
      @keydown.capture="trapDialogTab($event, previewDialog)"
    >
      <div class="data-preview-body">
        <h2>导入预览</h2>
        <p v-if="previewLoading" class="muted">正在解析文件…</p>
        <template v-else-if="preview">
          <p>题目 {{ questionCount }} 道 · 资料 {{ documentCount }} 份</p>
          <ul v-if="preview.warnings.length" class="data-warnings">
            <li v-for="(warning, index) in preview.warnings" :key="index">{{ warning }}</li>
          </ul>
          <p v-if="!questionCount" class="error">没有解析出任何可导入题目。</p>
          <fieldset v-if="documentCount" class="data-mode">
            <legend>要导入的资料（题目正文副本建议取消勾选）</legend>
            <label>
              <input
                type="checkbox"
                :checked="allDocumentsSelected"
                :disabled="!!busy"
                @change="toggleAllDocuments"
              />全选
            </label>
            <label v-for="(doc, index) in preview.documents" :key="index">
              <input
                type="checkbox"
                :checked="selectedDocuments.includes(index)"
                :disabled="!!busy"
                @change="selectedDocuments = toggleDocument(selectedDocuments, index)"
              />{{ doc.title }}（{{ doc.content.length }} 字）
            </label>
          </fieldset>
          <fieldset v-if="questionCount" class="data-mode">
            <legend>已存在题目如何处理</legend>
            <label><input v-model="mode" type="radio" value="skip" />跳过（默认，不覆盖）</label>
            <label
              ><input v-model="mode" type="radio" value="update" />更新（覆盖未删除的题目）</label
            >
          </fieldset>
        </template>
        <div class="data-dialog-actions">
          <button @click="closePreview">取消</button>
          <button
            class="primary"
            :disabled="!preview || !!busy || !questionCount"
            @click="commitImport"
          >
            {{ busy === '导入' ? '导入中…' : '确认导入' }}
          </button>
        </div>
      </div>
    </dialog>

    <dialog
      ref="reviewDialog"
      class="data-preview-dialog data-review-dialog"
      @cancel.prevent="closeReview"
      @keydown.capture="trapDialogTab($event, reviewDialog)"
    >
      <div class="data-preview-body">
        <h2>编辑审核结论</h2>
        <p v-if="reviewEditing">{{ reviewEditing.title }}</p>
        <label class="review-field"
          >状态<select v-model="reviewStatus" :disabled="reviewBusy">
            <option v-for="key in REVIEW_STATUSES" :key="key" :value="key">
              {{ STATUS_LABELS[key] }}
            </option>
          </select></label
        >
        <label class="review-field"
          >适用版本<input v-model="reviewVersion" :disabled="reviewBusy" maxlength="200"
        /></label>
        <label class="review-field"
          >审核人<input v-model="reviewReviewer" :disabled="reviewBusy" maxlength="80"
        /></label>
        <label class="review-field"
          >证据链接（每行一条）<textarea
            v-model="reviewEvidence"
            :disabled="reviewBusy"
            rows="4"
          ></textarea>
        </label>
        <div v-if="reviewError" class="module-form-error" role="alert">{{ reviewError }}</div>
        <div class="data-dialog-actions">
          <button :disabled="reviewBusy" @click="closeReview">取消</button>
          <button class="primary" :disabled="reviewBusy" @click="saveReview">
            {{ reviewBusy ? '保存中…' : '保存结论' }}
          </button>
        </div>
      </div>
    </dialog>
  </section>
</template>
