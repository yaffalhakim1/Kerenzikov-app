import { describe, expect, test } from 'bun:test';
import type { ProviderModel } from '@waku/client';

import {
  composerOptionSummary,
  modelTraitSummary,
  resolveModelTraitSelection,
} from './model-traits';

const model: ProviderModel = {
  id: 'test-model',
  name: 'Test Model',
  is_default: true,
  reasoning_efforts: [
    { id: 'low', label: 'Low' },
    { id: 'high', label: 'High' },
  ],
  default_reasoning_effort: 'high',
  service_tiers: [{ id: 'fast', label: 'Fast' }],
  default_service_tier: 'default',
  context_windows: [
    { id: '200k', label: '200K' },
    { id: '1m', label: '1M' },
  ],
  default_context_window: '200k',
};

describe('mobile model traits', () => {
  test('presents the model defaults while preserving unset runtime values', () => {
    const unset = { reasoningEffort: null, serviceTier: null, contextWindow: null };
    expect(resolveModelTraitSelection(model, unset)).toEqual({
      reasoningEffort: 'high',
      serviceTier: 'default',
      contextWindow: '200k',
    });
    expect(modelTraitSummary(model, unset)).toBe('High · Standard · 200K');
  });

  test('shows explicit choices and drops stale choices from the presentation', () => {
    expect(modelTraitSummary(model, {
      reasoningEffort: 'low',
      serviceTier: 'fast',
      contextWindow: '1m',
    })).toBe('Low · Fast · 1M');
    expect(resolveModelTraitSelection(model, {
      reasoningEffort: 'removed',
      serviceTier: 'removed',
      contextWindow: 'removed',
    })).toEqual({
      reasoningEffort: 'high',
      serviceTier: 'default',
      contextWindow: '200k',
    });
  });

  test('summarises the option button from access plus the traits on offer', () => {
    const unset = { reasoningEffort: null, serviceTier: null, contextWindow: null };
    expect(composerOptionSummary(model, unset, 'Auto')).toBe('Auto · High · Standard · 200K');
    // A model with nothing to configure leaves the access mode standing alone.
    expect(composerOptionSummary({
      ...model,
      reasoning_efforts: [],
      service_tiers: [],
      context_windows: [],
    }, unset, 'Auto')).toBe('Auto');
    // No model resolved yet: the access mode is all there is to say.
    expect(composerOptionSummary(undefined, unset, 'Plan')).toBe('Plan');
  });
});
