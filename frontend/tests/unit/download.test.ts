import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadText } from '../../src/lib/download';

afterEach(() => vi.unstubAllGlobals());

describe('downloadText', () => {
  it('用同源 GET 下载文本并触发指定文件名', async () => {
    const anchor = {
      href: '',
      download: '',
      click: vi.fn(),
      remove: vi.fn(),
    };
    const appendChild = vi.fn();
    const createElement = vi.fn(() => anchor);
    const createObjectURL = vi.fn(() => 'blob:test-url');
    const revokeObjectURL = vi.fn();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '# 题库',
    }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal(
      'Blob',
      class {
        constructor(parts: unknown[], options?: { type?: string }) {
          expect(parts[0]).toBe('# 题库');
          expect(options?.type).toBe('text/markdown;charset=utf-8');
        }
      },
    );
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.stubGlobal('document', {
      createElement,
      body: { appendChild },
    });

    await downloadText('/admin/export', 'java-interview.md', 'text/markdown;charset=utf-8');

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/export', { credentials: 'same-origin' });
    expect(createElement).toHaveBeenCalledWith('a');
    expect(anchor.href).toBe('blob:test-url');
    expect(anchor.download).toBe('java-interview.md');
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
  });

  it('错误响应带出后端消息与状态码', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 403,
        text: async () => '{"message":"权限不足"}',
      })),
    );

    await expect(downloadText('/admin/export', 'x.md', 'text/markdown')).rejects.toMatchObject({
      message: '权限不足',
      status: 403,
    });
  });

  it('非 JSON 错误体回退到默认提示', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        text: async () => '<html>error</html>',
      })),
    );

    await expect(downloadText('/admin/export', 'x.md', 'text/markdown')).rejects.toMatchObject({
      message: '下载失败，请重试',
      status: 500,
    });
  });

  it('网络失败给出连接提示', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network');
      }),
    );

    await expect(downloadText('/admin/export', 'x.md', 'text/markdown')).rejects.toMatchObject({
      message: '无法连接服务器，请检查连接后重试',
    });
  });
});
