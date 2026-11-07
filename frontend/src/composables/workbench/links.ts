import type { Ref } from 'vue';

export interface LinkScope {
  category: Ref<string>;
  search: Ref<string>;
  page: Ref<number>;
  acceptedHash: Ref<string>;
}

/** URL builders for question routes, derived from the current list scope. */
export function createLinks(scope: LinkScope) {
  function params(p = scope.page.value) {
    const q = new URLSearchParams();
    if (scope.category.value) {
      q.set('module', scope.category.value);
    }
    if (scope.search.value.trim()) {
      q.set('search', scope.search.value.trim());
    }
    if (p > 1) {
      q.set('page', String(p));
    }
    return q;
  }
  function listLink(p = scope.page.value) {
    const q = params(p);
    if (scope.category.value) q.delete('module');
    const source = new URL(scope.acceptedHash.value, location.origin);
    const weak = source.searchParams.get('weak') === '1';
    const global = source.searchParams.get('global') === '1';
    if (weak) q.set('weak', '1');
    if (global) q.set('global', '1');
    return (
      (weak
        ? '#/search'
        : scope.category.value
          ? '#/module/' + scope.category.value
          : scope.search.value.trim()
            ? '#/search'
            : '#/catalog') + (q.size ? '?' + q : '')
    );
  }
  function questionLink(id: number, p = scope.page.value) {
    const q = params(p);
    const source = new URL(scope.acceptedHash.value, location.origin);
    if (!scope.category.value && scope.search.value.trim()) q.set('global', '1');
    if (source.searchParams.get('weak') === '1') q.set('weak', '1');
    if (source.searchParams.get('global') === '1') q.set('global', '1');
    return '#/question/' + id + (q.size ? '?' + q : '');
  }
  return { params, listLink, questionLink };
}
