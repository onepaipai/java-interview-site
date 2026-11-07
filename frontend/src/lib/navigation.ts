export const PAGE_SIZE = 15;

export function normalizePage(value: string | null): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100000) : 1;
}

export function pageWithinTotal(page: number, total: number): number {
  return Math.min(page, Math.max(1, Math.ceil(total / PAGE_SIZE)));
}
