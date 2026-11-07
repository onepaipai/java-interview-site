import type { KnowledgeSource } from './types';

export type KnowledgeKind = 'question' | 'upload' | 'reference';
export interface KnowledgeGroup {
  key: string;
  title: string;
  kind: KnowledgeKind;
  questionId: number | null;
  chunks: KnowledgeSource[];
}

export const knowledgeKindLabels: Record<KnowledgeKind, string> = {
  question: '题库题目',
  upload: '上传文档',
  reference: '参考资料',
};

/** Preserve relevance between sources, but read fragments from one source in order. */
export function groupKnowledgeSources(sources: KnowledgeSource[]): KnowledgeGroup[] {
  const groups = new Map<string, KnowledgeGroup>();
  for (const source of sources) {
    const key =
      source.key || (source.questionId ? 'question:' + source.questionId : 'source:' + source.id);
    let group = groups.get(key);
    if (!group) {
      const kind: KnowledgeKind =
        source.questionId || key.startsWith('question:')
          ? 'question'
          : key.startsWith('upload:')
            ? 'upload'
            : 'reference';
      group = { key, title: source.title, kind, questionId: source.questionId ?? null, chunks: [] };
      groups.set(key, group);
    }
    if (!group.chunks.some((chunk) => chunk.id === source.id)) group.chunks.push(source);
  }
  for (const group of groups.values()) group.chunks.sort((a, b) => a.chunk - b.chunk);
  return Array.from(groups.values());
}

/** Shared text extraction for lists, search and knowledge results. */
export function plainContent(content: string): string {
  return content
    .replace(
      /<details\b[^>]*class=["'][^"']*\bexplanation-references\b[^"']*["'][^>]*>[\s\S]*?<\/details\s*>/gi,
      ' ',
    )
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/!?\[([^\]]*)\]\([^\n)]*\)/g, '$1')
    .replace(/(^|\n)```[^\n]*\n/g, '$1')
    .replace(/(^|\n)#{1,6}\s+/g, '$1')
    .replace(/`{1,3}|\*\*|__/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A plain-text preview around the first matched term; never inject document HTML. */
export function knowledgeExcerpt(content: string, query: string, limit = 150): string {
  const text = plainContent(content);
  const lower = text.toLocaleLowerCase();
  const positions = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => lower.indexOf(term.toLocaleLowerCase()))
    .filter((index) => index >= 0);
  const start = positions.length ? Math.max(0, Math.min(...positions) - 32) : 0;
  return (
    (start ? '…' : '') + text.slice(start, start + limit) + (text.length > start + limit ? '…' : '')
  );
}

export function answerPreview(content: string, query = '', limit = 90): string {
  const answer =
    !query.trim() && content.includes('## 参考回答')
      ? content
          .split('## 参考回答')[1]!
          .split(/\n## /)[0]!
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/^> 场景与约束：.*$/gm, '')
          .replace(/^\s*\d+[.、]\s*/, '')
          .split(/\n\s*\d+[.、]\s*/)[0]!
      : content;
  return knowledgeExcerpt(answer, query, limit);
}
