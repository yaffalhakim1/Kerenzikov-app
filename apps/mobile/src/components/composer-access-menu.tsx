import { useState } from 'react';

import { AppSymbol } from './app-symbol';
import type { ComposerAccessMenuProps } from './composer-access-menu.types';
import { AccessSheet } from './session-option-sheets';
import { AIInput } from 'panelui-native/components/ai-input';

import { useTheme } from '@/hooks/use-theme';
import { runtimeModeLabel } from '@/lib/session-presentation';

const MODE_ICONS = {
  plan: { ios: 'list.bullet', android: 'checklist', web: 'checklist' },
  ask: { ios: 'lock', android: 'lock', web: 'lock' },
  autoAcceptEdits: { ios: 'pencil', android: 'edit', web: 'edit' },
  auto: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  fullAccess: { ios: 'lock.open', android: 'lock_open', web: 'lock_open' },
} as const;

/** Non-iOS fallback. iOS replaces this with a native anchored menu. */
export function ComposerAccessMenu({ mode, onApply }: ComposerAccessMenuProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <AIInput.Action
        icon={<AppSymbol name={MODE_ICONS[mode]} size={19} tintColor={theme.textSecondary} />}
        label={`Agent access, ${runtimeModeLabel(mode)}`}
        onPress={() => setOpen(true)}
      />
      <AccessSheet
        mode={mode}
        onApply={onApply}
        onDismiss={() => setOpen(false)}
        visible={open}
      />
    </>
  );
}
