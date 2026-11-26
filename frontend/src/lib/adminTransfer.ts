import type { Preview } from './types';

export type ImportMode = 'skip' | 'update';

export function isImportMode(value: string): value is ImportMode {
  return value === 'skip' || value === 'update';
}

export function validImportFile(name: string, size: number, maxBytes = 6_000_000): boolean {
  return /\.md$/i.test(name) && size > 0 && size <= maxBytes;
}

export function importPayload(preview: Preview, mode: string) {
  if (!isImportMode(mode)) throw new Error('导入模式只支持 skip 或 update');
  return {
    questions: preview.questions,
    documents: preview.documents,
    mode,
  };
}

export function previewCounts(preview: Preview | null) {
  return {
    questions: preview?.questions.length ?? 0,
    documents: preview?.documents.length ?? 0,
  };
}
