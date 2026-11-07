import {testTarget} from './target.mjs';
const testEnvironment=await testTarget();
import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = testEnvironment.base;
const password = testEnvironment.password;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
await mkdir('test-results/regressions', { recursive: true });
try {
  for (const [name, width, height] of [['desktop', 1440, 1000], ['phone', 390, 844], ['small-phone', 320, 740]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);
      await page.getByLabel('账号', { exact: true }).fill('admin');
      await page.getByLabel('密码', { exact: true }).fill(password);
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await page.getByRole('heading', { name: '知识目录', exact: true }).waitFor();
      const get = async path => {
        const response = await context.request.get(base + '/api' + path);
        assert.ok(response.ok(), path + ': ' + response.status());
        return response.json();
      };
      assert.equal((await get('/questions?tag=senior-v1&size=1')).total, 1050);
      const categories = await get('/categories');
      const category = categories.find(c => c.name.includes('专家'));
      const first = await get('/questions?category=' + category.id + '&size=15');
      const second = await get('/questions?category=' + category.id + '&size=15&page=2');
      for (const [question, expectedPage] of [[first.items[0], 1], [second.items[0], 2]]) {
        await page.goto(base + '/#/question/' + question.id);
        await page.locator('.question-markdown').getByText(question.title, { exact: true }).waitFor();
        await page.getByRole('button', { name:width<=600?'题目列表':'返回题目列表',exact:true }).click();
        await page.locator('.question-row').filter({ hasText: question.title }).waitFor();
        assert.equal(new URL(page.url().split('#')[1], base).searchParams.get('page'), expectedPage === 1 ? null : '2');
      }
      await page.goto(base + '/#/question/' + second.items[0].id);
      await page.getByRole('button', { name:/^(← )?上一题$/ }).click();
      await page.locator('.question-markdown').getByText(first.items[14].title, { exact: true }).waitFor();
      await page.getByRole('button', { name:/^下一题(?: →)?$/ }).click();
      await page.locator('.question-markdown').getByText(second.items[0].title, { exact: true }).waitFor();
      await page.goto(base + '/#/question/' + second.items[0].id + '?module=' + category.id + '&page=999');
      await page.locator('.question-markdown').getByText(second.items[0].title, { exact: true }).waitFor();
      await page.getByRole('button', { name:/^(← )?上一题$/ }).click();
      await page.locator('.question-markdown').getByText(first.items[14].title, { exact: true }).waitFor();
      const moduleTotal = first.total, lastPage = Math.ceil(moduleTotal / 15);
      await page.goto(base + '/#/module/' + category.id + '?page=999');
      await page.locator('.question-row').first().waitFor();
      assert.match(page.url(), new RegExp('page=' + lastPage + '$'));
      await page.goto(base + '/#/module/' + category.id + '?page=1.5');
      await page.locator('.question-row').filter({ hasText: first.items[0].title }).waitFor();
      assert.ok(!page.url().includes('page='));
      const global = await get('/questions?size=15&page=2&search=' + encodeURIComponent('事务'));
      const globalQuestion = global.items[0];
      await page.goto(base + '/#/question/' + globalQuestion.id + '?global=1&search=' + encodeURIComponent('事务'));
      await page.locator('.reader').waitFor();
      await page.getByRole('button', { name:width<=600?'搜索结果':'返回搜索结果',exact:true }).click();
      await page.locator('.question-row').filter({ hasText: globalQuestion.title }).waitFor();
      assert.match(page.url(), /page=2/);
      // Exercise the actual built editor chunks without modifying the question.
      await page.goto(base + '/#/question/' + first.items[0].id + '/edit');
      await page.getByLabel('回答 Markdown', { exact: true }).waitFor();
      await page.getByLabel('题目 Markdown', { exact: true }).waitFor();
      await page.getByRole('button', { name: '返回', exact: true }).click();
      await page.locator('.reader').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: 'test-results/regressions/' + name + '.png' });
      assert.deepEqual(errors, []);
      console.log(name + ': senior content, direct/stale/fractional pages, module/global navigation and editor chunks PASS');
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
