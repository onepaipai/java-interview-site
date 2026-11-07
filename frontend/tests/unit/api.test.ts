import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { api, refreshCsrf } from '../../src/lib/api';

let server: Server;
let base: string;
const nativeFetch = globalThis.fetch;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/api/csrf') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ token: 'test-csrf', headerName: 'X-CSRF-TOKEN' }));
      return;
    }
    if (req.url === '/api/slow-body') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write('{"answer":');
      const timer = setTimeout(() => res.end('"late"}'), 1000);
      res.on('close', () => clearTimeout(timer));
      return;
    }
    if (req.url === '/api/error') {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end('{"message":"内容已被其他人修改"}');
      return;
    }
    if (req.url === '/api/invalid-json') {
      res.end('<html>upstream error</html>');
      return;
    }
    if (req.url === '/api/empty') {
      res.writeHead(204);
      res.end();
      return;
    }
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({ body: JSON.parse(body || '{}'), csrf: req.headers['x-csrf-token'] }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
  vi.stubGlobal('fetch', (url: string | URL | Request, init?: RequestInit) =>
    nativeFetch(typeof url === 'string' && url.startsWith('/') ? base + url : url, init),
  );
  await refreshCsrf();
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  vi.unstubAllGlobals();
});
afterEach(() => vi.restoreAllMocks());

describe('API deadlines and cancellation', () => {
  it('keeps the timeout active after receiving headers while the body stalls', async () => {
    await expect(api('/slow-body', 'GET', undefined, 60)).rejects.toThrow('加载超时');
  });
  it('distinguishes user cancellation from network failure', async () => {
    const controller = new AbortController();
    const result = api('/slow-body', 'GET', undefined, 2000, controller.signal);
    setTimeout(() => controller.abort(), 30);
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('does not send an already-cancelled request', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = vi.spyOn(globalThis, 'fetch');
    await expect(api('/echo', 'POST', {}, undefined, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('preserves server validation messages and handles empty responses', async () => {
    await expect(api('/error')).rejects.toThrow('内容已被其他人修改');
    await expect(api('/empty')).resolves.toBeUndefined();
    await expect(api('/invalid-json')).rejects.toThrow('服务器返回了无法识别的数据');
  });
  it('sends JSON and the current CSRF header for writes', async () => {
    await expect(api('/echo', 'PUT', { title: '测试题' })).resolves.toEqual({
      body: { title: '测试题' },
      csrf: 'test-csrf',
    });
  });
});
