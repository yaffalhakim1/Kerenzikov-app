import type { AgentSession, MessageAttachment } from '@waku/client';
import { AIInput } from 'panelui-native/components/ai-input';
import { Alert } from 'panelui-native/components/alert';
import { Button } from 'panelui-native/components/button';
import { Item } from 'panelui-native/components/item';
import { useState } from 'react';
import { View } from 'react-native';

import { AppSymbol } from './app-symbol';
import { AttachmentChip, UploadRing } from './attachment-chip';
import { ComposerAccessMenu } from './composer-access-menu';
import { ComposerAttachmentMenu, type ComposerAttachmentSource } from './composer-attachment-menu';
import { ComposerTextInput } from './composer-text-input';
import { useDaemon } from '@/lib/daemon-context';
import { useTheme } from '@/hooks/use-theme';
import { useSyncedComposerDraft } from '@/hooks/use-synced-composer-draft';
import {
  useComposerCommands,
  useProjectFiles,
  useProviderModels,
  useTaskState,
} from '@/hooks/use-daemon-data';
import { detectComposerTrigger, filterComposerCommands } from '@/lib/composer-commands';
import { confirmHaptic, tapHaptic } from '@/lib/haptics';
import { sessionBusy } from '@/lib/mobile-runtime';
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
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = sessionBusy(session);
  const disconnected = daemon.phase !== 'connected';

  const taskState = useTaskState();
  const projectPath = taskState.data?.projects.find(
    (project) => project.id === session.project_id,
  )?.path;
  const commandsQuery = useComposerCommands(session.provider, projectPath);
  const commands = commandsQuery.data ?? [];
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

  useProviderModels(session.provider);

  async function submit() {
    const typed = draft.trim();
    if (!typed || submitting) return;
    setSubmitting(true);
    setLocalError(null);
    onSubmitted?.();
    confirmHaptic();
    try {
      await runtime.sendPrompt(session, typed, attachments);
      draftSync.removeSubmittedDraft();
      setDraft('');
      setAttachments([]);
      tapHaptic();
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSubmitting(false);
    }
  }

  function chooseAttachment(source: ComposerAttachmentSource) {
    tapHaptic();
    setLocalError(`Attachments are not wired in this composer yet (${source}).`);
  }

  return (
    <AIInput
      onStop={() => void runtime.cancel(session.id)}
      onSubmit={submit}
      onValueChange={setDraft}
      status={busy ? 'streaming' : 'ready'}
      value={draft}
    >
      {localError ? (
        <Alert className="mb-1.5 items-center gap-1.5 px-2.5 py-1.5" variant="destructive">
          <Alert.Content>
            <Alert.Title className="text-destructive">{localError}</Alert.Title>
          </Alert.Content>
          <Button
            accessibilityLabel="Dismiss error"
            onPress={() => setLocalError(null)}
            size="xs"
            variant="ghost"
          >
            <AppSymbol
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              size={13}
              tintColor={theme.textSecondary}
            />
          </Button>
        </Alert>
      ) : null}

      {attachments.length > 0 ? (
        <View className="flex-row flex-wrap gap-2 px-1 pb-1">
          {attachments.map((attachment, index) => (
            <View key={`${index}`}>
              <AttachmentChip attachment={attachment} />
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
        multiline
        onChangeText={setDraft}
        placeholder="Message the agent"
        placeholderTextColor={theme.textTertiary}
        value={draft}
      />

      <AIInput.Toolbar>
        <ComposerAttachmentMenu onChoose={chooseAttachment} />
        <ComposerAccessMenu
          mode={session.runtime_mode}
          onApply={(mode) => {
            runtime.updateSessionOptions(session.id, { runtimeMode: mode }).catch(() => {});
          }}
        />
        <AIInput.Spacer />
        {submitting ? <UploadRing size={16} /> : null}
        <AIInput.Submit />
      </AIInput.Toolbar>
    </AIInput>
  );
}
