import {testTarget} from './target.mjs';
const testEnvironment=await testTarget();
import { chromium, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = testEnvironment.base;
const password = testEnvironment.password;
const source = await readFile(new URL('../../content/explanations/samples/spring-advanced-001.md', import.meta.url), 'utf8');
const answer = source.slice(source.indexOf('## 参考回答'));
await mkdir('test-results/explanations', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
try {
  for (const [name, width, height] of [['desktop',1440,1000],['phone',390,844],['small-phone',320,740]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    try {
      const page = await context.newPage(), errors = [], writes = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (request.method() !== 'GET' && !request.url().endsWith('/api/login')) writes.push(request.url()); });
      await page.goto(base);
      await page.getByLabel('账号', { exact: true }).fill('admin');
      await page.getByLabel('密码', { exact: true }).fill(password);
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await page.getByRole('heading', { name: '知识目录', exact: true }).waitFor();
      const results = await (await context.request.get(base + '/api/questions?search=' + encodeURIComponent('事务代理为什么会在同类自调用时失效'))).json();
      const question = results.items[0];
      assert.ok(question);
      // Only replace the browser response; never publish the sample into the real question bank.
      await page.route('**/api/questions/' + question.id, async route => {
        const response = await route.fetch();
        await route.fulfill({ response, json: { ...await response.json(), answer } });
      });
      await page.goto(base + '/#/question/' + question.id);
      await expect(page.locator('.reader .explanation-section')).toHaveCount(4);
      await expect(page.locator('.reader .answer-divider')).toBeHidden();
      const headingIds = await page.locator('.reader .explanation-content h2').evaluateAll(nodes => nodes.map(node => node.id));
      assert.deepEqual(headingIds, ['answer-heading-0','answer-heading-1','answer-heading-2','answer-heading-3']);
      const readingOrder = await page.locator('.reader .explanation-case .explanation-section-body').evaluate(node => Array.from(node.children).map(child => child.tagName));
      assert.deepEqual(readingOrder, ['OL','FIGURE','OL','DIV','OL'], 'keep the failure steps, diagram, repair code and verification in source order');
      const image = page.locator('.reader .explanation-diagram img');
      await expect(image).toHaveJSProperty('complete', true);
      assert.ok(await image.evaluate(element => element.naturalWidth > 0));
      const imageBounds = await image.boundingBox();
      assert.ok(imageBounds.width >= 220);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);assert.deepEqual(writes, []);
      await page.screenshot({ path: 'test-results/explanations/' + name + '-workbench-reader.png', fullPage: true });
      console.log(name + ': workbench typography, four sections, preserved anchors, diagram and read-only preview PASS');
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
