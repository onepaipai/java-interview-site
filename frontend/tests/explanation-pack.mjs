import {testTarget} from './target.mjs';
const testEnvironment=await testTarget();
import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const base = testEnvironment.base;
const root = new URL('../../content/explanations/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const modules = JSON.parse(await readFile(new URL('../../content/senior/manifest.json', import.meta.url), 'utf8')).modules;
const password = testEnvironment.password;
const hash = value => createHash('sha256').update(value).digest('hex');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
await mkdir('test-results/explanations', { recursive: true });
const report = { base, catalog: 0, customRetained: 0, modules: modules.length, viewports: [], questionIds: {} };
try {
  const session = await browser.newContext();
  const csrf = await (await session.request.get(base + '/api/csrf')).json();
  const login = await session.request.post(base + '/api/login', { form: { username: 'admin', password }, headers: { [csrf.headerName]: csrf.token } });
  assert.ok(login.ok());
  const items = [];
  for (let page = 1; ; page++) {
    const response = await session.request.get(base + '/api/admin/snapshot/questions?size=100&page=' + page);
    assert.ok(response.ok()); const data = await response.json();
    items.push(...data.items); if (items.length >= data.total) break;
  }
  const byKey = new Map(items.map(item => [item.source_key, item]));
  for (const entry of manifest.entries) {
    const actual = byKey.get(entry.sourceKey);
    assert.ok(actual, 'Missing published question: ' + entry.title);
    assert.equal(actual.title, entry.title);
    assert.equal(hash(actual.answer), entry.answerSha256, entry.title + ': unpublished or changed answer');
    assert.ok(actual.version >= 1);
  }
  report.catalog = manifest.entries.length;
  report.customRetained = items.length - manifest.entries.length;
  const picks = modules.map(module => {
    const number = module.id === 'database-advanced' ? 26 : 1;
    const sourceKey = hash(`senior-v1/${module.id}/${number}`);
    const question = byKey.get(sourceKey);
    report.questionIds[module.id] = question.id;
    return { module: module.id, question };
  });
  const compact = manifest.entries.filter(item => /\/legacy-[0-9]+\.md$/.test(item.file)).map(item => byKey.get(item.sourceKey)).sort((a,b) => a.answer.length-b.answer.length)[0];
  picks.push({ module: 'compact-answer', question: compact });
  for (const [module,number,label] of [['ai-basics',9,'rag-diagram'],['cache-messaging',24,'outbox-diagram']])
    picks.push({ module: label, question: byKey.get(hash(`senior-v1/${module}/${number}`)) });
  const state = await session.storageState(); await session.close();
  console.log(`API: ${manifest.count} exact published answers, unique sources and versions PASS; ${report.customRetained} custom content retained`);
  for (const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['small-phone',320,740]]) {
    const context = await browser.newContext({ viewport: { width,height }, storageState: state });
    try {
      const page = await context.newPage(), errors = [], writes = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (request.method() !== 'GET') writes.push(request.url()); });
      for (const { module,question } of picks) {
        await page.goto(base + '/#/question/' + question.id);
        const deep = question.answer.includes('<!-- explanation:deep -->');
        const headings = deep ? ['第一步 · 速记结论','第二步 · 逐点扩展','第三步 · 发散追问','关键口诀'] : ['参考回答', ...(question.answer.includes('## 参考分析') ? ['参考分析'] : []), '案例', '总结点'];
        await expect(page.locator('.reader .explanation-section')).toHaveCount(headings.length);
        const navLabels = await page.getByRole('navigation', { name: '主导航' }).locator('button').evaluateAll(buttons => buttons.map(button => {
          const range = document.createRange();
          range.selectNodeContents(button);
          return { text: button.textContent, lines: range.getClientRects().length };
        }));
        assert.ok(navLabels.every(label => label.lines === 1), name + ': navigation labels wrap: ' + JSON.stringify(navLabels));
        assert.deepEqual(await page.locator('.reader .explanation-content h2').allTextContents(), headings);
        await expect(page.locator('.reader .explanation-content > :last-child')).toHaveClass(/explanation-summary/);
        await expect(page.locator('.reader .explanation-references')).toHaveCount(1);
        await expect(page.locator('.reader .answer-divider')).toBeHidden();
        const outline = page.locator(width > 1150 ? '.answer-outline' : width > 600 ? '.mobile-answer-outline' : '.reader-mobile-toc');
        await expect(outline.locator('button')).toHaveCount(headings.length + (deep ? (question.answer.match(/^### /gm) || []).length : 0));
        if (width <= 600) {
          const tools = page.getByRole('navigation', { name: '阅读快捷操作' });
          await expect(tools).toBeVisible();
          const bounds = await tools.boundingBox();
          assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.height >= 54);
          await outline.locator('summary').click();
          await expect(outline.locator('button').last()).toBeVisible();
          await outline.locator('summary').press('Escape');
          await expect(outline).not.toHaveAttribute('open');
        }
        for (const img of await page.locator('.reader .explanation-diagram img').all()) {
          await expect(img).toHaveJSProperty('complete', true);
          assert.ok(await img.evaluate(node => node.naturalWidth > 0));
          if (module.endsWith('-diagram')) {
            await img.click(); await expect(page.locator('.image-lightbox')).toBeVisible();
            await page.getByRole('button',{name:'关闭图片',exact:true}).click();
          }
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, module + ': horizontal overflow');
        if (['spring-advanced','ai-basics','cache-messaging','compact-answer','rag-diagram','outbox-diagram'].includes(module)) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
          await page.screenshot({ path: `test-results/explanations/${name}-pack-${module}.png`, fullPage: true });
        }
        if (module === 'compact-answer') {
          await page.locator('.explanation-references summary').click();
          await expect(page.locator('.explanation-references a').first()).toBeVisible();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
      }
      assert.deepEqual(errors, []); assert.deepEqual(writes, []);
      report.viewports.push({ name,width,readers:picks.length,errors:0,overflow:0 });
      console.log(`${name}: ${picks.length} real readers, optional analysis, accessible outlines, references and diagrams PASS`);
    } finally { await context.close(); }
  }
  await writeFile('test-results/explanations/pack-audit.json', JSON.stringify(report,null,2));
} finally { await browser.close(); }
