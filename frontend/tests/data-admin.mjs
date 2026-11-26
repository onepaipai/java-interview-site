import { testTarget } from './target.mjs';
const testEnvironment = await testTarget();
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const base = testEnvironment.base;
const password = testEnvironment.password;
const stamp = Date.now();
const moduleName = 'qa-data-' + stamp;
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--disable-gpu', '--js-flags=--max-old-space-size=192'],
});
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const p = await context.newPage();
let categoryId;

async function req(method, path, data) {
  const headers = {};
  if (method !== 'GET') {
    const c = await (await context.request.get(base + '/api/csrf')).json();
    headers[c.headerName] = c.token;
  }
  const r = await context.request.fetch(base + '/api' + path, {
    method,
    headers,
    ...(data === undefined ? {} : { data }),
  });
  assert.ok(r.ok(), method + ' ' + path + ' ' + r.status());
  return r.headers()['content-type']?.includes('json') ? r.json() : r.text();
}

async function login() {
  await p.goto(base);
  await p.getByLabel('账号', { exact: true }).fill('admin');
  await p.getByLabel('密码', { exact: true }).fill(password);
  await p.getByRole('button', { name: '登录', exact: true }).click();
  await p.getByRole('heading', { name: '知识目录', exact: true }).waitFor();
}

try {
  await login();
  await p.getByRole('button', { name: '数据管理', exact: true }).click();
  await p.getByRole('heading', { name: '数据管理', exact: true }).waitFor();

  const status = await req('GET', '/admin/publications/status');
  assert.ok(typeof status.packVersion === 'string', '发布状态含 packVersion');
  await p.locator('.status-stats').waitFor();

  const [download] = await Promise.all([
    p.waitForEvent('download'),
    p.getByRole('button', { name: '题库 Markdown', exact: true }).click(),
  ]);
  assert.equal(download.suggestedFilename(), 'java-interview.md');

  const markdown =
    '## 进阶\n### 数据管理测试模块\n\n1. 导入自测题目\n    这是导入自测答案。\n';
  await p.locator('.data-card input[type=file]').setInputFiles({
    name: 'data-admin-import.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(markdown, 'utf8'),
  });
  await p.locator('.data-preview-dialog').waitFor();
  await p.getByText(/题目 1 道/).waitFor();
  await p.locator('.data-preview-dialog').getByRole('button', { name: '确认导入', exact: true }).click();
  await p.locator('.confirm-dialog').getByRole('button', { name: '确认导入', exact: true }).click();
  await p.getByText('导入完成', { exact: false }).waitFor();

  const created = await req('POST', '/admin/categories', { name: moduleName, sortOrder: 0 });
  categoryId = created.id;
  await p.getByRole('button', { name: '知识模块', exact: true }).click();
  await p.getByRole('heading', { name: '知识模块', exact: true }).waitFor();
  const card = p.locator('.managed-module-card').filter({ hasText: moduleName });
  await card.getByRole('button', { name: '归档' + moduleName + '模块', exact: true }).click();
  await p.locator('.confirm-dialog').getByRole('button', { name: '归档模块', exact: true }).click();
  await p.getByText('模块已归档', { exact: true }).waitFor();

  await p.locator('.module-manager-filter').getByRole('button', { name: '已归档', exact: false }).click();
  const archivedCard = p.locator('.managed-module-card').filter({ hasText: moduleName });
  await archivedCard.getByRole('button', { name: '恢复' + moduleName + '模块', exact: true }).click();
  await p.locator('.confirm-dialog').getByRole('button', { name: '取消归档', exact: true }).click();
  await p.getByText('模块已恢复', { exact: true }).waitFor();
  const categories = await req('GET', '/categories');
  assert.ok(categories.some((c) => c.name === moduleName), '取消归档后模块重新出现在目录');

  console.log('data admin: import/export, publication status, archive/unarchive PASS');
} finally {
  try {
    if (categoryId) {
      const rows = await context.request.get(base + '/api/categories');
      const list = await rows.json();
      if (list.some((c) => c.name === moduleName)) {
        const csrf = await (await context.request.get(base + '/api/csrf')).json();
        await context.request.fetch(base + '/api/admin/categories/' + categoryId, {
          method: 'DELETE',
          headers: { [csrf.headerName]: csrf.token },
        });
      }
    }
  } catch {
    // 隔离环境可丢弃，清理失败不影响本轮结论
  } finally {
    await browser.close();
  }
}
