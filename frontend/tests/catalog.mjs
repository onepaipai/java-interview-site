import { testTarget } from './target.mjs';
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const { base, password } = await testTarget();
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
await mkdir('test-results/github-redesign', { recursive: true });
async function login(context, username) {
  const csrf = await (await context.request.get(base + '/api/csrf')).json();
  const response = await context.request.post(base + '/api/login', { form: { username, password }, headers: { [csrf.headerName]: csrf.token } });
  assert.ok(response.ok());
  return await (await context.request.get(base + '/api/csrf')).json();
}
try {
  const setup = await browser.newContext();
  const adminCsrf = await login(setup, 'admin');
  const learner = 'catalog-' + Date.now();
  assert.ok((await setup.request.post(base + '/api/admin/accounts', { data: { username: learner, password }, headers: { [adminCsrf.headerName]: adminCsrf.token } })).ok());
  const customName = '自定义调优实验';
  assert.ok((await setup.request.post(base + '/api/admin/categories', { data: { name: customName, sortOrder: 999 }, headers: { [adminCsrf.headerName]: adminCsrf.token } })).ok());
  const categories = await (await setup.request.get(base + '/api/categories')).json();
  const java = categories.find(c => c.name === '1.1 Java 语言');
  const question = (await (await setup.request.get(base + '/api/questions?size=1&category=' + java.id)).json()).items[0];
  const bff = (await (await setup.request.get(base + '/api/questions?search=BFF')).json()).items[0];
  await setup.close();
  for (const width of [1280, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1280 ? 900 : 844 } });
    try {
      const csrf = await login(context, learner);
      assert.ok((await context.request.put(base + '/api/questions/' + question.id + '/progress', { data: { mastery: 'YES', favorite: false, note: '', reviewed: true }, headers: { [csrf.headerName]: csrf.token } })).ok());
      const page = await context.newPage(); const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/#/catalog');
      await expect(page.getByRole('heading', { name: '知识目录', exact: true })).toBeVisible();
      await expect(page.locator('.module-card')).toHaveCount(categories.length);
      await expect(page.getByRole('progressbar', { name: 'Java 语言掌握进度', exact: true })).toHaveAttribute('aria-valuenow', '1');
      await expect(page.getByRole('progressbar', { name: '自定义调优实验掌握进度', exact: true })).toHaveAttribute('aria-valuemax', '1');
      await expect(page.locator('.mobile-module-switch')).toHaveCount(0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `test-results/github-redesign/home-${width}.png` });
      await page.getByRole('button', { name: '开始学习', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Java 语言', exact: true })).toBeVisible();
      await page.getByRole('button', { name: '知识目录', exact: true }).click();
      await expect(page.locator('.module-card')).toHaveCount(categories.length);
      await page.getByLabel('查找知识模块', { exact: true }).fill('线程池');
      await expect(page.locator('.module-card')).toHaveCount(1);
      await expect(page.locator('.module-card')).toContainText('Java 并发实战');
      await page.getByRole('button', { name: '清除模块筛选', exact: true }).click();
      await page.getByRole('group', { name: '知识领域', exact: true }).getByRole('button', { name: 'AI 应用', exact: true }).click();
      await expect(page.locator('.module-card')).toHaveCount(3);
      await page.getByRole('button', { name: '学习路线', exact: true }).click();
      await expect(page.locator('.learning-path')).toHaveCount(5);
      await expect(page.locator('.learning-path').first().locator('li button').first()).toContainText('Java 语言');
      await page.screenshot({ path: `test-results/github-redesign/paths-${width}.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator('.learning-path').first().locator('li button').first().click();
      await expect(page.getByRole('heading', { name: 'Java 语言', exact: true })).toBeVisible();
      assert.match(page.url(), new RegExp('#/module/' + java.id + '$'));
      await page.getByRole('button', { name: '知识目录', exact: true }).click();
      await expect(page.getByRole('button', { name: '学习路线', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await page.reload();
      await expect(page.getByRole('button', { name: '学习路线', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await page.getByRole('button', { name: '全部模块', exact: true }).click();
      await expect(page.locator('.module-card').filter({ hasText: customName })).toHaveCount(1);
      await page.goto(base + '/#/question/' + bff.id);
      await expect(page.locator('.explanation-answer')).toBeVisible();
      await page.screenshot({ path: `test-results/github-redesign/reader-${width}.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      console.log(`${width}px: real mastery progress, custom modules, topic search, group filters, learning paths, navigation, view persistence and reader layout PASS`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
