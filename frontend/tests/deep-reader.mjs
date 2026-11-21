import { testTarget } from './target.mjs';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { loadQuestionContents } from '../../scripts/question-contents.mjs';

const { base, password } = await testTarget();
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
const contents = await loadQuestionContents();
// 阅读渲染器的固定小节标题（渲染时把参考回答/参考分析/案例/总结点映射为口述阅读标题）；
// h3 是分析与案例的块标题，数量 = 块数之和。
const deepH2 = ['面试口述', '机制与取舍', '故障推演与追问', '关键判断'];
// 固定包含两个内容锚点题，其余按固定步长抽样：全量源码↔发布包一致性由 validate-explanations 覆盖。
const deepKeys = Object.keys(contents.questions).filter(key => contents.questions[key].format === 'deep').sort();
const stride = Math.max(1, Math.floor(deepKeys.length / 6));
const sampled = ['distributed/16', 'architecture/1', ...deepKeys.filter(key => key !== 'distributed/16' && key !== 'architecture/1').filter((_, i) => i % stride === 0).slice(0, 6)];
const report = { questions: sampled.length, widths: [], writes: [] };
await mkdir('test-results/explanations', { recursive: true });
try {
  const session = await browser.newContext();
  const csrf = await (await session.request.get(base + '/api/csrf')).json();
  const login = await session.request.post(base + '/api/login', { form: { username: 'admin', password }, headers: { [csrf.headerName]: csrf.token } });
  assert.ok(login.ok());
  const picks = [];
  for (const key of sampled) {
    const value = contents.questions[key];
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
        await expect(page.locator('.reader .explanation-deep h2')).toHaveText(deepH2);
        await expect(page.locator('.reader .explanation-deep h3')).toHaveCount(value.analysis.length + value.case.length);
        await expect(page.getByRole('button', { name: '完整解析', exact: true })).toHaveAttribute('aria-pressed', 'true');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, key + ': overflow');
        const outline = page.locator(width > 1150 ? '.answer-outline' : '.reader-mobile-toc');
        await expect(outline.locator('button')).toHaveCount(deepH2.length + value.analysis.length + value.case.length);
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
        await expect(outline.locator('button')).toHaveCount(deepH2.length + value.analysis.length + value.case.length);
        if (key === 'architecture/1') {
          await page.evaluate(() => window.scrollTo(0, 0));
          await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
          await page.screenshot({ path: `test-results/explanations/deep-${width}.png`, fullPage: true });
        }
        if (key === 'distributed/16') {
          // v2 内容含多个代码块，按文本过滤出栅栏令牌那一块再断言。
          await expect(page.locator('.reader .code-block code').filter({ hasText: 'fence_token < :token' })).toBeVisible();
        }
      }
      assert.deepEqual(errors, []);
      report.widths.push({ width, readers: picks.length, overflow: 0, errors: 0 });
      console.log(`${width}px: ${picks.length} imported rich answers, scenario, subsection navigation, keyboard reading modes and width bounds PASS`);
    } finally { await context.close(); }
  }
  assert.deepEqual(report.writes, []);
  await writeFile('test-results/explanations/deep-audit.json', JSON.stringify(report, null, 2));
} finally { await browser.close(); }
