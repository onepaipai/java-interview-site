export function trapDialogTab(event: KeyboardEvent, dialog?: HTMLElement): boolean {
  if (event.key !== 'Tab' || !dialog) return false;
  const focusable = Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button,input,select,textarea,a[href],summary,[tabindex],[contenteditable="true"]',
    ),
  ).filter(
    (el) =>
      el.tabIndex >= 0 &&
      !el.hasAttribute('disabled') &&
      el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== 'hidden',
  );
  if (!focusable.length) {
    event.preventDefault();
    dialog.focus();
    return true;
  }
  const current = focusable.indexOf(document.activeElement as HTMLElement);
  const next = event.shiftKey
    ? current <= 0
      ? focusable.length - 1
      : current - 1
    : current >= focusable.length - 1
      ? 0
      : current + 1;
  event.preventDefault();
  focusable[next].focus();
  return true;
}
