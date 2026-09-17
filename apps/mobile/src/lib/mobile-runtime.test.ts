import { describe, expect, test } from 'bun:test';
import type { AgentSession, MessageAttachment, Project, SequencedEvent } from '@waku/client';

import {
  applySessionOptions,
  beginTurn,
  createSession,
  queueSubmission,
  runtimeEventAlreadyApplied,
  sessionBusy,
  sessionCwd,
  sessionHasActiveProviderTurn,
  sessionIsRunning,
  shouldApplyRuntimeEvent,
} from './mobile-runtime';

describe('mobile runtime projection', () => {
  test('begins a turn with a user message and prompt-derived title', () => {
    let id = 0;
    const started = beginTurn(session(), '  Fix the mobile reconnect race  ', {
      nowSeconds: () => 42,
      randomUUID: () => `id-${++id}`,
    });
    expect(started.status).toBe('connecting');
    expect(started.auto_title).toBe('Fix the mobile reconnect race');
    expect(started.messages.at(-1)).toMatchObject({
      id: 'id-2',
      turn_id: 'id-1',
      content: 'Fix the mobile reconnect race',
      created_at: 42,
    });
    expect(started.turns.at(-1)).toMatchObject({ id: 'id-1', status: 'running' });
  });

  test('keeps attachment presentation separate from the provider prompt', () => {
    let id = 0;
    const started = beginTurn(session(), 'Review this', {
      nowSeconds: () => 42,
      randomUUID: () => `id-${++id}`,
    }, [attachment]);
    expect(started.messages.at(-1)).toMatchObject({
      content: 'Review this @/daemon/file.png',
      display_content: 'Review this',
      attachments: [attachment],
    });
  });

  test('allows an attachment-only turn and uses its name for the title', () => {
    let id = 0;
    const started = beginTurn(session(), '', {
      nowSeconds: () => 42,
      randomUUID: () => `id-${++id}`,
    }, [attachment]);
    expect(started.auto_title).toBe('file.png');
    expect(started.messages.at(-1)).toMatchObject({
      content: '@/daemon/file.png',
      display_content: '',
      attachments: [attachment],
    });
  });

  test('uses a worktree path and rejects replayed runtime events', () => {
    const project: Project = { id: 'p', name: 'Waku', path: '/waku', created_at: 1 };
    const current = session({
      workspace: { kind: 'worktree', path: '/waku-worktree', branch: 'mobile' },
      runtime_event_cursor: { runtime_id: 'runtime', epoch: 'epoch', sequence: 4 },
    });
    const event = {
      sessionId: current.id,
      runtimeId: 'runtime',
      epoch: 'epoch',
      sequence: 4,
      event: { kind: 'textDelta', payload: 'duplicate' },
    } satisfies SequencedEvent;
    expect(sessionCwd(current, project)).toBe('/waku-worktree');
    expect(runtimeEventAlreadyApplied(current, event)).toBe(true);
  });

  test('rejects every replayed event at or below the cursor', () => {
    const current = session({
      status: 'waiting',
      runtime_event_cursor: { runtime_id: 'runtime', epoch: 'epoch', sequence: 4 },
    });
    const permission = {
      sessionId: current.id,
      runtimeId: 'runtime',
      epoch: 'epoch',
      sequence: 4,
      event: { kind: 'permission', payload: {} },
    } satisfies SequencedEvent;
    const text = {
      ...permission,
      event: { kind: 'textDelta', payload: 'duplicate' },
    } satisfies SequencedEvent;
    // A request still pending arrives above the cursor; anything at or below
    // it was already folded in and must not resurrect an answered panel.
    expect(shouldApplyRuntimeEvent(current, permission)).toBe(false);
    expect(shouldApplyRuntimeEvent(current, text)).toBe(false);
    expect(shouldApplyRuntimeEvent(current, { ...permission, sequence: 5 })).toBe(true);
  });

  test('creates a provider-neutral isolated draft', () => {
    const created = createSession('project', 'claude', true, {
      nowSeconds: () => 50,
      randomUUID: () => 'new-session',
    });
    expect(created).toMatchObject({
      id: 'new-session',
      project_id: 'project',
      provider: 'claude',
      workspace: { kind: 'newWorktree' },
      runtime_mode: 'fullAccess',
      status: 'idle',
    });
  });

  test('creates a draft carrying the chosen model traits and access mode', () => {
    const created = createSession('project', 'codex', false, {
      nowSeconds: () => 50,
      randomUUID: () => 'new-session',
    }, {
      model: 'gpt-5-codex',
      reasoningEffort: 'high',
      serviceTier: 'fast',
      contextWindow: '1m',
      runtimeMode: 'ask',
    });
    expect(created).toMatchObject({
      model: 'gpt-5-codex',
      reasoning_effort: 'high',
      service_tier: 'fast',
      context_window: '1m',
      runtime_mode: 'ask',
    });
  });

  test('queues a submission while a turn is live', () => {
    let id = 0;
    const busy = session({ status: 'working' });
    expect(sessionBusy(busy)).toBe(true);
    const queued = queueSubmission(busy, 'follow up', {
      nowSeconds: () => 99,
      randomUUID: () => `queued-${++id}`,
    });
    expect(queued.queued_messages).toEqual([{
      id: 'queued-1',
      content: 'follow up',
      display_content: null,
      attachments: [],
      created_at: 99,
    }]);
    expect(queued.updated_at).toBe(99);
    expect(busy.queued_messages ?? []).toEqual([]);
  });

  test('uses a hydrated turn to correct a lagging running status', () => {
    expect(sessionIsRunning(session({ status: 'working', turns: [] }))).toBe(true);
    expect(sessionIsRunning(session({
      status: 'working',
      turns: [{
        id: 'running',
        turn_count: 1,
        status: 'running',
        provider_turn_started: true,
        provider_resume_at: null,
        started_at: 10,
        completed_at: null,
        checkpoint: null,
      }],
    }))).toBe(true);
    expect(sessionIsRunning(session({
      status: 'working',
      turns: [{
        id: 'completed',
        turn_count: 1,
        status: 'completed',
        provider_turn_started: true,
        provider_resume_at: null,
        started_at: 10,
        completed_at: 20,
        checkpoint: null,
      }],
    }))).toBe(false);
  });

  test('a steer only counts once the provider opened the turn', () => {
    const running = (providerTurnStarted: boolean) => [{
      id: 'turn',
      turn_count: 1,
      status: 'running' as const,
      provider_turn_started: providerTurnStarted,
      provider_resume_at: null,
      started_at: 10,
      completed_at: null,
      checkpoint: null,
    }];

    // The daemon reports `working` while it is still starting the provider
    // process. A steer sent then has no turn to fold into, so it must queue.
    expect(sessionHasActiveProviderTurn(session({
      status: 'working',
      turns: running(false),
    }))).toBe(false);
    expect(sessionHasActiveProviderTurn(session({
      status: 'working',
      turns: running(true),
    }))).toBe(true);
    // Connecting is covered by the busy gate, not by the turn alone.
    expect(sessionHasActiveProviderTurn(session({
      status: 'connecting',
      turns: running(true),
    }))).toBe(true);
    // A settled turn is never steerable, whatever the status claims.
    expect(sessionHasActiveProviderTurn(session({
      status: 'idle',
      turns: running(true),
    }))).toBe(false);
    expect(sessionHasActiveProviderTurn(session({ status: 'working', turns: [] }))).toBe(false);
    expect(sessionHasActiveProviderTurn(session({
      status: 'working',
      turns: [{
        id: 'done',
        turn_count: 1,
        status: 'completed',
        provider_turn_started: true,
        provider_resume_at: null,
        started_at: 10,
        completed_at: 20,
        checkpoint: null,
      }],
    }))).toBe(false);
  });

  test('retains attachments in a queued submission', () => {
    const queued = queueSubmission(session({ status: 'working' }), '', {
      nowSeconds: () => 99,
      randomUUID: () => 'queued',
    }, [attachment]);
    expect(queued.queued_messages).toEqual([{
      id: 'queued',
      content: '@/daemon/file.png',
      display_content: '',
      attachments: [attachment],
      created_at: 99,
    }]);
  });

  test('applies option changes without clobbering unrelated fields', () => {
    const current = session({
      model: 'old',
      reasoning_effort: 'low',
      service_tier: 'default',
      context_window: '200k',
    });
    const next = applySessionOptions(current, { model: 'new-model' }, {
      nowSeconds: () => 77,
      randomUUID: () => 'unused',
    });
    expect(next.model).toBe('new-model');
    expect(next.reasoning_effort).toBe('low');
    expect(next.service_tier).toBe('default');
    expect(next.context_window).toBe('200k');
    expect(next.runtime_mode).toBe(current.runtime_mode);
    expect(next.updated_at).toBe(77);
    const cleared = applySessionOptions(current, {
      model: null,
      reasoningEffort: null,
      serviceTier: 'fast',
      contextWindow: '1m',
    }, {
      nowSeconds: () => 78,
      randomUUID: () => 'unused',
    });
    expect(cleared.model).toBeNull();
    expect(cleared.reasoning_effort).toBeNull();
    expect(cleared.service_tier).toBe('fast');
    expect(cleared.context_window).toBe('1m');
  });
});

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 'session',
    title: 'New task',
    auto_title: null,
    project_id: 'p',
    workspace: { kind: 'local' },
    provider: 'codex',
    runtime_mode: 'fullAccess',
    status: 'idle',
    created_at: 1,
    updated_at: 1,
    last_reply_at: null,
    provider_cursor: null,
    messages: [],
    transcript_blocks: [],
    turns: [],
    ...overrides,
  };
}

const attachment: MessageAttachment = {
  path: '/daemon/file.png',
  mention: '/daemon/file.png',
  name: 'file.png',
  is_dir: false,
  is_image: true,
  blob_reference: 'waku-attachment:file',
};
