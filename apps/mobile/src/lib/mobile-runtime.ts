import type {
  AgentSession,
  MessageAttachment,
  Project,
  ProviderKind,
  RuntimeMode,
  SequencedEvent,
} from '@waku/client';
import { reduceRuntimeEvent } from '@waku/client/event-reducer';

export interface MobileRuntimeClock {
  nowSeconds: () => number;
  randomUUID: () => string;
}

export interface NewSessionOptions {
  model?: string | null;
  reasoningEffort?: string | null;
  serviceTier?: string | null;
  contextWindow?: string | null;
  agentPreset?: string | null;
  runtimeMode?: RuntimeMode;
  /** Base branch for an isolated worktree; null means the project default. */
  baseBranch?: string | null;
}

export function beginTurn(
  session: AgentSession,
  prompt: string,
  clock: MobileRuntimeClock,
  attachments: MessageAttachment[] = [],
  providerPromptOverride?: string,
): AgentSession {
  const now = clock.nowSeconds();
  const turnId = clock.randomUUID();
  const visiblePrompt = prompt.trim();
  const providerPrompt = providerPromptOverride === undefined
    ? providerPromptForSubmission(visiblePrompt, attachments)
    : providerPromptOverride.trim();
  return {
    ...session,
    auto_title:
      session.messages.length === 0 && session.title === 'New task' && !session.auto_title
        ? promptTitle(visiblePrompt || attachments[0]?.name || '')
        : session.auto_title,
    status: 'connecting',
    updated_at: now,
    last_reply_at: now,
    messages: [
      ...session.messages,
      {
        id: clock.randomUUID(),
        turn_id: turnId,
        role: 'user',
        content: providerPrompt,
        display_content:
          attachments.length || providerPrompt !== visiblePrompt ? visiblePrompt : null,
        attachments,
        created_at: now,
        streaming: false,
      },
    ],
    turns: [
      ...session.turns,
      {
        id: turnId,
        turn_count: session.turns.length + 1,
        status: 'running',
        provider_turn_started: false,
        provider_resume_at: null,
        started_at: now,
        completed_at: null,
        checkpoint: null,
      },
    ],
  };
}

export function createSession(
  projectId: string,
  provider: ProviderKind,
  isolated: boolean,
  clock: MobileRuntimeClock,
  options: NewSessionOptions = {},
): AgentSession {
  const now = clock.nowSeconds();
  return {
    id: clock.randomUUID(),
    title: 'New task',
    auto_title: null,
    project_id: projectId,
    workspace: isolated
      ? { kind: 'newWorktree', baseBranch: options.baseBranch ?? null }
      : { kind: 'local' },
    provider,
    model: options.model ?? null,
    runtime_mode: options.runtimeMode ?? 'fullAccess',
    reasoning_effort: options.reasoningEffort ?? null,
    service_tier: options.serviceTier ?? null,
    context_window: options.contextWindow ?? null,
    agent_preset: options.agentPreset ?? null,
    status: 'idle',
    created_at: now,
    updated_at: now,
    last_reply_at: null,
    provider_cursor: null,
    available_commands: [],
    context_usage: null,
    provider_session_id: null,
    messages: [],
    transcript_blocks: [],
    turns: [],
    queued_messages: [],
  };
}

/** Mirrors the web client's queueSubmission: a prompt sent while a turn is
 * live becomes a persisted QueuedMessage that drains after the turn settles. */
export function queueSubmission(
  session: AgentSession,
  prompt: string,
  clock: MobileRuntimeClock,
  attachments: MessageAttachment[] = [],
  providerPromptOverride?: string,
): AgentSession {
  const now = clock.nowSeconds();
  const visiblePrompt = prompt.trim();
  const providerPrompt = providerPromptOverride === undefined
    ? providerPromptForSubmission(visiblePrompt, attachments)
    : providerPromptOverride.trim();
  return {
    ...session,
    updated_at: now,
    queued_messages: [
      ...(session.queued_messages ?? []),
      {
        id: clock.randomUUID(),
        content: providerPrompt,
        display_content:
          attachments.length || providerPrompt !== visiblePrompt ? visiblePrompt : null,
        attachments,
        created_at: now,
      },
    ],
  };
}

export function providerPromptForSubmission(
  prompt: string,
  attachments: MessageAttachment[],
): string {
  return [
    prompt.trim(),
    attachments.map((attachment) => `@${attachment.mention}`).join(' '),
  ].filter(Boolean).join(' ');
}

/** The ids beginTurn gave the running turn and the user message that opened
 * it. They are sent with the prompt so the daemon can publish the same
 * identity to every other client attached to the runtime. */
export function submittedTurnIdentity(
  session: AgentSession,
): { turnId: string | null; messageId: string | null } {
  const turn = session.turns.at(-1);
  if (!turn || turn.status !== 'running') return { turnId: null, messageId: null };
  const message = session.messages.find(
    (candidate) => candidate.turn_id === turn.id && candidate.role === 'user',
  );
  return { turnId: turn.id, messageId: message?.id ?? null };
}

export function sessionBusy(session: Pick<AgentSession, 'status'>): boolean {
  return (
    session.status === 'connecting'
    || session.status === 'working'
    || session.status === 'waiting'
    || session.status === 'background'
  );
}

/** A list projection has no turns, so its status is the best available
 * signal. Once hydrated, a settled latest turn wins over a lagging status. */
export function sessionIsRunning(
  session: Pick<AgentSession, 'status'> & Partial<Pick<AgentSession, 'turns'>>,
): boolean {
  if (session.status !== 'connecting' && session.status !== 'working') return false;
  const latestTurn = session.turns?.at(-1);
  return !latestTurn || latestTurn.status === 'running';
}

/** The fields the task list draws: identity, title, provider, model, status
 *  and recency. Everything else — messages, transcript blocks, turns,
 *  tool activity — is transcript detail the list never reads.
 *
 *  The sidebar keys its grouping, sorting and row identity off this shape,
 *  so a streamed delta must not reach it: the reducer bumps `updated_at` and
 *  `runtime_event_cursor` on every event, and passing those through would
 *  rebuild every row at the stream commit rate. `created_at` rides along
 *  because it is when a task was started, and `last_reply_at` because it is
 *  what promotes a task to the top of the list. */
export type SessionListSummary = Pick<
  AgentSession,
  | 'id'
  | 'title'
  | 'auto_title'
  | 'project_id'
  | 'provider'
  | 'model'
  | 'status'
  | 'created_at'
  | 'last_reply_at'
  | 'archived_at'
>;

/** Project a session to the fields the task list reads, dropping transcript
 *  detail so a stream commit cannot invalidate the list. */
export function sessionListSummary(session: AgentSession): SessionListSummary {
  return {
    id: session.id,
    title: session.title,
    auto_title: session.auto_title,
    project_id: session.project_id,
    provider: session.provider,
    model: session.model,
    status: session.status,
    created_at: session.created_at,
    last_reply_at: session.last_reply_at,
    archived_at: session.archived_at,
  };
}

/** Mirror of the desktop's `session_has_active_provider_turn`
 * (`src/app/runtime.rs`): a steer only lands once the provider has actually
 * opened the turn. Status alone is not enough — the daemon reports `working`
 * while it is still starting the provider process, and a steer sent in that
 * window is rejected, surfacing as an error banner instead of a queued
 * message. Submitting a prompt mid-turn is meant to queue. */
export function sessionHasActiveProviderTurn(
  session: Pick<AgentSession, 'status' | 'turns'>,
): boolean {
  if (!sessionBusy(session)) return false;
  const latestTurn = session.turns.at(-1);
  return latestTurn?.status === 'running' && latestTurn.provider_turn_started;
}

export interface SessionOptionChanges {
  model?: string | null;
  reasoningEffort?: string | null;
  serviceTier?: string | null;
  contextWindow?: string | null;
  agentPreset?: string | null;
  runtimeMode?: RuntimeMode;
}

export function applySessionOptions(
  session: AgentSession,
  changes: SessionOptionChanges,
  clock: MobileRuntimeClock,
): AgentSession {
  return {
    ...session,
    model: changes.model !== undefined ? changes.model : session.model,
    reasoning_effort:
      changes.reasoningEffort !== undefined ? changes.reasoningEffort : session.reasoning_effort,
    service_tier:
      changes.serviceTier !== undefined ? changes.serviceTier : session.service_tier,
    context_window:
      changes.contextWindow !== undefined ? changes.contextWindow : session.context_window,
    agent_preset:
      changes.agentPreset !== undefined ? changes.agentPreset : session.agent_preset,
    runtime_mode: changes.runtimeMode ?? session.runtime_mode,
    updated_at: clock.nowSeconds(),
  };
}

export function sessionCwd(session: AgentSession, project: Project): string {
  return session.workspace?.kind === 'worktree' ? session.workspace.path : project.path;
}

export function runtimeEventAlreadyApplied(session: AgentSession, event: SequencedEvent): boolean {
  const cursor = session.runtime_event_cursor;
  return Boolean(
    cursor && cursor.runtime_id === event.runtimeId && cursor.epoch === event.epoch &&
      cursor.sequence >= event.sequence,
  );
}

/** A replayed event at or below the cursor was already folded into this
 * session. Control requests are no exception: re-applying an already-seen
 * `permission`/`userInputRequested` cannot know whether it was answered here
 * or on another client, and resurrecting an answered one strands the panel.
 * A request that is still pending always arrives above the cursor. */
export function shouldApplyRuntimeEvent(
  session: AgentSession,
  event: SequencedEvent,
): boolean {
  return !runtimeEventAlreadyApplied(session, event);
}

/**
 * Event kinds that reach `reduceRuntimeEvent`'s `default: break`.
 *
 * The mobile app has no background-work, todo or plan-usage surface, so these
 * carry no projection this client draws. Cloning the session for them is pure
 * waste — measured at 4ms per clone on a 1.3MB transcript — and `backgroundWork`
 * arrives as often as the model streams (a 15s sample of one live turn: 2026
 * reasoningDelta + 90 backgroundWork events, 137/sec).
 */
const UNPROJECTED_RUNTIME_EVENTS = new Set(['todoUpdated', 'planUsageUpdated', 'backgroundWork']);

/** Whether folding this event can change the session the transcript draws. */
export function runtimeEventTouchesSession(event: SequencedEvent): boolean {
  return !UNPROJECTED_RUNTIME_EVENTS.has(event.event.kind);
}

/** Stream-rate kinds that wait for the commit tick instead of flushing the
 * buffer. `backgroundWork` belongs here because it is conversation meta with no
 * consumer in this app: flushing per event cost one deep clone and one
 * task-state cache write each, and it arrives at stream cadence. */
export function runtimeEventIsDeferrable(event: SequencedEvent): boolean {
  const kind = event.event.kind;
  return kind === 'textDelta'
    || kind === 'reasoningDelta'
    || kind === 'usageUpdated'
    || kind === 'backgroundWork';
}

/**
 * Move the replay cursor over an event the reducer ignores.
 *
 * The cursor is the client's "already folded in" marker, so it has to advance
 * even when nothing was projected — otherwise a reconnect replays the event.
 * Everything else is left by reference, so no row is invalidated and no cache
 * write happens.
 */
export function advanceRuntimeEventCursor(
  session: AgentSession,
  event: SequencedEvent,
): AgentSession {
  if (runtimeEventAlreadyApplied(session, event)) return session;
  return {
    ...session,
    runtime_event_cursor: {
      runtime_id: event.runtimeId,
      epoch: event.epoch,
      sequence: event.sequence,
    },
  };
}

/** Whether folding this event changes the transcript the user reads, as opposed
 *  to conversation meta this app does not project. Only these are worth
 *  replaying to catch a stored snapshot up to the live cursor. */
export function runtimeEventCarriesTranscript(event: SequencedEvent): boolean {
  return runtimeEventTouchesSession(event);
}

/**
 * Fold a replayed run of events into a stored snapshot.
 *
 * A reload reads the daemon's persisted snapshot, which is written on a
 * debounce and therefore trails a live turn. Applying the events the snapshot
 * has not seen is what keeps the transcript from moving backwards, so the
 * cursor is the authority and a missing or foreign cursor means "apply
 * everything, nothing can be proven already folded".
 *
 * Pure and I/O-free: the caller owns fetching the events and writing the
 * result back to the cache.
 */
export function foldRuntimeEvents(
  stored: AgentSession,
  events: readonly SequencedEvent[],
): AgentSession {
  const cursor = stored.runtime_event_cursor;
  const applicable = events.filter((event) => {
    if (!runtimeEventCarriesTranscript(event)) return false;
    if (!cursor) return true;
    return cursor.runtime_id !== event.runtimeId
      || cursor.epoch !== event.epoch
      || cursor.sequence < event.sequence;
  });
  if (!applicable.length) return stored;
  return applicable.reduce(
    (session, event) => reduceRuntimeEvent(session, event).session,
    stored,
  );
}

/**
 * Whether `candidate` holds a transcript at least as new as `current`.
 *
 * Cursors are only comparable within one runtime epoch: a different runtime id
 * or epoch means the daemon restarted (or the runtime was replaced), and the
 * freshly read snapshot is the authority. An absent cursor on the candidate is
 * "nothing known yet", which is never newer than a known one.
 */
export function runtimeSnapshotIsAtLeastAsNew(
  candidate: AgentSession,
  current: AgentSession,
): boolean {
  const next = candidate.runtime_event_cursor;
  const previous = current.runtime_event_cursor;
  if (!previous) return true;
  if (!next) return false;
  if (next.runtime_id !== previous.runtime_id || next.epoch !== previous.epoch) return true;
  return next.sequence >= previous.sequence;
}

function promptTitle(prompt: string): string | null {
  let title = prompt.split(/\s+/u).filter(Boolean).slice(0, 7).join(' ');
  if (!title) return null;
  if ([...title].length > 54) title = `${[...title].slice(0, 53).join('')}…`;
  return title;
}
