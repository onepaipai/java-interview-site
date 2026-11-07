<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue';
import { EditorView, basicSetup } from 'codemirror';
import { markdown as markdownLanguage } from '@codemirror/lang-markdown';
import { undo, redo } from '@codemirror/commands';
import { Compartment, EditorSelection, EditorState } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { markdown } from '../lib/markdown';
import { copyCodeButton } from '../lib/clipboard';
import { api } from '../lib/api';
import Icon from './Icon.vue';
import { renderAnswer } from '../lib/answer';
const props = withDefaults(
  defineProps<{
    modelValue: string;
    label?: string;
    compact?: boolean;
    maxLength?: number;
    disabled?: boolean;
  }>(),
  { label: 'Markdown 答案', compact: false, maxLength: 200000, disabled: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: string]; uploading: [value: boolean] }>();
const container = ref<HTMLDivElement>(),
  fileInput = ref<HTMLInputElement>(),
  mode = ref(props.compact ? 'edit' : window.innerWidth >= 1050 ? 'split' : 'edit'),
  toolsExpanded = ref(false),
  imageBusy = ref(false),
  error = ref(''),
  linkOpen = ref(false),
  linkText = ref(''),
  linkUrl = ref('https://'),
  previewSource = ref(props.modelValue);
let view: EditorView | undefined,
  previewTimer: ReturnType<typeof setTimeout> | undefined,
  disposed = false;
const uploadController = new AbortController();
const editability = new Compartment();
const editingExtensions = () => [
  EditorState.readOnly.of(props.disabled),
  EditorView.editable.of(!props.disabled),
];
const rendered = computed(() =>
  previewSource.value
    ? props.compact
      ? markdown(previewSource.value)
      : renderAnswer(previewSource.value)
    : '',
);
onMounted(() => {
  view = new EditorView({
    parent: container.value!,
    doc: props.modelValue,
    extensions: [
      editability.of(editingExtensions()),
      EditorState.transactionFilter.of((tr) => {
        if (tr.newDoc.length <= props.maxLength) return tr;
        error.value =
          '内容不能超过 ' + props.maxLength.toLocaleString() + ' 个字符，本次输入未插入';
        return [];
      }),
      EditorView.domEventHandlers({
        paste: (e) => {
          const file = Array.from(e.clipboardData?.files || []).find((f) =>
            f.type.startsWith('image/'),
          );
          if (file) {
            e.preventDefault();
            void uploadFile(file);
            return true;
          }
          return false;
        },
        drop: (e) => {
          const file = Array.from(e.dataTransfer?.files || []).find((f) =>
            f.type.startsWith('image/'),
          );
          if (file) {
            e.preventDefault();
            const pos = view?.posAtCoords({ x: e.clientX, y: e.clientY });
            if (pos != null) view?.dispatch({ selection: { anchor: pos } });
            void uploadFile(file);
            return true;
          }
          return false;
        },
      }),
      basicSetup,
      markdownLanguage(),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({
        'aria-label': props.label,
        spellcheck: 'false',
        'data-testid': 'markdown-input',
      }),
      keymap.of([
        {
          key: 'Mod-b',
          run: () => {
            wrap('**', '**', '加粗文字');
            return true;
          },
        },
        {
          key: 'Mod-i',
          run: () => {
            wrap('*', '*', '斜体文字');
            return true;
          },
        },
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          error.value = '';
          emit('update:modelValue', update.state.doc.toString());
        }
      }),
      EditorView.theme({
        '&': { height: '100%', fontSize: '13px' },
        '.cm-scroller': { overflow: 'auto', fontFamily: 'Consolas, SFMono-Regular, monospace' },
        '.cm-content': { padding: '18px 0', minHeight: '100%' },
        '.cm-line': { padding: '0 18px' },
        '.cm-gutters': {
          backgroundColor: '#f8fafc',
          color: '#a0aabb',
          borderRight: '1px solid #eef1f5',
        },
        '.cm-activeLine': { backgroundColor: '#f1f5ff' },
        '.cm-activeLineGutter': { backgroundColor: '#eef2fb' },
        '&.cm-focused': { outline: 'none' },
        '.cm-selectionBackground': { backgroundColor: '#dce6ff !important' },
        '.cm-cursor': { borderLeftColor: '#355bea' },
      }),
    ],
  });
});
watch(
  () => props.modelValue,
  (value) => {
    if (view && view.state.doc.toString() !== value)
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => (previewSource.value = value), 120);
  },
);
watch(mode, async () => {
  await nextTick();
  view?.requestMeasure();
  previewSource.value = props.modelValue;
});
watch(
  () => props.disabled,
  () => view?.dispatch({ effects: editability.reconfigure(editingExtensions()) }),
);
onBeforeUnmount(() => {
  disposed = true;
  uploadController.abort();
  clearTimeout(previewTimer);
  view?.destroy();
  view = undefined;
  emit('uploading', false);
});
function wrap(before: string, after: string, placeholder = '文字') {
  if (!view || props.disabled) return;
  mode.value = mode.value === 'preview' ? 'edit' : mode.value;
  const range = view.state.selection.main;
  const text = view.state.sliceDoc(range.from, range.to) || placeholder;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: before + text + after },
    selection: EditorSelection.single(
      range.from + before.length,
      range.from + before.length + text.length,
    ),
    scrollIntoView: true,
  });
  nextTick(() => view?.focus());
}
function insert(text: string) {
  if (!view || props.disabled) return false;
  const range = view.state.selection.main;
  if (view.state.doc.length - range.to + range.from + text.length > props.maxLength) {
    error.value = '内容不能超过 ' + props.maxLength.toLocaleString() + ' 个字符，本次输入未插入';
    return false;
  }
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: text },
    selection: { anchor: range.from + text.length },
    scrollIntoView: true,
  });
  mode.value = mode.value === 'preview' ? 'edit' : mode.value;
  nextTick(() => view?.focus());
  return true;
}
async function copyCode(e: MouseEvent) {
  const button = (e.target as Element).closest<HTMLButtonElement>('[data-copy-code]');
  if (!button) return;
  await copyCodeButton(button);
}
function openLink() {
  linkText.value = view
    ? view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to) ||
      '链接文字'
    : '链接文字';
  linkUrl.value = 'https://';
  linkOpen.value = !linkOpen.value;
}
function addLink() {
  if (!/^https?:\/\/\S+$/i.test(linkUrl.value)) {
    error.value = '请输入以 http:// 或 https:// 开头的链接';
    return;
  }
  if (
    !insert(
      '[' +
        linkText.value.replace(/[\[\]]/g, '') +
        '](' +
        linkUrl.value.replace(/\)/g, '%29') +
        ')',
    )
  )
    return;
  linkOpen.value = false;
  error.value = '';
}
async function upload(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) await uploadFile(file);
  input.value = '';
}
async function uploadFile(file: File) {
  if (disposed || props.disabled || imageBusy.value) return;
  error.value = '';
  if (file.size > 10_000_000) {
    error.value = '图片不能超过 10 MB';
    return;
  }
  imageBusy.value = true;
  emit('uploading', true);
  try {
    const data = new FormData();
    data.append('file', file);
    const result = await api<{ url: string }>(
      '/admin/uploads',
      'POST',
      data,
      undefined,
      uploadController.signal,
    );
    if (!disposed) insert('\n![图片](' + result.url + ')\n');
  } catch (e) {
    if (!disposed) error.value = e instanceof Error ? e.message : '图片上传失败';
  } finally {
    if (!disposed) {
      imageBusy.value = false;
      emit('uploading', false);
    }
  }
}
defineExpose({ insert, focus: () => view?.focus() });
</script>
<template>
  <div class="markdown-editor" :class="{ compact }" @dragover.prevent>
    <div class="md-editor-heading">
      <div>
        <strong>{{ compact ? '题目内容' : '回答内容' }}</strong
        ><span>Markdown</span>
      </div>
      <div class="segmented editor-view-switch">
        <button type="button" :class="{ active: mode === 'edit' }" @click="mode = 'edit'">
          编辑</button
        ><button
          type="button"
          class="split-option"
          :class="{ active: mode === 'split' }"
          @click="mode = 'split'"
        >
          分屏</button
        ><button type="button" :class="{ active: mode === 'preview' }" @click="mode = 'preview'">
          预览
        </button>
      </div>
    </div>
    <fieldset
      :disabled="disabled"
      style="border: 0; margin: 0; min-width: 0"
      class="md-toolbar"
      :class="{ expanded: toolsExpanded }"
      role="toolbar"
      aria-label="Markdown 格式工具栏"
    >
      <button
        type="button"
        title="二级标题"
        aria-label="插入二级标题"
        @click="wrap('\n## ', '\n', '标题')"
      >
        <span class="tool-heading">H₂</span></button
      ><button
        type="button"
        title="加粗 Ctrl+B"
        aria-label="加粗"
        @click="wrap('**', '**', '加粗文字')"
      >
        <b>B</b></button
      ><button
        type="button"
        title="斜体 Ctrl+I"
        aria-label="斜体"
        @click="wrap('*', '*', '斜体文字')"
      >
        <i>I</i></button
      ><span class="toolbar-divider"></span
      ><button
        type="button"
        title="代码块"
        aria-label="插入代码块"
        @click="wrap('\n```java\n', '\n```\n', '// 在这里写代码')"
      >
        <Icon name="code" /></button
      ><button
        type="button"
        title="无序列表"
        aria-label="插入列表"
        @click="wrap('\n- ', '\n', '列表内容')"
      >
        <Icon name="list" /></button
      ><button
        type="button"
        title="引用"
        aria-label="插入引用"
        @click="wrap('\n> ', '\n', '引用内容')"
      >
        <span class="tool-quote">“</span></button
      ><button
        type="button"
        title="链接"
        aria-label="插入链接"
        :class="{ active: linkOpen }"
        @click="openLink"
      >
        <Icon name="link" /></button
      ><button
        type="button"
        title="表格"
        aria-label="插入表格"
        @click="insert('\n| 对比项 | 说明 |\n| --- | --- |\n| 内容 | 内容 |\n')"
      >
        <Icon name="grid" /></button
      ><button
        type="button"
        :title="imageBusy ? '上传中' : '上传图片'"
        aria-label="上传图片"
        :disabled="imageBusy"
        @click="fileInput?.click()"
      >
        <Icon name="image" /></button
      ><span class="toolbar-divider"></span
      ><button type="button" title="撤销 Ctrl+Z" aria-label="撤销" @click="view && undo(view)">
        <Icon name="undo" /></button
      ><button type="button" title="重做" aria-label="重做" @click="view && redo(view)">
        <Icon name="redo" /></button
      ><button
        type="button"
        class="more-format-tools"
        :aria-expanded="toolsExpanded"
        aria-label="更多格式"
        @click="toolsExpanded = !toolsExpanded"
      >
        {{ toolsExpanded ? '收起' : '更多' }}</button
      ><input
        ref="fileInput"
        class="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/gif"
        tabindex="-1"
        @change="upload"
      />
    </fieldset>
    <fieldset
      v-if="linkOpen"
      :disabled="disabled"
      style="border: 0; margin: 0; min-width: 0"
      class="editor-link-form"
      @keydown.enter.prevent="addLink"
    >
      <label>链接文字<input v-model="linkText" maxlength="200" /></label
      ><label>链接地址<input v-model="linkUrl" type="url" required /></label
      ><button class="primary" type="button" @click="addLink">插入</button
      ><button type="button" aria-label="取消插入链接" @click="linkOpen = false">
        <Icon name="close" :size="16" />
      </button>
    </fieldset>
    <div v-if="error" class="inline-error" role="alert">
      {{ error
      }}<button type="button" class="icon-button" aria-label="关闭错误提示" @click="error = ''">
        <Icon name="close" :size="14" />
      </button>
    </div>
    <div class="md-panes" :class="'md-mode-' + mode">
      <div v-show="mode !== 'preview'" ref="container" class="md-source"></div>
      <div v-show="mode !== 'edit'" class="md-preview" aria-label="答案预览" @click="copyCode">
        <span class="preview-label">阅读效果</span>
        <div v-if="rendered" class="markdown" v-html="rendered"></div>
        <div v-else class="preview-placeholder">
          <Icon name="file" :size="30" />
          <p>在左侧编写内容，<br />这里会实时显示阅读效果。</p>
        </div>
      </div>
    </div>
    <div class="md-editor-footer">
      <span>{{ imageBusy ? '正在上传图片…' : 'Markdown · 支持粘贴、拖入或上传图片' }}</span
      ><small>{{ modelValue.length.toLocaleString() }} / {{ maxLength.toLocaleString() }}</small>
    </div>
  </div>
</template>
