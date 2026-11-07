import { ref, watch } from 'vue';
import { readSetting, saveSetting } from '../lib/storage';

export function useLearning() {
  const practice = ref(readSetting('zhixu-practice') === 'true');
  watch(practice, (value) => saveSetting('zhixu-practice', String(value)));
  return { practice };
}
