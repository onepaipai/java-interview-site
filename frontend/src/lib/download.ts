import { ApiError } from './api';

/** 通过浏览器下载接口返回的文本；GET 请求无需 CSRF，仅携带同源会话。 */
export async function downloadText(path: string, filename: string, mime: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api' + path, { credentials: 'same-origin' });
  } catch {
    throw new ApiError('无法连接服务器，请检查连接后重试');
  }
  if (!response.ok) {
    const text = await response.text();
    let message = '下载失败，请重试';
    try {
      const body = JSON.parse(text);
      if (body && typeof body.message === 'string') message = body.message;
    } catch {
      // 非 JSON 错误体时保留默认提示
    }
    throw new ApiError(message, response.status);
  }
  const text = await response.text();
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
