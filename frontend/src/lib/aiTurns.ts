export interface AiTurn<S = unknown> {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: S[];
}
export interface RenderedAiTurn<S = unknown> extends AiTurn<S> {
  html: string;
}

let sequence = 0;

export function newTurnId(): string {
  sequence += 1;
  return 'turn-' + Date.now().toString(36) + '-' + sequence;
}

/** sessionStorage 与渲染都只保留最近 max 轮，避免长期对话无界增长。 */
export function trimTurns<T>(turns: T[], max = 12): T[] {
  return turns.length > max ? turns.slice(turns.length - max) : turns;
}

/** 兼容旧 sessionStorage 数据（没有 id 的历史轮次补一个稳定 id）。 */
export function normalizeTurns<S = unknown>(value: unknown, max = 12): AiTurn<S>[] {
  if (!Array.isArray(value)) return [];
  const turns = value
    .filter(
      (item): item is Record<string, unknown> =>
        !!item &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string',
    )
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : newTurnId(),
      role: item.role as AiTurn<S>['role'],
      content: item.content as string,
      ...(Array.isArray(item.sources) ? { sources: item.sources as S[] } : {}),
    }));
  return trimTurns(turns, max);
}

/**
 * 只对新增的 assistant 轮次解析 Markdown；已渲染的 html 按 id 复用。
 * render 仍由 lib/markdown.ts 负责消毒，缓存不绕过 XSS 清洗。
 */
export function renderTurns<S>(
  turns: AiTurn<S>[],
  render: (content: string) => string,
  cache: Map<string, string>,
): RenderedAiTurn<S>[] {
  const rendered = turns.map((turn) => {
    if (turn.role !== 'assistant') return { ...turn, html: '' };
    let html = cache.get(turn.id);
    if (html === undefined) {
      html = render(turn.content);
      cache.set(turn.id, html);
    }
    return { ...turn, html };
  });
  for (const key of cache.keys()) {
    if (!turns.some((turn) => turn.id === key)) cache.delete(key);
  }
  return rendered;
}
