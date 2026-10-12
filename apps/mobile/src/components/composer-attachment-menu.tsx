import { AIInput } from 'panelui-native/components/ai-input';
import { useState } from 'react';

import { AppSymbol } from './app-symbol';

import { useTheme } from '@/hooks/use-theme';

export type ComposerAttachmentSource = 'files' | 'camera' | 'photo';

const ATTACHMENT_SOURCES = [
  { id: 'files', label: 'Files', description: 'Anything already on this device.', icon: 'folder' },
  { id: 'camera', label: 'Camera', description: 'Take a photo now.', icon: 'camera' },
  { id: 'photo', label: 'Photo', description: 'Pick from your library.', icon: 'photo' },
] as const satisfies readonly {
  id: ComposerAttachmentSource;
  label: string;
  description: string;
  icon: Parameters<typeof AppSymbol>[0]['name'] extends infer N ? N : never;
}[];

/**
 * The composer's attachment picker.
 *
 * A PanelUI `AIInput.Sheet`, which is the sheet the library documents for the
 * controls in a composer toolbar. It replaced `@expo/ui`'s native `MenuView`:
 * `MenuView` wraps its child in its own Pressable, so the `AIInput.Action`
 * trigger could not be one — the nested pressable swallowed the gesture and
 * the menu never opened. The sheet has no such constraint, because the action
 * opens it through context rather than by being wrapped in a pressable.
 */
export function ComposerAttachmentMenu({
  disabled = false,
  onChoose,
}: {
  disabled?: boolean;
  onChoose: (source: ComposerAttachmentSource) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <AIInput.Action
        disabled={disabled}
        icon={
          <AppSymbol
            name={{ ios: 'plus', android: 'add', web: 'add' }}
            size={19}
            tintColor={theme.textSecondary}
          />
        }
        label="Add attachment"
        onPress={() => setOpen(true)}
      />
      <AIInput.Sheet onOpenChange={setOpen} open={open} size="auto">
        <AIInput.Sheet.Screen id="attachments" title="Add to chat">
          <AIInput.Sheet.Group>
            {ATTACHMENT_SOURCES.map((source) => (
              <AIInput.Sheet.Row
                description={source.description}
                icon={
                  <AppSymbol
                    name={{
                      ios: source.icon === 'folder' ? 'folder' : source.icon,
                      android: source.icon === 'folder' ? 'folder' : source.icon,
                      web: source.icon,
                    }}
                    size={17}
                    tintColor={theme.textSecondary}
                  />
                }
                key={source.id}
                label={source.label}
                onPress={() => {
                  setOpen(false);
                  // Let the sheet finish dismissing before presenting the
                  // platform picker, which takes over the screen.
                  setTimeout(() => onChoose(source.id), 160);
                }}
              />
            ))}
          </AIInput.Sheet.Group>
        </AIInput.Sheet.Screen>
      </AIInput.Sheet>
    </>
  );
}
