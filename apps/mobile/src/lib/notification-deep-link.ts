/**
 * The session a notification tap should open, read from the push payload's
 * `data`. The daemon sends `{ url: "waku://session/<id>", sessionId }`; this
 * prefers the explicit `sessionId` and falls back to parsing the id out of the
 * URL, so a change to one field does not silently break navigation.
 *
 * It returns the id, not a URL, because the caller navigates with the router's
 * object form (`{ pathname: '/session/[id]', params }`). A `waku://session/<id>`
 * string is ambiguous — `session` parses as the URL host, not a path segment —
 * and routing it as a raw URL is what landed taps on the unmatched-route
 * screen. Returns null when the payload carries no id, so the app opens where
 * it was.
 */
export function notificationSessionId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as { url?: unknown; sessionId?: unknown };
  if (typeof record.sessionId === 'string' && record.sessionId.trim()) {
    return record.sessionId.trim();
  }
  if (typeof record.url === 'string') {
    const match = record.url.match(/^waku:\/\/session\/([^/?#]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  return null;
}
