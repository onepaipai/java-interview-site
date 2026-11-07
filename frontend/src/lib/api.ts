type Csrf = { token: string; headerName: string };
let csrf: Csrf | null = null;
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

/** Keep the deadline active until the caller has consumed the response body. */
async function withResponse<T>(
  url: string,
  options: RequestInit,
  timeout: number,
  consume: (response: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const external = options.signal;
  const cancel = () => controller.abort(external?.reason);
  if (external?.aborted) cancel();
  else external?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: 'same-origin',
    });
    return await consume(response);
  } catch (error) {
    if (external?.aborted) throw new DOMException('请求已取消', 'AbortError');
    if (controller.signal.aborted) {
      throw new Error(
        options.method && options.method !== 'GET'
          ? '请求超时，请刷新确认操作结果后再重试。'
          : '加载超时，请重试。',
      );
    }
    if (error instanceof ApiError) throw error;
    throw new Error('无法连接服务器，请检查连接后重试。');
  } finally {
    clearTimeout(timer);
    external?.removeEventListener('abort', cancel);
  }
}

export async function refreshCsrf() {
  csrf = await withResponse('/api/csrf', {}, 15000, async (response) => {
    if (!response.ok) throw new ApiError('登录连接已失效，请刷新后重试');
    const value = await response.json();
    if (typeof value.token !== 'string' || typeof value.headerName !== 'string')
      throw new ApiError('登录连接无效，请刷新后重试');
    return value as Csrf;
  });
}

export async function api<T = unknown>(
  path: string,
  method = 'GET',
  body?: unknown,
  timeout?: number,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) throw new DOMException('请求已取消', 'AbortError');
  if (method !== 'GET' && !csrf) await refreshCsrf();
  const headers: Record<string, string> = {};
  if (method !== 'GET' && csrf) headers[csrf.headerName] = csrf.token;
  let payload: BodyInit | undefined;
  if (body instanceof FormData || body instanceof URLSearchParams) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  return withResponse(
    '/api' + path,
    { method, headers, body: payload, signal },
    timeout ?? (body instanceof FormData ? 120000 : method === 'GET' ? 15000 : 30000),
    async (response) => {
      const text = await response.text();
      if (!response.ok) {
        if (response.status === 401) {
          csrf = null;
          if (path !== '/login' && path !== '/me')
            window.dispatchEvent(new Event('session-expired'));
        }
        let message = '操作失败，请重试';
        try {
          const value = JSON.parse(text);
          if (typeof value.message === 'string') message = value.message;
        } catch {}
        throw new ApiError(message, response.status);
      }
      if (response.status === 204 || !text) return undefined as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new ApiError('服务器返回了无法识别的数据，请重试');
      }
    },
  );
}
