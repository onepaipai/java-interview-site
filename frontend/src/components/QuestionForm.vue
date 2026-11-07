<script setup lang="ts">
import MarkdownEditor from './MarkdownEditor.vue';
import { categoryName } from '../lib/display';
import type { Category, Question } from '../lib/types';
defineProps<{
  editing: Question | null;
  categories: Category[];
  error: string;
  dirty: boolean;
  busy: boolean;
  uploading: boolean;
  draftRestored: boolean;
}>();
const title = defineModel<string>('title', { required: true }),
  answer = defineModel<string>('answer', { required: true }),
  moduleId = defineModel<string>('moduleId', { required: true }),
  difficulty = defineModel<string>('difficulty', { required: true }),
  titleExpanded = defineModel<boolean>('titleExpanded', { required: true });
const emit = defineEmits<{
  save: [];
  cancel: [];
  reload: [];
  discardDraft: [];
  questionUploading: [boolean];
  answerUploading: [boolean];
}>();
const difficulties = ['基础', '进阶', '高级', '专家'];
</script>
<template>
  <section class="editor panel">
    <div class="section-head">
      <div>
        <h1>{{ editing ? '编辑题目与回答' : '新增题目' }}</h1>
      </div>
      <button @click="emit('cancel')">返回</button>
    </div>
    <p v-if="draftRestored" class="draft-notice" role="status">
      已恢复上次未保存的草稿，确认保留请直接保存，确认丢弃可点击右侧按钮。
      <button type="button" class="text-button" @click="emit('discardDraft')">丢弃草稿</button>
    </p>
    <form @submit.prevent="emit('save')">
      <div class="question-edit-label">
        <strong>题目</strong>
        <span>支持 Markdown · 最多 1000 字符</span>
        <button type="button" class="text-button" @click="titleExpanded = !titleExpanded">
          {{ titleExpanded ? '收起编辑区' : '展开编辑区' }}
        </button>
      </div>
      <MarkdownEditor
        v-model="title"
        label="题目 Markdown"
        compact
        :class="{ expanded: titleExpanded }"
        :max-length="1000"
        :disabled="busy"
        @uploading="emit('questionUploading', $event)"
      />
      <label
        >知识模块<select v-model="moduleId" :disabled="busy" required>
          <option value="" disabled>请选择模块</option>
          <option v-for="c in categories" :key="c.id" :value="String(c.id)">
            {{ categoryName(c.name) }}
          </option>
        </select>
      </label>
      <label
        >难度<select v-model="difficulty" :disabled="busy">
          <option v-for="d in difficulties" :key="d" :value="d">{{ d }}</option>
        </select>
      </label>
      <MarkdownEditor
        v-model="answer"
        label="回答 Markdown"
        :disabled="busy"
        @uploading="emit('answerUploading', $event)"
      />
      <div v-if="error" class="inline-error editor-error" role="alert">
        <span>{{ error }}</span>
        <button type="button" @click="emit('reload')">重新加载</button>
      </div>
      <div class="form-footer">
        <span class="muted">{{ dirty ? '有未保存的修改' : '题目和回答一起保存' }}</span>
        <div class="actions">
          <button type="button" @click="emit('cancel')">取消</button>
          <button class="primary" :disabled="busy || uploading || !title.trim()">
            {{ uploading ? '图片上传中…' : busy ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </form>
  </section>
</template>
