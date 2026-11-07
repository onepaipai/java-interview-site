import {testTarget} from './target.mjs';
const testEnvironment=await testTarget();
import { chromium, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = testEnvironment.base;
const password = testEnvironment.password;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
await mkdir('test-results/details', { recursive: true });
try {
  for (const [name, width, height] of [['desktop',1440,1000],['phone',390,844],['small-phone',320,740]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    try {
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base);
      await page.getByLabel('账号', { exact: true }).fill('admin');
      await page.getByLabel('密码', { exact: true }).fill(password);
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await page.getByRole('heading', { name: '知识目录', exact: true }).waitFor();

      await page.getByRole('button', { name: '知识模块', exact: true }).click();
      const moduleCard = page.locator('.managed-module-card').first();
      await moduleCard.getByRole('button', { name: '重命名', exact: true }).click();
      const moduleName = page.getByLabel('模块名称', { exact: true });
      // Imported module numbering counts toward the server's 200-character name limit.
      const categories = await (await context.request.get(base + '/api/categories')).json();
      const prefix = categories[0].name.match(/^(\d+\.\d+\s*|[一二三四五六七八]、\s*)/)?.[0] || '';
      await expect(moduleName).toHaveAttribute('maxlength', String(200 - prefix.length));
      await page.getByRole('button', { name: '取消', exact: true }).click();
      await page.getByRole('button', { name: '题库', exact: true }).click();
      const pack = await (await context.request.get(base + '/api/questions?tag=senior-v1&size=1')).json();
      const question = pack.items[0];
      await page.goto(base + '/#/question/' + question.id);
      await expect(page.locator('.reader .question-audience')).toHaveText('进阶题库');
      await page.screenshot({ path: 'test-results/details/' + name + '-reader.png' });

      await page.getByRole('button', { name:/^(编辑题解|添加回答)$/ }).click();
      const title = page.getByLabel('题目 Markdown', { exact: true });
      await title.waitFor();
      const original = (await title.innerText()).trim();
      await title.click(); await page.keyboard.press('Control+A'); await page.keyboard.insertText('x'.repeat(1001));
      await expect(page.getByRole('alert').filter({ hasText: '本次输入未插入' })).toBeVisible();
      assert.equal((await title.innerText()).trim(), original);
      await page.keyboard.insertText('编辑器长度边界测试');
      await expect(page.getByRole('alert').filter({ hasText: '本次输入未插入' })).toHaveCount(0);
      await page.getByRole('button', { name: '返回', exact: true }).click();
      await page.locator('.confirm-dialog').getByRole('button', { name: '放弃修改', exact: true }).click();
      await page.locator('.reader').waitFor();

      await page.locator('.user-menu').getByRole('button', { name: 'admin', exact: true }).click();
      await page.getByLabel('原密码', { exact: true }).fill('unsaved-password-draft');
      await page.getByRole('button', { name: '题库', exact: true }).click();
      await page.locator('.confirm-dialog').getByRole('button', { name: '取消', exact: true }).click();
      await expect(page.getByLabel('原密码', { exact: true })).toHaveValue('unsaved-password-draft');
      await page.getByRole('button', { name: '题库', exact: true }).click();
      await page.locator('.confirm-dialog').getByRole('button', { name: '放弃修改', exact: true }).click();
      await page.getByRole('heading', { name: '知识目录', exact: true }).waitFor();

      await page.getByRole('button', { name: 'AI 知识库', exact: true }).click();
      await expect(page.locator('.knowledge-page')).toHaveAttribute('aria-busy', 'false');
      await page.locator('.knowledge-views').getByRole('tab', { name: '检索资料', exact: true }).click();
      let release, started;
      const gate = new Promise(resolve => release = resolve), began = new Promise(resolve => started = resolve);
      await page.route('**/api/ai/search?*', async route => {
        started(); await gate;
        await route.fulfill({ json: [{ id: 999, title: 'STALE_RESULT', chunk: 0, content: 'old-query-only' }] });
      });
      await page.getByLabel('搜索知识').fill('old-query');
      await page.getByRole('button', { name: '查找资料', exact: true }).click(); await began;
      await page.getByLabel('搜索知识').fill('changed-query'); release();
      await expect(page.locator('.knowledge-page')).toHaveAttribute('aria-busy', 'false');
      await expect(page.locator('.knowledge-search details')).toHaveCount(0);
      await page.unroute('**/api/ai/search?*');
      await page.getByLabel('搜索知识').fill('no_results_' + Date.now());
      await page.getByRole('button', { name: '查找资料', exact: true }).click();
      await expect(page.locator('.knowledge-search').getByText(/没有找到“/)).toBeVisible();
      let uploads = 0;
      page.on('request', req => { if (req.url().endsWith('/api/admin/knowledge/upload')) uploads++; });
      await page.locator('.knowledge-views').getByRole('tab', { name: '知识来源', exact: true }).click();
      const input = page.locator('.knowledge-page input[type=file]');
      await input.setInputFiles({ name: 'empty.md', mimeType: 'text/markdown', buffer: Buffer.alloc(0) });
      await expect(page.getByRole('alert').filter({ hasText: '非空 UTF-8' })).toBeVisible();
      await input.setInputFiles({ name: 'too-large.md', mimeType: 'text/markdown', buffer: Buffer.alloc(1_500_001) });
      await expect(page.getByRole('alert').filter({ hasText: '非空 UTF-8' })).toBeVisible();
      assert.equal(uploads, 0);
      assert.equal(await input.inputValue(), '');
      await page.screenshot({ path: 'test-results/details/' + name + '-knowledge.png' });

      let attempts = 0;
      await page.route('**/api/ai/status', route => ++attempts === 1
        ? route.fulfill({ status: 503, json: { message: '模型连接暂时不可用' } })
        : route.fulfill({ json: { enabled: false, model: '', embeddingConfigured: false, chunks: 0, vectors: 0, documents: 0 } }));
      await page.goto(base + '/#/question/' + question.id);
      await page.locator('.ai-panel-toggle').click();
      await expect(page.getByText('模型连接暂时不可用', { exact: false })).toBeVisible();
      await expect(page.locator('.ai-setup')).toHaveCount(0);
      await page.getByRole('button', { name: '重试连接', exact: true }).click();
      await expect(page.locator('.ai-setup')).toContainText('AI 追问暂未启用');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      console.log(name + ': module name limits, senior badges, editor limit feedback, password draft, stale/empty knowledge results, upload limits and AI retry PASS');
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
