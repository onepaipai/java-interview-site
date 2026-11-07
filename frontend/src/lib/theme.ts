import { ref, watchEffect } from 'vue';

export type ThemeMode = 'auto' | 'light' | 'dark';
const STORAGE_KEY = 'zhixu-theme';

function readMode(): ThemeMode {
  const value = readSetting();
  return value === 'light' || value === 'dark' ? value : 'auto';
}
function readSetting(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}
const media = window.matchMedia('(prefers-color-scheme: dark)');
const mode = ref<ThemeMode>(readMode());
const effective = ref<'light' | 'dark'>('light');
function apply() {
  const value = mode.value === 'auto' ? (media.matches ? 'dark' : 'light') : mode.value;
  document.documentElement.dataset.theme = value;
  effective.value = value;
}
media.addEventListener('change', apply);
watchEffect(apply);
watchEffect(() => {
  try {
    if (mode.value === 'auto') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode.value);
  } catch {}
});
const labels: Record<ThemeMode, string> = { auto: '跟随系统', light: '浅色', dark: '深色' };
export function useTheme() {
  function cycle() {
    mode.value = mode.value === 'auto' ? 'light' : mode.value === 'light' ? 'dark' : 'auto';
  }
  return { mode, effective, labels, cycle };
}
