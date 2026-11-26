import type { Preview } from './types';

export type ImportMode = 'skip' | 'update';

export function isImportMode(value: string): value is ImportMode {
  return value === 'skip' || value === 'update';
}

export function validImportFile(name: string, size: number, maxBytes = 6_000_000): boolean {
  return /\.md$/i.test(name) && size > 0 && size <= maxBytes;
}

export function importPayload(preview: Preview, mode: string, selectedDocuments?: number[]) {
  if (!isImportMode(mode)) throw new Error('导入模式只支持 skip 或 update');
  const documents =
    selectedDocuments === undefined
      ? preview.documents
      : preview.documents.filter((_, index) => selectedDocuments.includes(index));
  return {
    questions: preview.questions,
    documents,
    mode,
  };
}

export function allDocumentIndexes(preview: Preview | null): number[] {
  return preview ? preview.documents.map((_, index) => index) : [];
}

export function toggleDocument(selected: number[], index: number): number[] {
  const next = new Set(selected);
  if (next.has(index)) next.delete(index);
  else next.add(index);
  return [...next].sort((a, b) => a - b);
}

export function previewCounts(preview: Preview | null) {
  return {
    questions: preview?.questions.length ?? 0,
    documents: preview?.documents.length ?? 0,
  };
}
