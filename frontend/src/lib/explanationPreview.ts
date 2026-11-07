import '../styles/theme.css';
import 'highlight.js/styles/github.css';
import '../styles/explanations.css';
import '../styles/explanationPreview.css';
import { markdown } from './markdown';
import { formatExplanation } from './explanations';
import { copyCodeButton } from './clipboard';
import { trapDialogTab } from './dialog';

const sources: Record<string, string> = JSON.parse(
  document.querySelector('#sample-data')!.textContent || '{}',
);
const modules: Record<string, { name: string; topic: string }> = {
  'java-language-001.md': { name: 'Java 语言', topic: '对象契约与身份设计' },
  'spring-advanced-001.md': { name: 'Spring 进阶', topic: '事务代理与调用边界' },
  'database-advanced-026.md': { name: '数据库进阶', topic: '库存扣减与幂等' },
};
const defaultFile = sources['spring-advanced-001.md']
  ? 'spring-advanced-001.md'
  : Object.keys(sources)[0];
const requested = new URLSearchParams(location.search).get('sample') || defaultFile;
const selected = Object.hasOwn(sources, requested) ? requested : defaultFile;
const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const parsed = document.createElement('div');
parsed.innerHTML = markdown(sources[selected]);
const title = parsed.querySelector('h1')?.textContent || '经典题解';
const metadata = parsed.querySelector('h1 + p');
const references = Array.from(metadata?.querySelectorAll('a') || []);
const version = metadata?.firstChild?.textContent?.split('·')[0].trim() || '';
const firstSection = Array.from(parsed.children).find((element) => element.tagName === 'H2');
while (parsed.firstChild && parsed.firstChild !== firstSection) parsed.firstChild.remove();

document.title = title + ' · 知序';
get('#question-title').textContent = title;
get('#module-name').textContent = modules[selected]?.name || '经典题解';
get('#question-version').textContent = version;
get('#reference-label').textContent = '参考资料 · ' + references.length;
references.forEach((reference) => get('#reference-links').append(reference));
if (!references.length) get('.preview-references').hidden = true;
get('#answer').innerHTML = formatExplanation(parsed.innerHTML);

const picker = get<HTMLSelectElement>('#sample-picker');
const orderedFiles = [
  ...Object.keys(modules).filter((file) => Object.hasOwn(sources, file)),
  ...Object.keys(sources).filter((file) => !Object.hasOwn(modules, file)),
];
for (const [index, file] of orderedFiles.entries()) {
  const info = modules[file] || { name: '经典题解', topic: file };
  const link = document.createElement('a');
  link.href = '?sample=' + encodeURIComponent(file);
  link.className = 'preview-sample-link';
  if (file === selected) link.setAttribute('aria-current', 'page');
  const number = document.createElement('span');
  number.className = 'preview-sample-number';
  number.textContent = String(index + 1).padStart(2, '0');
  const labels = document.createElement('span');
  const name = document.createElement('strong');
  name.textContent = info.name;
  const topic = document.createElement('small');
  topic.textContent = info.topic;
  labels.append(name, topic);
  link.append(number, labels);
  get('#sample-links').append(link);
  picker.add(new Option(info.name + ' · ' + info.topic, file, false, file === selected));
}
picker.addEventListener('change', () => {
  location.search = '?sample=' + encodeURIComponent(picker.value);
});

const headings = Array.from(get('#answer').querySelectorAll<HTMLHeadingElement>('h2'));
for (const [index, heading] of headings.entries()) {
  const link = document.createElement('a');
  link.href = '#' + heading.id;
  const number = document.createElement('span');
  number.textContent = String(index + 1).padStart(2, '0');
  link.append(number, document.createTextNode(heading.textContent || ''));
  get('#desktop-toc').append(link);
  get('#mobile-toc').append(link.cloneNode(true));
}
const tocLinks = Array.from(
  document.querySelectorAll<HTMLAnchorElement>('.preview-toc a, .preview-mobile-toc a'),
);
function activeHeading(id: string) {
  tocLinks.forEach((link) => {
    if (link.hash === '#' + id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
if (headings.length) activeHeading(headings[0].id);
const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible[0]) activeHeading(visible[0].target.id);
  },
  { rootMargin: '-80px 0px -55% 0px', threshold: 0 },
);
headings.forEach((heading) => observer.observe(heading));

const dialog = get<HTMLDialogElement>('#diagram-dialog');
const largeImage = get<HTMLImageElement>('#diagram-large');
get('#answer').addEventListener('click', async (event) => {
  const target = event.target as Element;
  const copy = target.closest<HTMLButtonElement>('[data-copy-code]');
  if (copy) {
    await copyCodeButton(copy);
    return;
  }
  const image = target.closest<HTMLImageElement>('.explanation-diagram img');
  if (image) {
    largeImage.src = image.src;
    largeImage.alt = image.alt;
    dialog.showModal();
  }
});
get('#close-diagram').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener('keydown', (event) => trapDialogTab(event, dialog));
