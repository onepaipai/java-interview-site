import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import java from 'highlight.js/lib/languages/java';
import sql from 'highlight.js/lib/languages/sql';
import json from 'highlight.js/lib/languages/json';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import bash from 'highlight.js/lib/languages/bash';
import yaml from 'highlight.js/lib/languages/yaml';
import plaintext from 'highlight.js/lib/languages/plaintext';
import lua from 'highlight.js/lib/languages/lua';
for (const [name, language] of Object.entries({
  java,
  sql,
  json,
  javascript,
  typescript,
  xml,
  bash,
  yaml,
  plaintext,
  lua,
}))
  hljs.registerLanguage(name, language);
marked.setOptions({ gfm: true, breaks: false });
export function markdown(source: string, options: { media?: boolean | 'local' } = {}): string {
  const local = options.media === 'local';
  if (local)
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.nodeName !== 'IMG') return;
      node.removeAttribute('srcset');
      if (!/^\/explanations\/[a-z0-9-]+\.svg$/.test(node.getAttribute('src') || '')) {
        const placeholder = document.createElement('span');
        placeholder.className = 'media-placeholder';
        placeholder.textContent =
          '图片未加载：' + (node.getAttribute('alt') || '来源图片') + '（请查看原文）';
        node.replaceWith(placeholder);
      }
    });
  let html: string;
  try {
    html = DOMPurify.sanitize(marked.parse(source, { async: false }) as string, {
      FORBID_TAGS: [
        'style',
        'iframe',
        'form',
        'input',
        'button',
        ...(options.media === false || local
          ? [
              'svg',
              'video',
              'audio',
              'picture',
              'source',
              'object',
              'embed',
              ...(local ? [] : ['img']),
            ]
          : []),
      ],
      FORBID_ATTR: ['style'],
    });
  } finally {
    if (local) DOMPurify.removeHook('afterSanitizeAttributes');
  }
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  wrapper.querySelectorAll('pre code').forEach((node) => {
    const lang = Array.from(node.classList)
      .find((c) => c.startsWith('language-'))
      ?.slice(9);
    if (lang && hljs.getLanguage(lang))
      node.innerHTML = hljs.highlight(node.textContent || '', { language: lang }).value;
  });
  wrapper.querySelectorAll('pre').forEach((pre) => {
    const block = document.createElement('div');
    block.className = 'code-block';
    const header = document.createElement('div');
    header.className = 'code-header';
    const language = document.createElement('span');
    language.textContent =
      Array.from(pre.querySelector('code')?.classList || [])
        .find((c) => c.startsWith('language-'))
        ?.slice(9)
        .toUpperCase() || 'CODE';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = '复制';
    copy.setAttribute('data-copy-code', '');
    copy.setAttribute('aria-label', '复制代码');
    header.append(language, copy);
    pre.replaceWith(block);
    block.append(header, pre);
  });
  wrapper.querySelectorAll('table').forEach((table) => {
    const container = document.createElement('div');
    container.className = 'table-scroll';
    table.replaceWith(container);
    container.append(table);
  });
  wrapper.querySelectorAll('a').forEach((a) => {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });
  return wrapper.innerHTML;
}
