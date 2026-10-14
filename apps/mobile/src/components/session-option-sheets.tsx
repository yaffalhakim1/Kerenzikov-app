import { BottomSheetFlatList } from '@expo/ui/community/bottom-sheet';
import type {
  AgentSession,
  ProviderKind,
  ProviderModel,
  ProviderSessionSummary,
  RuntimeMode,
} from '@waku/client';
import { Alert } from 'panelui-native/components/alert';
import { Button } from 'panelui-native/components/button';
import { SearchBar } from 'panelui-native/components/search-bar';
import { Typography } from 'panelui-native/components/typography';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppPressable } from '@/components/app-pressable';

import { AppSymbol } from './app-symbol';
import { Blocks } from './blocks';
import { ProviderIcon } from './provider-icon';
import { Sheet } from './sheet';

import { Radius, Spacing } from '@/constants/theme';
import { useAllProviderModels, useProviderModels } from '@/hooks/use-daemon-data';
import { useTheme } from '@/hooks/use-theme';
import {
  resolveModelTraitSelection,
  type ModelTraitSelection,
} from '@/lib/model-traits';
import {
  providerLabel,
  runtimeModeLabel,
  type TurnOption,
} from '@/lib/session-presentation';
import { listProviderSessions, providerSessionNativeId } from '@/lib/daemon-api';
import { useDaemon } from '@/lib/daemon-context';
import { tapHaptic } from '@/lib/haptics';
import { useRuntime } from '@/lib/runtime-context';

export interface ModelSelection {
  model: string | null;
  reasoningEffort: string | null;
}

export interface AgentPresetSelection {
  agentPreset: string | null;
}

/**
 * One option in a sheet.
 *
 * `AppPressable`, not PanelUI `Item`, and that is deliberate. `Item` renders
 * through `AnimatedPressable` — an `Animated.createAnimatedComponent(Pressable)`
 * driven by a Reanimated style — and these rows live inside `@expo/ui`'s
 * native sheet, whose content is hosted by a native `HostView`. Reanimated
 * cannot update props on a view inside that host; it fails with
 * `synchronouslyUpdateUIProps failed`, and the row never takes the press. Every
 * picker in the app (model, reasoning effort, access, service tier, context
 * window) stopped responding when these rows were moved onto `Item`.
 *
 * `Item` is fine everywhere else — it drives the transcript's rows and the
 * activity list, neither of which is inside a native sheet.
 *
 * Selection is carried by the trailing check alone, not by a fill: a tinted
 * background reads as a hover remnant on a static picker, and the checkmark is
 * the stronger signal anyway.
 */
function OptionRow({
  label,
  description,
  selected = false,
  disabled = false,
  leading,
  onPress,
}: {
  label: string;
  description?: string | null;
  selected?: boolean;
  disabled?: boolean;
  leading?: ReactNode;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        {
          backgroundColor: pressed ? theme.overlayStrong : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      {leading ? <View style={styles.optionMedia}>{leading}</View> : null}
      <View style={styles.optionCopy}>
        <Text numberOfLines={1} style={[styles.optionLabel, { color: theme.text }]}>
          {label}
        </Text>
        {description ? (
          <Text numberOfLines={2} style={[styles.optionDescription, { color: theme.textTertiary }]}>
            {description}
          </Text>
        ) : null}
      </View>
      {selected ? (
        <AppSymbol
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          size={15}
          tintColor={theme.accent}
        />
      ) : null}
    </AppPressable>
  );
}

/** The eyebrow over a run of options. */
function SectionHeading({ children }: { children: string }) {
  return (
    <Typography
      className="mx-3 mb-1.5 mt-3.5"
      type="body-xs"
      weight="semibold"
      muted>
      {children}
    </Typography>
  );
}

/** The one line a sheet shows instead of rows: nothing installed, nothing to
 *  pick, or a search that matched nothing. */
function SheetNote({ children }: { children: ReactNode }) {
  return (
    <Typography className="px-3 py-2.5" type="body-sm" muted>
      {children}
    </Typography>
  );
}

/** A failed probe or import, as a PanelUI `Alert` so it carries the library's
 *  status icon and its soft destructive surface rather than plain red text. */
function SheetError({ message }: { message: string }) {
  return (
    <View className="px-3 pt-2">
      <Alert accessibilityLiveRegion="polite" variant="destructive">
        <Alert.Indicator />
        <Alert.Content>
          {/* This app redefines `--color-destructive-foreground` as the
              contrast pair for a *solid* destructive fill, so the variant's
              default title colour lands white-on-pink here. The text part
              takes the colour instead. */}
          <Alert.Title className="text-destructive">{message}</Alert.Title>
        </Alert.Content>
      </Alert>
    </View>
  );
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/** Picks how many turns a rewind or a fork keeps.
 *
 * Rewind and fork are destructive and irreversible, so the sheet only selects
 * a target — the caller confirms before anything is sent to the daemon.
 */
export function TurnSheet({
  visible,
  onDismiss,
  title,
  note,
  turns,
  onPick,
}: {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  note?: string;
  turns: TurnOption[];
  onPick: (turnCount: number) => void;
}) {
  function pick(turnCount: number) {
    tapHaptic();
    onPick(turnCount);
    onDismiss();
  }

  return (
    <Sheet onDismiss={onDismiss} title={title} visible={visible}>
      {note ? <SheetNote>{note}</SheetNote> : null}
      {turns.map((turn) => (
        <OptionRow
          key={turn.turnCount}
          label={turn.label}
          onPress={() => pick(turn.turnCount)}
        />
      ))}
      {!turns.length && (
        <SheetNote>This task has no completed turn to rewind to yet.</SheetNote>
      )}
    </Sheet>
  );
}

export function modelDisplayName(
  models: ProviderModel[] | undefined,
  model: string | null,
): string {
  if (!model) return 'Default model';
  return models?.find((item) => item.id === model)?.name ?? model;
}

/** Model + reasoning-effort picker, backed by the daemon's model discovery. */
export function ModelSheet({
  visible,
  onDismiss,
  provider,
  model,
  reasoningEffort,
  onApply,
}: {
  visible: boolean;
  onDismiss: () => void;
  provider: ProviderKind;
  model: string | null;
  reasoningEffort: string | null;
  onApply: (selection: ModelSelection) => void;
}) {
  const theme = useTheme();
  const probe = useProviderModels(visible ? provider : null);
  const models = probe.data?.models ?? [];
  const selected = model ? models.find((item) => item.id === model) : models.find((item) => item.is_default);
  const efforts = selected?.reasoning_efforts ?? [];

  function pickModel(next: ProviderModel) {
    tapHaptic();
    onApply({
      model: next.id,
      reasoningEffort: next.default_reasoning_effort ?? null,
    });
    if (!next.reasoning_efforts.length) onDismiss();
  }

  return (
    <Sheet onDismiss={onDismiss} title={`${providerLabel(provider)} model`} visible={visible}>
      {probe.isPending ? (
        <View className="items-center justify-center py-10">
          <Blocks color={theme.accent} size={20} />
        </View>
      ) : probe.error ? (
        <SheetError message={errorMessage(probe.error)} />
      ) : (
        <>
          {models.map((item) => (
            <OptionRow
              description={item.sub_provider ?? undefined}
              key={item.id}
              label={item.name}
              onPress={() => pickModel(item)}
              selected={model === item.id || (!model && item.is_default)}
            />
          ))}
          {!models.length && (
            <SheetNote>
              This agent doesn’t expose a model list; it will use its own default.
            </SheetNote>
          )}
          {efforts.length ? (
            <>
              <SectionHeading>REASONING EFFORT</SectionHeading>
              {efforts.map((effort) => (
                <OptionRow
                  description={effort.description ?? undefined}
                  key={effort.id}
                  label={effort.label}
                  onPress={() => {
                    tapHaptic();
                    onApply({ model: selected?.id ?? model, reasoningEffort: effort.id });
                    onDismiss();
                  }}
                  selected={(reasoningEffort ?? selected?.default_reasoning_effort) === effort.id}
                />
              ))}
            </>
          ) : null}
        </>
      )}
    </Sheet>
  );
}

/** All model-advertised options in one sheet. Unlike single-choice pickers,
 * it stays open after a choice so effort, tier, and context can be configured
 * together before starting a task. */
export function ModelTraitsSheet({
  visible,
  onDismiss,
  model,
  selection,
  onApply,
}: {
  visible: boolean;
  onDismiss: () => void;
  model: ProviderModel;
  selection: ModelTraitSelection;
  onApply: (changes: Partial<ModelTraitSelection>) => void;
}) {
  const resolved = resolveModelTraitSelection(model, selection);

  function pick(changes: Partial<ModelTraitSelection>) {
    tapHaptic();
    onApply(changes);
  }

  return (
    <Sheet onDismiss={onDismiss} visible={visible}>
      {model.reasoning_efforts.length ? (
        <>
          <SectionHeading>REASONING EFFORT</SectionHeading>
          {model.reasoning_efforts.map((option) => (
            <OptionRow
              description={optionDescription(
                option.description,
                model.default_reasoning_effort === option.id,
              )}
              key={option.id}
              label={option.label}
              onPress={() => pick({ reasoningEffort: option.id })}
              selected={resolved.reasoningEffort === option.id}
            />
          ))}
        </>
      ) : null}
      {model.service_tiers.length ? (
        <>
          <SectionHeading>SERVICE TIER</SectionHeading>
          <OptionRow
            description={(model.default_service_tier ?? 'default') === 'default'
              ? 'Default'
              : undefined}
            label="Standard"
            onPress={() => pick({ serviceTier: 'default' })}
            selected={resolved.serviceTier === 'default'}
          />
          {model.service_tiers.map((option) => (
            <OptionRow
              description={optionDescription(
                option.description,
                model.default_service_tier === option.id,
              )}
              key={option.id}
              label={option.label}
              onPress={() => pick({ serviceTier: option.id })}
              selected={resolved.serviceTier === option.id}
            />
          ))}
        </>
      ) : null}
      {model.context_windows.length ? (
        <>
          <SectionHeading>CONTEXT WINDOW</SectionHeading>
          {model.context_windows.map((option) => (
            <OptionRow
              description={optionDescription(
                option.description,
                model.default_context_window === option.id,
              )}
              key={option.id}
              label={option.label}
              onPress={() => pick({ contextWindow: option.id })}
              selected={resolved.contextWindow === option.id}
            />
          ))}
        </>
      ) : null}
    </Sheet>
  );
}

export interface ProviderModelSelection extends ModelTraitSelection {
  provider: ProviderKind;
  model: string | null;
}

/**
 * Two-screen cross-provider model picker: opening lands on the current
 * provider's models with a search filter over a virtualized list; the back
 * row (named after the provider) slides across to the providers screen, and
 * choosing a provider slides back into that provider's models.
 */
export function ModelPickerSheet({
  visible,
  onDismiss,
  providers,
  provider,
  model,
  onApply,
}: {
  visible: boolean;
  onDismiss: () => void;
  providers: ProviderKind[];
  provider: ProviderKind | null;
  model: string | null;
  onApply: (selection: ProviderModelSelection) => void;
}) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const catalog = useAllProviderModels(visible ? providers : []);
  const [browsing, setBrowsing] = useState<ProviderKind | null>(provider);
  const [search, setSearch] = useState('');
  const reduceMotion = useReducedMotion();
  // 0 = providers page, 1 = models page.
  const progress = useSharedValue(1);
  const pageWidth = useSharedValue(0);
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -pageWidth.value * progress.value }],
  }));

  useEffect(() => {
    if (!visible) return;
    const opening = provider ?? providers[0] ?? null;
    setBrowsing(opening);
    setSearch('');
    progress.value = opening ? 1 : 0;
    // `providers` is a fresh array each render, so depending on it here would
    // reset the sheet on every parent render — and a running task re-renders
    // this screen several times a second, which snapped `browsing` back to the
    // current provider mid-tap. The open transition is the only moment this
    // should run.
  }, [progress, visible]);

  function slideTo(target: 0 | 1) {
    progress.value = reduceMotion
      ? target
      : withTiming(target, { duration: 260, easing: Easing.bezier(0.32, 0.72, 0.25, 1) });
  }

  const entry = catalog.find((item) => item.id === browsing);
  const preferredModelId = entry?.models.find((item) => item.is_default)?.id
    ?? entry?.models[0]?.id;
  const listHeight = Math.round(windowHeight * 0.48);
  const items = useMemo<ProviderModel[]>(() => {
    const query = search.trim().toLocaleLowerCase();
    const models = entry?.models ?? [];
    if (!query) return models;
    return models.filter((item) => (
      item.name.toLocaleLowerCase().includes(query) ||
        item.id.toLocaleLowerCase().includes(query) ||
        item.sub_provider?.toLocaleLowerCase().includes(query)
    ));
  }, [entry?.models, search]);

  function pickModel(next: ProviderModel) {
    if (!browsing) return;
    tapHaptic();
    onApply({
      provider: browsing,
      model: next.id,
      reasoningEffort: next.default_reasoning_effort ?? null,
      serviceTier: next.default_service_tier ?? null,
      contextWindow: next.default_context_window ?? null,
    });
    onDismiss();
  }

  return (
    <Sheet onDismiss={onDismiss} scrollable={false} visible={visible}>
      <View
        style={styles.pagerClip}
        onLayout={(event) => {
          pageWidth.value = event.nativeEvent.layout.width;
        }}>
        <Animated.View style={[styles.pagerTrack, slideStyle]}>
          <View style={styles.page}>
            <BottomSheetFlatList
              data={providers}
              keyExtractor={(id) => id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: id }) => (
                <OptionRow
                  label={providerLabel(id)}
                  leading={<ProviderIcon provider={id} size={20} />}
                  onPress={() => {
                    tapHaptic();
                    setBrowsing(id);
                    setSearch('');
                    slideTo(1);
                  }}
                  selected={id === provider}
                />
              )}
              showsVerticalScrollIndicator={false}
              style={{ height: listHeight }}
              ListEmptyComponent={(
                <SheetNote>No agents are installed on this daemon host.</SheetNote>
              )}
            />
          </View>
          <View style={styles.page}>
            <Button
              accessibilityHint="Shows all providers"
              accessibilityLabel={browsing ? providerLabel(browsing) : 'Provider'}
              className="mx-1 self-start"
              labelClassName="text-primary"
              onPress={() => slideTo(0)}
              size="sm"
              startContent={(
                <AppSymbol
                  name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                  size={14}
                  tintColor={theme.accent}
                />
              )}
              variant="ghost">
              {browsing ? providerLabel(browsing) : 'Provider'}
            </Button>
            <SearchBar
              accessibilityLabel="Search models"
              clearLabel="Clear search"
              containerClassName="mx-1 mb-2"
              onChangeText={setSearch}
              panel="never"
              placeholder="Search models"
              size="sm"
              value={search}
            />
            {entry?.isPending ? (
              <View className="items-center justify-center" style={{ height: listHeight }}>
                <Blocks color={theme.accent} size={20} />
              </View>
            ) : (
              <BottomSheetFlatList
                data={items}
                initialNumToRender={14}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <OptionRow
                    description={item.sub_provider ?? undefined}
                    label={item.name}
                    onPress={() => pickModel(item)}
                    selected={provider === browsing &&
                      (model === item.id || (!model && item.id === preferredModelId))}
                  />
                )}
                showsVerticalScrollIndicator={false}
                style={{ height: listHeight }}
                ListEmptyComponent={(
                  <SheetNote>
                    {search.trim()
                      ? 'No models match your search.'
                      : 'This agent doesn’t expose a model list; it will use its own default.'}
                  </SheetNote>
                )}
              />
            )}
          </View>
        </Animated.View>
      </View>
    </Sheet>
  );
}

const ACCESS_MODES: Array<{ id: RuntimeMode; description: string }> = [
  { id: 'plan', description: 'Investigate and propose without changing files.' },
  { id: 'ask', description: 'Approve every command and file edit.' },
  { id: 'autoAcceptEdits', description: 'Edits apply automatically; commands still ask.' },
  { id: 'auto', description: 'Works autonomously inside the project.' },
  { id: 'fullAccess', description: 'No approval prompts. The agent acts freely.' },
];

/** Agent preset picker for providers that expose startable compositions
 * (DeepSeek Harness, OpenCode). Mirrors the desktop agent chip. */
export function AgentPresetSheet({
  visible,
  onDismiss,
  provider,
  agentPreset,
  onApply,
}: {
  visible: boolean;
  onDismiss: () => void;
  provider: ProviderKind;
  agentPreset: string | null;
  onApply: (selection: AgentPresetSelection) => void;
}) {
  const theme = useTheme();
  const probe = useProviderModels(visible ? provider : null);
  const presets = probe.data?.agent_presets ?? [];
  const fallback = presets.find((preset) => preset.is_default) ?? presets[0];

  return (
    <Sheet onDismiss={onDismiss} title={`${providerLabel(provider)} agent`} visible={visible}>
      {probe.isPending ? (
        <View className="items-center justify-center py-10">
          <Blocks color={theme.accent} size={20} />
        </View>
      ) : probe.error ? (
        <SheetError message={errorMessage(probe.error)} />
      ) : (
        <>
          {presets.map((preset) => (
            <OptionRow
              description={preset.description ?? undefined}
              key={preset.id}
              label={preset.name}
              onPress={() => {
                tapHaptic();
                onApply({ agentPreset: preset.id });
                onDismiss();
              }}
              selected={agentPreset === preset.id || (!agentPreset && preset.id === fallback?.id)}
            />
          ))}
          {!presets.length && (
            <SheetNote>This agent doesn’t expose any startable presets.</SheetNote>
          )}
        </>
      )}
    </Sheet>
  );
}

/** Access-mode picker mirroring the desktop composer's access control. */
export function AccessSheet({
  visible,
  onDismiss,
  mode,
  onApply,
}: {
  visible: boolean;
  onDismiss: () => void;
  mode: RuntimeMode;
  onApply: (mode: RuntimeMode) => void;
}) {
  return (
    <Sheet onDismiss={onDismiss} title="Agent access" visible={visible}>
      {ACCESS_MODES.map((item) => (
        <OptionRow
          description={item.description}
          key={item.id}
          label={runtimeModeLabel(item.id)}
          onPress={() => {
            tapHaptic();
            onApply(item.id);
            onDismiss();
          }}
          selected={mode === item.id}
        />
      ))}
    </Sheet>
  );
}

function optionDescription(description: string | null | undefined, isDefault: boolean) {
  if (description && isDefault) return `Default · ${description}`;
  return description ?? (isDefault ? 'Default' : undefined);
}

/** Adopts a session an agent CLI started on the daemon host as a Kerenzikov task.
 *
 * The sheet first lists installed providers, then the external sessions for
 * the chosen one. Picking a session hands the imported task back through
 * `onResume`; the caller navigates to it. */
export function ResumeSessionSheet({
  visible,
  onDismiss,
  onResume,
  installedProviders,
  initialProvider,
}: {
  visible: boolean;
  onDismiss: () => void;
  onResume: (session: AgentSession) => void;
  installedProviders: ProviderKind[];
  initialProvider: ProviderKind | null;
}) {
  const theme = useTheme();
  const daemon = useDaemon();
  const runtime = useRuntime();
  const [provider, setProvider] = useState<ProviderKind | null>(initialProvider);
  const [summaries, setSummaries] = useState<ProviderSessionSummary[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

  // Reset to the provider step each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setProvider(initialProvider);
      setSummaries([]);
      setError(null);
      setImporting(null);
    }
  }, [visible, initialProvider]);

  // Listing is keyed to the connection so a reconnect mid-pick refetches rather
  // than leaving a stale empty list.
  useEffect(() => {
    if (!visible || !provider || !daemon.client || daemon.phase !== 'connected') return undefined;
    let current = true;
    setPending(true);
    setError(null);
    setSummaries([]);
    void listProviderSessions(daemon.client, provider)
      .then((sessions) => { if (current) setSummaries(sessions); })
      .catch((cause) => {
        if (current) setError(errorMessage(cause));
      })
      .finally(() => { if (current) setPending(false); });
    return () => { current = false; };
  }, [visible, provider, daemon.client, daemon.phase]);

  async function pick(summary: ProviderSessionSummary) {
    if (importing) return;
    setImporting(providerSessionNativeId(summary.cursor));
    try {
      const session = await runtime.resumeProviderSession(summary);
      onResume(session);
    } catch (cause) {
      setError(errorMessage(cause));
      setImporting(null);
    }
  }

  return (
    <Sheet visible={visible} onDismiss={onDismiss} title="Resume external session">
      {provider === null ? (
        installedProviders.map((candidate) => (
          <OptionRow
            key={candidate}
            label={providerLabel(candidate)}
            leading={<ProviderIcon provider={candidate} size={18} />}
            onPress={() => setProvider(candidate)}
          />
        ))
      ) : (
        <>
          <OptionRow
            label="Change provider"
            leading={(
              <AppSymbol
                name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                size={16}
                tintColor={theme.textSecondary}
              />
            )}
            onPress={() => {
              setProvider(null);
              setSummaries([]);
            }}
          />
          {pending ? (
            <View className="items-center justify-center py-10">
              <Blocks color={theme.accent} size={20} />
            </View>
          ) : error ? (
            <SheetError message={error} />
          ) : summaries.length === 0 ? (
            <SheetNote>
              No sessions from {providerLabel(provider)} to resume.
            </SheetNote>
          ) : summaries.map((summary) => {
            const id = providerSessionNativeId(summary.cursor);
            return (
              <OptionRow
                key={`${summary.cursor.provider}:${id}`}
                label={summary.title || 'Untitled session'}
                description={`${providerLabel(summary.cursor.provider)} · ${summary.cwd}`}
                disabled={Boolean(importing)}
                onPress={() => void pick(summary)}
              />
            );
          })}
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // The picker row: a wide, quiet line. `Item`'s padding/radius are for
  // card-shaped rows; these are full-width lines inside a sheet that already
  // carries the horizontal padding.
  optionRow: {
    alignItems: 'center',
    borderRadius: Radius.small,
    flexDirection: 'row',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
  },
  optionMedia: { alignItems: 'center', justifyContent: 'center' },
  optionCopy: { flex: 1, gap: 2, minWidth: 0 },
  optionLabel: { fontSize: 15, fontWeight: '500' },
  optionDescription: { fontSize: 12.5, lineHeight: 17 },
  pagerClip: { overflow: 'hidden' },
  pagerTrack: { flexDirection: 'row', width: '200%' },
  page: { paddingTop: 4, width: '50%' },
});
