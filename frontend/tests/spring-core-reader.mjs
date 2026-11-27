import { testTarget } from './target.mjs';
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { loadQuestionContents } from '../../scripts/question-contents.mjs';

const { base, password } = await testTarget();
const { questions } = await loadQuestionContents();
const profiles = {
  'spring-core': { module: 'spring-basics', legacyStart: 33, legacyCount: 9, screenshots: ['spring-basics/4', 'spring-basics/23', 'legacy/41'] },
  'spring-advanced': { module: 'spring-advanced', legacyStart: 83, legacyCount: 10, screenshots: ['spring-advanced/3', 'spring-advanced/10', 'legacy/90'] },
  'database-basics': { module: 'database-basics', legacyStart: 42, legacyCount: 9, screenshots: ['database-basics/15', 'database-basics/24', 'legacy/47'] },
};
const profileName = process.argv[2] || 'spring-core';
assert.ok(Object.hasOwn(profiles, profileName), 'Unknown reader profile');
const profile = profiles[profileName];
const keys = [...Array.from({ length: 50 }, (_, i) => profile.module + '/' + (i + 1)),
  ...Array.from({ length: profile.legacyCount }, (_, i) => 'legacy/' + (i + profile.legacyStart))];
const manifest = JSON.parse(await readFile(new URL('../../content/explanations/manifest.json', import.meta.url), 'utf8'));
const hash = text => createHash('sha256').update(text).digest('hex');
const directory = 'test-results/' + profileName;
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
const report = { version: manifest.version, imported: 0, widths: [], writes: [] };
try {
  const setup = await browser.newContext();
  const csrf = await (await setup.request.get(base + '/api/csrf')).json();
  assert.ok((await setup.request.post(base + '/api/login', { form: { username: 'admin', password }, headers: { [csrf.headerName]: csrf.token } })).ok());
  const snapshot = [];
  for (let page = 1; ; page++) {
    const response = await setup.request.get(base + '/api/admin/snapshot/questions?size=100&page=' + page);
    assert.ok(response.ok());
    const data = await response.json();
    snapshot.push(...data.items);
    if (snapshot.length >= data.total) break;
  }
  const picks = keys.map(key => {
    const value = questions[key];
    const entry = manifest.entries.find(entry => entry.title === value.title);
    const question = snapshot.find(item => item.source_key === entry.sourceKey);
    assert.ok(question, key + ': missing imported answer');
    assert.equal(hash(question.answer), entry.answerSha256, key + ': exact publication');
    return { key, value, question };
  });
  report.imported = picks.length;
  const state = await setup.storageState();
  await setup.close();
  for (const width of [1280, 390, 320]) {
    const context = await browser.newContext({ storageState: state, viewport: { width, height: 900 } });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (request.method() !== 'GET') report.writes.push(request.url()); });
      for (const { key, value, question } of picks) {
        await page.goto(base + '/#/question/' + question.id);
        const deep = value.format === 'deep';
        const headings = deep ? ['第一步 · 速记结论', '第二步 · 逐点扩展', '第三步 · 发散追问', '关键口诀']
          : ['参考回答', ...(value.analysis ? ['参考分析'] : []), '案例', '总结点'];
        await expect(page.locator('.reader .explanation-content h2')).toHaveText(headings);
        await expect(page.locator('.reader .explanation-summary')).toContainText(value.summary[0]);
        const outline = page.locator(width > 1150 ? '.answer-outline' : '.reader-mobile-toc');
        await expect(outline.locator('button')).toHaveCount(headings.length + (deep ? value.analysis.length + value.case.length : 0));
        if (deep) {
          await expect(page.locator('.question-scenario')).toContainText(value.scenario);
          await expect(page.locator('.reader .explanation-deep h3')).toHaveCount(value.analysis.length + value.case.length);
        }
        const sources = deep
          ? [...value.case.map(item => item.body).join('\n').matchAll(/~~~(?:java|sql)\n([\s\S]*?)\n~~~/g)].map(match => match[1].trim())
          : value.case.filter(step => step.code).map(step => step.code.source.trim());
        for (const [index, source] of sources.entries()) await expect(page.locator('.reader .code-block code').nth(index)).toContainText(source);
        await page.getByRole('button', { name: '口述复习', exact: true }).click();
        await expect(page.locator('.reader .explanation-case')).toBeHidden();
        await expect(outline.locator('button')).toHaveCount(2);
        await page.getByRole('button', { name: '完整解析', exact: true }).click();
        await expect(page.locator('.reader .explanation-case')).toBeVisible();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), key + ': page overflow');
        if (profile.screenshots.includes(key)) {
          if (width <= 600) await outline.locator('summary').click();
          await outline.locator('button').last().click();
          await expect.poll(() => page.evaluate(() => {
            const rect = document.querySelector('.reader .explanation-summary').getBoundingClientRect();
            return rect.top >= 0 && rect.top < innerHeight;
          })).toBe(true);
          // Wait for the user's smooth anchor jump to finish before resetting the screenshot.
          // Visibility occurs partway through the animation, and an immediate reset races it.
          await page.evaluate(() => new Promise(resolve => {
            let previous = scrollY, stableFrames = 0;
            const frame = () => {
              stableFrames = Math.abs(scrollY - previous) < 0.5 ? stableFrames + 1 : 0;
              previous = scrollY;
              if (stableFrames >= 12) resolve();
              else requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
          }));
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
          await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
          await page.screenshot({ path: `${directory}/${key.replace('/', '-')}-${width}.png`, fullPage: true });
        }
      }
      assert.deepEqual(errors, []);
      report.widths.push({ width, readers: picks.length, errors: 0, overflow: 0 });
      console.log(`${width}px: all ${picks.length} ${profileName} readers, full/spoken modes, outlines, code and width bounds PASS`);
    } finally { await context.close(); }
  }
  assert.deepEqual(report.writes, []);
  await writeFile(`${directory}/reader-audit.json`, JSON.stringify(report, null, 2));
} finally { await browser.close(); }
