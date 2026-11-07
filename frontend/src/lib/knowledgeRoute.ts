import { normalizePage } from './navigation';
export type KnowledgeView = 'search' | 'library' | 'settings';
export type SourceKind = 'all' | 'question' | 'reference' | 'upload';
export interface KnowledgeRoute {
  view: KnowledgeView;
  query: string;
  name: string;
  kind: SourceKind;
  page: number;
}
export function readKnowledgeRoute(hash: string): KnowledgeRoute {
  const params = new URLSearchParams(hash.split('?')[1] || '');
  const view = params.get('view'),
    kind = params.get('kind');
  return {
    view: view === 'library' || view === 'settings' ? view : 'search',
    query: (params.get('query') || '').slice(0, 3000),
    name: (params.get('name') || '').slice(0, 200),
    kind: kind === 'question' || kind === 'reference' || kind === 'upload' ? kind : 'all',
    page: normalizePage(params.get('page')),
  };
}
export function knowledgeLink(state: KnowledgeRoute): string {
  const params = new URLSearchParams();
  if (state.view !== 'search') params.set('view', state.view);
  if (state.query) params.set('query', state.query);
  if (state.name) params.set('name', state.name);
  if (state.kind !== 'all') params.set('kind', state.kind);
  if (state.page > 1) params.set('page', String(state.page));
  return '#/knowledge' + (params.size ? '?' + params : '');
}
