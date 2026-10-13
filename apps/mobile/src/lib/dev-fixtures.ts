import type { BackgroundWorkItem, TodoItem } from '@waku/client';

/**
 * Dev-only sample data, so a surface can be looked at without staging the real
 * thing. Reached from a session route with `?devFixtures=1`; `__DEV__`-gated at
 * the route, so none of this can reach a release build.
 *
 * These exist because the interesting states of the harness surfaces are the
 * ones that need a live daemon to produce: work running in the background, a
 * plan mid-flight, a failed command. Rendering them from fixtures is how those
 * states get looked at in a minute instead of an afternoon.
 */

export function devBackgroundWorkItems(): BackgroundWorkItem[] {
  const now = Date.now();
  return [
    {
      background: true,
      canStop: true,
      command: 'bun run build --watch',
      controlId: 'dev-1',
      cwd: '/Users/dev/project',
      detail: 'Rebuilding on change',
      durationMs: null,
      exitCode: null,
      key: { kind: 'process', providerId: 'dev-build-watch' },
      model: null,
      originActivityId: null,
      output: 'watching 214 files…',
      outputTruncated: false,
      parentId: null,
      role: null,
      startedAtMs: now - 42_000,
      status: 'running',
      title: 'Dev server',
      updatedAtMs: now,
    },
    {
      background: true,
      canStop: true,
      command: null,
      controlId: 'dev-2',
      cwd: null,
      detail: 'Reading the transcript pipeline',
      durationMs: null,
      exitCode: null,
      key: { kind: 'subagent', providerId: 'dev-explore' },
      model: 'claude-sonnet-4-5',
      originActivityId: null,
      output: null,
      outputTruncated: false,
      parentId: null,
      role: 'explore',
      startedAtMs: now - 8_000,
      status: 'running',
      title: 'Explore agent',
      updatedAtMs: now,
    },
    {
      background: false,
      canStop: false,
      command: 'bun test',
      controlId: null,
      cwd: '/Users/dev/project',
      detail: null,
      durationMs: 1_240,
      exitCode: 1,
      key: { kind: 'process', providerId: 'dev-test-run' },
      model: null,
      originActivityId: null,
      output: '3 failing',
      outputTruncated: false,
      parentId: null,
      role: null,
      startedAtMs: now - 90_000,
      status: 'failed',
      title: 'Test run',
      updatedAtMs: now - 88_000,
    },
    {
      background: true,
      canStop: true,
      command: 'tail -f daemon.log',
      controlId: 'dev-3',
      cwd: '/var/log',
      detail: 'Watching for reconnect storms',
      durationMs: null,
      exitCode: null,
      key: { kind: 'monitor', providerId: 'dev-monitor' },
      model: null,
      originActivityId: null,
      output: null,
      outputTruncated: false,
      parentId: null,
      role: null,
      startedAtMs: now - 5_000,
      status: 'monitoring',
      title: 'Daemon log',
      updatedAtMs: now,
    },
    {
      background: false,
      canStop: false,
      command: 'bun run typecheck',
      controlId: null,
      cwd: '/Users/dev/project',
      detail: null,
      durationMs: 9_800,
      exitCode: 0,
      key: { kind: 'process', providerId: 'dev-typecheck' },
      model: null,
      originActivityId: null,
      output: null,
      outputTruncated: false,
      parentId: null,
      role: null,
      startedAtMs: now - 300_000,
      status: 'completed',
      title: 'Typecheck',
      updatedAtMs: now - 290_000,
    },
  ];
}

export function devTodoItems(): TodoItem[] {
  return [
    { content: 'Read the existing composer', priority: 'high', status: 'completed' },
    { content: 'Port the queue path', priority: 'high', status: 'completed' },
    { content: 'Wire attachments', priority: 'high', status: 'in_progress' },
    { content: 'Match the desktop palette', priority: 'medium', status: 'pending' },
    { content: 'Verify on device', priority: 'low', status: 'pending' },
    { content: 'Drop the unused sheet', priority: 'low', status: 'cancelled' },
  ];
}
