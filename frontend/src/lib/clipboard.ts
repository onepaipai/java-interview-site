export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  const active = document.activeElement as HTMLElement | null;
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('aria-hidden', 'true');
  field.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
  document.body.append(field);
  field.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
  } finally {
    field.remove();
    active?.focus({ preventScroll: true });
  }
  return copied;
}
export async function copyCodeButton(button: HTMLButtonElement): Promise<void> {
  const code = button.parentElement?.nextElementSibling;
  const copied = await copyText(code?.textContent || '');
  if (copied) {
    button.textContent = '已复制';
    button.setAttribute('aria-label', '复制代码');
    setTimeout(() => {
      if (button.isConnected) button.textContent = '复制';
    }, 1800);
    return;
  }
  if (code) {
    const range = document.createRange();
    range.selectNodeContents(code);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  button.textContent = '已选中，请复制';
  button.setAttribute('aria-label', '代码已选中，可手动复制');
}
