import { computed, ref } from 'vue';
import type { QuestionSummary } from '../lib/types';

/** Shared list state uses summaries; full answers only live in the detail/editor. */
export function useQuestionList() {
  const items = ref<QuestionSummary[]>([]),
    total = ref(0),
    page = ref(1);
  const category = ref(''),
    search = ref(''),
    searchDraft = ref(''),
    searched = ref(false);
  const searchGroups = computed(() => {
    const groups = new Map<number, { name: string; items: QuestionSummary[] }>();
    for (const question of items.value) {
      if (!groups.has(question.category_id))
        groups.set(question.category_id, { name: question.category, items: [] });
      groups.get(question.category_id)!.items.push(question);
    }
    return [...groups.values()];
  });
  const questionPreviews = computed(
    () => new Map(items.value.map((question) => [question.id, question.preview])),
  );
  return {
    items,
    total,
    page,
    category,
    search,
    searchDraft,
    searched,
    searchGroups,
    questionPreviews,
  };
}
