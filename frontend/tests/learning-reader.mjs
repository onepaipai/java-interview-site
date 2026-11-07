import { testTarget } from './target.mjs';
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import answers from '../../content/explanations/answers/review-answers-20261023.mjs';

const { base, password } = await testTarget();
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
const output = 'test-results/learning-reader';
await mkdir(output, { recursive: true });
async function authenticate(context, username, secret) {
  const csrf = await (await context.request.get(base + '/api/csrf')).json();
  const response = await context.request.post(base + '/api/login', {
    form: { username, password: secret }, headers: { [csrf.headerName]: csrf.token },
  });
  assert.ok(response.ok());
  return await (await context.request.get(base + '/api/csrf')).json();
}
try {
  const setup = await browser.newContext();
  const csrf = await authenticate(setup, 'admin', password);
  const learner = 'learner-' + Date.now();
  const created = await setup.request.post(base + '/api/admin/accounts', {
    data: { username: learner, password }, headers: { [csrf.headerName]: csrf.token },
  });
  assert.ok(created.ok());
  const categories = await (await setup.request.get(base + '/api/categories')).json();
  const category = categories[0];
  const questions = (await (await setup.request.get(base + '/api/questions?size=15&category=' + category.id)).json()).items;
  const bff = (await (await setup.request.get(base + '/api/questions?search=BFF')).json()).items[0];
  assert.ok(bff);
  // All rewritten source entries must actually reach the imported publication.
  for (const value of Object.values(answers)) {
    const list = await (await setup.request.get(base + '/api/questions?search=' + encodeURIComponent(value.title))).json();
    const q = list.items.find(q => q.title === value.title);
    assert.ok(q, value.title);
    const detail = await (await setup.request.get(base + '/api/questions/' + q.id)).json();
    assert.ok(detail.answer.includes(value.answer[0].replace(/[。；]+$/, '')), value.title);
    if (value.format === 'deep') assert.ok(detail.answer.includes(value.scenario));
  }
  await setup.close();
  for (const [role, username] of [['admin', 'admin'], ['learner', learner]]) {
    for (const width of [1280, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: width === 1280 ? 800 : 844 } });
      try {
        const token = await authenticate(context, username, password);
        const originalNote = '保留已有笔记';
        const seeded = await context.request.put(base + '/api/questions/' + questions[0].id + '/progress', {
          data: { mastery: 'NEW', favorite: true, note: originalNote, reviewed: false },
          headers: { [token.headerName]: token.token },
        });
        assert.ok(seeded.ok());
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + '/#/module/' + category.id);
        await page.getByRole('button', { name: '先答再看', exact: true }).click();
        await expect(page.locator('.row-preview')).toHaveCount(0);
        await page.locator('.question-row').first().click();
        await expect(page.locator('.answer-content')).toHaveCount(0);
        await expect(page.locator('.ai-panel')).toHaveCount(0);
        await page.getByRole('button', { name: '查看参考答案', exact: true }).click();
        await expect(page.locator('.explanation-answer')).toBeVisible();
        await page.getByRole('button', { name: '口述复习', exact: true }).click();
        await expect(page.locator('.explanation-case')).toBeHidden();
        await page.getByRole('button', { name: '模糊', exact: true }).click();
        await expect(page.getByRole('button', { name: '模糊', exact: true })).toHaveAttribute('aria-pressed', 'true');
        const saved = await (await context.request.get(base + '/api/questions/' + questions[0].id)).json();
        assert.equal(saved.mastery, 'PARTIAL'); assert.equal(saved.note, originalNote); assert.equal(saved.favorite, true);
        await page.getByRole('button', { name: /^下一题(?: →)?$/ }).click();
        await expect(page.locator('.answer-content')).toHaveCount(0);
        await page.getByRole('button', { name: '查看参考答案', exact: true }).click();
        await expect(page.getByRole('button', { name: '口述复习', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await page.reload();
        await page.getByRole('button', { name: '查看参考答案', exact: true }).click();
        await expect(page.getByRole('button', { name: '口述复习', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await page.getByRole('button', { name: '阅读学习', exact: true }).click();
        await page.getByRole('button', { name: '完整解析', exact: true }).click();
        if (width === 1280) {
          await page.evaluate(() => window.scrollTo(0, 600));
          const bounds = await page.locator('.reader-navigation').boundingBox();
          assert.ok(bounds.y >= 60 && bounds.y < 100, 'desktop navigation stays within reach');
        }
        // Search context return and actual module ancestry have distinct destinations.
        await page.goto(base + '/#/question/' + bff.id + '?global=1&search=BFF');
        await expect(page.locator('.explanation-deep')).toBeVisible();
        await expect(page.locator('.explanation-analysis')).not.toContainText('未保存离开');
        await page.getByRole('button', { name: width <= 600 ? '搜索结果' : '返回搜索结果', exact: true }).click();
        await expect(page.locator('.question-row')).toHaveCount(1);
        assert.match(page.url(), /#\/search\?search=BFF/);
        await page.locator('.question-row').click();
        await page.locator('.reader-breadcrumbs button').nth(1).click();
        await expect(page.locator('.question-row').first()).toBeVisible();
        assert.match(page.url(), new RegExp('#/module/' + bff.category_id + '$'));
        await page.goto(base + '/#/question/' + bff.id);
        await expect(page.locator('.question-scenario')).not.toHaveAttribute('open');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.screenshot({ path: `${output}/${role}-${width}-reader.png`, fullPage: true });
        await page.screenshot({ path: `${output}/${role}-${width}-reader-viewport.png` });
        if (width <= 600) {
          const top = await page.locator('.explanation-answer').evaluate(el => el.getBoundingClientRect().top);
          assert.ok(top < 560, 'mobile answer begins at ' + top);
        }
        await page.getByRole('button', { name: '知识目录', exact: true }).click();
        await expect(page.locator('.resume-question')).toContainText('BFF');
        await expect(page.locator('.review-questions')).toContainText(questions[0].title);
        await page.screenshot({ path: `${output}/${role}-${width}-home.png`, fullPage: true });
        if (role === 'admin' && width === 1280) {
          for (const answer of [
            '## 参考回答\n1. 直接结论\n\n## 案例\n1. 操作与结果\n\n## 总结点\n1. 记忆点',
            '## 参考回答\n1. 直接结论\n\n## 参考分析\n### 普通子标题\n机制\n\n## 案例\n1. 操作与结果\n\n## 总结点\n1. 记忆点',
            '## 手工笔记\n### 普通子标题\n保持自由格式，不伪装成深入题解。',
          ]) {
            await page.route('**/api/questions/' + bff.id, async route => {
              const response = await route.fetch();
              await route.fulfill({ response, json: { ...await response.json(), answer } });
            });
            await page.goto(base + '/#/question/' + bff.id);
            await expect(page.locator('.answer-content')).toBeVisible();
            await expect(page.locator('.explanation-deep')).toHaveCount(0);
            if (answer.includes('## 参考回答')) {
              await page.getByRole('button', { name: '口述复习', exact: true }).click();
              await expect(page.locator('.explanation-case')).toBeHidden();
              await page.getByRole('button', { name: '完整解析', exact: true }).click();
            } else {
              await expect(page.locator('.answer-mode-switch')).toHaveCount(0);
              await expect(page.locator('.reader-format-note')).toBeVisible();
            }
            await page.unroute('**/api/questions/' + bff.id);
            await page.goto(base + '/#/catalog');
          }
        }
        assert.deepEqual(errors, []);
        console.log(`${role} ${width}px: conceal/reveal, saved rating, preserved note/favorite, reading preference, breadcrumbs, resume, review and responsive layout PASS`);
      } finally { await context.close(); }
    }
  }
} finally { await browser.close(); }
