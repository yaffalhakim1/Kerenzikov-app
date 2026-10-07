/**
 * The route a notification tap should open, read from the push payload's
 * `data`. The daemon sends `{ url: "waku://task/<id>", sessionId }`; this
 * prefers the explicit URL and falls back to the session id, so a change to
 * one field does not silently break navigation. Returns null when the payload
 * carries neither, so the app simply opens where it was.
 */
export function notificationDeepLink(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as { url?: unknown; sessionId?: unknown };
  if (typeof record.url === 'string' && record.url.trim()) return record.url;
  if (typeof record.sessionId === 'string' && record.sessionId.trim()) {
    return `waku://task/${record.sessionId}`;
  }
  return null;
}
