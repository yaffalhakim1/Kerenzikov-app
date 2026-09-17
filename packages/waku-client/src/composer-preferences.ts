import type { AgentSession, ProviderKind } from './generated'

const STORAGE_KEY = 'waku.composer-preferences.v1'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export interface RememberedModelTraits {
  reasoningEffort: string | null
  serviceTier: string | null
  contextWindow: string | null
}

export interface ComposerPreferences {
  lastProvider: ProviderKind
  lastModel: string | null
  lastReasoningEffort: string | null
  lastServiceTier: string | null
  lastContextWindow: string | null
  modelTraits: Record<string, RememberedModelTraits>
}

const DEFAULT_PREFERENCES: ComposerPreferences = {
  lastProvider: 'codex',
  lastModel: null,
  lastReasoningEffort: null,
  lastServiceTier: null,
  lastContextWindow: null,
  modelTraits: {},
}

const PROVIDERS = new Set<ProviderKind>([
  'amp',
  'claude',
  'codex',
  'copilot',
  'cursor',
  'deepSeek',
  'fx',
  'openCode',
  'openCode2',
  'grok',
  'kimi',
  'ohMyPi',
  'pi',
])

export function browserComposerPreferenceStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readComposerPreferences(
  storage: StorageLike | null,
  daemonAddress: string,
): ComposerPreferences {
  if (!storage) return { ...DEFAULT_PREFERENCES }
  try {
    const entries = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>
    return parsePreferences(entries[daemonAddress])
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export function writeComposerPreferences(
  storage: StorageLike | null,
  daemonAddress: string,
  preferences: ComposerPreferences,
): void {
  if (!storage) return
  let entries: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}')
    if (isRecord(parsed)) entries = parsed
  } catch {
    // Replace malformed disposable app state with the current preference.
  }
  entries[daemonAddress] = preferences
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Composer choices still work when browser storage is unavailable.
  }
}

export function rememberComposerSession(
  preferences: ComposerPreferences,
  session: Pick<
    AgentSession,
    'provider' | 'model' | 'reasoning_effort' | 'service_tier' | 'context_window'
  >,
): ComposerPreferences {
  // A session can run without a model — the provider picks its own default —
  // but the provider itself is always worth remembering. Refusing to record a
  // model-less session left `lastProvider` frozen at whichever provider was
  // last used *with* an explicit model, so every later task reopened on that
  // one.
  //
  // `lastModel` belongs to `lastProvider`, so the pair has to stay coherent:
  // a model-less session for the *same* provider keeps the remembered model
  // (an empty draft must not erase an explicit pick), while a model-less
  // session for a *different* provider clears it, since a model id is only
  // meaningful against the provider's own catalogue.
  if (!session.model) {
    if (preferences.lastProvider === session.provider) return preferences
    return {
      ...preferences,
      lastProvider: session.provider,
      lastModel: null,
      lastReasoningEffort: session.reasoning_effort ?? null,
      lastServiceTier: session.service_tier ?? null,
      lastContextWindow: session.context_window ?? null,
    }
  }
  const reasoningEffort = session.reasoning_effort ?? null
  const serviceTier = session.service_tier ?? null
  const contextWindow = session.context_window ?? null
  return {
    ...preferences,
    lastProvider: session.provider,
    lastModel: session.model,
    lastReasoningEffort: reasoningEffort,
    lastServiceTier: serviceTier,
    lastContextWindow: contextWindow,
    modelTraits: {
      ...preferences.modelTraits,
      [modelKey(session.provider, session.model)]: {
        reasoningEffort,
        serviceTier,
        contextWindow,
      },
    },
  }
}

export function rememberedModelTraits(
  preferences: ComposerPreferences,
  provider: ProviderKind,
  model: string,
): RememberedModelTraits | undefined {
  return preferences.modelTraits[modelKey(provider, model)]
}

function parsePreferences(value: unknown): ComposerPreferences {
  if (!isRecord(value) || !PROVIDERS.has(value.lastProvider as ProviderKind)) {
    return { ...DEFAULT_PREFERENCES }
  }
  const modelTraits: Record<string, RememberedModelTraits> = {}
  if (isRecord(value.modelTraits)) {
    for (const [key, traits] of Object.entries(value.modelTraits)) {
      if (!isRecord(traits)) continue
      const reasoningEffort = nullableString(traits.reasoningEffort)
      const serviceTier = nullableString(traits.serviceTier)
      // Written before context windows existed: treat a missing one as unset
      // rather than dropping the whole entry.
      const contextWindow = nullableString(traits.contextWindow) ?? null
      if (reasoningEffort !== undefined && serviceTier !== undefined) {
        modelTraits[key] = { reasoningEffort, serviceTier, contextWindow }
      }
    }
  }
  return {
    lastProvider: value.lastProvider as ProviderKind,
    lastModel: nullableString(value.lastModel) ?? null,
    lastReasoningEffort: nullableString(value.lastReasoningEffort) ?? null,
    lastServiceTier: nullableString(value.lastServiceTier) ?? null,
    lastContextWindow: nullableString(value.lastContextWindow) ?? null,
    modelTraits,
  }
}

function nullableString(value: unknown): string | null | undefined {
  return value === null || typeof value === 'string' ? value : undefined
}

function modelKey(provider: ProviderKind, model: string): string {
  return `${provider}\u0000${model}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
