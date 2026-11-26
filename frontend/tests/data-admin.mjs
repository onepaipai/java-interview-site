import { testTarget } from './target.mjs';
const testEnvironment = await testTarget();
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const base = testEnvironment.base;
const password = testEnvironment.password;
const stamp = Date.now();
const moduleName = 'qa-data-' + stamp;
const moveSourceName = 'qa-move-src-' + stamp;
const moveTargetName = 'qa-move-dst-' + stamp;
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--disable-gpu', '--js-flags=--max-old-space-size=192'],
});
const context = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1280, height: 900 },
});
const p = await context.newPage();
let categoryId;
let sourceModuleId;
let targetModuleId;
let createdQuestionId;

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
  await p.locator('.status-stats').first().waitFor();

  const [bankDownload] = await Promise.all([
    p.waitForEvent('download'),
    p.getByRole('button', { name: '题库 Markdown', exact: true }).click(),
  ]);
  assert.equal(bankDownload.suggestedFilename(), 'java-interview.md');

  const [backupDownload] = await Promise.all([
    p.waitForEvent('download'),
    p.getByRole('button', { name: '完整备份 JSON', exact: true }).click(),
  ]);
  assert.match(backupDownload.suggestedFilename(), /^java-interview-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const backup = await req('GET', '/admin/backup');
  assert.ok(Array.isArray(backup.questions) && backup.questions.length > 0, '备份含题目');
  assert.ok(Array.isArray(backup.archivedCategories), '备份含归档模块');
  assert.match(backup.scope, /仅限当前管理员/);

  const reviews = await req('GET', '/admin/reviews');
  assert.ok(Array.isArray(reviews.items) && reviews.items.length > 0, '审核列表非空');
  assert.ok(typeof reviews.counts.pending === 'number', '审核统计含 pending');
  const reviewItem = reviews.items[0];
  await p.locator('.data-card').filter({ hasText: '题解审核' }).getByRole('button', { name: '编辑结论' }).first().click();
  await p.locator('.data-review-dialog').waitFor();
  const reviewDialog = p.locator('.data-review-dialog');
  await reviewDialog.getByLabel('状态').selectOption('rejected');
  await reviewDialog.getByLabel('审核人').fill('e2e-reviewer');
  await reviewDialog.getByRole('button', { name: '保存结论', exact: true }).click();
  await p.getByText('审核结论已保存', { exact: true }).waitFor();
  const afterReview = await req('GET', '/admin/reviews');
  assert.equal(
    afterReview.items.find((item) => item.sourceKey === reviewItem.sourceKey).status,
    'rejected',
    '审核结论已写回业务库',
  );

  // 造一条人工改动，确保发布状态列表一定有可跳转的题目
  const firstQuestion = await req('GET', '/questions?size=1');
  const seedId = firstQuestion.items[0].id;
  const seed = await req('GET', '/questions/' + seedId);
  await req('PUT', '/admin/questions/' + seedId, {
    title: seed.title,
    categoryId: seed.category_id,
    difficulty: seed.difficulty,
    answer: seed.answer + '\n\n人工改动标记-' + stamp,
    sortOrder: seed.sort_order,
    tags: seed.tags,
    version: seed.version,
  });
  await p.getByRole('button', { name: '刷新' }).first().click();
  const publicationLink = p.locator('.status-items a').first();
  await publicationLink.waitFor();
  assert.match(await publicationLink.getAttribute('href'), /^#\/question\/\d+$/);

  const markdown =
    '## 进阶\n### 数据管理测试模块\n\n1. 导入自测题目\n    这是导入自测答案。\n';
  await p.locator('.data-card input[type=file]').setInputFiles({
    name: 'data-admin-import.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(markdown, 'utf8'),
  });
  await p.locator('.data-preview-dialog:not(.data-review-dialog)').waitFor();
  await p.getByText(/题目 1 道/).waitFor();
  const previewDialog = p.locator('.data-preview-dialog:not(.data-review-dialog)');
  const checkboxes = previewDialog.locator('.data-mode input[type=checkbox]');
  const checkboxCount = await checkboxes.count();
  assert.ok(checkboxCount >= 2, '预览列出资料勾选框（含全选）');
  for (let index = 1; index < checkboxCount; index++) await checkboxes.nth(index).uncheck();
  await previewDialog.getByRole('button', { name: '确认导入', exact: true }).click();
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

  const source = await req('POST', '/admin/categories', { name: moveSourceName, sortOrder: 0 });
  const target = await req('POST', '/admin/categories', { name: moveTargetName, sortOrder: 0 });
  sourceModuleId = source.id;
  targetModuleId = target.id;
  const question = await req('POST', '/admin/questions', {
    title: '批量移动自测题-' + stamp,
    categoryId: sourceModuleId,
    difficulty: '基础',
    answer: '批量移动自测答案',
    sortOrder: 0,
    tags: [],
  });
  createdQuestionId = question.id;
  await p.reload();
  await p.getByRole('button', { name: '知识模块', exact: true }).click();
  await p.getByRole('heading', { name: '知识模块', exact: true }).waitFor();
  const sourceCard = p.locator('.managed-module-card').filter({ hasText: moveSourceName });
  await sourceCard
    .getByRole('button', { name: '批量移动' + moveSourceName + '模块的题目', exact: true })
    .click();
  const moveDialog = p.locator('dialog').filter({ hasText: '批量移动题目' });
  await moveDialog.getByLabel('目标模块').selectOption(String(targetModuleId));
  await moveDialog.getByRole('button', { name: '确认移动', exact: true }).click();
  await p.getByText('已移动 1 道题目', { exact: true }).waitFor();
  const moved = await req('GET', '/questions/' + createdQuestionId);
  assert.equal(moved.category_id, targetModuleId, '题目归属已变更');

  console.log(
    'data admin: import/backup/reviews/publication link/archive/unarchive/bulk-move PASS',
  );
} finally {
  try {
    if (createdQuestionId) {
      const csrf = await (await context.request.get(base + '/api/csrf')).json();
      await context.request.fetch(base + '/api/admin/questions/' + createdQuestionId, {
        method: 'DELETE',
        headers: { [csrf.headerName]: csrf.token },
      });
    }
    for (const [id, name] of [
      [categoryId, moduleName],
      [sourceModuleId, moveSourceName],
      [targetModuleId, moveTargetName],
    ]) {
      if (!id) continue;
      const rows = await context.request.get(base + '/api/categories');
      const list = await rows.json();
      if (list.some((c) => c.name === name)) {
        const csrf = await (await context.request.get(base + '/api/csrf')).json();
        await context.request.fetch(base + '/api/admin/categories/' + id, {
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
