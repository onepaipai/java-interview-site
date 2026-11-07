import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// All API calls are mocked: this suite never changes a running question bank.
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5180';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir('test-results/review', { recursive: true });
try {
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    try {
      const page = await context.newPage(), errors = [], requests = [];
      page.on('pageerror', error => errors.push(error.message));
      const questions = [1, 2].map(id => ({ id, title: '测试题目 ' + id, answer: '原有回答 ' + id,
        category_id: 2, category: '测试模块', difficulty: '基础', sort_order: id, tags: [], version: 0 }));
      let delayed = false, began, release, providerFails = false, askCount = 0;
      let gate;
      await page.route('**/api/**', async route => {
        const url = new URL(route.request().url()), path = url.pathname;
        requests.push(path + url.search);
        let json;
        if (path === '/api/csrf') json = { token: 'test', headerName: 'X-CSRF-TOKEN' };
        else if (path === '/api/me') json = { id: 1, username: 'admin', role: 'ADMIN' };
        else if (path === '/api/categories') json = [{ id: 2, name: '测试模块', question_count: 2 }];
        else if (path === '/api/ai/status') json = { enabled: true, model: 'test', chunks: 1, vectors: 0, documents: 0, embeddingConfigured: false };
        else if (/\/questions\/\d+\/ai$/.test(path)) {
          askCount++;
          if (providerFails) { await route.fulfill({ status: 502, json: { message: '模型暂时不可用，请重试' } }); return; }
          json = { answer: 'AI 新回答 <script>window.aiInjected=true</script>', sources: [{ id: 1, title: '来源题', questionId: 2, chunk: 0, content: '来源正文' }] };
        }
        else if (path.endsWith('/location')) {
          if (url.searchParams.get('search') === '失效搜索') {
            await route.fulfill({ status: 404, json: { message: '当前筛选中没有该题目' } }); return;
          }
          json = { page: 1, index: 0, total: 2 };
        } else if (/\/questions\/\d+$/.test(path)) {
          if (delayed && path.endsWith('/1')) { began(); await gate; }
          json = questions.find(q => q.id === Number(path.split('/').at(-1)));
        } else if (path === '/api/stats') json = { total: 2, mastered: 0, weak: 0, favorites: 0 };
        else if (path === '/api/questions') json = { items: url.searchParams.get('weak') === 'true' ? [] : questions.map(({answer,...question})=>({...question,answered:!!answer,preview:answer})), total: 2, page: 1, size: 15 };
        else throw new Error('Unexpected API: ' + path);
        await route.fulfill({ json });
      });

      await page.goto(base + '/#/question/1?module=999');
      await expect(page.locator('.reader')).toBeVisible();
      await expect(page).toHaveURL(/#\/question\/1\?module=2$/);
      await page.goto(base + '/#/question/1?global=1&search=' + encodeURIComponent('失效搜索'));
      await expect(page.locator('.reader')).toBeVisible();
      await expect(page).toHaveURL(/#\/question\/1\?module=2$/);
      await expect(page.locator('.feedback.error')).toHaveCount(0);

      await page.goto(base + '/#/module/2');
      await page.locator('.question-row').first().waitFor();
      await page.getByPlaceholder('搜索题目或回答').fill('尚未提交');
      requests.length = 0;
      await page.locator('.question-row').first().click();
      await expect(page.locator('.reader')).toBeVisible();
      assert.ok(!requests.some(url => url.includes(encodeURIComponent('尚未提交'))));
      await page.locator('.ai-panel-toggle').click();
      await page.getByLabel('向 AI 提问', { exact: true }).fill('保留这段草稿');
      await page.getByRole('button', { name: '生成参考回答', exact: true }).click();
      await expect(page.locator('.ai-turn.assistant')).toBeVisible();
      await expect(page.getByLabel('向 AI 提问', { exact: true })).toHaveValue('保留这段草稿');
      await page.locator('.ai-sources > summary').click();
      await page.locator('.ai-sources details > summary').click();
      await expect(page.getByRole('link', { name: '新标签页查看原题 →' })).toHaveAttribute('target', '_blank');
      assert.equal(await page.evaluate(() => window.aiInjected), undefined);
      providerFails = true;
      await page.getByRole('button', { name: '发送', exact: true }).click();
      await expect(page.locator('.ai-panel .error')).toContainText('模型暂时不可用');
      await expect(page.getByLabel('向 AI 提问', { exact: true })).toHaveValue('保留这段草稿');
      await expect(page.getByRole('button', { name: '发送', exact: true })).toBeEnabled();
      assert.equal(askCount, 2);
      providerFails = false;
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `test-results/review/ai-${width}.png`, fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

      // An adopted answer must not overwrite another editor reached while its route is loading.
      gate = new Promise(resolve => release = resolve);
      const started = new Promise(resolve => began = resolve);
      delayed = true;
      await page.getByRole('button', { name: '编辑并保存为回答', exact: true }).click();
      await page.locator('.confirm-dialog').getByRole('button', { name: '进入编辑', exact: true }).click();
      await started;
      const cancelled = page.waitForEvent('requestfailed', { predicate: r => new URL(r.url()).pathname === '/api/questions/1' });
      await page.evaluate(() => { location.hash = '#/question/2/edit'; });
      await expect(page.getByLabel('回答 Markdown', { exact: true })).toContainText('原有回答 2');
      delayed = false;
      release(); await cancelled;
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await expect(page.getByLabel('回答 Markdown', { exact: true })).toContainText('原有回答 2');
      assert.deepEqual(errors, []);
      console.log(`${width}: stale links, draft search, AI draft/source links/adoption race PASS`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
