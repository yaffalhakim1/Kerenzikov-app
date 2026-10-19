import type { FileEntry, MessageAttachment } from '@waku/client';
import { AIInput } from 'panelui-native/components/ai-input';
import { Button } from 'panelui-native/components/button';
import { Item } from 'panelui-native/components/item';
import { Text as PanelText } from 'panelui-native/primitives/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppSymbol } from './app-symbol';
import { AttachmentChip, UploadRing } from './attachment-chip';
import { ComposerTextInput } from './composer-text-input';
import { useTheme } from '@/hooks/use-theme';
import { NativeTint } from '@/constants/theme';
import { useKeyboardHeight } from '@/lib/keyboard-offset';
import { tapHaptic } from '@/lib/haptics';

/**
 * The composer's chrome, shared by the session and new-task screens.
 *
 * Both screens put the same surface on screen — a PanelUI `AIInput` card with
 * the app's own text field, the attachment stack, the `/command` and `@file`
 * suggestion lists, and a toolbar of model pill, access menu and send slot.
 * What differs is only what each *means*: the session composer sends into a
 * live session and shows its queue, the new-task composer starts one and picks
 * the project first.
 *
 * So the surface is presentational and the callers own their own state. This is
 * the same split the app already uses for `MobileComposer`'s primitives — the
 * pieces live here, the wiring lives at the screen — just one level up, because
 * the whole card is now identical rather than only its parts.
 *
 * Anything genuinely per-screen arrives as a slot: `header` for the model chip
 * row, `toolbar` for the controls, `aboveCard` for the queue, `error` for the
 * banner. Slots rather than flags, so a screen that needs a control the other
 * does not is not a branch inside this file.
 */
export function ComposerSurface({
  value,
  onValueChange,
  onSubmit,
  status = 'ready',
  editable = true,
  placeholder,
  error,
  aboveCard,
  header,
  attachments,
  pendingFiles,
  onRemoveAttachment,
  commands,
  onPickCommand,
  files,
  onPickFile,
  toolbar,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  /** `streaming` puts the card in its working state; the toolbar slot decides
   *  what that means for the trailing control. */
  status?: 'ready' | 'streaming';
  editable?: boolean;
  placeholder: string;
  /** Rendered above the card, full width. */
  error?: React.ReactNode;
  /** Rendered above the card, full width — the session's queue. */
  aboveCard?: React.ReactNode;
  /** Rendered inside the card, above the field. */
  header?: React.ReactNode;
  attachments: MessageAttachment[];
  /** Names of files still uploading, so a multi-file pick shows what is left
   *  rather than one opaque "Attaching…". */
  pendingFiles?: { id: number; name: string }[];
  onRemoveAttachment: (index: number) => void;
  /** `/command` matches for the typed trigger. Empty hides the list. */
  commands?: string[];
  onPickCommand?: (name: string) => void;
  /** `@file` matches for the typed trigger. Empty hides the list. */
  files?: FileEntry[];
  onPickFile?: (file: FileEntry) => void;
  /** The `AIInput.Toolbar` row. Composed by the caller, rendered here. */
  toolbar: React.ReactNode;
  /** Sheets and dialogs the composer opens. Rendered outside the card. */
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // The app tracks the software keyboard itself rather than letting `AIInput`
  // do it: edge-to-edge Android delivers the keyboard as a WindowInset, and
  // `AIInput`'s own path switches the app out of `adjustResize` to measure it.
  const keyboardHeight = useKeyboardHeight();

  return (
    <View
      style={[
        styles.shell,
        // The composer's own floor, plus the keyboard while it is up, plus a
        // gap — resting directly on the keys reads as part of them.
        { paddingBottom: Math.max(insets.bottom, 10) + keyboardHeight + 8 },
      ]}
    >

      {/* The queue sits above the card, not inside it. Inside, it read as a
          second field belonging to the composer; above, it reads as what it
          is — messages waiting their turn, outside the thing you type into.
          The margin is what keeps it off the card's edge so the two do not
          look welded together. */}
      {aboveCard ? <View style={styles.aboveCard}>{aboveCard}</View> : null}

      <AIInput
        avoidKeyboard={false}
        // `AIInput`'s root carries `shadow-md` so the card reads as lifted off
        // a page. This app's surfaces are flat with hairline borders, so the
        // shadow is the one thing that would look foreign.
        className="shadow-none"
        onSubmit={onSubmit}
        onValueChange={onValueChange}
        // The radius cannot be set as a class: `AIInput` hardcodes it as a
        // style prop (`RADIUS[size]`, 26 at `md`) and passes it to `Glass`,
        // which merges `[shape, style]` — so a caller's style is what wins.
        // 16 matches the todo panel's `rounded-2xl`, so the two surfaces agree.
        style={styles.card}
        status={status}
        value={value}
      >
        {header}

        {/* The error strip stays inside the card: it is the composer's own
            failure to send, so it belongs to the surface that would have sent
            it. The queue does not — see above. */}
        {error}

        {attachments.length > 0 || (pendingFiles?.length ?? 0) > 0 ? (
          <View className="flex-row flex-wrap gap-2 px-1 pb-1">
            {attachments.map((attachment, index) => (
              <View className="relative" key={`${attachment.path}:${index}`}>
                <AttachmentChip attachment={attachment} />
                <Button
                  accessibilityLabel={`Remove ${attachment.name}`}
                  className="absolute -right-1 -top-1 h-5 w-5 min-h-0 min-w-0 rounded-full bg-muted px-0 py-0"
                  onPress={() => onRemoveAttachment(index)}
                  size="xs"
                  variant="ghost"
                >
                  <AppSymbol
                    name={{ ios: 'xmark', android: 'close', web: 'close' }}
                    size={11}
                    tintColor={theme.textSecondary}
                  />
                </Button>
              </View>
            ))}
            {pendingFiles?.map((file) => (
              <View
                className="flex-row items-center gap-2 rounded-md px-2.5 py-1.5"
                key={file.id}
                style={{ backgroundColor: theme.overlayStrong }}
              >
                <UploadRing size={14} />
                <Text className="text-xs" numberOfLines={1} style={{ color: theme.textSecondary }}>
                  {file.name}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {files && files.length > 0 ? (
          /*
            Scrollable, because the picker is how you reach a path you cannot
            type from memory: a list capped at six rows and clipped is a list
            that cannot answer the query it was given. The height cap keeps the
            composer's own height bounded so the field stays on screen.
          */
          <ScrollView
            className="pb-1"
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.suggestionList}
          >
            {files.map((file) => (
              <Item
                className="gap-2 rounded-md px-2.5 py-1.5"
                key={file.path}
                onPress={() => {
                  tapHaptic();
                  onPickFile?.(file);
                }}
                pressOpacity={0.6}
                pressScale={1}
                size="sm"
              >
                <Item.Media>
                  <AppSymbol
                    name={file.is_dir
                      ? { ios: 'folder', android: 'folder', web: 'folder' }
                      : { ios: 'doc', android: 'description', web: 'description' }}
                    size={15}
                    tintColor={theme.textSecondary}
                  />
                </Item.Media>
                <Item.Content>
                  <Item.Title className="shrink" numberOfLines={1}>
                    {file.path}
                  </Item.Title>
                </Item.Content>
              </Item>
            ))}
          </ScrollView>
        ) : null}

        {commands && commands.length > 0 && !(files && files.length > 0) ? (
          <ScrollView
            className="pb-1"
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.suggestionList}
          >
            {commands.map((command) => (
              <Item
                className="gap-2 rounded-md px-2.5 py-1.5"
                key={command}
                onPress={() => {
                  tapHaptic();
                  onPickCommand?.(command);
                }}
                pressOpacity={0.6}
                pressScale={1}
                size="sm"
              >
                <Item.Content className="flex-row items-center gap-2">
                  <Item.Title className="shrink">{`/${command}`}</Item.Title>
                </Item.Content>
              </Item>
            ))}
          </ScrollView>
        ) : null}

        <ComposerTextInput
          editable={editable}
          // The app's own composer opens at a 64pt floor; `AIInput.Field`'s
          // one-row default is shorter than the surface it replaces.
          style={[styles.field, { color: theme.text }]}
          multiline
          onChangeText={onValueChange}
          placeholder={placeholder}
          placeholderTextColor={theme.textTertiary}
          selectionColor={NativeTint}
          value={value}
        />

        {toolbar}
      </AIInput>

      {children}
    </View>
  );
}

/**
 * The model control — a `Pill`, which is the library's name for a value that
 * opens a list.
 *
 * `shrink` plus a one-line cap is what keeps a long model name from pushing the
 * send button off the row: the label is rendered by the library with no width
 * bound and no truncation, so without these a name like
 * "claude-sonnet-4-5-20250929" takes the whole toolbar and Send becomes
 * unreachable.
 */
export function ComposerModelPill({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <AIInput.Pill
      accessibilityLabel={accessibilityLabel}
      className="shrink"
      indicator={
        <AppSymbol
          name={{ ios: 'chevron.up.chevron.down', android: 'unfold_more', web: 'unfold_more' }}
          size={11}
          tintColor={theme.textTertiary}
        />
      }
      indicatorSymbol="chevron.up.chevron.down"
      label={
        <PanelText className="shrink" numberOfLines={1} size="sm" weight="medium">
          {label}
        </PanelText>
      }
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  // The same shell the app's own composer uses, so every composer in the app
  // sits identically.
  shell: { paddingHorizontal: 12, paddingTop: 4 },
  // Full shell width, so the queue's edges line up with the card's rather than
  // insetting from it. 8pt is the gap the rest of the app uses between a
  // stacked row and the surface under it.
  aboveCard: { marginBottom: 8 },
  // 8, not 6: the toolbar's `px-2` puts the attachment button's circle 8pt off
  // the card edge, and the placeholder sitting 2pt to its left read as
  // misaligned with the row of controls under it. The field and the toolbar now
  // share the same left edge.
  field: { fontSize: 16, lineHeight: 22, minHeight: 64, paddingHorizontal: 8, paddingVertical: 12 },
  // 16 is `rounded-2xl`, the todo panel's radius, so the two surfaces agree.
  card: { borderRadius: 16 },
  // Roughly six rows. The cap is what keeps the composer from growing to fill
  // the screen when a query matches a lot — past it the list scrolls.
  suggestionList: { maxHeight: 240 },
});
