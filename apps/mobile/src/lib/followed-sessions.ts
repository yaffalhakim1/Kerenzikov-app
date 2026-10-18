/**
 * Which sessions this client is following on a live runtime.
 *
 * Two providers need the same answer at different times. `RuntimeProvider`
 * owns the subscriptions and is the only writer; `DaemonProvider` reads it
 * when the link comes back, because a followed runtime replays its own missed
 * events and must not also be refetched from the daemon — that would parse the
 * whole transcript a second time while the replay is still draining.
 *
 * A module-level set rather than React state: the reader is a connection
 * callback that must see the current membership without re-subscribing, and a
 * stale read would only cost one redundant refetch.
 */
const followed = new Set<string>();

export function markSessionFollowed(sessionId: string): void {
  followed.add(sessionId);
}

export function markSessionUnfollowed(sessionId: string): void {
  followed.delete(sessionId);
}

export function clearFollowedSessions(): void {
  followed.clear();
}

export function followedSessionIds(): ReadonlySet<string> {
  return followed;
}
