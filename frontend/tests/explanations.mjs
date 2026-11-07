import { chromium, expect } from '@playwright/test';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const samplesRoot = new URL('../../content/explanations/samples/', import.meta.url);
const files = (await readdir(samplesRoot)).filter(file => file.endsWith('.md'));
const sources = Object.fromEntries(await Promise.all(files.map(async file => [file, await readFile(new URL(file, samplesRoot), 'utf8')])));
const output = new URL('../test-results/explanations/', import.meta.url);
await mkdir(output, { recursive: true });
const template = await readFile(new URL('fixtures/explanations-preview.html', import.meta.url), 'utf8');
await writeFile(new URL('preview.html', output), template.replace('__SAMPLE_DATA__', JSON.stringify(sources).replace(/</g, '\\u003c')));
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
try {
  for (const [name, width, height] of [['desktop',1440,1000],['phone',390,844],['small-phone',320,740]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      for (const file of files) {
        await page.goto(base + '/test-results/explanations/preview.html?sample=' + file);
        await expect(page.locator('main h2')).toHaveText(['参考回答','参考分析','案例','总结点']);
        await expect(page.locator('.explanation-section')).toHaveCount(4);
        const legacy = await page.evaluate(async () => {
          const { formatExplanation } = await import('/src/explanations.ts');
          const html = '<h2>原有回答</h2><p>保持旧版内容与目录</p>';
          return formatExplanation(html) === html;
        });
        assert.equal(legacy, true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const images = page.locator('main img');
        assert.ok(await images.count() <= 1);
        for (const image of await images.all()) {
          await expect(image).toHaveJSProperty('complete', true);
          assert.ok(await image.evaluate(element => element.naturalWidth > 0));
          const box = await image.boundingBox();
          assert.ok(box.width >= 220 && box.x >= 0 && box.x + box.width <= width);
          await image.click();
          await expect(page.locator('#diagram-dialog')).toBeVisible();
          await page.getByRole('button', { name: '关闭大图', exact: true }).click();
          await expect(page.locator('#diagram-dialog')).not.toBeVisible();
        }
        const caseNumbers = await page.locator('.explanation-case li[data-point]').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('data-point'))));
        assert.deepEqual(caseNumbers, Array.from({length:caseNumbers.length}, (_, index) => index + 1));
        const copy = page.locator('.explanation-case [data-copy-code]').first();
        await copy.click();
        await expect(copy).toHaveText(/已复制|已选中/);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: fileURLToPath(new URL(name + '-' + file.replace('.md','.png'), output)), fullPage: true });
      }
      assert.deepEqual(errors, []);
      console.log(name + ': four sections, concise lists, readable diagram, code and no page overflow PASS');
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
