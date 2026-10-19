import type { ProviderAgentPreset, ProviderModel, RuntimeMode } from '@waku/client';
import { AIInput } from 'panelui-native/components/ai-input';
import { useState } from 'react';

import { AppSymbol } from './app-symbol';

import { useTheme } from '@/hooks/use-theme';
import {
  composerOptionSummary,
  resolveModelTraitSelection,
  type ModelTraitSelection,
} from '@/lib/model-traits';
import { runtimeModeLabel } from '@/lib/session-presentation';

/** The four-square glyph: the toolbar's "everything else this composer can be
 *  told" control. */
const OPTIONS_ICON = { ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' } as const;
/** Agent access modes, in the order the desktop lists them. */
const ACCESS_MODES: Array<{ id: RuntimeMode; description: string }> = [
  { id: 'plan', description: 'Investigate and propose without changing files.' },
  { id: 'ask', description: 'Approve every command and file edit.' },
  { id: 'autoAcceptEdits', description: 'Edits apply automatically; commands still ask.' },
  { id: 'auto', description: 'Works autonomously inside the project.' },
  { id: 'fullAccess', description: 'No approval prompts. The agent acts freely.' },
];

/**
 * The composer's option button: one square-grid control holding the two
 * settings that used to each own a toolbar slot — agent access and reasoning
 * effort.
 *
 * They were two icons whose glyphs only said *that* a mode was set, never
 * which, so the toolbar spent two of its three leading slots on values nobody
 * could read. One control that opens a list is the same number of taps to
 * change either, and it leaves the row for the things that act (attach, model,
 * send).
 *
 * A PanelUI `AIInput.Sheet`, the sheet the library documents for composer
 * controls, so the rows push onto one surface instead of stacking native sheets
 * — and so it works the same on both platforms rather than being an anchored
 * SwiftUI menu on one and a sheet on the other.
 */
export function ComposerOptionsMenu({
  mode,
  onApplyMode,
  model,
  selection,
  onApplyTraits,
  agentPresets,
  agentPreset,
  onApplyAgentPreset,
  disabled = false,
}: {
  mode: RuntimeMode;
  onApplyMode: (mode: RuntimeMode) => void;
  /** The model that will run. Its advertised trait lists are what the sheet
   *  can offer; without one the sheet is agent access only. */
  model?: ProviderModel;
  selection: ModelTraitSelection;
  onApplyTraits: (changes: Partial<ModelTraitSelection>) => void;
  /** The provider's startable agent compositions. Only the new-task screen has
   *  these — a running session's agent is fixed for its life — so the section
   *  is absent rather than disabled when they are not offered. */
  agentPresets?: readonly ProviderAgentPreset[];
  agentPreset?: string | null;
  onApplyAgentPreset?: (agentPreset: string | null) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const resolved = model ? resolveModelTraitSelection(model, selection) : null;

  const efforts = model?.reasoning_efforts ?? [];
  const tiers = model?.service_tiers ?? [];
  const windows = model?.context_windows ?? [];
  const effortLabel = optionLabel(efforts, resolved?.reasoningEffort ?? null);
  const tierLabel = tiers.length
    ? resolved?.serviceTier === 'default'
      ? 'Standard'
      : optionLabel(tiers, resolved?.serviceTier ?? null)
    : null;
  const windowLabel = optionLabel(windows, resolved?.contextWindow ?? null);
  const presets = agentPresets ?? [];
  const selectedPreset = presets.find((preset) => preset.id === agentPreset)
    ?? presets.find((preset) => preset.is_default)
    ?? presets[0];
  const showsAgent = presets.length > 0 && Boolean(onApplyAgentPreset);

  return (
    <>
      <AIInput.Action
        disabled={disabled}
        icon={<AppSymbol name={OPTIONS_ICON} size={19} tintColor={theme.textSecondary} />}
        // The glyph says nothing about the state, so the label carries all of
        // it: a reader who cannot see the sheet still hears which agent, access
        // mode and effort are in force before opening anything.
        label={`Options, ${composerOptionSummary(model, selection, runtimeModeLabel(mode))}`}
        onPress={() => setOpen(true)}
      />
      <AIInput.Sheet open={open} onOpenChange={setOpen} size="auto">
        <AIInput.Sheet.Screen id="options" title="Options">
          <AIInput.Sheet.Group>
            {showsAgent ? (
              <AIInput.Sheet.Row
                label="Agent"
                to="agent"
                value={selectedPreset?.name ?? 'Default'}
              />
            ) : null}
            <AIInput.Sheet.Row
              label="Agent access"
              to="access"
              value={runtimeModeLabel(mode)}
            />
            {efforts.length ? (
              <AIInput.Sheet.Row
                label="Reasoning effort"
                to="effort"
                value={effortLabel ?? undefined}
              />
            ) : null}
            {tiers.length ? (
              <AIInput.Sheet.Row label="Service tier" to="tier" value={tierLabel ?? undefined} />
            ) : null}
            {windows.length ? (
              <AIInput.Sheet.Row
                label="Context window"
                to="context"
                value={windowLabel ?? undefined}
              />
            ) : null}
          </AIInput.Sheet.Group>
        </AIInput.Sheet.Screen>

        {showsAgent ? (
          <AIInput.Sheet.Screen id="agent" title="Agent">
            <AIInput.Sheet.Group>
              {presets.map((preset) => (
                <AIInput.Sheet.Choice
                  description={preset.description ?? undefined}
                  key={preset.id}
                  label={preset.name}
                  onPress={() => {
                    onApplyAgentPreset?.(preset.id);
                    setOpen(false);
                  }}
                  selected={(agentPreset ?? selectedPreset?.id) === preset.id}
                />
              ))}
            </AIInput.Sheet.Group>
          </AIInput.Sheet.Screen>
        ) : null}

        <AIInput.Sheet.Screen id="access" title="Agent access">
          <AIInput.Sheet.Group>
            {ACCESS_MODES.map((item) => (
              <AIInput.Sheet.Choice
                description={item.description}
                key={item.id}
                label={runtimeModeLabel(item.id)}
                onPress={() => {
                  onApplyMode(item.id);
                  setOpen(false);
                }}
                selected={mode === item.id}
              />
            ))}
          </AIInput.Sheet.Group>
        </AIInput.Sheet.Screen>

        {efforts.length ? (
          <AIInput.Sheet.Screen id="effort" title="Reasoning effort">
            <AIInput.Sheet.Group>
              {efforts.map((option) => (
                <AIInput.Sheet.Choice
                  description={optionDescription(
                    option.description,
                    model?.default_reasoning_effort === option.id,
                  )}
                  key={option.id}
                  label={option.label}
                  onPress={() => {
                    onApplyTraits({ reasoningEffort: option.id });
                    setOpen(false);
                  }}
                  selected={resolved?.reasoningEffort === option.id}
                />
              ))}
            </AIInput.Sheet.Group>
          </AIInput.Sheet.Screen>
        ) : null}

        {tiers.length ? (
          <AIInput.Sheet.Screen id="tier" title="Service tier">
            <AIInput.Sheet.Group>
              <AIInput.Sheet.Choice
                description={model?.default_service_tier === 'default' ? 'Default' : undefined}
                label="Standard"
                onPress={() => {
                  onApplyTraits({ serviceTier: 'default' });
                  setOpen(false);
                }}
                selected={resolved?.serviceTier === 'default'}
              />
              {tiers.map((option) => (
                <AIInput.Sheet.Choice
                  description={optionDescription(
                    option.description,
                    model?.default_service_tier === option.id,
                  )}
                  key={option.id}
                  label={option.label}
                  onPress={() => {
                    onApplyTraits({ serviceTier: option.id });
                    setOpen(false);
                  }}
                  selected={resolved?.serviceTier === option.id}
                />
              ))}
            </AIInput.Sheet.Group>
          </AIInput.Sheet.Screen>
        ) : null}

        {windows.length ? (
          <AIInput.Sheet.Screen id="context" title="Context window">
            <AIInput.Sheet.Group>
              {windows.map((option) => (
                <AIInput.Sheet.Choice
                  description={optionDescription(
                    option.description,
                    model?.default_context_window === option.id,
                  )}
                  key={option.id}
                  label={option.label}
                  onPress={() => {
                    onApplyTraits({ contextWindow: option.id });
                    setOpen(false);
                  }}
                  selected={resolved?.contextWindow === option.id}
                />
              ))}
            </AIInput.Sheet.Group>
          </AIInput.Sheet.Screen>
        ) : null}
      </AIInput.Sheet>
    </>
  );
}

function optionLabel(
  options: ReadonlyArray<{ id: string; label: string }>,
  id: string | null,
): string | null {
  if (!id) return null;
  return options.find((option) => option.id === id)?.label ?? id;
}

function optionDescription(description: string | null | undefined, isDefault: boolean) {
  if (description && isDefault) return `Default · ${description}`;
  return description ?? (isDefault ? 'Default' : undefined);
}
