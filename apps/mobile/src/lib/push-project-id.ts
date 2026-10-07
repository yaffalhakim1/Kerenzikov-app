/**
 * Expo mints a push token only for a project it can identify, and the id
 * lives at `expo.extra.eas.projectId` in the resolved config. This reads it
 * defensively: the value is injected by EAS at build time and is absent in a
 * bare local run, which must yield `undefined` rather than a throw. Kept
 * separate from `push-notifications.ts` so the parsing is testable without
 * importing React Native.
 */
export function projectIdFor(extra: unknown): string | undefined {
  if (extra && typeof extra === 'object' && 'eas' in extra) {
    const eas = (extra as { eas?: unknown }).eas;
    if (eas && typeof eas === 'object' && 'projectId' in eas) {
      const projectId = (eas as { projectId?: unknown }).projectId;
      if (typeof projectId === 'string') return projectId;
    }
  }
  return undefined;
}
