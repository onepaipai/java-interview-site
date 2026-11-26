import { api } from './api';
import type { BulkMoveResult, Page, QuestionSummary } from './types';

/** 按模块分页拉取全部活动题的 id；列表接口单页最多 100 条。 */
export async function moduleQuestionIds(categoryId: number): Promise<number[]> {
  const ids: number[] = [];
  let page = 1;
  while (true) {
    const result = await api<Page<QuestionSummary>>(
      '/questions?category=' + categoryId + '&page=' + page + '&size=100',
    );
    for (const item of result.items) ids.push(item.id);
    if (ids.length >= result.total || result.items.length === 0) break;
    page++;
  }
  return ids;
}

const MAX_BATCH = 1000;

export async function bulkMoveQuestions(
  ids: number[],
  categoryId: number,
): Promise<BulkMoveResult> {
  let moved = 0;
  let skipped = 0;
  for (let start = 0; start < ids.length; start += MAX_BATCH) {
    const result = await api<BulkMoveResult>('/admin/questions/batch-move', 'POST', {
      ids: ids.slice(start, start + MAX_BATCH),
      categoryId,
    });
    moved += result.moved;
    skipped += result.skipped;
  }
  return { moved, skipped };
}
