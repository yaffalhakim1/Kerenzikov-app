import { describe, expect, test } from 'bun:test'
import {
  readComposerPreferences,
  rememberedModelTraits,
  rememberComposerSession,
  writeComposerPreferences,
} from './composer-preferences'

describe('composer preferences', () => {
  test('remembers the last model per daemon and its traits', () => {
    const storage = memoryStorage()
    const remembered = rememberComposerSession(
      readComposerPreferences(storage, 'ws://first'),
      {
        provider: 'codex',
        model: 'gpt-5.6-sol',
        reasoning_effort: 'high',
        service_tier: 'fast',
        context_window: '1m',
      },
    )
    writeComposerPreferences(storage, 'ws://first', remembered)

    expect(readComposerPreferences(storage, 'ws://first')).toMatchObject({
      lastProvider: 'codex',
      lastModel: 'gpt-5.6-sol',
      lastReasoningEffort: 'high',
      lastServiceTier: 'fast',
      lastContextWindow: '1m',
    })
    expect(rememberedModelTraits(remembered, 'codex', 'gpt-5.6-sol')).toEqual({
      reasoningEffort: 'high',
      serviceTier: 'fast',
      contextWindow: '1m',
    })
    expect(readComposerPreferences(storage, 'ws://second').lastModel).toBeNull()
  })

  test('does not erase an explicit model when a blank draft is selected', () => {
    const preferences = rememberComposerSession(
      readComposerPreferences(null, 'ws://first'),
      {
        provider: 'claude',
        model: 'claude-opus-4-1',
        reasoning_effort: null,
        service_tier: null,
      },
    )
    // The model is what a model-less session must not clear.
    const next = rememberComposerSession(preferences, {
      provider: 'claude',
      model: null,
      reasoning_effort: null,
      service_tier: null,
    })
    expect(next.lastModel).toBe('claude-opus-4-1')
    expect(next).toBe(preferences)
  })

  test('remembers the provider of a session that carries no model', () => {
    // Codex and OpenCode can both run without an explicit model, so the
    // provider has to be recorded anyway — otherwise `lastProvider` freezes at
    // whichever provider was last used with one, and every later task reopens
    // on that provider.
    const started = rememberComposerSession(
      readComposerPreferences(null, 'ws://first'),
      {
        provider: 'openCode',
        model: 'some-model',
        reasoning_effort: null,
        service_tier: null,
      },
    )
    expect(started.lastProvider).toBe('openCode')

    const modelLess = rememberComposerSession(started, {
      provider: 'codex',
      model: null,
      reasoning_effort: null,
      service_tier: null,
    })
    expect(modelLess.lastProvider).toBe('codex')
    // A model id is only meaningful against its own provider's catalogue, so a
    // model-less session on a different provider drops it rather than pairing
    // the new provider with the old provider's model.
    expect(modelLess.lastModel).toBeNull()
    // The previous provider's own traits survive for when it is chosen again.
    expect(rememberedModelTraits(modelLess, 'openCode', 'some-model')).toBeDefined()
  })

  test('restores Fx as a valid remembered provider', () => {
    const storage = memoryStorage()
    const preferences = rememberComposerSession(
      readComposerPreferences(storage, 'ws://first'),
      {
        provider: 'fx',
        model: 'openai/gpt-5.6-sol',
        reasoning_effort: null,
        service_tier: null,
      },
    )
    writeComposerPreferences(storage, 'ws://first', preferences)

    expect(readComposerPreferences(storage, 'ws://first').lastProvider).toBe('fx')
  })
})

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  }
}
