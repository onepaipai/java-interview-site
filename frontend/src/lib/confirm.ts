import { shallowRef } from 'vue';
export const pendingConfirm = shallowRef<{
  title: string;
  message: string;
  label: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
} | null>(null);
export function confirmAction(
  title: string,
  message: string,
  label = '确认',
  danger = false,
): Promise<boolean> {
  if (pendingConfirm.value) pendingConfirm.value.resolve(false);
  return new Promise((resolve) => {
    pendingConfirm.value = { title, message, label, danger, resolve };
  });
}
export function settleConfirm(ok: boolean) {
  const p = pendingConfirm.value;
  pendingConfirm.value = null;
  p?.resolve(ok);
}
