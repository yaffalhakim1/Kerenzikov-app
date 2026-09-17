import type { AgentSession } from '@waku/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Drawer } from 'react-native-drawer-layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '@/components/app-pressable';

import { AppSymbol } from '@/components/app-symbol';
import { ConnectionBanner, useConnectionNotice } from '@/components/connection-banner';
import { DaemonPickerSheet } from '@/components/daemon-picker-sheet';
import { GlassSurface } from '@/components/glass-surface';
import { ConnectionStatus, connectionPhaseLabel } from '@/components/connection-status';
import { ProviderIcon } from '@/components/provider-icon';
import { RenameDialog } from '@/components/rename-dialog';
import { Sheet, SheetRow } from '@/components/sheet';
import { TaskRowMenu } from '@/components/task-row-menu';
import { NativeTint, Radius, Spacing } from '@/constants/theme';
import { useSessionMessageSearch, useTaskState } from '@/hooks/use-daemon-data';
import { useTheme } from '@/hooks/use-theme';
import { useDaemon } from '@/lib/daemon-context';
import { useKeyboardHeight } from '@/lib/keyboard-offset';
import { sessionIsRunning } from '@/lib/mobile-runtime';
import { useRuntime } from '@/lib/runtime-context';
import {
  displaySessionTitle,
  foldGroups,
  groupSessions,
  messageSearchRows,
  providerLabel,
  withoutHiddenSessions,
  type MessageSearchRow,
  type SessionGrouping,
  type SessionListItem,
  type SessionOrdering,
} from '@/lib/session-presentation';

const DaemonPickerHeight = 38;
const SearchDockGap = 14;
const SIDEBAR_PREFS_KEY = 'waku.mobile.sidebar-prefs.v1';

interface SidebarPrefs {
  grouping: SessionGrouping;
  ordering: SessionOrdering;
  /** Session ids removed from this phone's list. The daemon still has them. */
  hidden: string[];
  /** Section ids whose rows are folded away. */
  folded: string[];
}

const DEFAULT_SIDEBAR_PREFS: SidebarPrefs = {
  grouping: 'updated',
  ordering: 'newest',
  hidden: [],
  folded: [],
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function parseSidebarPrefs(raw: string | null): SidebarPrefs | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SidebarPrefs>;
    return {
      grouping: value.grouping === 'project' ? 'project' : 'updated',
      ordering: value.ordering === 'oldest' ? 'oldest' : 'newest',
      hidden: stringArray(value.hidden),
      folded: stringArray(value.folded),
    };
  } catch {
    return null;
  }
}
interface TaskDrawerContextValue {
  openTaskDrawer: () => void;
  closeTaskDrawer: () => void;
}

const TaskDrawerContext = createContext<TaskDrawerContextValue | null>(null);

export function TaskDrawerHost({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const daemon = useDaemon();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ id?: string | string[] }>();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  // While the search field is focused the keyboard can swallow the first tap on
  // the drawer overlay, leaving it uncloseable; this adds a one-tap catcher.
  const [searchFocused, setSearchFocused] = useState(false);
  const drawerWidth = Math.max(0, Math.min(360, width - 44));
  const drawerEnabled = daemon.phase === 'booting' || daemon.profiles.length > 0;
  const openTaskDrawer = useCallback(() => {
    if (drawerEnabled) setOpen(true);
  }, [drawerEnabled]);
  const closeTaskDrawer = useCallback(() => setOpen(false), []);
  const controls = useMemo(
    () => ({ openTaskDrawer, closeTaskDrawer }),
    [closeTaskDrawer, openTaskDrawer],
  );
  const swipeEnabled = pathname === '/'
    || pathname === '/new-task'
    || pathname.startsWith('/session/');
  const selectedSessionId = pathname.startsWith('/session/')
    ? Array.isArray(params.id) ? params.id[0] : params.id ?? null
    : null;

  useEffect(() => setOpen(false), [drawerEnabled, pathname]);

  const drawerScene = <View style={styles.drawerScene}>{children}</View>;

  return (
    <TaskDrawerContext.Provider value={controls}>
      <View style={styles.drawerHost}>
        {drawerEnabled ? (
          <Drawer
            drawerStyle={{ backgroundColor: theme.background, width: drawerWidth }}
            // `front`, not `back`: the sidebar slides in over the chat page
            // with a dim overlay, leaving the transcript in place underneath.
            drawerType="front"
            open={open}
            overlayAccessibilityLabel="Close task history"
            overlayStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.18)' }}
            renderDrawerContent={() => (
              <TaskDrawerContent
                drawerWidth={drawerWidth}
                selectedSessionId={selectedSessionId}
                onClose={closeTaskDrawer}
                onSearchFocus={setSearchFocused}
              />
            )}
            // Narrow edge so wide code/tables can pan horizontally without
            // opening the drawer; the button still opens it anywhere.
            swipeEdgeWidth={32}
            swipeEnabled={swipeEnabled}
            onClose={closeTaskDrawer}
            onOpen={openTaskDrawer}>
            {drawerScene}
          </Drawer>
        ) : (
          drawerScene
        )}
        {open && searchFocused && (
          <AppPressable
            accessibilityLabel="Close task history"
            accessibilityRole="button"
            onPress={() => {
              Keyboard.dismiss();
              closeTaskDrawer();
            }}
            style={[styles.drawerCloseCatcher, { left: drawerWidth }]}
          />
        )}
      </View>
    </TaskDrawerContext.Provider>
  );
}

export function useTaskDrawer(): TaskDrawerContextValue {
  const context = useContext(TaskDrawerContext);
  if (!context) throw new Error('useTaskDrawer must be used inside TaskDrawerHost');
  return context;
}

function TaskDrawerContent({
  drawerWidth,
  selectedSessionId,
  onClose,
  onSearchFocus,
}: {
  drawerWidth: number;
  selectedSessionId: string | null;
  onClose: () => void;
  onSearchFocus?: (focused: boolean) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const daemon = useDaemon();
  const runtime = useRuntime();
  const taskState = useTaskState();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // Every keystroke would otherwise be a full transcript scan on the daemon.
  const [messageQuery, setMessageQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setMessageQuery(search.trim()), 180);
    return () => clearTimeout(timer);
  }, [search]);
  const messageSearch = useSessionMessageSearch(messageQuery);
  const [daemonPickerOpen, setDaemonPickerOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<AgentSession | null>(null);
  // Sidebar grouping/ordering, persisted like the desktop's sidebar prefs.
  const [prefs, setPrefs] = useState<SidebarPrefs>(DEFAULT_SIDEBAR_PREFS);
  const [filterOpen, setFilterOpen] = useState(false);
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SIDEBAR_PREFS_KEY)
      .then((raw) => {
        if (!cancelled) {
          const parsed = parseSidebarPrefs(raw);
          if (parsed) setPrefs(parsed);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const updatePrefs = useCallback((patch: Partial<SidebarPrefs>) => {
    setPrefs((previous) => {
      const next = { ...previous, ...patch };
      void AsyncStorage.setItem(SIDEBAR_PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);
  const hiddenSessions = useMemo(() => new Set(prefs.hidden), [prefs.hidden]);
  const foldedGroups = useMemo(() => new Set(prefs.folded), [prefs.folded]);
  const visibleSessions = useMemo(() => {
    const sessions = withoutHiddenSessions(taskState.data?.sessions ?? [], hiddenSessions);
    if (!search.trim()) return sessions;
    const query = search.trim().toLocaleLowerCase();
    const projects = new Map(taskState.data?.projects.map((project) => [project.id, project]));
    return sessions.filter((session) => {
      const project = projects.get(session.project_id);
      return [
        displaySessionTitle(session),
        project?.name,
        project?.path,
        providerLabel(session.provider),
        session.model,
      ].some((value) => value?.toLocaleLowerCase().includes(query));
    });
  }, [hiddenSessions, search, taskState.data]);
  const sections = useMemo(() => {
    const built = taskState.data
      ? groupSessions(taskState.data.projects, visibleSessions, new Date(), prefs)
      : [];
    return foldGroups(built, foldedGroups);
  }, [taskState.data, visibleSessions, prefs, foldedGroups]);
  const messageRows = useMemo(
    () => (messageQuery.trim() && messageSearch.data)
      ? messageSearchRows(messageSearch.data, taskState.data?.sessions ?? [])
      : [],
    [messageQuery, messageSearch.data, taskState.data?.sessions],
  );
  const showNewTask = useCallback(() => {
    onClose();
    router.dismissTo('/');
  }, [onClose]);
  const showSession = useCallback((sessionId: string) => {
    if (selectedSessionId === sessionId) {
      onClose();
    } else if (selectedSessionId) {
      router.setParams({ id: sessionId });
    } else {
      router.replace({ pathname: '/session/[id]', params: { id: sessionId } });
    }
  }, [onClose, selectedSessionId]);

  const handleSelect = useCallback((sessionId: string) => showSession(sessionId), [showSession]);
  const handleRename = useCallback((session: AgentSession) => setRenameTarget(session), []);
  /** Removing is a local list filter, not a daemon delete: the task and its
   *  transcript stay on the daemon for every other device. Undo lives in the
   *  task list sheet, which clears the whole hidden set. */
  const handleRemove = useCallback((session: AgentSession) => {
    updatePrefs({ hidden: [...prefs.hidden, session.id] });
  }, [prefs.hidden, updatePrefs]);
  const toggleGroup = useCallback((groupId: string) => {
    void Haptics.selectionAsync();
    updatePrefs({
      folded: prefs.folded.includes(groupId)
        ? prefs.folded.filter((id) => id !== groupId)
        : [...prefs.folded, groupId],
    });
  }, [prefs.folded, updatePrefs]);

  async function refreshTasks() {
    setRefreshing(true);
    try {
      if (daemon.phase === 'connected') await taskState.refetch();
      else await daemon.reconnect();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Pill and search dock are in normal flow, so the list scrolls in its
        own region between them and never slides underneath either. */}
      <View style={[styles.drawerHeader, { paddingTop: insets.top + 8 }]}>
        <DaemonPill onPress={() => setDaemonPickerOpen(true)} />
      </View>

      <SectionList
        sections={sections}
        extraData={runtime.runtimes}
        keyExtractor={(item) => item.session.id}
        contentContainerStyle={[
          styles.listContent,
          sections.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={(
          <RefreshControl
            colors={[theme.textTertiary]}
            progressViewOffset={insets.top + DaemonPickerHeight + 12}
            refreshing={refreshing}
            tintColor={theme.textTertiary}
            onRefresh={() => void refreshTasks()}
          />
        )}
        renderSectionHeader={({ section }) => {
          const isFolded = foldedGroups.has(section.id);
          // Mirrors the desktop sidebar: a project group reads as a folder,
          // a date group as a chevron. The folder still carries the fold
          // state via open/closed, so both kinds stay one tap to collapse.
          const isProject = prefs.grouping === 'project';
          // `as const` keeps each entry a literal: AppSymbol's name prop is a
          // union of the platform symbol sets, and a plain ternary widens
          // these to `string`, which the union rejects.
          const icon = isProject
            ? ({
                ios: isFolded ? 'folder' : 'folder.fill',
                android: isFolded ? 'folder' : 'folder_open',
                web: isFolded ? 'folder' : 'folder_open',
              } as const)
            : ({
                ios: isFolded ? 'chevron.right' : 'chevron.down',
                android: isFolded ? 'chevron_right' : 'keyboard_arrow_down',
                web: isFolded ? 'chevron_right' : 'keyboard_arrow_down',
              } as const);
          return (
            <AppPressable
              accessibilityLabel={`${section.title}, ${isFolded ? 'collapsed' : 'expanded'}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: !isFolded }}
              onPress={() => toggleGroup(section.id)}
              style={({ pressed }) => [
                styles.sectionHeader,
                { opacity: pressed ? 0.55 : 1 },
              ]}>
              <AppSymbol
                name={icon}
                size={isProject ? 14 : 13}
                tintColor={theme.textTertiary}
              />
              <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>
                {section.title}
              </Text>
              {/* One control for the whole list, riding the first section
                header so it stays top-right whether the title reads "Today"
                or a project name. */}
              {section === sections[0] && (
                <AppPressable
                  accessibilityLabel="Group and order tasks"
                  accessibilityRole="button"
                  hitSlop={8}
                  // Rides the header's press target; a tap here opens the list
                  // options and must not also fold the group.
                  onPress={(event) => {
                    event.stopPropagation();
                    setFilterOpen(true);
                  }}
                  style={({ pressed }) => [styles.filterInner, { opacity: pressed ? 0.5 : 1 }]}>
                  <AppSymbol
                    name={{ ios: 'arrow.up.arrow.down', android: 'sort', web: 'sort' }}
                    size={14}
                    tintColor={theme.text}
                  />
                </AppPressable>
              )}
            </AppPressable>
          );
        }}
        renderItem={({ item }) => (
          <SessionRow
            drawerWidth={drawerWidth}
            item={item}
            running={Boolean(runtime.runtimes[item.session.id]?.running ?? sessionIsRunning(item.session))}
            selected={item.session.id === selectedSessionId}
            onRemove={handleRemove}
            onRename={handleRename}
            onSelect={handleSelect}
          />
        )}
        ListHeaderComponent={(
          <>
            <ConnectionBanner />
            {messageRows.length ? (
              <View style={styles.messageResults}>
                <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>
                  Messages
                </Text>
                {messageRows.map((row, index) => (
                  <MessageResultRow
                    key={`${row.session.id}:${index}`}
                    onSelect={handleSelect}
                    row={row}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
        ListEmptyComponent={(
          <TaskListEmpty
            error={taskState.error}
            searching={Boolean(search.trim()) && !messageRows.length}
            onNewTask={showNewTask}
          />
        )}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      {(daemon.profiles.length > 0 || daemon.phase === 'booting') && (
        <View
          pointerEvents="box-none"
          style={[styles.searchDock, { paddingBottom: insets.bottom + SearchDockGap + keyboardHeight }]}>
          <GlassSurface interactive style={styles.searchCapsule}>
              <View style={styles.searchCapsuleInner}>
                <AppSymbol
                  name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                  size={17}
                  tintColor={theme.textSecondary}
                />
                <TextInput
                  accessibilityLabel="Search tasks"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Search"
                  placeholderTextColor={theme.textTertiary}
                  selectionColor={NativeTint}
                  style={[styles.searchInput, { color: theme.text }]}
                  value={search}
                  onChangeText={setSearch}
                  onFocus={() => onSearchFocus?.(true)}
                  onBlur={() => onSearchFocus?.(false)}
                />
                {search.length > 0 && (
                  <AppPressable
                    accessibilityLabel="Clear search"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setSearch('')}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                    <AppSymbol
                      name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                      size={16}
                      tintColor={theme.textTertiary}
                    />
                  </AppPressable>
                )}
              </View>
            </GlassSurface>
            {daemon.phase === 'connected' && (
              <GlassSurface
                interactive
                style={[styles.composeButton, Platform.OS === 'android' && styles.rippleClip]}>
                <AppPressable
                  accessibilityLabel="New task"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={showNewTask}
                  style={({ pressed }) => [styles.roundInner, { opacity: pressed ? 0.5 : 1 }]}>
                  <AppSymbol
                    name={{ ios: 'square.and.pencil', android: 'edit_square', web: 'edit' }}
                    size={20}
                    tintColor={theme.text}
                  />
                </AppPressable>
              </GlassSurface>
            )}
        </View>
      )}

      {renameTarget && (
        <RenameDialog
          initialValue={displaySessionTitle(renameTarget)}
          onDismiss={() => setRenameTarget(null)}
          onSubmit={(title) => runtime.renameSession(renameTarget.id, title)}
          visible
        />
      )}
      <DaemonPickerSheet
        onDismiss={() => setDaemonPickerOpen(false)}
        visible={daemonPickerOpen}
      />
      <Sheet onDismiss={() => setFilterOpen(false)} title="Task list" visible={filterOpen}>
        <Text style={[styles.filterHeading, { color: theme.textTertiary }]}>Group by</Text>
        <SheetRow
          label="Updated"
          selected={prefs.grouping === 'updated'}
          onPress={() => updatePrefs({ grouping: 'updated' })}
        />
        <SheetRow
          label="Project"
          selected={prefs.grouping === 'project'}
          onPress={() => updatePrefs({ grouping: 'project' })}
        />
        <Text style={[styles.filterHeading, { color: theme.textTertiary }]}>Order</Text>
        <SheetRow
          label="Newest first"
          selected={prefs.ordering === 'newest'}
          onPress={() => updatePrefs({ ordering: 'newest' })}
        />
        <SheetRow
          label="Oldest first"
          selected={prefs.ordering === 'oldest'}
          onPress={() => updatePrefs({ ordering: 'oldest' })}
        />
        {prefs.hidden.length > 0 && (
          <>
            <Text style={[styles.filterHeading, { color: theme.textTertiary }]}>Hidden tasks</Text>
            <SheetRow
              description="Removed tasks stay on the daemon; this only unhides them here."
              label={`Show ${prefs.hidden.length} removed`}
              selected={false}
              onPress={() => updatePrefs({ hidden: [] })}
            />
          </>
        )}
      </Sheet>
    </KeyboardAvoidingView>
  );
}

/** A transcript hit. The title is what you recognise; the snippet is the
 * evidence, so both are shown and neither is truncated to one line only. */
const MessageResultRow = memo(function MessageResultRow({
  onSelect,
  row,
}: {
  onSelect: (sessionId: string) => void;
  row: MessageSearchRow;
}) {
  const theme = useTheme();
  return (
    <AppPressable
      accessibilityLabel={`${displaySessionTitle(row.session)}: ${row.snippet}`}
      accessibilityRole="button"
      onPress={() => onSelect(row.session.id)}
      style={({ pressed }) => [
        styles.messageRow,
        { backgroundColor: pressed ? theme.surfaceMuted : 'transparent' },
      ]}>
      <View style={styles.messageHeading}>
        <ProviderIcon color={theme.textTertiary} provider={row.session.provider} size={11} />
        <Text numberOfLines={1} style={[styles.messageTitle, { color: theme.text }]}>
          {displaySessionTitle(row.session)}
        </Text>
      </View>
      <Text numberOfLines={2} style={[styles.messageSnippet, { color: theme.textSecondary }]}>
        {row.snippet}
      </Text>
    </AppPressable>
  );
});

function DaemonPill({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const daemon = useDaemon();
  return (
    // Android only: the native ripple is a full-bounds drawable that the
    // pressable cannot round itself — the parent must clip it to the pill
    // (ReactViewGroup rounds dispatchDraw for overflow-hidden children).
    // iOS glass masks natively and must not be overflow-clipped.
    <GlassSurface
      interactive
      style={[styles.daemonButton, Platform.OS === 'android' && styles.rippleClip]}>
      <AppPressable
        accessibilityHint="Opens the daemon switcher"
        accessibilityLabel={daemon.activeProfile
          ? `${connectionPhaseLabel(daemon.phase)}: ${daemon.activeProfile.name}`
          : 'Add a daemon'}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onPress}
        style={({ pressed }) => [styles.daemonButtonInner, { opacity: pressed ? 0.62 : 1 }]}>
        {daemon.activeProfile ? <ConnectionStatus compact phase={daemon.phase} /> : (
          <AppSymbol
            name={{ ios: 'plus', android: 'add', web: 'add' }}
            size={14}
            tintColor={theme.text}
          />
        )}
        <Text numberOfLines={1} style={[styles.daemonButtonText, { color: theme.text }]}>
          {daemon.activeProfile?.name ?? 'Add daemon'}
        </Text>
        <AppSymbol
          name={{ ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }}
          size={12}
          tintColor={theme.textTertiary}
        />
      </AppPressable>
    </GlassSurface>
  );
}

function TaskListEmpty({
  error,
  searching,
  onNewTask,
}: {
  error: unknown;
  searching: boolean;
  onNewTask: () => void;
}) {
  const theme = useTheme();
  const { phase } = useDaemon();
  const notice = useConnectionNotice();
  // The banner above the list is already explaining the wait.
  if (notice && notice.kind !== 'restored') return null;
  if (phase === 'booting' || phase === 'connecting' || phase === 'reconnecting') {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator color={theme.textTertiary} />
        <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
          {phase === 'reconnecting' ? 'Reconnecting…' : 'Connecting to daemon…'}
        </Text>
      </View>
    );
  }
  if (searching) {
    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No matching tasks</Text>
        <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>Try another title, project, or agent.</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Couldn’t load tasks</Text>
        <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
          {error instanceof Error ? error.message : String(error)}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.overlayStrong }]}>
        <AppSymbol
          name={{ ios: 'text.bubble', android: 'chat_bubble', web: 'chat' }}
          size={25}
          tintColor={theme.textTertiary}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No tasks yet</Text>
      <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
        Start an agent on anything — a bug, a feature, a question about the code.
      </Text>
      {phase === 'connected' && (
        <View style={[styles.emptyActionClip, Platform.OS === 'android' && styles.rippleClip]}>
          <AppPressable
            accessibilityRole="button"
            onPress={onNewTask}
            style={({ pressed }) => [
              styles.emptyAction,
              { backgroundColor: theme.inverse, opacity: pressed ? 0.7 : 1 },
            ]}>
            <Text style={[styles.emptyActionText, { color: theme.onInverse }]}>New task</Text>
          </AppPressable>
        </View>
      )}
    </View>
  );
}

const SessionRow = memo(function SessionRow({
  drawerWidth,
  item,
  running,
  selected,
  onRemove,
  onRename,
  onSelect,
}: {
  drawerWidth: number;
  item: SessionListItem;
  running: boolean;
  selected: boolean;
  onRemove: (session: AgentSession) => void;
  onRename: (session: AgentSession) => void;
  onSelect: (sessionId: string) => void;
}) {
  const theme = useTheme();
  const rowWidth = Math.max(0, drawerWidth - 24);
  const session = item.session;
  return (
    <TaskRowMenu
      accessibilityLabel={`${displaySessionTitle(session)}, ${providerLabel(session.provider)} in ${item.projectName}${running ? ', Running' : ''}`}
      onRemove={() => onRemove(session)}
      onRename={() => onRename(session)}
      onSelect={() => onSelect(session.id)}
      renderTrigger={(pressed) => (
        <View
          style={[
            styles.sessionRow,
            {
              backgroundColor: pressed
                ? theme.overlayStrong
                : selected ? theme.overlay : 'transparent',
              width: rowWidth,
            },
          ]}>
          <View style={styles.sessionContent}>
            <View style={styles.sessionHeading}>
              <Text numberOfLines={1} style={[styles.sessionTitle, { color: theme.text }]}>
                {displaySessionTitle(session)}
              </Text>
              {running && (
                <ActivityIndicator
                  accessibilityLabel="Running"
                  color={theme.textTertiary}
                  size="small"
                  style={styles.sessionSpinner}
                />
              )}
            </View>
          </View>
        </View>
      )}
      selected={selected}
      style={[styles.sessionMenu, { width: rowWidth }]}
    />
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  drawerHost: { flex: 1 },
  drawerScene: { flex: 1 },
  // Rendered above the drawer, covering only the strip of screen beside the
  // drawer (where the dim overlay lives) so a single tap blurs search + closes.
  drawerCloseCatcher: {
    bottom: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  drawerHeader: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    // The block's vertical rhythm lives here, not on the label. With it on
    // `sectionTitle` the row centered the title's own margin against an
    // unmargined icon, so the icon rode above the baseline it labels.
    marginBottom: 4,
    marginTop: 14,
    paddingLeft: 14,
    paddingRight: 12,
  },
  filterInner: { alignItems: 'center', justifyContent: 'center' },
  filterHeading: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginHorizontal: 12,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  roundInner: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  searchDock: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    paddingHorizontal: Spacing.three,
  },
  searchCapsule: { borderRadius: Radius.pill, flex: 1 },
  searchCapsuleInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  searchInput: { flex: 1, fontSize: 16.5, paddingVertical: 10 },
  composeButton: { borderRadius: Radius.pill, height: 50, width: 50 },
  daemonButton: { borderRadius: Radius.pill, maxWidth: 176 },
  /** Parent-side clip that rounds Android's rectangular ripple drawable. */
  rippleClip: { overflow: 'hidden' },
  daemonButtonInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: DaemonPickerHeight,
    paddingHorizontal: 12,
  },
  daemonButtonText: { flexShrink: 1, fontSize: 13, fontWeight: '600' },
  listContent: { paddingBottom: 4 },
  listContentEmpty: { flexGrow: 1 },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 360,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 64,
    justifyContent: 'center',
    marginBottom: 18,
    width: 64,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyBody: { fontSize: 14, lineHeight: 20, marginTop: 7, maxWidth: 320, textAlign: 'center' },
  emptyActionClip: {
    alignSelf: 'stretch',
    borderRadius: Radius.pill,
    marginTop: 18,
  },
  emptyAction: {
    borderRadius: Radius.pill,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 18,
  },
  emptyActionText: { fontSize: 14, fontWeight: '700' },
  messageResults: { marginBottom: 6 },
  messageRow: {
    borderRadius: 10,
    gap: 2,
    marginHorizontal: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageHeading: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  messageTitle: { flex: 1, fontSize: 14.5, fontWeight: '500' },
  messageSnippet: { fontSize: 12.5, lineHeight: 17 },
  sessionMenu: {
    // Clip to the daemon chooser's card radius so the selected fill and the
    // Android ripple both take the row's rounded shape.
    borderRadius: Radius.large,
    overflow: 'hidden',
    height: 48,
    marginHorizontal: 12,
  },
  sessionRow: {
    alignItems: 'center',
    borderRadius: Radius.large,
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: 12,
  },
  sessionContent: { flex: 1 },
  sessionHeading: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  sessionSpinner: { height: 14, transform: [{ scale: 0.72 }], width: 14 },
  sessionTitle: {
    flex: 1,
    fontSize: 16.5,
    fontWeight: '400',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
});
