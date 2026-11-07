import { categoryName } from './display';
import { moduleProfile } from './catalog';
import type { Category } from './types';

export function moduleSearchText(category: Category) {
  const profile = moduleProfile(category.name);
  return [categoryName(category.name), profile.description, ...profile.topics]
    .join(' ')
    .toLocaleLowerCase();
}

export function matchesModule(category: Category, query: string) {
  const term = query.trim().toLocaleLowerCase();
  return !term || moduleSearchText(category).includes(term);
}
