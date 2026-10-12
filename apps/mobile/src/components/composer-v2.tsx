import type { AgentSession, MessageAttachment } from '@waku/client';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { AIInput } from 'panelui-native/components/ai-input';
import { Alert } from 'panelui-native/components/alert';
import { Button } from 'panelui-native/components/button';
import { Item } from 'panelui-native/components/item';
import { Text as PanelText } from 'panelui-native/primitives/text';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSymbol } from './app-symbol';
import { AttachmentChip, UploadRing } from './attachment-chip';
import { ComposerAccessMenu } from './composer-access-menu';
import { ComposerAttachmentMenu, type ComposerAttachmentSource } from './composer-attachment-menu';
import { ComposerTextInput } from './composer-text-input';
import { SendStopSlot } from './mobile-composer';
import { QueuedMessageRow } from './queued-message-row';
import { ProviderIcon } from './provider-icon';
import { ModelSheet, ModelTraitsSheet, modelDisplayName } from './session-option-sheets';
import { useDaemon } from '@/lib/daemon-context';
import { useTheme } from '@/hooks/use-theme';
import { useSyncedComposerDraft } from '@/hooks/use-synced-composer-draft';
import {
  useComposerCommands,
  useProjectFiles,
  useProviderModels,
  useTaskState,
} from '@/hooks/use-daemon-data';
import {
  detectComposerTrigger,
  filterComposerCommands,
  mergeComposerCommands,
  resolvedComposerSubmission,
} from '@/lib/composer-commands';
import { modelHasConfigurableTraits } from '@/lib/model-traits';
import { imagePickerFiles, importLocalAttachment, type LocalAttachmentFile } from '@/lib/attachments';
import { confirmHaptic, tapHaptic } from '@/lib/haptics';
import { useKeyboardHeight } from '@/lib/keyboard-offset';
import { sessionBusy, sessionHasActiveProviderTurn } from '@/lib/mobile-runtime';
import { isDaemonDisconnectError } from '@/lib/runtime-errors';
import { useRuntime } from '@/lib/runtime-context';

/**
 * The composer rebuilt as a PanelUI `AIInput` composition, behind a flag.
 *
 * The difference from `MobileComposer` is what owns the state. There, the
 * surface owns the draft, the attachments and the submit path, and `AIInput`
 * is only the shell around them. Here `AIInput` owns the value — it is
 * controlled through `value`/`onValueChange` and it draws its own trailing
 * control — and the app keeps only what the library has no seam for:
 * attachments, the slash/file suggestions, and the runtime round-trip.
 *
 * What it deliberately does NOT carry, because `AIInput` has no place to put
 * it: cross-device draft sync is wired but only for text (the library owns the
 * value, so `onHydrate` writes straight into it), the queued-message list is
 * out of scope, and the send/stop cross-fade is the library's own rather than
 * the app's. Those are the known losses; `mobile-composer.tsx` is untouched
 * and still the default.
 */
export function ComposerV2({
  session,
  onSubmitted,
}: {
  session: AgentSession;
  /** Fires as the submission begins, so the transcript can pin to the tail. */
  onSubmitted?: () => void;
}) {
  const theme = useTheme();
  const runtime = useRuntime();
  const daemon = useDaemon();
  const insets = useSafeAreaInsets();
  // The app tracks the software keyboard itself rather than letting `AIInput`
  // do it: edge-to-edge Android delivers the keyboard as a WindowInset, and
  // `AIInput`'s own path switches the app out of `adjustResize` to measure it.
  // This is the same offset `MobileComposer` uses, so both composers sit the
  // same distance off the keys.
  const keyboardHeight = useKeyboardHeight();
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modelSheetOpen, setModelSheetOpen] = useState(false);
  const [traitsSheetOpen, setTraitsSheetOpen] = useState(false);
  const [editingQueued, setEditingQueued] = useState(false);
  const [importingAttachments, setImportingAttachments] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<{ id: number; name: string }[]>([]);
  const activeSessionId = useRef(session.id);
  activeSessionId.current = session.id;
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);
  const attachmentImportTail = useRef<Promise<void>>(Promise.resolve());
  const pendingAttachmentImports = useRef(0);
  const pendingId = useRef(0);

  const busy = sessionBusy(session);
  const disconnected = daemon.phase !== 'connected';
  const queued = session.queued_messages ?? [];
  const liveRuntime = runtime.runtimes[session.id];
  // Whether a queued follow-up can be delivered into the live turn right now,
  // which decides if its Send now action is offered. Mirrors the desktop's
  // `session_can_steer`: an active provider turn AND a driver that takes a
  // mid-turn message.
  const canSteer = sessionHasActiveProviderTurn(session) && Boolean(liveRuntime?.supportsSteer);
  // The placeholder carries the state the toolbar cannot: a disconnected
  // composer says why it will not send, and a busy one says a message will
  // queue rather than interrupt.
  const placeholder = disconnected
    ? daemon.phase === 'reconnecting'
      ? 'Reconnecting…'
      : daemon.phase === 'connecting' || daemon.phase === 'booting'
        ? 'Connecting…'
        : 'Reconnect to message this agent'
    : busy
      ? 'Queue a follow-up…'
      : 'Message agent';
  const runtimeError = runtime.errors[session.id];
  // A disconnect error is the connection banner's to report, not the
  // composer's — showing both says the same thing twice.
  const visibleError =
    (disconnected && isDaemonDisconnectError(localError) ? null : localError)
    || (disconnected && isDaemonDisconnectError(runtimeError) ? null : runtimeError);

  const taskState = useTaskState();
  const projectPath = taskState.data?.projects.find(
    (project) => project.id === session.project_id,
  )?.path;
  const commandsQuery = useComposerCommands(session.provider, projectPath);
  const commands = useMemo(
    () => mergeComposerCommands(commandsQuery.data ?? [], session.available_commands ?? []),
    [commandsQuery.data, session.available_commands],
  );
  const trigger = detectComposerTrigger(draft, draft.length);
  const suggestions = trigger?.kind === 'command'
    ? filterComposerCommands(commands, trigger.query)
    : [];
  const projectFiles = useProjectFiles(projectPath, trigger?.kind === 'file');

  const draftSync = useSyncedComposerDraft({
    target: { type: 'session', sessionId: session.id },
    text: draft,
    attachments,
    onHydrate: (synchronized) => {
      setDraft(synchronized.text);
    },
    flushOnUnmount: true,
  });

  const providerModels = useProviderModels(session.provider);
  const sessionModels = providerModels.data?.models;
  const activeModel = session.model
    ? sessionModels?.find((item) => item.id === session.model)
    : sessionModels?.find((item) => item.is_default) ?? sessionModels?.[0];
  const selectedModelName = modelDisplayName(sessionModels, session.model ?? null);

  async function submit() {
    const typed = draft.trim();
    // Template and skill commands have to become provider syntax here — the
    // daemon sends the prompt through verbatim.
    const prompt = resolvedComposerSubmission(session.provider, typed, commands) ?? typed;
    if ((!prompt && attachments.length === 0) || submitting || pendingAttachmentImports.current > 0) {
      return;
    }
    setSubmitting(true);
    setLocalError(null);
    onSubmitted?.();
    confirmHaptic();
    try {
      await runtime.sendPrompt(session, prompt, attachments);
      draftSync.removeSubmittedDraft();
      setDraft('');
      setAttachments([]);
      setEditingQueued(false);
      tapHaptic();
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSubmitting(false);
    }
  }

  function applyOptions(changes: Parameters<typeof runtime.updateSessionOptions>[1]) {
    runtime.updateSessionOptions(session.id, changes).catch((cause) => {
      setLocalError(cause instanceof Error ? cause.message : String(cause));
    });
  }

  async function addLocalFiles(files: LocalAttachmentFile[]) {
    if (!files.length) return;
    const targetSessionId = session.id;
    pendingAttachmentImports.current += 1;
    setImportingAttachments(true);
    setLocalError(null);
    const staged = files.map((file) => ({ id: ++pendingId.current, name: file.name }));
    setPendingFiles((current) => [...current, ...staged]);
    // Imports run one at a time behind a tail promise, so a multi-file pick
    // lands in the order it was chosen rather than whichever upload finishes
    // first.
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

  return (
    <View
      style={[
        styles.shell,
        // The composer's own floor, plus the keyboard while it is up, plus a
        // gap — resting directly on the keys reads as part of them.
        { paddingBottom: Math.max(insets.bottom, 10) + keyboardHeight + 8 },
      ]}
    >
    {visibleError ? (
      <Alert className="mb-1.5 items-center gap-1.5 px-2.5 py-1.5" variant="destructive">
        <Alert.Content>
          <Alert.Title className="text-destructive">{visibleError}</Alert.Title>
        </Alert.Content>
        <Button
          accessibilityLabel="Dismiss error"
          className="min-h-0 min-w-0 self-center px-0.5 py-0"
          onPress={() => {
            setLocalError(null);
            runtime.dismissError(session.id);
          }}
          size="xs"
          variant="ghost"
        >
          <AppSymbol
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={12}
            tintColor={theme.danger}
          />
        </Button>
      </Alert>
    ) : null}

    {queued.map((message) => (
      <QueuedMessageRow
        canSteer={canSteer}
        key={message.id}
        message={message}
        onEdit={() => {
          // Pop the message back into the composer to be reworked, dropping it
          // from the queue in the same step — matching the desktop's Edit.
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

    {editingQueued ? (
      <View
        className="mb-1.5 flex-row items-center justify-between rounded-md border px-2.5 py-1.5"
        style={{ backgroundColor: theme.overlay, borderColor: theme.border }}
      >
        <Text className="text-xs" style={{ color: theme.textSecondary }}>
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
          variant="ghost"
        >
          <PanelText className="text-[12.5px] font-semibold text-primary">Cancel</PanelText>
        </Button>
      </View>
    ) : null}

    <AIInput
      avoidKeyboard={false}
      // `AIInput`'s root carries `shadow-md` so the card reads as lifted off a
      // page. This app's surfaces are flat with hairline borders, so the
      // shadow is the one thing that would look foreign.
      className="shadow-none"
      onSubmit={submit}
      onValueChange={setDraft}
      status={busy ? 'streaming' : 'ready'}
      value={draft}
    >
      {attachments.length > 0 || pendingFiles.length > 0 ? (
        <View className="flex-row flex-wrap gap-2 px-1 pb-1">
          {attachments.map((attachment, index) => (
            <View className="relative" key={`${attachment.path}:${index}`}>
              <AttachmentChip attachment={attachment} />
              <Button
                accessibilityLabel={`Remove ${attachment.name}`}
                className="absolute -right-1 -top-1 h-5 w-5 min-h-0 min-w-0 rounded-full bg-muted px-0 py-0"
                disabled={submitting}
                onPress={() => {
                  draftSync.markEdited();
                  setAttachments((current) => current.filter((_, item) => item !== index));
                }}
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
          {/* One tile per file still in flight, so a multi-file pick shows what
              is left rather than a single opaque "Attaching…". */}
          {pendingFiles.map((file) => (
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

      {suggestions.length > 0 ? (
        <View className="pb-1">
          {suggestions.map((command) => (
            <Item
              className="gap-2 rounded-md px-2.5 py-1.5"
              key={`${command.scope}:${command.name}`}
              onPress={() => {
                tapHaptic();
                setDraft(`/${command.name} `);
              }}
              pressOpacity={0.6}
              pressScale={1}
              size="sm"
              variant="muted"
            >
              <Item.Content className="flex-row items-center gap-2">
                <Item.Title className="shrink">{`/${command.name}`}</Item.Title>
              </Item.Content>
            </Item>
          ))}
        </View>
      ) : null}

      {projectFiles.data?.length && trigger?.kind === 'file' ? (
        <View className="pb-1">
          {projectFiles.data.slice(0, 6).map((file) => (
            <Item
              className="gap-2 rounded-md px-2.5 py-1.5"
              key={file.path}
              onPress={() => {
                tapHaptic();
                setDraft(file.path);
              }}
              pressOpacity={0.6}
              pressScale={1}
              size="sm"
              variant="muted"
            >
              <Item.Media>
                <AppSymbol
                  name={{ ios: 'doc', android: 'description', web: 'description' }}
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
        </View>
      ) : null}

      <ComposerTextInput
        editable={!disconnected && !submitting}
        // The app's own composer opens at a 64pt floor; `AIInput.Field`'s
        // one-row default is shorter than the surface it replaces.
        style={styles.field}
        multiline
        onChangeText={setDraft}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        value={draft}
      />

      <AIInput.Toolbar>
        <ComposerAttachmentMenu onChoose={chooseAttachment} />
        <ComposerAccessMenu
          mode={session.runtime_mode}
          onApply={(mode) => applyOptions({ runtimeMode: mode })}
        />
        {/*
          The model is a `Pill` — a value that opens a list — and the reasoning
          effort is an `Action`, which is what the library's own composer
          example does. `indicator` is the chevron; `indicatorSymbol` is the
          platform's name for it, needed only when the pill is handed over.
        */}
        <AIInput.Pill
          accessibilityLabel={`Model, ${selectedModelName}`}
          indicator={
            <AppSymbol
              name={{ ios: 'chevron.up.chevron.down', android: 'unfold_more', web: 'unfold_more' }}
              size={11}
              tintColor={theme.textTertiary}
            />
          }
          indicatorSymbol="chevron.up.chevron.down"
          label={selectedModelName}
          onPress={() => setModelSheetOpen(true)}
        />
        {activeModel && modelHasConfigurableTraits(activeModel) ? (
          <AIInput.Action
            icon={<ProviderIcon provider={session.provider} size={15} />}
            label="Reasoning and model options"
            onPress={() => setTraitsSheetOpen(true)}
          />
        ) : null}
        <AIInput.Spacer />
        {/*
          Not `AIInput.Submit`: it offers voice when the field is empty, and
          this app has no voice — the mic was a button that did nothing. It
          also has no queue state, and this app queues a message while the
          agent works. The app's own slot is send/stop/queue with no voice.
        */}
        <SendStopSlot
          busy={busy}
          canSubmit={draft.trim().length > 0 || attachments.length > 0}
          disconnected={disconnected}
          importingAttachments={importingAttachments}
          onSend={submit}
          onStop={() => void runtime.cancel(session.id)}
          queueing={busy}
          submitting={submitting}
        />
      </AIInput.Toolbar>
    </AIInput>

    <ModelSheet
      model={session.model ?? null}
      onApply={(selection) => applyOptions(selection)}
      onDismiss={() => setModelSheetOpen(false)}
      provider={session.provider}
      reasoningEffort={session.reasoning_effort ?? null}
      visible={modelSheetOpen}
    />

    {activeModel ? (
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
    ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // The same shell the app's own composer uses, so the two sit identically.
  shell: { paddingHorizontal: 12, paddingTop: 4 },
  field: { fontSize: 16, lineHeight: 22, minHeight: 64, paddingHorizontal: 6, paddingVertical: 12 },
});
