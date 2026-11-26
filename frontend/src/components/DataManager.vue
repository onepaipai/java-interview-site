<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { api } from '../lib/api';
import { confirmAction } from '../lib/confirm';
import { trapDialogTab } from '../lib/dialog';
import { downloadText } from '../lib/download';
import type { Preview } from '../lib/types';
import {
  importPayload,
  previewCounts,
  validImportFile,
  type ImportMode,
} from '../lib/adminTransfer';
import Icon from './Icon.vue';

interface PublicationStatus {
  packVersion: string;
  published: number;
  archived: number;
  manualChanges: number;
  items: {
    questionId: number;
    title: string;
    version: number;
    publication: string;
    status: string;
  }[];
}

const MAX_IMPORT_BYTES = 6_000_000;

const busy = ref('');
const error = ref('');
const notice = ref('');
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
const controller = new AbortController();

const status = ref<PublicationStatus | null>(null);
const statusLoading = ref(false);

const fileInput = ref<HTMLInputElement>();
const previewDialog = ref<HTMLDialogElement>();
const preview = ref<Preview | null>(null);
const previewLoading = ref(false);
const mode = ref<ImportMode>('skip');
let previewController: AbortController | undefined;
let previewSequence = 0;

const counts = computed(() => previewCounts(preview.value));
const questionCount = computed(() => counts.value.questions);
const documentCount = computed(() => counts.value.documents);

function success(message: string) {
  notice.value = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (notice.value = ''), 5000);
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
    if (token === previewSequence) preview.value = result;
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

async function commitImport() {
  const current = preview.value;
  if (!current || busy.value) return;
  if (!questionCount.value && !documentCount.value) {
    error.value = '没有可导入的内容';
    return;
  }
  const ok = await confirmAction(
    '确认导入？',
    `将导入 ${questionCount.value} 道题、${documentCount.value} 份资料；模式：${mode.value === 'update' ? '更新已存在题目' : '跳过已存在题目'}。`,
    '确认导入',
  );
  if (!ok) return;
  busy.value = '导入';
  error.value = '';
  try {
    const payload = importPayload(current, mode.value);
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

onBeforeUnmount(() => {
  controller.abort();
  previewController?.abort();
  clearTimeout(noticeTimer);
});

loadStatus();
</script>

<template>
  <section class="data-manager page-section">
    <header class="data-manager-heading">
      <div>
        <h1>数据管理</h1>
        <p>备份与迁移题库、查看解析发布状态。导入导出不会无损还原版本、标签与归档状态。</p>
      </div>
    </header>

    <p v-if="notice" class="notice feedback" role="status">{{ notice }}</p>
    <p v-if="error" class="error feedback" role="alert">{{ error }}</p>

    <div class="data-manager-grid">
      <section class="data-card">
        <h2>导出</h2>
        <p class="muted">下载题库、参考资料与个人学习记录，用于备份或迁移。</p>
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
        </div>
      </section>

      <section class="data-card">
        <h2>导入</h2>
        <p class="muted">上传 Markdown 预览后确认导入。支持 UTF-8、不超过 6MB。</p>
        <input
          ref="fileInput"
          class="visually-hidden"
          type="file"
          accept=".md"
          @change="chooseFile"
        />
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
        <div v-if="statusLoading" class="muted">加载中…</div>
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
              <span class="status-title">{{ item.title }}</span>
              <span class="muted"
                >#{{ item.questionId }} · v{{ item.version }} · {{ item.publication }}</span
              >
            </li>
          </ul>
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
          <p v-if="documentCount" class="muted">
            解析出的资料可能包含题目正文副本，确认前请核对；不需要的资料可在预览后取消本次导入。
          </p>
          <ul v-if="preview.warnings.length" class="data-warnings">
            <li v-for="(warning, index) in preview.warnings" :key="index">{{ warning }}</li>
          </ul>
          <p v-if="!questionCount && !documentCount" class="error">没有解析出任何可导入内容。</p>
          <fieldset v-else class="data-mode">
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
            :disabled="!preview || !!busy || (!questionCount && !documentCount)"
            @click="commitImport"
          >
            {{ busy === '导入' ? '导入中…' : '确认导入' }}
          </button>
        </div>
      </div>
    </dialog>
  </section>
</template>
