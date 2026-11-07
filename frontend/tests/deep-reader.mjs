import { testTarget } from './target.mjs';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import answers from '../../content/explanations/deep-answers.mjs';

const { base, password } = await testTarget();
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
const report = { questions: Object.keys(answers).length, widths: [], writes: [] };
await mkdir('test-results/explanations', { recursive: true });
try {
  const session = await browser.newContext();
  const csrf = await (await session.request.get(base + '/api/csrf')).json();
  const login = await session.request.post(base + '/api/login', { form: { username: 'admin', password }, headers: { [csrf.headerName]: csrf.token } });
  assert.ok(login.ok());
  const picks = [];
  for (const [key, value] of Object.entries(answers)) {
    const response = await session.request.get(base + '/api/questions?search=' + encodeURIComponent(value.title));
    assert.ok(response.ok());
    const question = (await response.json()).items.find(item => item.title === value.title);
    assert.ok(question, key + ': missing question');
    const detail = await (await session.request.get(base + '/api/questions/' + question.id)).json();
    assert.ok(detail.answer.includes('<!-- explanation:deep -->'), key + ': rich answer not imported');
    assert.ok(detail.answer.includes(value.scenario));
    picks.push({ key, value, question });
  }
  const state = await session.storageState();
  await session.close();
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ storageState: state, viewport: { width, height: 940 } });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (request.method() !== 'GET') report.writes.push(request.url()); });
      for (const { key, value, question } of picks) {
        await page.goto(base + '/#/question/' + question.id);
        await expect(page.locator('.question-scenario')).toContainText(value.scenario);
        await expect(page.locator('.reader .explanation-deep h2')).toHaveText(['面试口述', '机制与取舍', '故障推演与追问', '关键判断']);
        await expect(page.locator('.reader .explanation-deep h3')).toHaveCount(value.analysis.length + value.case.length);
        await expect(page.getByRole('button', { name: '完整解析', exact: true })).toHaveAttribute('aria-pressed', 'true');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, key + ': overflow');
        const outline = page.locator(width > 1150 ? '.answer-outline' : '.reader-mobile-toc');
        await expect(outline.locator('button')).toHaveCount(4 + value.analysis.length + value.case.length);
        if (width > 1150) {
          const bounds = await outline.boundingBox();
          assert.ok(bounds.height <= 940 - 120);
        }
        await page.getByRole('button', { name: '口述复习', exact: true }).click();
        await expect(page.locator('.reader .explanation-analysis')).toBeHidden();
        await expect(page.locator('.reader .explanation-case')).toBeHidden();
        await expect(outline.locator('button')).toHaveCount(2);
        await page.getByRole('button', { name: '完整解析', exact: true }).focus();
        await page.keyboard.press('Space');
        await expect(page.locator('.reader .explanation-analysis')).toBeVisible();
        await expect(outline.locator('button')).toHaveCount(4 + value.analysis.length + value.case.length);
        if (key === 'architecture/1') {
          await expect(page.locator('.reader .table-scroll table')).toHaveCount(1);
          await page.evaluate(() => window.scrollTo(0, 0));
          await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
          await page.screenshot({ path: `test-results/explanations/deep-${width}.png`, fullPage: true });
        }
        if (key === 'distributed/16') await expect(page.locator('.reader .code-block code')).toContainText('fence_token < :token');
      }
      assert.deepEqual(errors, []);
      report.widths.push({ width, readers: picks.length, overflow: 0, errors: 0 });
      console.log(`${width}px: ${picks.length} imported rich answers, scenario, subsection navigation, keyboard reading modes and width bounds PASS`);
    } finally { await context.close(); }
  }
  assert.deepEqual(report.writes, []);
  await writeFile('test-results/explanations/deep-audit.json', JSON.stringify(report, null, 2));
} finally { await browser.close(); }
