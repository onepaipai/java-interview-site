export function readSetting(key: string, fallback = ''): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
export function saveSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
export function readScrollPositions(): Record<string, number> {
  try {
    const value = JSON.parse(sessionStorage.getItem('zhixu-scroll') || '{}');
    if (!value || Array.isArray(value) || typeof value !== 'object') return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([key, y]) => key.startsWith('#/') && typeof y === 'number' && Number.isFinite(y) && y >= 0,
      ),
    ) as Record<string, number>;
  } catch {
    return {};
  }
}
export function saveScrollPositions(value: Record<string, number>): void {
  try {
    sessionStorage.setItem('zhixu-scroll', JSON.stringify(value));
  } catch {}
}
