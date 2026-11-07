const sections = [
  { title: '参考回答', kind: 'answer' },
  { title: '参考分析', kind: 'analysis' },
  { title: '案例', kind: 'case' },
  { title: '总结点', kind: 'summary' },
];

/** Analysis is optional when the direct answer already explains the mechanism. */
export function formatExplanation(html: string, deep = false): string {
  const source = document.createElement('div');
  source.innerHTML = html;
  const headings = Array.from(source.children).filter((node) => node.tagName === 'H2');
  const expected =
    headings.length === 3 ? sections.filter((section) => section.kind !== 'analysis') : sections;
  if (
    headings.length !== expected.length ||
    headings.some((node, index) => node.textContent?.trim() !== expected[index].title)
  )
    return html;

  const result = document.createElement('div');
  result.className = 'explanation-content';
  if (deep) result.classList.add('explanation-deep');
  const labels: Record<string, string> = {
    answer: '面试口述',
    analysis: '机制与取舍',
    case: '故障推演与追问',
    summary: '关键判断',
  };
  let body: HTMLDivElement | undefined;
  for (const node of Array.from(source.childNodes)) {
    const index = headings.indexOf(node as Element);
    if (index < 0) {
      (body || result).append(node);
      continue;
    }
    const config = expected[index];
    const section = document.createElement('section');
    section.className = 'explanation-section explanation-' + config.kind;
    const header = document.createElement('div');
    header.className = 'explanation-section-heading';
    const number = document.createElement('span');
    number.className = 'explanation-section-number';
    number.textContent = String(index + 1).padStart(2, '0');
    number.setAttribute('aria-hidden', 'true');
    const heading = node as HTMLHeadingElement;
    if (deep) heading.textContent = labels[config.kind];
    if (!heading.id) heading.id = 'explanation-' + config.kind;
    section.setAttribute('aria-labelledby', heading.id);
    header.append(number, heading);
    body = document.createElement('div');
    body.className = 'explanation-section-body';
    section.append(header, body);
    result.append(section);
  }

  result.querySelectorAll('ol').forEach((list) => {
    const requested = Number(list.getAttribute('start') || 1);
    const start = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
    Array.from(list.children).forEach((item, index) => {
      if (item.tagName === 'LI') item.setAttribute('data-point', String(start + index));
    });
  });

  // Replace image paragraphs in place, preserving the order of text, diagrams and code.
  result
    .querySelectorAll<HTMLImageElement>('.explanation-section-body > p > img:only-child')
    .forEach((image) => {
      const paragraph = image.parentElement;
      if (paragraph && !paragraph.textContent?.trim()) {
        const figure = document.createElement('figure');
        figure.className = 'explanation-diagram';
        const caption = document.createElement('figcaption');
        caption.textContent = (image.alt.split(/[：:]/)[0] || '流程示意') + ' · 点击放大';
        paragraph.replaceWith(figure);
        figure.append(image, caption);
      }
    });
  return result.outerHTML;
}
