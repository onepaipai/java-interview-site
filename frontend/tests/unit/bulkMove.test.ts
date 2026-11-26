import { afterEach, describe, expect, it, vi } from 'vitest';
import { bulkMoveQuestions, moduleQuestionIds } from '../../src/lib/bulkMove';

afterEach(() => vi.unstubAllGlobals());

describe('bulkMove', () => {
  it('分页拉取模块全部题目 id', async () => {
    const pages = [
      { items: [{ id: 1 }, { id: 2 }], total: 3, page: 1, size: 100 },
      { items: [{ id: 3 }], total: 3, page: 2, size: 100 },
    ];
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(pages.shift()),
    }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await moduleQuestionIds(7)).toEqual([1, 2, 3]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('page=2');
  });

  it('提交批量移动请求体', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const isCsrf = String(url).includes('/csrf');
      const payload = isCsrf
        ? { token: 'test', headerName: 'X-CSRF-TOKEN' }
        : { moved: 2, skipped: 0 };
      return {
        ok: true,
        status: 200,
        json: async () => payload,
        text: async () => JSON.stringify(payload),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await bulkMoveQuestions([1, 2], 9);
    expect(result).toEqual({ moved: 2, skipped: 0 });
    const call = fetchMock.mock.calls.find((entry) => String(entry[0]).includes('batch-move'));
    expect(call).toBeDefined();
    const init = call![1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ ids: [1, 2], categoryId: 9 });
  });

  it('超过 1000 题时分批提交并合并计数', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes('/csrf')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ token: 'test', headerName: 'X-CSRF-TOKEN' }),
          text: async () => '{"token":"test","headerName":"X-CSRF-TOKEN"}',
        };
      }
      const body = JSON.parse(String(init?.body));
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => JSON.stringify({ moved: body.ids.length, skipped: 0 }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    const ids = Array.from({ length: 1001 }, (_, index) => index + 1);
    const result = await bulkMoveQuestions(ids, 9);
    expect(result.moved).toBe(1001);
    const moveCalls = fetchMock.mock.calls.filter((entry) =>
      String(entry[0]).includes('batch-move'),
    );
    expect(moveCalls).toHaveLength(2);
  });
});
