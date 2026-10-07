import { describe, expect, test } from 'bun:test';
import type { AgentSession, AgentTurn, Message, Project } from '@waku/client';
import { activitiesForBlock, reduceRuntimeEvent } from '@waku/client/event-reducer';

import { TranscriptMarkdownCache } from '../md/transcript-cache';
import { sessionListSummary } from './mobile-runtime';
import {
  agentPresetAvailable,
  buildTranscriptPipeline,
  buildTranscriptRows,
  contextPercent,
  displaySessionTitle,
  expandTranscriptRows,
  filterArchivedSessions,
  findActivityBlock,
  foldGroups,
  groupSessions,
  messageSearchRows,
  paginateSections,
  relativeSessionTime,
  sessionDateGroup,
  sessionHasStarted,
  sessionStatusBadge,
  stabilizeSessionSummaries,
  stabilizeTranscriptRows,
  turnOptionsForSession,
} from './session-presentation';

describe('task list projection', () => {
  const clock = { nowSeconds: () => 1_000, nowMillis: () => 1_000_000, randomUUID: () => 'id' };
  const stream = (session: AgentSession, delta: string) =>
    reduceRuntimeEvent(session, {
      sessionId: session.id,
      runtimeId: 'runtime',
      epoch: 'epoch',
      sequence: 1,
      event: { kind: 'textDelta', payload: delta },
    }, clock).session;

  test('a streamed delta does not change the summary the task list draws', () => {
    const running = session({ status: 'working', turns: [runningTurn()] });
    const before = sessionListSummary(running);
    const after = sessionListSummary(stream(running, 'more text'));
    // The regression: the reducer bumps updated_at and runtime_event_cursor on
    // every event, so projecting the whole session invalidated every row at the
    // stream commit rate.
    expect(after).toEqual(before);
  });

  test('a settled turn still promotes the task through the summary', () => {
    const running = session({ status: 'working', turns: [runningTurn()] });
    const settled = reduceRuntimeEvent(running, {
      sessionId: running.id,
      runtimeId: 'runtime',
      epoch: 'epoch',
      sequence: 2,
      event: { kind: 'turnFinished', payload: { success: true, summary: null } },
    }, clock).session;
    const summary = sessionListSummary(settled);
    expect(summary.last_reply_at).toBe(1_000);
    expect(summary.status).toBe('idle');
    expect(sessionHasStarted(summary)).toBe(true);
  });

  test('stabilization keeps the row identity of every untouched task', () => {
    const before = [sessionListSummary(session({ id: 'a' })), sessionListSummary(session({ id: 'b' }))];
    const after = [sessionListSummary(session({ id: 'a' })), sessionListSummary(session({ id: 'b', title: 'Renamed' }))];
    const stable = stabilizeSessionSummaries(before, after);
    expect(stable[0]).toBe(before[0]);
    expect(stable[1]).not.toBe(before[1]);
    expect(stable[1]!.title).toBe('Renamed');
    // Re-running over unchanged input must be a no-op, or the list re-renders
    // on every commit regardless.
    expect(stabilizeSessionSummaries(stable, stabilizeSessionSummaries(stable, after))).toBe(stable);
  });
});

function runningTurn() {
  return {
    id: 'turn',
    turn_count: 1,
    status: 'running' as const,
    provider_turn_started: true,
    provider_resume_at: null,
    started_at: 1,
    completed_at: null,
    checkpoint: null,
  };
}
describe('mobile session presentation', () => {
  test('uses provider title for untouched tasks', () => {
    expect(displaySessionTitle(session({ title: 'New task', auto_title: 'Fix login' }))).toBe(
      'Fix login',
    );
  });

  test('groups started sessions by the desktop calendar periods, newest first', () => {
    const now = new Date(2026, 7, 31, 12);
    const projects: Project[] = [{ id: 'project', name: 'Waku', path: '/waku', created_at: 1 }];
    const current = session({ id: 'new', last_reply_at: epoch(2026, 7, 31, 11) });
    const yesterday = session({ id: 'old', last_reply_at: epoch(2026, 7, 30, 20) });
    const earlier = session({ id: 'earlier', last_reply_at: epoch(2026, 7, 20, 20) });
    const empty = session({ id: 'empty', last_reply_at: null, messages: [], turns: [] });
    expect(groupSessions(projects, [earlier, yesterday, empty, current], now).map((group) => ({
      id: group.id,
      sessions: group.data.map((item) => item.session.id),
    }))).toEqual([
      { id: 'today', sessions: ['new'] },
      { id: 'yesterday', sessions: ['old'] },
      { id: 'month', sessions: ['earlier'] },
    ]);
  });

  test('orders updated groups and members oldest first when requested', () => {
    const now = new Date(2026, 7, 31, 12);
    const current = session({ id: 'new', last_reply_at: epoch(2026, 7, 31, 11) });
    const newerToday = session({ id: 'newer', last_reply_at: epoch(2026, 7, 31, 12) });
    const earlier = session({ id: 'earlier', last_reply_at: epoch(2026, 7, 20, 20) });
    expect(groupSessions(
      [],
      [earlier, current, newerToday],
      now,
      { ordering: 'oldest' },
    ).map((group) => ({
      id: group.id,
      sessions: group.data.map((item) => item.session.id),
    }))).toEqual([
      { id: 'month', sessions: ['earlier'] },
      { id: 'today', sessions: ['new', 'newer'] },
    ]);
  });

  test('groups by project in first-occurrence order, honoring the ordering', () => {
    const now = new Date(2026, 7, 31, 12);
    const projects: Project[] = [
      { id: 'project', name: 'Waku', path: '/waku', created_at: 1 },
      { id: 'other', name: 'T3', path: '/t3', created_at: 1 },
    ];
    const newest = session({ id: 'a', project_id: 'project', last_reply_at: epoch(2026, 7, 31, 12) });
    const second = session({ id: 'b', project_id: 'other', last_reply_at: epoch(2026, 7, 30, 12) });
    const older = session({ id: 'c', project_id: 'project', last_reply_at: epoch(2026, 7, 20, 12) });
    const orphan = session({ id: 'd', project_id: 'ghost', last_reply_at: epoch(2026, 7, 1, 12) });
    const shape = (groups: ReturnType<typeof groupSessions>) => groups.map((group) => ({
      title: group.title,
      sessions: group.data.map((item) => item.session.id),
    }));
    expect(shape(groupSessions(projects, [older, second, orphan, newest], now, {
      grouping: 'project',
    }))).toEqual([
      { title: 'Waku', sessions: ['a', 'c'] },
      { title: 'T3', sessions: ['b'] },
      { title: 'Unknown project', sessions: ['d'] },
    ]);
    expect(shape(groupSessions(projects, [older, second, orphan, newest], now, {
      grouping: 'project',
      ordering: 'oldest',
    }))).toEqual([
      { title: 'Unknown project', sessions: ['d'] },
      { title: 'Waku', sessions: ['c', 'a'] },
      { title: 'T3', sessions: ['b'] },
    ]);
  });

  test('leads with a pinned section and drops pinned tasks from the groups below', () => {
    const now = new Date(2026, 7, 31, 12);
    const projects: Project[] = [{ id: 'project', name: 'Waku', path: '/waku', created_at: 1 }];
    const a = session({ id: 'a', last_reply_at: epoch(2026, 7, 31, 11) });
    const b = session({ id: 'b', last_reply_at: epoch(2026, 7, 31, 10) });
    const c = session({ id: 'c', last_reply_at: epoch(2026, 7, 20, 10) });
    // Pin order, not recency, decides the pinned rows; `a` is newer but pinned
    // second, so it must still come after `b`.
    const groups = groupSessions(projects, [a, b, c], now, { pinned: ['b', 'a'] });
    expect(groups.map((group) => ({
      id: group.id,
      sessions: group.data.map((item) => item.session.id),
    }))).toEqual([
      { id: '__pinned__', sessions: ['b', 'a'] },
      { id: 'month', sessions: ['c'] },
    ]);
    // A pin that resolves to no live task is simply absent.
    expect(groupSessions(projects, [a], now, { pinned: ['ghost'] }).map((group) => group.id))
      .toEqual(['today']);
  });

  test('names the settled state a task row should show, and none while running', () => {
    expect(sessionStatusBadge({ status: 'waiting' })).toEqual({ label: 'Input', tone: 'warning' });
    expect(sessionStatusBadge({ status: 'failed' })).toEqual({ label: 'Failed', tone: 'danger' });
    expect(sessionStatusBadge({ status: 'idle' })).toEqual({ label: 'Done', tone: 'ghost' });
    // Connecting/working are covered by the row's spinner, not a label.
    expect(sessionStatusBadge({ status: 'working' })).toBeNull();
    expect(sessionStatusBadge({ status: 'connecting' })).toBeNull();
  });

  test('hides archived tasks unless the toggle asks for them', () => {
    const sessions = [
      session({ id: 'a' }),
      session({ id: 'b', archived_at: 1_000 }),
    ];
    expect(filterArchivedSessions(sessions, false).map((item) => item.id)).toEqual(['a']);
    // Asking for archived tasks returns the list untouched.
    expect(filterArchivedSessions(sessions, true)).toBe(sessions);

    // The drawer re-renders on every stream tick, so a list with nothing
    // archived must not produce a new array and invalidate every row.
    const active = [session({ id: 'a' }), session({ id: 'c' })];
    expect(filterArchivedSessions(active, false)).toBe(active);
  });

  test('folds a group to an empty section that keeps its header', () => {
    const sections = [
      { id: 'today', title: 'Today', data: [session({ id: 'a' })] as never[] },
      { id: 'yesterday', title: 'Yesterday', data: [session({ id: 'b' })] as never[] },
    ];
    expect(foldGroups(sections, new Set())).toBe(sections);

    const folded = foldGroups(sections, new Set(['today']));
    expect(folded[0]).toMatchObject({ id: 'today', title: 'Today', data: [] });
    expect(folded[1]!.data).toHaveLength(1);
  });

  test('pages a long group and leaves a short one untouched', () => {
    const long = {
      id: 'project',
      title: 'waku',
      data: Array.from({ length: 9 }, (_, i) => ({ session: { id: `s${i}` } })),
    } as never;
    const short = {
      id: 'today',
      title: 'Today',
      data: [{ session: { id: 'a' } }],
    } as never;
    const sections = [long, short];

    const { sections: paged, hidden } = paginateSections(sections, new Set(), 6);
    expect(paged[0]!.data).toHaveLength(6);
    expect(hidden.get('project')).toBe(3);
    // The short section keeps its identity so its rows stay memoized.
    expect(paged[1]).toBe(short);
  });

  test('an expanded group shows every row and hides nothing', () => {
    const section = {
      id: 'project',
      title: 'waku',
      data: Array.from({ length: 9 }, (_, i) => ({ session: { id: `s${i}` } })),
    } as never;
    const { sections, hidden } = paginateSections([section], new Set(['project']), 6);
    expect(sections[0]!.data).toHaveLength(9);
    expect(hidden.size).toBe(0);
  });

  test('formats compact recency labels', () => {    expect(relativeSessionTime(1_000, 1_030_000)).toBe('Now');
    expect(relativeSessionTime(1_000, 1_300_000)).toBe('5m');
    const now = new Date(2026, 7, 12, 12);
    expect(sessionDateGroup(epoch(2026, 7, 12, 12), now)).toBe('today');
    expect(sessionDateGroup(epoch(2026, 7, 11, 12), now)).toBe('yesterday');
    expect(sessionDateGroup(epoch(2026, 7, 10, 12), now)).toBe('week');
    expect(sessionDateGroup(epoch(2026, 7, 1, 12), now)).toBe('month');
    expect(sessionDateGroup(epoch(2026, 0, 1, 12), now)).toBe('year');
    expect(sessionDateGroup(epoch(2025, 11, 31, 12), now)).toBe('more');
  });

  test('reports context usage as a bounded percentage', () => {
    expect(contextPercent(session({}))).toBeNull();
    expect(contextPercent(session({ context_usage: { tokens: 50_000, window: 200_000 } }))).toBe(25);
    expect(contextPercent(session({ context_usage: { tokens: 500, window: null } }))).toBeNull();
  });

  test('keeps provider ordering inline when the turn is unknown', () => {
    const current = session({
      messages: [
        { id: 'user', turn_id: 'turn', role: 'user', content: 'go', created_at: 1, streaming: false },
        { id: 'agent', turn_id: 'turn', role: 'assistant', content: 'done', created_at: 2, streaming: false },
      ],
      transcript_blocks: [activityBlock(1, 'turn')],
    });
    expect(buildTranscriptRows(current).map((row) => row.kind)).toEqual([
      'user',
      'activities',
      'md',
    ]);
  });

  test('folds a settled turn behind “Worked for X” like the desktop', () => {
    const current = session({
      turns: [turn({ id: 'turn', status: 'completed', started_at: 10, completed_at: 130 })],
      messages: [
        { id: 'user', turn_id: 'turn', role: 'user', content: 'go', created_at: 1, streaming: false },
        { id: 'agent', turn_id: 'turn', role: 'assistant', content: 'done', created_at: 2, streaming: false },
      ],
      transcript_blocks: [activityBlock(1, 'turn')],
    });
    const collapsed = buildTranscriptRows(current);
    expect(collapsed.map((row) => row.kind)).toEqual(['user', 'fold', 'md']);
    const fold = collapsed[1]!;
    if (fold.kind !== 'fold') throw new Error('expected fold');
    expect(fold.label).toBe('Worked for 2 minutes');
    const answer = collapsed[2]!;
    if (answer.kind !== 'md') throw new Error('expected md');
    expect(answer.footerTimestamp).toBe(130);

    const expanded = buildTranscriptRows(current, new Set(['turn']));
    expect(expanded.map((row) => row.kind)).toEqual(['user', 'fold', 'activities', 'md']);
  });

  test('folds thoughts too — a thought-only turn shows just the answer', () => {
    const current = session({
      turns: [turn({ id: 'turn', status: 'completed', started_at: 10, completed_at: 15 })],
      messages: [
        { id: 'user', turn_id: 'turn', role: 'user', content: 'hi', created_at: 1, streaming: false },
        { id: 'agent', turn_id: 'turn', role: 'assistant', content: 'Hi!', created_at: 2, streaming: false },
      ],
      transcript_blocks: [{
        after_message: 1,
        turn_id: 'turn',
        content: {
          kind: 'activities',
          data: [{
            id: 'thought',
            source_id: null,
            kind: 'reasoning',
            title: 'Reasoning',
            detail: null,
            failed: false,
            complete: true,
            reasoning: { content: 'Preparing greeting', started_at_ms: 0, finished_at_ms: 900 },
          }],
        },
      }],
    });
    expect(buildTranscriptRows(current).map((row) => row.kind)).toEqual([
      'user',
      'fold',
      'md',
    ]);
  });

  test('hides intermediate text parts — only the terminal answer stays visible', () => {
    const current = session({
      turns: [turn({ id: 'turn', status: 'completed', started_at: 10, completed_at: 40 })],
      messages: [
        { id: 'user', turn_id: 'turn', role: 'user', content: 'go', created_at: 1, streaming: false },
        { id: 'part1', turn_id: 'turn', role: 'assistant', content: 'First part.', created_at: 2, streaming: false },
        { id: 'part2', turn_id: 'turn', role: 'assistant', content: 'Final answer.', created_at: 3, streaming: false },
      ],
      transcript_blocks: [activityBlock(2, 'turn')],
    });
    const collapsed = buildTranscriptRows(current);
    expect(collapsed.map((row) => (
      row.kind === 'md' ? `md:${row.messageId}` : row.kind
    ))).toEqual(['user', 'fold', 'md:part2']);
    const answer = collapsed[2]!;
    if (answer.kind !== 'md') throw new Error('expected md');
    expect(answer.footerTimestamp).toBe(40);

    const expanded = buildTranscriptRows(current, new Set(['turn']));
    expect(expanded.map((row) => (
      row.kind === 'md' ? `md:${row.messageId}` : row.kind
    ))).toEqual(['user', 'fold', 'md:part1', 'activities', 'md:part2']);
  });

  test('offers copy text only on the last block of an assistant message', () => {
    const current = session({
      turns: [turn({ id: 'turn', status: 'completed', started_at: 10, completed_at: 40 })],
      messages: [
        { id: 'user', turn_id: 'turn', role: 'user', content: 'go', created_at: 1, streaming: false },
        {
          id: 'agent',
          turn_id: 'turn',
          role: 'assistant',
          content: 'First paragraph.\n\nSecond paragraph.',
          created_at: 2,
          streaming: false,
        },
      ],
      transcript_blocks: [],
    });
    const blocks = buildTranscriptRows(current).filter((row) => row.kind === 'md');
    // One row per markdown block, but a single copy target: the whole answer,
    // carried by the last block so the control copies the message, not the
    // paragraph it happens to be rendered from.
    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.slice(0, -1).every((row) => row.kind === 'md' && row.copyText === null)).toBe(true);
    expect(blocks.at(-1)).toMatchObject({
      copyText: 'First paragraph.\n\nSecond paragraph.',
    });
  });

  test('keeps a running turn’s work expanded and live', () => {
    const current = session({
      status: 'working',
      turns: [turn({ id: 'turn', status: 'running', started_at: 10, completed_at: null })],
      messages: [
        { id: 'user', turn_id: 'turn', role: 'user', content: 'go', created_at: 1, streaming: false },
      ],
      transcript_blocks: [activityBlock(1, 'turn')],
    });
    const rows = buildTranscriptRows(current);
    expect(rows.map((row) => row.kind)).toEqual(['user', 'activities']);
    const activities = rows[1]!;
    if (activities.kind !== 'activities') throw new Error('expected activities');
    expect(activities.live).toBe(true);
  });

  test('emits a changed-files card after a checkpointed turn', () => {
    const current = session({
      turns: [turn({
        id: 'turn',
        status: 'completed',
        started_at: 10,
        completed_at: 70,
        checkpoint: {
          turn_count: 1,
          git_ref: 'refs/waku/x',
          status: 'ready',
          files: [{ path: 'src/a.ts', additions: 3, deletions: 1 }],
          additions: 3,
          deletions: 1,
          created_at: 70,
        },
      })],
      messages: [
        { id: 'user', turn_id: 'turn', role: 'user', content: 'go', created_at: 1, streaming: false },
        { id: 'agent', turn_id: 'turn', role: 'assistant', content: 'done', created_at: 2, streaming: false },
      ],
      transcript_blocks: [],
    });
    expect(buildTranscriptRows(current).map((row) => row.kind)).toEqual([
      'user',
      'md',
      'changed',
    ]);
  });

  test('splits assistant messages into block rows with the spacing tokens', () => {
    const current = session({
      status: 'working',
      turns: [turn({ id: 'turn', status: 'running', started_at: 10, completed_at: null })],
      messages: [
        { id: 'user', turn_id: 'turn', role: 'user', content: 'go', created_at: 1, streaming: false },
        {
          id: 'agent',
          turn_id: 'turn',
          role: 'assistant',
          content: '# Title\n\nFirst paragraph.\n\nSecond paragraph grows',
          created_at: 2,
          streaming: true,
        },
      ],
    });
    const rows = buildTranscriptRows(current);
    expect(rows.map((row) => row.kind)).toEqual(['user', 'md', 'md', 'md']);
    expect(rows.map((row) => row.kind === 'md' ? row.live : null)).toEqual([
      null, false, false, true,
    ]);
    expect(rows.map((row) => row.topGap)).toEqual([26, 16, 12, 12]);
    expect(rows[1]!.key).toBe('md:agent.0');
    expect(rows[3]!.key).toBe('md:agent.2');
  });

  test('a windowed tail lays out exactly like the full transcript', () => {
    const current = session({
      turns: [
        turn({ id: 't1', status: 'completed', started_at: 10, completed_at: 20 }),
        turn({ id: 't2', status: 'completed', started_at: 30, completed_at: 40 }),
      ],
      messages: [
        { id: 'u1', turn_id: 't1', role: 'user', content: 'one', created_at: 1, streaming: false },
        { id: 'a1', turn_id: 't1', role: 'assistant', content: 'First.\n\nSecond.', created_at: 2, streaming: false },
        { id: 'u2', turn_id: 't2', role: 'user', content: 'two', created_at: 3, streaming: false },
        { id: 'a2', turn_id: 't2', role: 'assistant', content: 'Third.', created_at: 4, streaming: false },
      ],
      transcript_blocks: [activityBlock(1, 't1'), activityBlock(3, 't2')],
    });
    const md = new TranscriptMarkdownCache();
    const pipeline = buildTranscriptPipeline(current);
    expect(pipeline.map((row) => row.kind)).toEqual([
      'message', 'fold', 'message', 'message', 'fold', 'message',
    ]);
    const full = expandTranscriptRows(pipeline, md, 0);
    const tail = expandTranscriptRows(pipeline, md, 3);
    expect(tail.map((row) => row.key)).toEqual(full.slice(-3).map((row) => row.key));
    expect(tail.map((row) => row.topGap)).toEqual(full.slice(-3).map((row) => row.topGap));
    // The first mounted row measures its gap against the unmounted row
    // before it — here the fold above the first answer.
    const fromAnswer = expandTranscriptRows(pipeline, md, 2);
    expect(fromAnswer.map((row) => row.key).slice(0, 2)).toEqual(['md:a1.0', 'md:a1.1']);
    expect(fromAnswer.map((row) => row.topGap).slice(0, 2)).toEqual([12, 12]);
  });

  test('stabilizes row identity across commits so memoized rows bail out', () => {
    const md = new TranscriptMarkdownCache();
    const before = buildTranscriptRows(session({
      status: 'working',
      turns: [turn({ id: 'turn', status: 'running', started_at: 10, completed_at: null })],
      messages: [
        { id: 'user', turn_id: 'turn', role: 'user', content: 'go', created_at: 1, streaming: false },
        { id: 'agent', turn_id: 'turn', role: 'assistant', content: 'One.\n\nTwo', created_at: 2, streaming: true },
      ],
    }), new Set(), md);
    const after = buildTranscriptRows(session({
      status: 'working',
      turns: [turn({ id: 'turn', status: 'running', started_at: 10, completed_at: null })],
      messages: [
        before[0]!.kind === 'user' ? before[0].message : (() => { throw new Error('user'); })(),
        { id: 'agent', turn_id: 'turn', role: 'assistant', content: 'One.\n\nTwo more', created_at: 2, streaming: true },
      ],
    }), new Set(), md);
    const stable = stabilizeTranscriptRows(before, after);
    expect(stable[0]).toBe(before[0]!);
    expect(stable[1]).toBe(before[1]!);
    expect(stable[2]).not.toBe(before[2]!);
    expect(stable[2]!.kind === 'md' && stable[2].source).toBe('Two more');
    expect(stabilizeTranscriptRows(stable, stabilizeTranscriptRows(stable, after))).toBe(stable);
  });
});

describe('activity sheet locator', () => {
  test('trusts the index hint only while the anchor still matches', () => {
    const first = activityBlock(0, 'turn');
    const second = activityBlock(1, 'turn');
    const current = session({ transcript_blocks: [first, second] });
    expect(findActivityBlock(current, { blockIndex: 1, turnId: 'turn', afterMessage: 1 })).toBe(second);
    // A rewind dropped a block in front: the hint is stale, the anchor is not.
    expect(findActivityBlock(current, { blockIndex: 1, turnId: 'turn', afterMessage: 0 })).toBe(first);
    expect(findActivityBlock(current, { blockIndex: 0, turnId: 'other', afterMessage: 0 })).toBeNull();
  });

  test('survives the per-commit clone by resolving against the new session', () => {
    const before = session({ transcript_blocks: [activityBlock(0, 'turn')] });
    const after = JSON.parse(JSON.stringify(before)) as AgentSession;
    activitiesForBlock(after.transcript_blocks[0]!)[0]!.output = 'streamed';
    const target = { blockIndex: 0, turnId: 'turn', afterMessage: 0 };
    expect(activitiesForBlock(findActivityBlock(before, target)!)[0]!.output).toBeUndefined();
    expect(activitiesForBlock(findActivityBlock(after, target)!)[0]!.output).toBe('streamed');
  });
});

function activityBlock(afterMessage: number, turnId: string): AgentSession['transcript_blocks'][number] {
  return {
    after_message: afterMessage,
    turn_id: turnId,
    content: {
      kind: 'activities',
      data: [{
        id: 'tool',
        source_id: null,
        kind: 'command',
        title: 'Run tests',
        detail: null,
        failed: false,
        complete: true,
      }],
    },
  };
}

function turn(overrides: Partial<AgentTurn> & Pick<AgentTurn, 'id' | 'status'>): AgentTurn {
  return {
    turn_count: 1,
    provider_turn_started: true,
    provider_resume_at: null,
    started_at: 1,
    completed_at: 2,
    checkpoint: null,
    ...overrides,
  };
}

function session(overrides: Partial<AgentSession>): AgentSession {
  return {
    id: 'session',
    title: 'Task',
    project_id: 'project',
    provider: 'codex',
    runtime_mode: 'autoAcceptEdits',
    status: 'idle',
    created_at: 1,
    updated_at: 1,
    last_reply_at: 1,
    provider_cursor: null,
    messages: [{
      id: 'message',
      turn_id: null,
      role: 'user',
      content: 'hello',
      created_at: 1,
      streaming: false,
    }],
    transcript_blocks: [],
    turns: [],
    ...overrides,
  };
}

describe('turn options for rewind and fork', () => {
  function message(overrides: Partial<Message> & Pick<Message, 'id' | 'turn_id'>) {
    return {
      role: 'user' as const,
      content: '',
      created_at: 1,
      streaming: false,
      ...overrides,
    };
  }

  test('lists completed turns oldest first, labelled by their prompt', () => {
    const options = turnOptionsForSession(session({
      turns: [
        turn({ id: 'turn-2', status: 'completed', turn_count: 2 }),
        turn({ id: 'turn-1', status: 'completed', turn_count: 1 }),
      ],
      messages: [
        message({ id: 'm1', turn_id: 'turn-1', content: 'first question' }),
        message({ id: 'm2', turn_id: 'turn-2', content: 'second question' }),
      ],
    }));

    expect(options.map((option) => option.turnCount)).toEqual([1, 2]);
    expect(options[0]?.label).toBe('Turn 1 · first question');
  });

  test('leaves out a turn the provider has not answered yet', () => {
    const options = turnOptionsForSession(session({
      turns: [
        turn({ id: 'turn-1', status: 'completed', turn_count: 1 }),
        turn({ id: 'turn-2', status: 'running', turn_count: 2, completed_at: null }),
      ],
      messages: [message({ id: 'm1', turn_id: 'turn-1', content: 'first' })],
    }));

    expect(options.map((option) => option.turnCount)).toEqual([1]);
  });

  test('truncates a long prompt and falls back to the turn number', () => {
    const long = 'a'.repeat(80);
    const options = turnOptionsForSession(session({
      turns: [
        turn({ id: 'turn-1', status: 'completed', turn_count: 1 }),
        turn({ id: 'turn-2', status: 'completed', turn_count: 2 }),
      ],
      messages: [
        message({ id: 'm1', turn_id: 'turn-1', content: long }),
        message({ id: 'm2', turn_id: 'turn-2' }),
      ],
    }));

    expect(options[0]?.label).toBe(`Turn 1 · ${'a'.repeat(60)}…`);
    expect(options[1]?.label).toBe('Turn 2');
  });

  test('has nothing to offer before the first turn settles', () => {
    expect(turnOptionsForSession(null)).toEqual([]);
    expect(turnOptionsForSession(session({ turns: [] }))).toEqual([]);
  });
});

describe('message search rows', () => {
  const sessions = [session({ id: 'known' }), session({ id: 'other' })];

  test('resolves matches against known sessions in daemon order', () => {
    const rows = messageSearchRows([
      { session_id: 'other', source: 'assistant', snippet: 'second hit' },
      { session_id: 'known', source: 'user', snippet: 'first hit' },
    ], sessions);
    expect(rows.map((row) => [row.session.id, row.snippet, row.role])).toEqual([
      ['other', 'second hit', 'assistant'],
      ['known', 'first hit', 'user'],
    ]);
  });

  test('drops matches for sessions that are no longer openable', () => {
    expect(messageSearchRows([{ session_id: 'gone', source: 'user', snippet: 'x' }], sessions))
      .toEqual([]);
  });

  test('caps the list so a broad query cannot flood the drawer', () => {
    const matches = Array.from({ length: 20 }, (_unused, index) => ({
      session_id: 'known',
      source: 'user' as const,
      snippet: `hit ${index}`,
    }));
    expect(messageSearchRows(matches, sessions, 5)).toHaveLength(5);
  });
});

describe('agent preset availability', () => {
  // `sessionHasStarted` also reads `last_reply_at`, so an unstarted fixture has
  // to clear all four signals rather than only the transcript.
  const unstarted = { messages: [], turns: [], provider_cursor: null, last_reply_at: null };

  test('offers presets on a composable provider before the session starts', () => {
    for (const provider of ['codex', 'deepSeek', 'openCode', 'openCode2'] as const) {
      expect(agentPresetAvailable(session({ provider, ...unstarted }), false)).toBe(true);
    }
  });

  test('hides presets for providers that compose none', () => {
    for (const provider of ['claude', 'amp', 'cursor'] as const) {
      expect(agentPresetAvailable(session({ provider, ...unstarted }), false)).toBe(false);
    }
  });

  test('a started session keeps presets only where the provider swaps live', () => {
    // The default fixture is started (it carries a message).
    expect(agentPresetAvailable(session({ provider: 'codex' }), false)).toBe(false);
    expect(agentPresetAvailable(session({ provider: 'deepSeek' }), false)).toBe(false);
    expect(agentPresetAvailable(session({ provider: 'openCode' }), false)).toBe(true);
    expect(agentPresetAvailable(session({ provider: 'openCode2' }), false)).toBe(true);
  });

  test('a busy turn never re-roles the agent', () => {
    expect(agentPresetAvailable(session({ provider: 'openCode', ...unstarted }), true)).toBe(false);
  });
});

function epoch(year: number, month: number, day: number, hour: number) {
  return Math.floor(new Date(year, month, day, hour).getTime() / 1_000);
}
