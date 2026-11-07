/** Destructive UI suites only run against the disposable runner's marked environment. */
export async function testTarget() {
  const base = process.env.TEST_BASE_URL, password = process.env.TEST_ADMIN_PASSWORD;
  const id = process.env.TEST_ENVIRONMENT_ID;
  if (!base || !password || !id) throw new Error('请通过 scripts/test-e2e.ps1 启动独立测试环境；禁止读取日常管理员密码或使用默认业务地址。');
  const url = new URL(base);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('写入测试只允许本机独立环境。');
  const response = await fetch(new URL('/api/test-environment', url), { signal: AbortSignal.timeout(5000) });
  if (!response.ok || (await response.json()).id !== id) throw new Error('目标未通过独立测试环境身份校验，已停止写入。');
  return { base: url.origin, password };
}
