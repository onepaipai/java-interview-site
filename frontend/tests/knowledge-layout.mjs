import { testTarget } from './target.mjs';
const testEnvironment = await testTarget();
import { chromium, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = testEnvironment.base;
const password = testEnvironment.password;
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--disable-gpu'],
});
await mkdir('test-results/knowledge-layout', { recursive: true });
try {
  for (const [name, width, height] of [
    ['desktop', 1440, 1000],
    ['phone', 390, 844],
    ['small-phone', 320, 740],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } });
    try {
      const page = await context.newPage(),
        errors = [],
        mediaRequests = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('request', (request) => {
        if (request.url().endsWith('/unexpected-source-image.png'))
          mediaRequests.push(request.url());
      });
      await page.goto(base);
      await page.getByLabel('账号', { exact: true }).fill('admin');
      await page.getByLabel('密码', { exact: true }).fill(password);
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await page.getByRole('heading', { name: '知识目录', exact: true }).waitFor();
      let service = {
        enabled: false,
        model: '',
        embeddingConfigured: false,
        chunks: 1233,
        vectors: 0,
        documents: 2,
      };
      let docs = [
        { id: 31, title: 'G1 排查记录.md', characters: 2400, created_at: '2026-10-15T03:00:00Z' },
        {
          id: 32,
          title: '项目规范与跨服务一致性方案'.repeat(4) + '.md',
          characters: 6700,
          created_at: '2026-10-14T03:00:00Z',
        },
      ];
      const hit = (id, key, chunk, title, content, questionId = null) => ({
        id,
        key,
        chunk,
        title,
        content,
        questionId,
        score: 1,
      });
      const sources = [
        hit(5, 'question:659', 1, 'G1 的回收边界', '第二段：检查 Humongous 对象。', 659),
        hit(
          6,
          'upload:31',
          0,
          'G1 排查记录.md',
          'G1 日志：核对回收前后的占用。\n\n![示意](/unexpected-source-image.png)\n\n```java\nint x = 1;\n```',
        ),
        hit(3, 'question:659', 0, 'G1 的回收边界', '第一段：观察老年代增长。', 659),
      ];
      await page.route('**/api/ai/status', (route) => route.fulfill({ json: service }));
      await page.route('**/api/admin/knowledge', (route) => route.fulfill({ json: docs }));
      const libraryItems = [
        {
          key: 'question:659',
          title: 'G1 的回收边界',
          kind: 'question',
          questionId: 659,
          chunks: 2,
        },
        ...docs.map((doc) => ({
          key: 'upload:' + doc.id,
          title: doc.title,
          kind: 'upload',
          questionId: null,
          chunks: 3,
        })),
      ];
      await page.route('**/api/admin/knowledge/sources?*', (route) => {
        const params = new URL(route.request().url()).searchParams;
        const items = libraryItems.filter(
          (item) =>
            (params.get('kind') === 'all' || item.kind === params.get('kind')) &&
            item.title.includes(params.get('query') || ''),
        );
        return route.fulfill({
          json: {
            items,
            total: items.length,
            page: 1,
            size: 12,
            counts: {
              question: 1,
              reference: 0,
              upload: libraryItems.filter((item) => item.kind === 'upload').length,
            },
          },
        });
      });
      await page.route('**/api/admin/knowledge/source?*', (route) =>
        route.fulfill({
          json: {
            key: 'question:659',
            title: 'G1 的回收边界',
            questionId: 659,
            content:
              '## 参考回答\n1、观察老年代增长。\n\n## 案例\nG1 日志。\n\n![本地示意](/explanations/transaction-self-call.svg)\n\n![外部图片](/unexpected-source-image.png)\n\n## 总结点\n1、先看趋势。',
          },
        }),
      );
      await page.route('**/api/ai/search?*', (route) =>
        route.fulfill({ json: route.request().url().includes('no_results') ? [] : sources }),
      );
      // All document and index fixtures are intercepted: this test never writes library data.
      await page.route('**/api/admin/knowledge/index', async (route) => {
        service = { ...service, vectors: service.chunks };
        await route.fulfill({ json: { indexed: 2, remaining: 0 } });
      });
      await page.getByRole('button', { name: 'AI 知识库', exact: true }).click();
      await expect(page.locator('.knowledge-page')).toHaveAttribute('aria-busy', 'false');
      await expect(page.getByText('资料检索可用', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'AI 问答未连接', exact: true })).toBeVisible();
      await page.getByRole('tab', { name: '知识来源', exact: true }).click();
      await expect(page.locator('.knowledge-doc')).toHaveCount(3);
      await page.getByLabel('筛选知识来源', { exact: true }).fill('G1');
      await expect(page.locator('.knowledge-doc')).toHaveCount(2);
      await page.getByRole('button', { name: '题库', exact: true }).click();
      await page.goBack();
      await expect(page.getByRole('tab', { name: '知识来源', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(page.getByLabel('筛选知识来源', { exact: true })).toHaveValue('G1');
      await page.locator('.knowledge-source-open').first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('.knowledge-preview-content .explanation-section')).toHaveCount(3);
      await expect(page.locator('.knowledge-preview-content img')).toHaveCount(1);
      await expect(
        page.getByRole('link', { name: '查看原图：本地示意', exact: true }),
      ).toHaveAttribute('href', '/explanations/transaction-self-call.svg');
      await expect(page.locator('.knowledge-preview-content .media-placeholder')).toContainText(
        '外部图片',
      );
      assert.equal(mediaRequests.length, 0, 'full preview must not load untrusted media');
      await page.getByRole('button', { name: '关闭资料预览', exact: true }).press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await page.getByLabel('筛选知识来源', { exact: true }).fill('');
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      await page.screenshot({
        path: 'test-results/knowledge-layout/' + name + '-library.png',
        fullPage: true,
      });

      await page.getByRole('tab', { name: '检索资料', exact: true }).click();
      await page.getByRole('button', { name: 'G1 垃圾回收', exact: true }).click();
      await expect(page.getByLabel('搜索知识', { exact: true })).toBeFocused();
      await expect(page.locator('.knowledge-result')).toHaveCount(2);
      await expect(page.locator('.knowledge-result-count')).toContainText('2 个相关来源');
      await expect(page.locator('.knowledge-result-count')).toContainText('3 个命中片段');
      await expect(
        page.locator('.knowledge-result').first().locator('.knowledge-fragment p'),
      ).toHaveText(['第一段：观察老年代增长。', '第二段：检查 Humongous 对象。']);
      await expect(page.getByRole('link', { name: '在题库中打开 ↗', exact: true })).toHaveAttribute(
        'href',
        '#/question/659',
      );
      await page
        .locator('.knowledge-source-filters')
        .getByRole('button', { name: /上传文档/ })
        .click();
      await expect(page.locator('.knowledge-result')).toHaveCount(1);
      await expect(page.locator('.knowledge-result')).toContainText('G1 排查记录.md');
      await expect(page.locator('.knowledge-fragment-content img')).toHaveCount(0);
      const copy = page.locator('.knowledge-fragment-content [data-copy-code]');
      await copy.click();
      await expect(copy).toHaveText(/已复制|已选中/);
      assert.equal(mediaRequests.length, 0, 'retrieval excerpts must not load media');
      await page
        .locator('.knowledge-source-filters')
        .getByRole('button', { name: /全部来源/ })
        .click();
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      await page.screenshot({
        path: 'test-results/knowledge-layout/' + name + '-search.png',
        fullPage: true,
      });
      await page.getByLabel('搜索知识', { exact: true }).fill('no_results');
      await page.getByRole('button', { name: '查找资料', exact: true }).click();
      await expect(page.locator('.knowledge-search')).toContainText('没有找到“no_results”');

      service = {
        ...service,
        enabled: true,
        model: '本地测试模型',
        embeddingConfigured: true,
        chunks: 3,
        vectors: 1,
      };
      await page.getByRole('button', { name: '刷新', exact: true }).click();
      await page.getByRole('tab', { name: '服务设置', exact: true }).click();
      await expect(page.getByRole('progressbar', { name: '向量构建进度' })).toHaveAttribute(
        'value',
        '1',
      );
      await page.getByRole('button', { name: '构建向量索引', exact: true }).click();
      await expect(page.getByRole('progressbar', { name: '向量构建进度' })).toHaveAttribute(
        'value',
        '3',
      );
      await expect(page.getByRole('button', { name: '索引已就绪', exact: true })).toBeDisabled();
      docs = [];
      libraryItems.splice(1);
      service = { ...service, documents: 0 };
      await page.getByRole('button', { name: '刷新', exact: true }).click();
      await page.getByRole('tab', { name: '知识来源', exact: true }).click();
      await page
        .locator('.knowledge-library-filters')
        .getByRole('button', { name: /上传文档/ })
        .click();
      await expect(page.getByText('还没有上传文档', { exact: true })).toBeVisible();
      assert.deepEqual(errors, []);
      console.log(
        name +
          ': library filter, honest model state, grouped sources, source filters, empty results and vector progress PASS',
      );
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
