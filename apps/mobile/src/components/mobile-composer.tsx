import type {
  AgentSession,
  FileEntry,
  MessageAttachment,
  SlashCommand,
} from '@waku/client';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Blocks } from '@/components/blocks';
import { AIInput } from 'panelui-native/components/ai-input';
import { Alert } from 'panelui-native/components/alert';
import { Button } from 'panelui-native/components/button';
import { Chip } from 'panelui-native/components/chip';
import { Item } from 'panelui-native/components/item';
import { Text as PanelText } from 'panelui-native/primitives/text';

import { useKeyboardHeight } from '@/lib/keyboard-offset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AgentPresetMenu } from './agent-preset-menu';
import { AppSymbol } from './app-symbol';
import { AttachmentChip, UploadRing } from './attachment-chip';
import { ComposerAccessMenu } from './composer-access-menu';
import {
  ComposerAttachmentMenu,
  type ComposerAttachmentSource,
} from './composer-attachment-menu';
import { ComposerTextInput } from './composer-text-input';
import type { ComposerTextInputProps } from './composer-text-input.types';
import { ProviderIcon } from './provider-icon';
import { QueuedMessageRow } from './queued-message-row';
import { PermissionPanel, UserInputPanel } from './request-panels';
import { ModelSheet, ModelTraitsSheet, modelDisplayName } from './session-option-sheets';
import { NativeTint, Radius } from '@/constants/theme';
import { useSyncedComposerDraft } from '@/hooks/use-synced-composer-draft';
import { useComposerCommands, useProjectFiles, useProviderModels, useTaskState } from '@/hooks/use-daemon-data';
import {
  detectComposerTrigger,
  filterComposerCommands,
  filterComposerFiles,
  mergeComposerCommands,
  replaceComposerFileTrigger,
  replaceComposerTrigger,
  resolvedComposerSubmission,
} from '@/lib/composer-commands';
import { useTheme } from '@/hooks/use-theme';
import {
  imagePickerFiles,
  importLocalAttachment,
  type LocalAttachmentFile,
} from '@/lib/attachments';
import { useDaemon } from '@/lib/daemon-context';
import { confirmHaptic, tapHaptic } from '@/lib/haptics';
import { sessionBusy, sessionHasActiveProviderTurn } from '@/lib/mobile-runtime';
import { modelHasConfigurableTraits } from '@/lib/model-traits';
import { agentPresetAvailable } from '@/lib/session-presentation';
import { useRuntime } from '@/lib/runtime-context';
import { isDaemonDisconnectError } from '@/lib/runtime-errors';

/**
 * The composer surface shared by the session screen and the new-task screen:
 * a tall rounded card holding the input with an icon toolbar underneath —
 * option toggles on the left, meters and the send button on the right.
 */
export function ComposerCard({
  beforeInput,
  header,
  left,
  right,
  ...inputProps
}: ComposerTextInputProps & {
  beforeInput?: ReactNode;
  /** What is about to receive the message: model and agent, above the input. */
  header?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <AIInput
      className="px-2.5 pb-3.5 pt-3"
      // The brand rim is the composer's signature, so it is drawn over the
      // panel's own card surface rather than replacing it.
      style={{ borderColor: theme.accent, borderWidth: 1 }}
    >
      {beforeInput}
      {header}
      <ComposerTextInput
        multiline
        placeholderTextColor={theme.textTertiary}
        selectionColor={NativeTint}
        style={[styles.input, { color: theme.text }]}
        {...inputProps}
      />
      <AIInput.Toolbar>
        <View style={styles.cluster}>{left}</View>
        <AIInput.Spacer />
        <View style={styles.cluster}>{right}</View>
      </AIInput.Toolbar>
    </AIInput>
  );
}

/**
 * The composer's header row: what a message will run on.
 *
 * Shared by the session and new-task screens so the two composers cannot drift
 * apart in structure — the row's spacing lives here, not at each call site.
 */
export function ComposerHeader({ children }: { children: ReactNode }) {
  return <View style={styles.headerRow}>{children}</View>;
}

/**
 * The composer's header chip: what a message will run on.
 *
 * Sized to the model/agent names rather than to an icon, because the point of
 * the row is to answer "which model, which agent" without opening a sheet.
 */
export function ComposerTargetChip({
  accessibilityLabel,
  leading,
  label,
  color,
  onPress,
}: {
  accessibilityLabel: string;
  leading?: ReactNode;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      // Trimmed back to its label: the header chip is a name, not a pill, so
      // only the press feedback and the button role are wanted from the
      // library — the same treatment the inline agent preset beside it takes.
      className="min-h-0 min-w-0 shrink gap-1.5 border-0 px-0 py-0"
      onPress={onPress}
      pressOpacity={0.55}
      pressScale={1}
      size="xs"
      variant="ghost">
      {leading}
      <PanelText numberOfLines={1} style={[styles.targetChipLabel, { color }]}>
        {label}
      </PanelText>
    </Button>
  );
}

export function ComposerIconButton({
  icon,
  label,
  onPress,
  active = false,
  disabled = false,
}: {
  icon: Parameters<typeof AppSymbol>[0]['name'];
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <AIInput.Action
      disabled={disabled}
      icon={
        <AppSymbol
          name={icon}
          size={19}
          tintColor={active ? NativeTint : theme.textSecondary}
        />
      }
      label={label}
      onPress={onPress}
    />
  );
}

/**
 * The glyph inside the send/stop slot.
 *
 * 19 is what the toolbar's own icon controls already draw — the attachment
 * menu, the access menu and `ComposerIconButton` all pass 19 to `AppSymbol` —
 * so the slot agrees with the row it sits in. Send already drew 19 and Stop
 * drew 18; the 1pt difference was not doing any work.
 */
const SEND_SLOT_GLYPH = 19;

/**
 * The stop mark: a rounded square drawn as a stroke, not a filled glyph.
 *
 * It is drawn rather than taken from a symbol set because it has to read as an
 * *outline* against a solid fill. The button it sits in is `destructive`, so
 * the surface under it is the danger colour already — tinting a `stop.fill`
 * symbol in `theme.danger` painted a red square on a red fill, which is the
 * blank red chip the stop control was reported as. The stroke takes
 * `theme.onInverse` — the app's own "content on a solid fill" tier, white on
 * light and near-black on dark — so it is legible in both appearances. A drawn
 * mark also cannot drift from the button the way a platform symbol can:
 * Material's `stop` is a hard-cornered square and SF Symbols' `stop.fill` is a
 * filled one, so the two platforms disagreed about the shape as well.
 *
 * The stroke is 2 of the 19pt box, and the square is inset by half of it so the
 * stroke lands inside the box rather than being clipped by it.
 */
function StopGlyph({ size }: { size: number }) {
  const theme = useTheme();
  const stroke = 2;
  const inset = stroke / 2;
  return (
    <View
      style={{
        borderColor: theme.onInverse,
        borderRadius: Math.max(2, size * 0.22),
        borderWidth: stroke,
        height: size - inset * 2,
        width: size - inset * 2,
      }}
    />
  );
}

export function SendButton({
  onPress,
  disabled,
  busy = false,
  queueing = false,
  label,
}: {
  onPress: () => void;
  disabled: boolean;
  busy?: boolean;
  queueing?: boolean;
  label: string;
}) {
  const theme = useTheme();
  return (
    <Button
      accessibilityLabel={label}
      // `size="sm"` is the library's own 36pt box — the same height as the slot
      // this control sits in, and the same box Stop takes, so neither is a
      // 44pt `icon` button overflowing its container. No `shadow-none` here:
      // `ghost` carries no shadow to remove, and Stop's is only there because
      // `destructive` does.
      disabled={disabled}
      onPress={onPress}
      size="sm"
      variant="ghost"
    >
      {busy ? (
        <Blocks color={theme.textSecondary} />
      ) : (
        <AppSymbol
          name={queueing
            ? { ios: 'text.append', android: 'playlist_add', web: 'playlist_add' }
            : { ios: 'paperplane.fill', android: 'send', web: 'send' }}
          size={SEND_SLOT_GLYPH}
          tintColor={disabled ? theme.textTertiary : theme.text}
        />
      )}
    </Button>
  );
}

/**
 * The composer's primary slot: Stop while the agent works, Send when it can
 * act, cross-fading in place instead of one button replacing the other.
 *
 * The two states are stacked in one slot and cross-faded, so the toolbar never
 * shifts. Reanimated drives it, per the library's rule that core `Animated`
 * does not compose with it and would put the frames back on the JS thread.
 *
 * PanelUI's own `AIInput.Submit` is the same idea — one button that is send,
 * stop or voice — but it has no queue state: while the agent is working with
 * text typed it *stops*, where this app queues. So the states are wired here
 * and only the button chrome comes from PanelUI.
 */
export function SendStopSlot({
  busy,
  submitting,
  queueing,
  canSubmit,
  importingAttachments,
  disconnected,
  onStop,
  onSend,
}: {
  busy: boolean;
  submitting: boolean;
  queueing: boolean;
  canSubmit: boolean;
  importingAttachments: boolean;
  disconnected: boolean;
  onStop: () => void;
  onSend: () => void;
}) {
  const theme = useTheme();
  const sendDisabled = !canSubmit || submitting || importingAttachments || disconnected;
  const sendVisible = !busy || canSubmit;
  const stopShown = busy && !sendVisible;

  const sendProgress = useSharedValue(sendVisible ? 1 : 0);
  const stopProgress = useSharedValue(stopShown ? 1 : 0);
  const [sendMounted, setSendMounted] = useState(sendVisible);
  const [stopMounted, setStopMounted] = useState(busy);

  useEffect(() => {
    if (sendVisible) setSendMounted(true);
    sendProgress.value = withTiming(sendVisible ? 1 : 0, { duration: 140 });
  }, [sendProgress, sendVisible]);
  useEffect(() => {
    if (stopShown) setStopMounted(true);
    stopProgress.value = withTiming(stopShown ? 1 : 0, { duration: 140 });
  }, [stopProgress, stopShown]);

  const sendStyle = useAnimatedStyle(() => ({
    opacity: sendProgress.value,
    transform: [{ scale: 0.7 + 0.3 * sendProgress.value }],
  }));
  const stopStyle = useAnimatedStyle(() => ({
    opacity: stopProgress.value,
    transform: [{ scale: 0.7 + 0.3 * stopProgress.value }],
  }));

  if (!sendMounted && !stopMounted) return null;
  return (
    <View style={styles.sendSlot}>
      {stopMounted && (
        <Animated.View
          pointerEvents={stopShown ? 'auto' : 'none'}
          style={[styles.sendSlotChild, stopStyle]}>
          {/*
            The same box Send carries — one slot, so one control that changes
            colour rather than two that happen to share a home.
          */}
          <Button
            accessibilityLabel="Stop agent"
            onPress={onStop}
            size="sm"
            variant="destructive"
          >
            <StopGlyph size={SEND_SLOT_GLYPH} />
          </Button>
        </Animated.View>
      )}
      {sendMounted && (
        <Animated.View
          pointerEvents={sendVisible ? 'auto' : 'none'}
          style={[styles.sendSlotChild, sendStyle]}>
          <SendButton
            busy={submitting}
            disabled={sendDisabled}
            label={queueing ? 'Queue message' : 'Send message'}
            onPress={onSend}
            queueing={queueing}
          />
        </Animated.View>
      )}
    </View>
  );
}

export function MobileComposer({
  session,
  onSubmitted,
}: {
  session: AgentSession;
  /** Fires as the submission begins — before the runtime round-trip — so the
   * transcript can pin to the tail the moment the message lands. */
  onSubmitted?: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const daemon = useDaemon();
  const runtime = useRuntime();
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [importingAttachments, setImportingAttachments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [modelSheetOpen, setModelSheetOpen] = useState(false);
  const [traitsSheetOpen, setTraitsSheetOpen] = useState(false);
  // Set while the draft holds a queued message being reworked, so the composer
  // can say so and offer a way out. The message is already dequeued at that
  // point (matching the desktop), so Cancel just clears the draft.
  const [editingQueued, setEditingQueued] = useState(false);
  const busy = sessionBusy(session);
  const supportsAgentPreset = agentPresetAvailable(session, busy);
  // One probe feeds both halves of the header — the model's name and whether a
  // preset picker has anything to offer. `AgentPresetMenu` reads the same
  // cache-shared query, so rendering both costs one request.
  const providerModels = useProviderModels(session.provider);
  const agentPresets = providerModels.data?.agent_presets ?? [];
  const sessionModels = providerModels.data?.models;
  const selectedModelName = modelDisplayName(sessionModels, session.model ?? null);
  // The effective model, so the traits sheet edits what will actually run —
  // a session with no explicit pick is on the provider's default.
  const activeModel = session.model
    ? sessionModels?.find((item) => item.id === session.model)
    : sessionModels?.find((item) => item.is_default) ?? sessionModels?.[0];
  const showAgentPreset = supportsAgentPreset && agentPresets.length > 0;
  const taskState = useTaskState();
  const projectPath = taskState.data?.projects.find(
    (project) => project.id === session.project_id,
  )?.path;
  const discoveredCommands = useComposerCommands(session.provider, projectPath);
  // Provider-reported commands ride along with the session; discovery adds the
  // project, user, and skill commands defined on the daemon host.
  const commands = useMemo(
    () => mergeComposerCommands(discoveredCommands.data ?? [], session.available_commands ?? []),
    [discoveredCommands.data, session.available_commands],
  );
  // const agentPresets = agentPresetProbe.data?.agent_presets ?? [];
  // const selectedAgentPreset =
  //   agentPresets.find((preset) => preset.id === session.agent_preset) ??
  //   agentPresets.find((preset) => preset.is_default) ??
  //   agentPresets[0];
  const liveRuntime = runtime.runtimes[session.id];
  // Whether a queued follow-up can be delivered into the live turn right now,
  // which decides if its Send now action is offered. Mirrors desktop
  // `session_can_steer`: an active provider turn AND a driver that takes a
  // mid-turn message.
  const canSteer =
    sessionHasActiveProviderTurn(session) && Boolean(liveRuntime?.supportsSteer);
  const permission = runtime.permissions[session.id];
  const userInput = runtime.userInputs[session.id];
  const runtimeError = runtime.errors[session.id];
  const connected = daemon.phase === 'connected';
  const visibleLocalError = connected && isDaemonDisconnectError(localError) ? null : localError;
  const visibleRuntimeError = connected && isDaemonDisconnectError(runtimeError)
    ? null
    : runtimeError;
  const visibleError = visibleLocalError || visibleRuntimeError;
  const queued = session.queued_messages ?? [];

  // The caret is assumed to sit at the end of the draft: single-line composer
  // input, and the trigger dies at the first whitespace either way.
  const trigger = useMemo(() => detectComposerTrigger(draft, draft.length), [draft]);
  const suggestions = useMemo(
    () => trigger?.kind === 'command' ? filterComposerCommands(commands, trigger.query) : [],
    [commands, trigger],
  );
  const projectFiles = useProjectFiles(projectPath, trigger?.kind === 'file');
  const fileSuggestions = useMemo(
    () => trigger?.kind === 'file' ? filterComposerFiles(projectFiles.data ?? [], trigger.query) : [],
    [projectFiles.data, trigger],
  );

  function applyCommand(command: SlashCommand) {
    if (trigger?.kind !== 'command') return;
    draftSync.markEdited();
    setDraft(replaceComposerTrigger(draft, trigger, command).text);
    tapHaptic();
  }

  function applyFile(file: FileEntry) {
    if (trigger?.kind !== 'file') return;
    draftSync.markEdited();
    setDraft(replaceComposerFileTrigger(draft, trigger, file).text);
    tapHaptic();
  }

  useEffect(() => setLocalError(null), [session.id]);
  useEffect(() => {
    if (connected && isDaemonDisconnectError(localError)) setLocalError(null);
  }, [connected, localError]);

  // Cross-device draft, persisted on the daemon like the desktop composer:
  // hydrate when this surface becomes active, save only local edits, and
  // clear on send. A daemon-loaded value must never be echoed back as an edit.
  const draftSync = useSyncedComposerDraft({
    target: { type: 'session', sessionId: session.id },
    text: draft,
    attachments,
    onHydrate: (synchronized) => {
      setDraft(synchronized.text);
      setAttachments(synchronized.attachments);
    },
    flushOnUnmount: true,
  });
  const activeSessionId = useRef(session.id);
  activeSessionId.current = session.id;
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const attachmentImportTail = useRef<Promise<void>>(Promise.resolve());
  const pendingAttachmentImports = useRef(0);
  // Each file gets its own pending tile with a spinner, so a multi-file drop
  // shows what is still in flight rather than one opaque "Attaching…" chip.
  const pendingId = useRef(0);
  const [pendingFiles, setPendingFiles] = useState<{ id: number; name: string }[]>([]);

  async function addLocalFiles(files: LocalAttachmentFile[]) {
    if (!files.length) return;
    const targetSessionId = session.id;
    pendingAttachmentImports.current += 1;
    setImportingAttachments(true);
    setLocalError(null);
    const staged = files.map((file) => ({ id: ++pendingId.current, name: file.name }));
    setPendingFiles((current) => [...current, ...staged]);
    const operation = attachmentImportTail.current.catch(() => {}).then(async () => {
      const client = daemon.client;
      if (!client || daemon.phase !== 'connected') {
        throw new Error('Kerenzikov daemon is disconnected');
      }
      for (let index = 0; index < files.length; index += 1) {
        const imported = await importLocalAttachment(client, files[index]!);
        if (mounted.current && activeSessionId.current === targetSessionId) {
          draftSync.markEdited();
          setAttachments((current) => [...current, imported]);
          const id = staged[index]!.id;
          setPendingFiles((current) => current.filter((item) => item.id !== id));
        }
      }
    });
    attachmentImportTail.current = operation;
    try {
      await operation;
      tapHaptic();
    } finally {
      pendingAttachmentImports.current -= 1;
      if (mounted.current && pendingAttachmentImports.current === 0) {
        setImportingAttachments(false);
        setPendingFiles([]);
      }
    }
  }

  async function chooseAttachment(source: ComposerAttachmentSource) {
    try {
      if (source === 'files') {
        const result = await DocumentPicker.getDocumentAsync({
          copyToCacheDirectory: true,
          multiple: true,
          type: '*/*',
        });
        if (!result.canceled) {
          await addLocalFiles(result.assets.map((asset) => ({
            uri: asset.uri,
            name: asset.name,
            mimeType: asset.mimeType,
            size: asset.size,
            base64: asset.base64,
          })));
        }
        return;
      }

      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          throw new Error('Camera access is required to take a photo');
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 1,
        });
        if (!result.canceled) await addLocalFiles(imagePickerFiles(result.assets, 'Photo'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ['images'],
        quality: 1,
        selectionLimit: 0,
      });
      if (!result.canceled) await addLocalFiles(imagePickerFiles(result.assets, 'Photo'));
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : String(cause));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  const requestSignature = permission?.requestId ?? userInput?.requestId;
  const lastRequest = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (requestSignature && requestSignature !== lastRequest.current) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    lastRequest.current = requestSignature;
  }, [requestSignature]);

  async function submit() {
    const typed = draft.trim();
    // Template commands and skills have to become provider syntax here: the
    // daemon sends the prompt through verbatim.
    const prompt = resolvedComposerSubmission(session.provider, typed, commands) ?? typed;
    const submittedAttachments = attachments;
    if (
      (!prompt && submittedAttachments.length === 0)
      || submitting
      || pendingAttachmentImports.current > 0
    ) return;
    setSubmitting(true);
    setLocalError(null);
    onSubmitted?.();
    confirmHaptic();
    try {
      // While the agent is working a new message queues; it is never steered
      // implicitly. Steering a live turn is deliberate and lives on the queued
      // row's Send now action, matching the desktop composer.
      await runtime.sendPrompt(session, prompt, submittedAttachments);
      draftSync.removeSubmittedDraft();
      setDraft('');
      setAttachments([]);
      setEditingQueued(false);
      tapHaptic();
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : String(cause));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  }

  async function stop() {
    setLocalError(null);
    confirmHaptic();
    try {
      await runtime.cancel(session.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function applyOptions(changes: Parameters<typeof runtime.updateSessionOptions>[1]) {
    runtime.updateSessionOptions(session.id, changes).catch((cause) => {
      setLocalError(cause instanceof Error ? cause.message : String(cause));
    });
  }

  const disconnected = daemon.phase !== 'connected';
  // While the agent works, Stop owns the primary slot and Send only returns
  // once it can actually act — a draft to queue, or a live agent to steer.
  // Same rule as the desktop's `composer_submit_action` + `can_send` pair, so
  // an idle working session never shows a dead Send button beside Stop.
  const canSubmit = Boolean(draft.trim() || attachments.length);
  const placeholder = disconnected
    ? daemon.phase === 'reconnecting'
      ? 'Reconnecting…'
      : daemon.phase === 'connecting' || daemon.phase === 'booting'
        ? 'Connecting…'
        : 'Reconnect to message this agent'
    : busy
      ? 'Queue a follow-up…'
      : 'Message agent';

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 10) + keyboardHeight + 8 }]}>
      {permission && !userInput && (
        <PermissionPanel
          permission={permission}
          onRespond={(optionId) => runtime.respond(session.id, permission.requestId, optionId)}
        />
      )}
      {userInput && (
        <UserInputPanel
          input={userInput}
          onSubmit={(answers) => runtime.respondUserInput(session.id, userInput.requestId, answers)}
        />
      )}
      {visibleError && (
        <Alert
          accessibilityLiveRegion="polite"
          className="mb-1.5 items-center gap-1.5 px-2.5 py-1.5"
          variant="destructive">
          {/* This app redefines `--color-destructive-foreground` as the
              contrast pair for a *solid* destructive fill, so the variant's
              own title colour lands white-on-pink here. The text takes the
              house danger colour instead. */}
          <Alert.Content>
            <Alert.Title className="text-destructive">{visibleError}</Alert.Title>
          </Alert.Content>
          <Button
            accessibilityLabel="Dismiss error"
            // Trimmed to the glyph: the banner is a one-line strip, and the
            // library's own 10pt hit slop on `xs` keeps the target reachable
            // without the box setting the strip's height.
            className="min-h-0 min-w-0 self-center px-0.5 py-0"
            onPress={() => {
              setLocalError(null);
              runtime.dismissError(session.id);
            }}
            size="xs"
            variant="ghost">
            <AppSymbol
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
             
              tintColor={theme.danger}
            />
          </Button>
        </Alert>
      )}
      {queued.map((message) => (
        <QueuedMessageRow
          key={message.id}
          canSteer={canSteer}
          message={message}
          onEdit={() => {
            // Pop the message back into the composer so it can be changed,
            // dropping it from the queue in the same step — matching the
            // desktop's Edit.
            runtime.removeQueuedMessage(session.id, message.id).catch(() => {});
            draftSync.markEdited();
            setDraft(message.display_content ?? message.content);
            setAttachments(message.attachments ?? []);
            setEditingQueued(true);
          }}
          onRemove={() => void runtime.removeQueuedMessage(session.id, message.id).catch(() => {})}
          onSendNow={() => void runtime.steerQueuedMessage(session.id, message.id).catch(() => {})}
        />
      ))}

      {editingQueued && (
        <View style={[styles.editingRow, { backgroundColor: theme.overlay, borderColor: theme.border }]}>
          <Text style={[styles.editingText, { color: theme.textSecondary }]}>
            Editing queued message
          </Text>
          <Button
            accessibilityLabel="Cancel editing queued message"
            className="min-h-0 px-1 py-0"
            onPress={() => {
              setEditingQueued(false);
              draftSync.markEdited();
              setDraft('');
              setAttachments([]);
            }}
            size="xs"
            variant="ghost">
            <PanelText className="text-[12.5px] font-semibold text-primary">
              Cancel
            </PanelText>
          </Button>
        </View>
      )}

      <ComposerCard
        accessibilityLabel="Message agent"
        beforeInput={
          attachments.length || importingAttachments || suggestions.length || fileSuggestions.length ? (
          <>
          {suggestions.length ? (
            <View style={styles.commandList}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                style={styles.commandListScroll}
                contentContainerStyle={styles.commandListContent}>
                {suggestions.map((command) => (
                  <Item
                    accessibilityLabel={`Use command ${command.name}`}
                    className="gap-2 rounded-md px-2.5 py-1.5"
                    key={`${command.scope}:${command.name}`}
                    onPress={() => applyCommand(command)}
                    // Dim, don't shrink: a full-bleed suggestion row scaling to
                    // 0.97 reads as a layout jump. Same pair PanelUI's own
                    // text-shaped rows use.
                    pressOpacity={0.6}
                    pressScale={1}
                    size="sm"
                    variant="muted">
                    {/* Name and hint sit side by side on the left, as they
                        did before — the content column is turned back into a
                        row so the hint does not get pushed to the far edge by
                        the title's flex. */}
                    <Item.Content className="flex-row items-center gap-2">
                      <Item.Title className="shrink" numberOfLines={1}>/{command.name}</Item.Title>
                      {command.description ? (
                        <Item.Description className="shrink" numberOfLines={1}>
                          {command.description}
                        </Item.Description>
                      ) : null}
                    </Item.Content>
                  </Item>
                ))}
              </ScrollView>
            </View>
          ) : null}
          {fileSuggestions.length ? (
            <View style={styles.commandList}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                style={styles.commandListScroll}
                contentContainerStyle={styles.commandListContent}>
                {fileSuggestions.map((file) => (
                  <Item
                    accessibilityLabel={`Mention ${file.path}`}
                    className="gap-2 rounded-md px-2.5 py-1.5"
                    key={file.path}
                    onPress={() => applyFile(file)}
                    pressOpacity={0.6}
                    pressScale={1}
                    size="sm"
                    variant="muted">
                    <Item.Media>
                      <AppSymbol
                        name={file.is_dir
                          ? { ios: 'folder', android: 'folder', web: 'folder' }
                          : { ios: 'doc.text', android: 'description', web: 'description' }}
                       
                        tintColor={theme.textSecondary}
                      />
                    </Item.Media>
                    <Item.Content>
                      <Item.Title numberOfLines={1}>{file.path}</Item.Title>
                    </Item.Content>
                  </Item>
                ))}
              </ScrollView>
            </View>
          ) : null}
          {attachments.length || pendingFiles.length ? (
            <View style={styles.attachmentStack}>
              {attachments.map((attachment, index) => (
                <View
                  key={`${attachment.blob_reference ?? attachment.path}:${index}`}
                  style={styles.attachmentItem}>
                  <AttachmentChip attachment={attachment} />
                  <Button
                    accessibilityLabel={`Remove ${attachment.name}`}
                    // A 20pt badge pinned to the chip's corner, so the library
                    // button is trimmed back to the box this had: the press
                    // feedback and the button role come from it, the size and
                    // the position from here.
                    className="absolute -right-1 -top-1 h-5 w-5 min-h-0 min-w-0 rounded-full border-0 bg-muted px-0 py-0"
                    disabled={submitting}
                    onPress={() => {
                      draftSync.markEdited();
                      setAttachments((current) => current.filter((_, item) => item !== index));
                    }}
                    size="xs"
                    variant="ghost">
                    <AppSymbol
                      name={{ ios: 'xmark', android: 'close', web: 'close' }}
                      size={11}
                      tintColor={theme.textSecondary}
                    />
                  </Button>
                </View>
              ))}
              {pendingFiles.map((file) => (
                <Chip
                  className="max-w-48"
                  key={file.id}
                  size="sm"
                  start={<UploadRing />}>
                  <PanelText className="shrink text-xs text-secondary-foreground" numberOfLines={1}>
                    {file.name}
                  </PanelText>
                </Chip>
              ))}
            </View>
          ) : null}
          </>
        ) : undefined}
        editable={!disconnected && !submitting}
        header={(
          <ComposerHeader>
            <ComposerTargetChip
              accessibilityLabel={`Model, ${selectedModelName}`}
              color={theme.text}
              label={selectedModelName}
              leading={<ProviderIcon provider={session.provider} size={15} />}
              onPress={() => setModelSheetOpen(true)}
            />
            {showAgentPreset && (
              <AgentPresetMenu
                agentPreset={session.agent_preset ?? null}
                onApply={(selection) => applyOptions(selection)}
                provider={session.provider}
                variant="inline"
              />
            )}
          </ComposerHeader>
        )}
        left={(
          <>
            <ComposerAttachmentMenu
              disabled={disconnected || submitting || importingAttachments}
              onChoose={(source) => void chooseAttachment(source)}
            />
            <ComposerAccessMenu
              mode={session.runtime_mode}
              onApply={(mode) => applyOptions({ runtimeMode: mode })}
            />
            {activeModel && modelHasConfigurableTraits(activeModel) && (
              <ComposerIconButton
                icon={{ ios: 'brain.head.profile', android: 'psychology', web: 'psychology' }}
                label="Reasoning and model options"
                onPress={() => setTraitsSheetOpen(true)}
              />
            )}
          </>
        )}
        placeholder={placeholder}
        right={(
          <SendStopSlot
            busy={busy}
            submitting={submitting}
            queueing={busy}
            canSubmit={canSubmit}
            importingAttachments={importingAttachments}
            disconnected={disconnected}
            onStop={() => void stop()}
            onSend={() => void submit()}
          />
        )}
        value={draft}
        onChangeText={(value) => {
          draftSync.markEdited();
          setDraft(value);
        }}
        onPasteError={(message) => {
          setLocalError(message);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }}
        onPasteFiles={(files) => {
          void addLocalFiles(files).catch(async (cause) => {
            setLocalError(cause instanceof Error ? cause.message : String(cause));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          });
        }}
      />

      <ModelSheet
        model={session.model ?? null}
        onApply={(selection) => applyOptions(selection)}
        onDismiss={() => setModelSheetOpen(false)}
        provider={session.provider}
        reasoningEffort={session.reasoning_effort ?? null}
        visible={modelSheetOpen}
      />

      {activeModel && (
        <ModelTraitsSheet
          model={activeModel}
          onApply={(changes) => applyOptions(changes)}
          onDismiss={() => setTraitsSheetOpen(false)}
          selection={{
            reasoningEffort: session.reasoning_effort ?? null,
            serviceTier: session.service_tier ?? null,
            contextWindow: session.context_window ?? null,
          }}
          visible={traitsSheetOpen}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { paddingHorizontal: 12, paddingTop: 4 },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 6,
    paddingTop: 4,
  },
  targetChipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 140,
    minHeight: 64,
    paddingHorizontal: 6,
    paddingVertical: 12,
  },
  attachmentStack: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4, paddingTop: 4 },
  attachmentItem: { position: 'relative' },
  commandList: { marginHorizontal: 4, marginTop: 4 },
  commandListScroll: { maxHeight: 220 },
  commandListContent: { gap: 4, paddingVertical: 4 },
  editingRow: {
    alignItems: 'center',
    borderRadius: Radius.small,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  editingText: { fontSize: 12.5, fontWeight: '600' },
  // No gap: each control already carries its own 36pt box, and the invisible
  // space between them reads as the spacing.
  cluster: { alignItems: 'center', flexDirection: 'row' },
  // The morph slot: both states are absolutely positioned in the same 36dp
  // box, so the cross-fade never shifts the toolbar.
  sendSlot: { height: 36, width: 36 },
  sendSlotChild: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    top: 0,
    width: 36,
  },
});
