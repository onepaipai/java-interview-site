import { markdown } from '../../lib/markdown';

/** Strip markdown rendering chrome (code headers, images) to a plain one-line summary. */
export function plain(s: string) {
  const element = document.createElement('div');
  element.innerHTML = markdown(s);
  element.querySelectorAll('.code-header').forEach((h) => h.remove());
  element.querySelectorAll('img').forEach((i) => i.replaceWith(i.alt));
  return (element.textContent || '').replace(/\s+/g, ' ').trim();
}

/** Reading-pane heading outline; short answers without a content wrapper have no outline. */
export function buildOutline(renderedHtml: string, rawLength: number) {
  if (rawLength < 400 && !renderedHtml.includes('explanation-content')) {
    return [];
  }
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderedHtml;
  const headings = Array.from(wrapper.querySelectorAll('h1,h2,h3')).map((h) => ({
    id: h.id,
    label: h.textContent || '',
    level: Number(h.tagName[1]),
  }));
  return headings.length >= 2 ? headings : [];
}

export function jumpTo(id: string) {
  const heading = document.getElementById(id);
  if (!heading) return;
  heading.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  });
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
}
