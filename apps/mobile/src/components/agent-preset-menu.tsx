import { useState } from 'react';

import { AppSymbol } from './app-symbol';
import type { AgentPresetMenuProps } from './agent-preset-menu.types';
import { AgentPresetSheet } from './session-option-sheets';
import { Button } from 'panelui-native/components/button';
import { Chip } from 'panelui-native/components/chip';
import { Text } from 'panelui-native/primitives/text';

import { useProviderModels } from '@/hooks/use-daemon-data';
import { useTheme } from '@/hooks/use-theme';
import { providerLabel } from '@/lib/session-presentation';

const PERSON_ICON = { ios: 'person', android: 'person', web: 'person' } as const;

/** Non-iOS fallback. iOS replaces this with a native anchored popover. */
export function AgentPresetMenu({
  provider,
  agentPreset,
  onApply,
  variant = 'chip',
}: AgentPresetMenuProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const probe = useProviderModels(provider);
  const presets = probe.data?.agent_presets ?? [];
  const selected = presets.find((preset) => preset.id === agentPreset)
    ?? presets.find((preset) => preset.is_default)
    ?? presets[0];
  const label = selected?.name ?? `${providerLabel(provider)} agent`;
  const inline = variant === 'inline';

  return (
    <>
      {inline ? (
        // The composer header's inline name: a borderless, brand-tinted action
        // beside the model chip. A ghost `Button` trimmed back to its label, so
        // the header keeps the height it had while the press feedback and the
        // button role come from the library instead of a local style callback.
        <Button
          accessibilityLabel={`Agent preset, ${label}`}
          className="min-h-0 min-w-0 shrink border-0 px-0 py-0"
          onPress={() => setOpen(true)}
          pressOpacity={0.55}
          pressScale={1}
          size="xs"
          variant="ghost"
        >
          {/* An element rather than a string, because the name has to truncate
              rather than wrap the header onto a second line — and `text-primary`
              resolves to the same value as the app's accent in both appearances. */}
          <Text
            className="shrink text-[13px] font-semibold text-primary"
            numberOfLines={1}
          >
            {label}
          </Text>
        </Button>
      ) : (
        // The bordered pill the new-task screen's chip variant asks for.
        // `outline` is the library's own bordered pill, so the border, the pill
        // radius and the label colour come from the component rather than from
        // a local style block. `lg` is the step nearest the 34pt box this had,
        // and `max-w-40` keeps the name from pushing the model chip off the row.
        <Chip
          accessibilityLabel={`Agent preset, ${label}`}
          className="max-w-40 shrink self-center"
          onPress={() => setOpen(true)}
          pressOpacity={0.55}
          pressScale={1}
          size="lg"
          start={<AppSymbol name={PERSON_ICON} size={15} tintColor={theme.textSecondary} />}
          variant="outline"
        >
          <Text className="shrink text-[13px] font-medium" numberOfLines={1}>
            {label}
          </Text>
        </Chip>
      )}
      <AgentPresetSheet
        agentPreset={agentPreset}
        onApply={(selection) => {
          onApply(selection);
          setOpen(false);
        }}
        onDismiss={() => setOpen(false)}
        provider={provider}
        visible={open}
      />
    </>
  );
}
