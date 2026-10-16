import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MessageAttachment, ProviderKind, RuntimeMode } from '@waku/client';
import {
  rememberedModelTraits,
  rememberComposerSession,
  type ComposerPreferences,
} from '@waku/client/composer-preferences';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Blocks } from '@/components/blocks';

import { Alert } from 'panelui-native/components/alert';
import { Chip } from 'panelui-native/components/chip';
import { AIInput } from 'panelui-native/components/ai-input';
import { Item } from 'panelui-native/components/item';
import { AppSymbol } from '@/components/app-symbol';
import { ConnectionBanner } from '@/components/connection-banner';
import { AgentPresetMenu } from '@/components/agent-preset-menu';
import { ComposerAccessMenu } from '@/components/composer-access-menu';
import {
  ComposerAttachmentMenu,
  type ComposerAttachmentSource,
} from '@/components/composer-attachment-menu';
import { DaemonPickerSheet } from '@/components/daemon-picker-sheet';
import { SendButton } from '@/components/mobile-composer';
import { ComposerModelPill, ComposerSurface } from '@/components/composer-surface';
import { ProviderIcon } from '@/components/provider-icon';
import { RemoteProjectPicker } from '@/components/remote-project-picker';
import { ResumeSessionSheet } from '@/components/session-option-sheets';
import { useScreenHeaderInset } from '@/components/screen-header';
import {
  ModelPickerSheet,
  ModelTraitsSheet,
  type ProviderModelSelection,
} from '@/components/session-option-sheets';
import { Sheet, SheetRow } from '@/components/sheet';
import { Spacing } from '@/constants/theme';
import {
  useAllProviderModels,
  useComposerCommands,
  useDaemonSettings,
  useProjectFiles,
  providerModelsQuery,
  useProviderCatalog,
  useProviderModels,
  useTaskState,
} from '@/hooks/use-daemon-data';
import {
  detectComposerTrigger,
  filterComposerCommands,
  filterComposerFiles,
  replaceComposerFileTrigger,
  resolvedComposerSubmission,
} from '@/lib/composer-commands';
import { useSyncedComposerDraft } from '@/hooks/use-synced-composer-draft';
import { useTheme } from '@/hooks/use-theme';
import { daemonKeys, inspectBranches } from '@/lib/daemon-api';
import {
  imagePickerFiles,
  importLocalAttachment,
  type LocalAttachmentFile,
} from '@/lib/attachments';
import {
  loadComposerPreferences,
  loadNewTaskExtras,
  saveComposerPreferences,
  saveNewTaskExtras,
} from '@/lib/composer-preferences-store';
import { useDaemon } from '@/lib/daemon-context';
import { tapHaptic } from '@/lib/haptics';
import {
  modelHasConfigurableTraits,
  type ModelTraitSelection,
} from '@/lib/model-traits';
import { useRuntime } from '@/lib/runtime-context';
import { isDaemonDisconnectError } from '@/lib/runtime-errors';
import { providerLabel } from '@/lib/session-presentation';

/**
 * Expo Router renders this when the screen below throws, instead of tearing the
 * whole tree down. See `route-error-boundary` — it also writes the error to
 * disk, which is the only copy a release build has.
 */
export { ErrorBoundary } from '@/components/route-error-boundary';


type SheetKind =
  | 'daemon'
  | 'project'
  | 'model'
  | 'traits'
  | 'workspace'
  | 'branch';

/**
 * One provider probe + model discovery per connect, fired after first paint
 * rather than inside render: `useAllProviderModels` on mount ran a probe per
 * installed agent against the single daemon WebSocket while the screen was
 * measuring its first frame. The model sheet re-reads the same query keys, so
 * it stays warm for free.
 */
function useModelCatalogPrefetch(installedProviders: ProviderKind[]) {
  const queryClient = useQueryClient();
  const { client, activeProfile, phase } = useDaemon();
  const settings = useDaemonSettings();
  const providersRef = useRef(installedProviders);
  providersRef.current = installedProviders;
  const connected = phase === 'connected' && Boolean(client && activeProfile && settings.data);
  useEffect(() => {
    if (!connected || !client || !settings.data || !activeProfile) return;
    for (const provider of providersRef.current) {
      void queryClient.prefetchQuery(
        providerModelsQuery({ activeProfile, client, phase }, settings, provider),
      );
    }
    // Re-runs on daemon/settings identity changes only; the provider list is
    // read through the ref so a re-ordered catalog cannot restart prefetches.
  }, [connected, client, activeProfile, phase, settings.data, queryClient]);
}

/**
 * Ready-made openings for the blank-page problem, mirroring the desktop's
 * prompt starters. Tapping fills the composer rather than sending, so the
 * wording can be adjusted before it goes anywhere.
 */
const PROMPT_TEMPLATES = [
  {
    icon: { ios: 'safari', android: 'explore', web: 'explore' },
    prompt: 'Explore this codebase and explain how the main pieces fit together.',
    title: 'Explore the codebase',
  },
  {
    icon: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
    prompt: 'Catch me up on what changed recently and what still needs attention.',
    title: 'Catch me up',
  },
  {
    icon: { ios: 'arrow.left.arrow.right', android: 'compare_arrows', web: 'compare_arrows' },
    prompt: 'Lay out the options for this and the trade-offs between them.',
    title: 'Weigh my options',
  },
  {
    icon: { ios: 'checklist', android: 'checklist', web: 'checklist' },
    prompt: 'Plan this feature end to end before writing any code.',
    title: 'Start feature planning',
  },
  {
    icon: { ios: 'target', android: 'track_changes', web: 'track_changes' },
    prompt: 'Turn this into a clear, checkable goal for the task.',
    title: 'Craft a Goal',
  },
  {
    icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
    prompt: 'Break this into scheduled steps I can follow.',
    title: 'Schedule a Task',
  },
  {
    icon: { ios: 'ladybug', android: 'bug_report', web: 'bug_report' },
    prompt: 'Debug this issue and tell me the root cause.',
    title: 'Debug an issue',
  },
  {
    icon: { ios: 'doc.text.magnifyingglass', android: 'find_in_page', web: 'find_in_page' },
    prompt: 'Review my current changes and point out anything risky.',
    title: 'Review my changes',
  },
] as const;

export default function NewTaskScreen() {
  const theme = useTheme();
  const headerInset = useScreenHeaderInset();
  const daemon = useDaemon();
  const runtime = useRuntime();
  const taskState = useTaskState();
  const catalog = useProviderCatalog();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderKind | null>(null);
  const [agentPreset, setAgentPreset] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [reasoningEffort, setReasoningEffort] = useState<string | null>(null);
  const [serviceTier, setServiceTier] = useState<string | null>(null);
  const [contextWindow, setContextWindow] = useState<string | null>(null);
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>('fullAccess');
  const [isolated, setIsolated] = useState(false);
  const [baseBranch, setBaseBranch] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [importingAttachments, setImportingAttachments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openSheet, setOpenSheet] = useState<SheetKind | null>(null);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const installedProviders = useMemo(
    () => catalog.providers.filter((item) => item.installed).map((item) => item.id),
    [catalog.providers],
  );
  // Only the selected provider is probed on mount; the rest warm via
  // useModelCatalogPrefetch after first paint, deduped by query key.
  const modelCatalog = useAllProviderModels(provider ? [provider] : []);
  useModelCatalogPrefetch(installedProviders);
  const projects = taskState.data?.projects ?? [];
  const selectedProject = projects.find((item) => item.id === projectId);
  // Same resolution the session composer applies, so a command typed as the
  // very first prompt reaches the provider in its native form too.
  const commandCatalog = useComposerCommands(provider, selectedProject?.path);
  const projectless = selectedProject?.name === 'No project';
  const branches = useQuery({
    queryKey: daemonKeys.branches(
      daemon.activeProfile?.id ?? 'disconnected',
      selectedProject?.path ?? 'missing',
    ),
    queryFn: () => inspectBranches(daemon.client!, selectedProject!.path),
    // Deferred to sheet-open: a git inspect over the daemon WS is only worth
    // paying for when the user actually picks a branch.
    enabled: daemon.phase === 'connected' && Boolean(daemon.client && selectedProject) &&
      isolated && openSheet === 'branch',
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!projectId || !projects.some((project) => project.id === projectId)) {
      setProjectId(projects[0]?.id ?? null);
    }
  }, [projectId, projects]);

  useEffect(() => {
    if (projectless && isolated) setIsolated(false);
  }, [isolated, projectless]);

  useEffect(() => setBaseBranch(null), [projectId]);

  useEffect(() => {
    if (provider && installedProviders.includes(provider)) return;
    const preferred = installedProviders.includes('codex') ? 'codex' : installedProviders[0];
    if (preferred) {
      setProvider(preferred);
      setAgentPreset(null);
      setModel(null);
      setReasoningEffort(null);
      setServiceTier(null);
      setContextWindow(null);
    }
  }, [installedProviders, provider]);

  // Restore the last-used composition (provider/model traits via the shared
  // composer preferences, plus mobile extras) once per daemon.
  const [restoredAddress, setRestoredAddress] = useState<string | null>(null);
  const restoredFor = useRef<string | null>(null);
  const preferencesRef = useRef<ComposerPreferences | null>(null);
  useEffect(() => {
    const address = daemon.activeProfile?.address;
    if (!address || restoredFor.current === address) return;
    restoredFor.current = address;
    preferencesRef.current = null;
    setRestoredAddress(null);
    void (async () => {
      const [prefs, extras] = await Promise.all([
        loadComposerPreferences(address),
        loadNewTaskExtras(address),
      ]);
      setRuntimeMode(extras.runtimeMode);
      setIsolated(extras.isolated);
      if (extras.projectId) setProjectId(extras.projectId);
      setProvider(prefs.lastProvider);
      setModel(prefs.lastModel);
      setReasoningEffort(prefs.lastReasoningEffort);
      setServiceTier(prefs.lastServiceTier);
      setContextWindow(prefs.lastContextWindow);
      preferencesRef.current = prefs;
      setRestoredAddress(address);
    })();
  }, [daemon.activeProfile?.address]);

  // Unlike the web SPA, this screen unmounts between visits, so every choice
  // persists as it is made — not only when a task is created.
  useEffect(() => {
    const address = daemon.activeProfile?.address;
    if (!address || restoredAddress !== address) return;
    const timer = setTimeout(() => {
      void loadComposerPreferences(address).then((stored) => {
        const prefs = preferencesRef.current ?? stored;
        let next: ComposerPreferences = {
          ...prefs,
          ...(provider ? { lastProvider: provider } : {}),
          lastModel: model,
          lastReasoningEffort: reasoningEffort,
          lastServiceTier: serviceTier,
          lastContextWindow: contextWindow,
        };
        if (provider && model) {
          next = rememberComposerSession(next, {
            provider,
            model,
            reasoning_effort: reasoningEffort,
            service_tier: serviceTier,
            context_window: contextWindow,
          });
        }
        preferencesRef.current = next;
        return saveComposerPreferences(address, next);
      }).catch(() => {});
      void saveNewTaskExtras(address, {
        runtimeMode,
        isolated,
        projectId,
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [
    contextWindow,
    daemon.activeProfile?.address,
    isolated,
    model,
    projectId,
    provider,
    reasoningEffort,
    restoredAddress,
    runtimeMode,
    serviceTier,
  ]);

  // Cross-device draft: hydrate again whenever this surface becomes active,
  // but persist only real local edits. Echoing a hydrated value would let a
  // backgrounded mobile client resurrect it after desktop submits it.
  const draftSync = useSyncedComposerDraft({
    target: selectedProject
      ? { type: 'newSession', projectId: selectedProject.id }
      : null,
    text: prompt,
    carryAcrossTargets: true,
    onHydrate: (synchronized) => setPrompt(synchronized.text),
  });

  function pick(apply: () => void) {
    return () => {
      tapHaptic();
      apply();
      setOpenSheet(null);
    };
  }

  // Same import pipeline the session composer uses: each file is uploaded to
  // the daemon once and referenced by blob from the first prompt on.
  const attachmentImportTail = useRef<Promise<void>>(Promise.resolve());
  const pendingAttachmentImports = useRef(0);
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);

  async function addLocalFiles(files: LocalAttachmentFile[]) {
    if (!files.length) return;
    pendingAttachmentImports.current += 1;
    setImportingAttachments(true);
    setError(null);
    const operation = attachmentImportTail.current.catch(() => {}).then(async () => {
      const client = daemon.client;
      if (!client || daemon.phase !== 'connected') {
        throw new Error('Kerenzikov daemon is disconnected');
      }
      for (const file of files) {
        const imported = await importLocalAttachment(client, file);
        if (mounted.current) setAttachments((current) => [...current, imported]);
      }
    });
    attachmentImportTail.current = operation;
    try {
      await operation;
      tapHaptic();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      setError(cause instanceof Error ? cause.message : String(cause));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  function applyModelSelection(selection: ProviderModelSelection) {
    let preferences = preferencesRef.current;
    if (preferences && provider && model) {
      preferences = rememberComposerSession(preferences, {
        provider,
        model,
        reasoning_effort: reasoningEffort,
        service_tier: serviceTier,
        context_window: contextWindow,
      });
      preferencesRef.current = preferences;
    }
    const remembered = preferences && selection.model
      ? rememberedModelTraits(preferences, selection.provider, selection.model)
      : undefined;
    if (selection.provider !== provider) setAgentPreset(null);
    setProvider(selection.provider);
    setModel(selection.model);
    setReasoningEffort(remembered ? remembered.reasoningEffort : selection.reasoningEffort);
    setServiceTier(remembered ? remembered.serviceTier : selection.serviceTier);
    setContextWindow(remembered ? remembered.contextWindow : selection.contextWindow);
  }

  function applyModelTraits(changes: Partial<ModelTraitSelection>) {
    if (changes.reasoningEffort !== undefined) setReasoningEffort(changes.reasoningEffort);
    if (changes.serviceTier !== undefined) setServiceTier(changes.serviceTier);
    if (changes.contextWindow !== undefined) setContextWindow(changes.contextWindow);
  }

  async function start() {
    const typed = prompt.trim();
    const value = provider
      ? resolvedComposerSubmission(provider, typed, commandCatalog.data ?? []) ?? typed
      : typed;
    if (
      !selectedProject
      || !provider
      || (!typed && attachments.length === 0)
      || submitting
      || importingAttachments
    ) return;
    const submittedAttachments = attachments;
    setSubmitting(true);
    setError(null);
    try {
      const session = await runtime.createTask(
        selectedProject.id,
        provider,
        isolated && !projectless,
        value,
        {
          model,
          reasoningEffort,
          serviceTier,
          contextWindow,
          runtimeMode,
          baseBranch,
          agentPreset,
        },
        submittedAttachments,
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const address = daemon.activeProfile?.address;
      if (address) {
        void loadComposerPreferences(address).then((stored) => {
          const prefs = preferencesRef.current ?? stored;
          // `rememberComposerSession` records the provider even when the
          // session carries no model, so a model-less task still updates the
          // next task's default.
          const next = rememberComposerSession(prefs, session);
          preferencesRef.current = next;
          return saveComposerPreferences(address, next);
        }).catch(() => {});
        void saveNewTaskExtras(address, {
          runtimeMode,
          isolated: isolated && !projectless,
          projectId: selectedProject.id,
        }).catch(() => {});
      }
      draftSync.removeSubmittedDraft();
      setPrompt('');
      setAttachments([]);
      setSubmitting(false);
      router.push({ pathname: '/session/[id]', params: { id: session.id } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSubmitting(false);
    }
  }

  const providerModels = modelCatalog.find((entry) => entry.id === provider)?.models ?? [];
  const disconnected = daemon.phase !== 'connected';
  // Mirrors desktop AgentSession::can_choose_agent_preset: presets are offered
  // by Codex | DeepSeek | OpenCode. Codex joins them through its own
  // ~/.codex/agents/*.toml directory rather than a wire catalogue.
  const supportsAgentPreset =
    provider === 'codex' ||
    provider === 'deepSeek' ||
    provider === 'openCode';
  const agentPresetProbe = useProviderModels(supportsAgentPreset ? provider : null);
  const agentPresets = agentPresetProbe.data?.agent_presets ?? [];
  const activeModel = model
    ? providerModels.find((item) => item.id === model)
    : providerModels.find((item) => item.is_default) ?? providerModels[0];
  const modelLabel = !provider
    ? catalog.isPending ? 'Checking agents…' : 'No agents installed'
    : activeModel?.name ?? model ?? providerLabel(provider);
  const branchLabel = baseBranch
    ?? branches.data?.default_branch
    ?? branches.data?.current
    ?? 'Default branch';
  // The trigger is read from the draft, the same as the session composer, so a
  // command typed as the first prompt gets its own suggestion list.
  const composerTrigger = detectComposerTrigger(prompt, prompt.length);
  const commandNames =
    composerTrigger?.kind === 'command'
      ? filterComposerCommands(commandCatalog.data ?? [], composerTrigger.query).map(
          (command) => command.name,
        )
      : [];
  const projectFiles = useProjectFiles(
    selectedProject?.path,
    composerTrigger?.kind === 'file',
  );
  const fileSuggestions = useMemo(
    () =>
      composerTrigger?.kind === 'file'
        ? filterComposerFiles(projectFiles.data ?? [], composerTrigger.query)
        : [],
    [composerTrigger, projectFiles.data],
  );
  const startDisabled = !selectedProject
    || !provider
    || (!prompt.trim() && attachments.length === 0)
    || submitting
    || importingAttachments;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Title and back button are the native navigation bar's; keep clear of it. */}
      <View style={{ height: headerInset }} />
      {/* The connection notice belongs at the top on this screen for the same
          reason it is at the top on a session: it explains why nothing else on
          the page will work, and a warning under the setup rows is a warning
          read after the reader has already tried to use them. It rides the
          composer card as `aboveCard` today, which puts it at the bottom. */}
      <View pointerEvents="box-none" style={[styles.linkBanner, { top: headerInset + 8 }]}>
        <ConnectionBanner floating />
      </View>
      {/* The setup area scrolls. With the keyboard up this region is all that
          can give, and without a scroll it simply overflowed — which pushed the
          composer, the last child, under the keyboard. */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}>
        <View style={styles.templates}>
          {PROMPT_TEMPLATES.map((template) => (
            <Chip
              accessibilityLabel={`Start from: ${template.title}`}
              key={template.title}
              onPress={() => {
                tapHaptic();
                setPrompt(template.prompt);
              }}
              size="sm"
              start={<AppSymbol name={template.icon} size={13} tintColor={theme.textSecondary} />}
              variant="outline"
            >
              <Chip.Label>{template.title}</Chip.Label>
            </Chip>
          ))}
        </View>

        <View style={styles.rows}>
          <SelectorRow
            icon={{ ios: 'laptopcomputer', android: 'laptop_mac', web: 'laptop_mac' }}
            label="Daemon"
            loading={
              daemon.phase === 'connecting'
              || daemon.phase === 'booting'
              || daemon.phase === 'reconnecting'
            }
            value={daemon.activeProfile?.name ?? 'Add a daemon'}
            onPress={() => setOpenSheet('daemon')}
          />
          <SelectorRow
            icon={{ ios: 'folder', android: 'folder', web: 'folder' }}
            label="Project"
            loading={taskState.isPending}
            value={selectedProject?.name ?? 'Choose a project'}
            onPress={() => setOpenSheet('project')}
          />
          {/* The model moved into the composer header, where the session screen
              already keeps it — one place to answer "what will run this", rather
              than the same name in a setup row and again above the input. */}
          <SelectorRow
            icon={{ ios: 'externaldrive', android: 'storage', web: 'storage' }}
            label="Workspace"
            value={isolated ? 'Isolated worktree' : 'Work locally'}
            onPress={() => setOpenSheet('workspace')}
          />
          {isolated && (
            <SelectorRow
              icon={{ ios: 'arrow.triangle.branch', android: 'account_tree', web: 'account_tree' }}
              label="Base branch"
              loading={branches.isPending && branches.fetchStatus !== 'idle'}
              value={branchLabel}
              onPress={() => setOpenSheet('branch')}
            />
          )}
          <SelectorRow
            icon={{ ios: 'arrow.uturn.down', android: 'restart_alt', web: 'restart_alt' }}
            label="Resume external session"
            value="Resume from CLI"
            onPress={() => {
              tapHaptic();
              setResumeOpen(true);
            }}
          />
        </View>
      </ScrollView>

      <ComposerSurface
        attachments={attachments}
        commands={commandNames.length > 0 ? commandNames : undefined}
        editable={!submitting}
        error={error && !isDaemonDisconnectError(error) ? (
          // A PanelUI `Alert`, not the tinted `View` this used to be: every
          // other failure in the app is an `Alert`, and a hand-rolled strip
          // here made the same class of failure read as a different component
          // on this screen than on a session. A disconnect is left out because
          // the banner above the card already owns it — showing both says the
          // same thing twice, which is the rule the composer follows too.
          <Alert className="mb-1.5" variant="destructive">
            <Alert.Content>
              <Alert.Title className="text-destructive">{error}</Alert.Title>
            </Alert.Content>
          </Alert>
        ) : null}
        header={provider && supportsAgentPreset && agentPresets.length > 0 && !submitting ? (
          // The agent preset is the one control the session composer has no
          // equivalent for — it is chosen here, and fixed for the session's
          // life. It sits at the card's top-left as a round action, matching
          // the toolbar's other controls, so the header costs one row of
          // nothing else.
          <View className="flex-row items-center px-1 pb-1 pt-1.5" style={styles.agentPicker}>
            <AgentPresetMenu
              agentPreset={agentPreset}
              onApply={(selection) => {
                tapHaptic();
                setAgentPreset(selection.agentPreset);
              }}
              provider={provider}
              variant="icon"
            />
          </View>
        ) : undefined}
        files={fileSuggestions}
        onPickCommand={(name) => {
          tapHaptic();
          setPrompt(`/${name} `);
        }}
        onPickFile={(file) => {
          // Replace the `@query`, not the whole draft.
          if (composerTrigger?.kind !== 'file') return;
          draftSync.markEdited();
          setPrompt(replaceComposerFileTrigger(prompt, composerTrigger, file).text);
          tapHaptic();
        }}
        onRemoveAttachment={(index) => {
          draftSync.markEdited();
          setAttachments((current) => current.filter((_, item) => item !== index));
        }}
        onSubmit={() => void start()}
        onValueChange={(value) => {
          draftSync.markEdited();
          setPrompt(value);
        }}
        pendingFiles={importingAttachments ? [{ id: 0, name: 'Attaching…' }] : undefined}
        placeholder={`Work on ${daemon.activeProfile?.name ?? 'your daemon'}`}
        toolbar={
          <AIInput.Toolbar>
            <ComposerAttachmentMenu
              disabled={disconnected || submitting || importingAttachments}
              onChoose={(source) => void chooseAttachment(source)}
            />
            <ComposerAccessMenu
              mode={runtimeMode}
              onApply={setRuntimeMode}
            />
            <ComposerModelPill
              accessibilityLabel={`Model, ${modelLabel}`}
              label={modelLabel}
              onPress={() => setOpenSheet('model')}
            />
            {activeModel && modelHasConfigurableTraits(activeModel) && (
              <AIInput.Action
                icon={<ProviderIcon provider={provider!} size={15} />}
                label="Reasoning and model options"
                onPress={() => setOpenSheet('traits')}
              />
            )}
            <AIInput.Spacer />
            <SendButton
              busy={submitting}
              disabled={startDisabled}
              label="Start task"
              onPress={() => void start()}
            />
          </AIInput.Toolbar>
        }
        value={prompt}
      />

      <DaemonPickerSheet
        onDismiss={() => setOpenSheet(null)}
        visible={openSheet === 'daemon'}
      />

      <Sheet onDismiss={() => setOpenSheet(null)} title="Project" visible={openSheet === 'project'}>
        {projects.map((project) => (
          <SheetRow
            description={project.path}
            key={project.id}
            label={project.name}
            onPress={pick(() => setProjectId(project.id))}
            selected={project.id === projectId}
          />
        ))}
        <SheetRow
          description="Browse the daemon host, then add a folder or an empty workspace"
          label="Add new project…"
          leading={(
            <AppSymbol
              name={{ ios: 'folder.badge.plus', android: 'create_new_folder', web: 'create_new_folder' }}
             
              tintColor={theme.textSecondary}
            />
          )}
          onPress={() => {
            setOpenSheet(null);
            setProjectPickerOpen(true);
          }}
        />
      </Sheet>

      <ModelPickerSheet
        model={model}
        onApply={applyModelSelection}
        onDismiss={() => setOpenSheet(null)}
        provider={provider}
        providers={installedProviders}
        visible={openSheet === 'model'}
      />

      {activeModel && (
        <ModelTraitsSheet
          model={activeModel}
          onApply={applyModelTraits}
          onDismiss={() => setOpenSheet(null)}
          selection={{ reasoningEffort, serviceTier, contextWindow }}
          visible={openSheet === 'traits'}
        />
      )}

      <Sheet onDismiss={() => setOpenSheet(null)} title="Workspace" visible={openSheet === 'workspace'}>
        <SheetRow
          description="Run in the project checkout"
          label="Work locally"
          onPress={pick(() => setIsolated(false))}
          selected={!isolated}
        />
        <SheetRow
          description="A separate branch and folder that never touches the checkout"
          disabled={projectless}
          label="Isolated worktree"
          onPress={pick(() => setIsolated(true))}
          selected={isolated}
        />
      </Sheet>

      <Sheet onDismiss={() => setOpenSheet(null)} title="Base branch" visible={openSheet === 'branch'}>
        {branches.isPending ? (
          <View style={styles.sheetLoading}>
            <Blocks color={theme.accent} />
          </View>
        ) : branches.error ? (
          <Text style={[styles.sheetNote, { color: theme.danger }]}>
            {branches.error instanceof Error ? branches.error.message : String(branches.error)}
          </Text>
        ) : !branches.data ? (
          <Text style={[styles.sheetNote, { color: theme.textTertiary }]}>
            This project isn’t a Git repository.
          </Text>
        ) : (
          branches.data.branches.map((branch) => (
            <SheetRow
              description={branch.name === branches.data?.current ? 'Current branch' : undefined}
              key={branch.name}
              label={branch.name}
              onPress={pick(() => setBaseBranch(branch.name))}
              selected={branch.name === (baseBranch ?? branches.data?.default_branch ?? branches.data?.current)}
            />
          ))
        )}
      </Sheet>

      <RemoteProjectPicker
        visible={projectPickerOpen}
        onDismiss={() => setProjectPickerOpen(false)}
        onSelect={(project) => setProjectId(project.id)}
      />

      <ResumeSessionSheet
        visible={resumeOpen}
        onDismiss={() => setResumeOpen(false)}
        onResume={(resumed) => {
          setResumeOpen(false);
          router.push({ pathname: '/session/[id]', params: { id: resumed.id } });
        }}
        installedProviders={installedProviders}
        initialProvider={provider}
      />
    </KeyboardAvoidingView>
  );
}

/** Full-width context row: icon, current value, unfold affordance. The label
 * never shows — the value is what changes and what you recognise — but it
 * stays on the accessibility node, and the sheet it opens is titled with it.
 * 52dp tall, so the target clears Material's 48dp minimum on its own. */
function SelectorRow({
  icon,
  label,
  value,
  onPress,
  loading = false,
}: {
  icon: Parameters<typeof AppSymbol>[0]['name'];
  label: string;
  value: string;
  onPress: () => void;
  loading?: boolean;
}) {
  const theme = useTheme();
  return (
    <Item
      accessibilityLabel={`${label}: ${value}`}
      disabled={loading}
      onPress={onPress}
      pressScale={1}
      size="sm"
    >
      <Item.Media>
        <AppSymbol name={icon} size={19} tintColor={theme.textSecondary} />
      </Item.Media>
      <Item.Content>
        {loading ? (
          <Blocks color={theme.accent} />
        ) : (
          <Item.Title numberOfLines={1}>{value}</Item.Title>
        )}
      </Item.Content>
      <Item.Actions>
        <AppSymbol
          name={{ ios: 'chevron.up.chevron.down', android: 'unfold_more', web: 'unfold_more' }}
          size={13}
          tintColor={theme.textTertiary}
        />
      </Item.Actions>
    </Item>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // The connection notice, floating over the setup area. Absolute so it does
  // not take a row from the scroll that owns the space, and inset by 12 to
  // match the shell every other surface on the screen sits in.
  linkBanner: { left: 12, position: 'absolute', right: 12, zIndex: 30 },
  // Grows to fill when there is room, so the setup rows sit just above the
  // composer; shrinks and scrolls once the keyboard takes the space.
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'flex-end', paddingBottom: 8 },
  templates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
    paddingHorizontal: Spacing.three,
  },
  rows: { gap: 2, paddingBottom: 8, paddingHorizontal: Spacing.three },
  // A nudge in from the card's corner: the round action sits on the field's
  // own inset, which is tighter than a circle wants against the edge.
  agentPicker: { marginLeft: 2, marginTop: 2 },
  sheetLoading: { alignItems: 'center', paddingVertical: 14 },
  sheetSection: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginHorizontal: 12,
    marginTop: 12,
  },
  sheetNote: { fontSize: 13, lineHeight: 18, paddingHorizontal: 12, paddingVertical: 10 },
});
