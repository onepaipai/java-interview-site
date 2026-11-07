import { markdown } from './markdown';
import { formatExplanation } from './explanations';

/** Reader, editor and source preview use the same headings and explanation layout. */
export function renderAnswer(source: string, options: { media?: boolean | 'local' } = {}): string {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = markdown(source, options);
  wrapper
    .querySelectorAll('h1,h2,h3')
    .forEach((heading, index) => (heading.id = 'answer-heading-' + index));
  const html = formatExplanation(wrapper.innerHTML, source.includes('<!-- explanation:deep -->'));
  if (options.media !== 'local') return html;
  wrapper.innerHTML = html;
  wrapper.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    const link = document.createElement('a');
    link.href = img.getAttribute('src')!;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', '查看原图：' + (img.alt || '流程图'));
    img.replaceWith(link);
    link.append(img);
  });
  wrapper
    .querySelectorAll('figcaption')
    .forEach((el) => (el.textContent = '流程示意 · 点击或按 Enter 查看原图 ↗'));
  return wrapper.innerHTML;
}
