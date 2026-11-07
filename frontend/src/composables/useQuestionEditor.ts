import { computed, ref, watch, type Ref } from 'vue';
import type { Category, Question } from '../lib/types';

const DRAFT_PREFIX = 'zhixu-edit-draft-';

type EditorDraft = { title: string; moduleId: string; answer: string };

/** Editor draft lifecycle is separate from routes, lists and session state. */
export function useQuestionEditor(category: Ref<string>, categories: Ref<Category[]>) {
  const editor = ref(false),
    editing = ref<Question | null>(null);
  const title = ref(''),
    moduleId = ref(''),
    answer = ref(''),
    baseline = ref('');
  const difficulty = ref('基础');
  const draftRestored = ref(false);
  const questionUploading = ref(false),
    answerUploading = ref(false),
    titleExpanded = ref(false);
  const uploading = computed(() => questionUploading.value || answerUploading.value);
  const dirty = computed(
    () =>
      editor.value &&
      JSON.stringify([title.value, moduleId.value, answer.value]) !== baseline.value,
  );
  function draftKey() {
    return editing.value ? String(editing.value.id) : 'new';
  }
  function readDraft(key: string): EditorDraft | null {
    try {
      const value = JSON.parse(localStorage.getItem(DRAFT_PREFIX + key) || 'null');
      if (
        value &&
        typeof value.title === 'string' &&
        typeof value.moduleId === 'string' &&
        typeof value.answer === 'string'
      ) {
        return value;
      }
    } catch {}
    return null;
  }
  function persistDraft() {
    if (!editor.value || !dirty.value) return;
    try {
      localStorage.setItem(
        DRAFT_PREFIX + draftKey(),
        JSON.stringify({ title: title.value, moduleId: moduleId.value, answer: answer.value }),
      );
    } catch {}
  }
  /**
   * Writes the pending draft even though a route change has already closed the
   * editor: the pending timer proves the change happened while editing, and the
   * editor fields still hold the unsaved content (version-conflict reload path).
   */
  function flushDraft() {
    if (editing.value === null) return;
    try {
      localStorage.setItem(
        DRAFT_PREFIX + String(editing.value.id),
        JSON.stringify({ title: title.value, moduleId: moduleId.value, answer: answer.value }),
      );
    } catch {}
  }
  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_PREFIX + draftKey());
    } catch {}
  }
  let draftTimer: ReturnType<typeof setTimeout> | undefined;
  watch([title, moduleId, answer], () => {
    if (!editor.value) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(persistDraft, 500);
  });
  function startEdit(question: Question | null) {
    // A fast route change (e.g. version-conflict reload) can land inside the draft
    // debounce window and close the editor before the timer fires; flush the write
    // or the draft is silently lost.
    if (draftTimer !== undefined) {
      clearTimeout(draftTimer);
      draftTimer = undefined;
      flushDraft();
    }
    editing.value = question;
    const serverTitle = question?.title || '';
    const serverModule = String(
      question?.category_id || category.value || categories.value[0]?.id || '',
    );
    const serverAnswer = question?.answer || '';
    baseline.value = JSON.stringify([serverTitle, serverModule, serverAnswer]);
    const draft = readDraft(question ? String(question.id) : 'new');
    draftRestored.value =
      !!draft && JSON.stringify([draft.title, draft.moduleId, draft.answer]) !== baseline.value;
    title.value = draft?.title ?? serverTitle;
    moduleId.value = draft?.moduleId ?? serverModule;
    answer.value = draft?.answer ?? serverAnswer;
    difficulty.value = question?.difficulty || '基础';
    questionUploading.value = answerUploading.value = false;
    titleExpanded.value = !!question && question.title.length > 160;
    editor.value = true;
  }
  return {
    editor,
    editing,
    title,
    moduleId,
    answer,
    baseline,
    difficulty,
    draftRestored,
    questionUploading,
    answerUploading,
    titleExpanded,
    uploading,
    dirty,
    startEdit,
    clearDraft,
  };
}
