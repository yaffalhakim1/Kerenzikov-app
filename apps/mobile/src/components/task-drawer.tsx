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
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Alert,
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
import { Blocks } from '@/components/blocks';

import { AppSymbol } from '@/components/app-symbol';
import { ConnectionBanner, useConnectionNotice } from '@/components/connection-banner';
import { DaemonPickerSheet } from '@/components/daemon-picker-sheet';
import { GlassSurface } from '@/components/glass-surface';
import { ConnectionStatus, connectionPhaseLabel } from '@/components/connection-status';
import { ProviderIcon, providerBrandColor } from '@/components/provider-icon';
import { RenameDialog } from '@/components/rename-dialog';
import { Sheet, SheetRow } from '@/components/sheet';
import { TaskRowMenu } from '@/components/task-row-menu';
import { NativeTint, Radius, Spacing } from '@/constants/theme';
import { useSessionMessageSearch, useTaskState } from '@/hooks/use-daemon-data';
import { useTheme } from '@/hooks/use-theme';
import { useDaemon } from '@/lib/daemon-context';
import { tapHaptic } from '@/lib/haptics';
import { sessionIsRunning, sessionListSummary, type SessionListSummary } from '@/lib/mobile-runtime';
import { useRuntime } from '@/lib/runtime-context';
import {
  displaySessionTitle,
  filterArchivedSessions,
  foldGroups,
  groupSessions,
  messageSearchRows,
  providerLabel,
  sessionStatusBadge,
  stabilizeSessionSummaries,
  type MessageSearchRow,
  type SessionGrouping,
  type SessionListItem,
  type SessionOrdering,
} from '@/lib/session-presentation';

const DaemonPickerHeight = 38;
const SIDEBAR_PREFS_KEY = 'waku.mobile.sidebar-prefs.v1';

interface SidebarPrefs {
  grouping: SessionGrouping;
  ordering: SessionOrdering;
  /** Whether archived tasks are shown. Archiving hides a task by default; this
   *  is the toggle that brings the archived ones back into view. */
  showArchived: boolean;
  /** Section ids whose rows are folded away. */
  folded: string[];
  /** Pinned task ids, in pin order. Pinned tasks lead the list in their own
   *  section, the way a project board keeps the handful you care about on top. */
  pinned: string[];
}

const DEFAULT_SIDEBAR_PREFS: SidebarPrefs = {
  grouping: 'updated',
  ordering: 'newest',
  showArchived: false,
  folded: [],
  pinned: [],
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
      showArchived: value.showArchived === true,
      folded: stringArray(value.folded),
      pinned: stringArray(value.pinned),
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
  // The drawer library renders its content even while closed, so mounting the
  // task list at launch builds every row (and its provider icon) before the
  // user asks for it — measured as multi-second frames on first paint. Build it
  // on first open, then keep it mounted so search/scroll state survives close.
  const [contentMounted, setContentMounted] = useState(false);
  // Full-bleed: the drawer replaces the screen rather than leaving a strip of
  // the chat showing, so the task list is not squeezed into a phone-width
  // column with a permanently visible sliver behind it.
  const drawerWidth = width;
  const drawerEnabled = daemon.phase === 'booting' || daemon.profiles.length > 0;
  // The first open lands right after connect, when the JS thread is still
  // busy with the connect-time queries; measured on a physical device as a
  // 30s+ unresponsive drawer (83% janky frames). Rows need task state to
  // exist, so wait for the cached list rather than building the whole tree
  // against a query that is still in flight — the shell (pill, search,
  // footer) renders immediately and the list fills in the frame the cache
  // lands.
  const taskState = useTaskState();
  const taskStateReady = taskState.isSuccess && taskState.data !== undefined;
  const openTaskDrawer = useCallback(() => {
    if (drawerEnabled) {
      setContentMounted(true);
      setOpen(true);
    }
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
              contentMounted && (taskStateReady || daemon.phase !== 'connected') ? (
                <TaskDrawerContent
                  drawerRowWidth={drawerWidth - 24}
                  selectedSessionId={selectedSessionId}
                  onClose={closeTaskDrawer}
                />
              ) : null
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
  drawerRowWidth,
  selectedSessionId,
  onClose,
}: {
  drawerRowWidth: number;
  selectedSessionId: string | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const daemon = useDaemon();
  const runtime = useRuntime();
  // Pull the two stable callbacks the row menu depends on out of the context
  // value. The provider rebuilds that object on every stream commit, so
  // depending on `runtime` itself would hand `SessionRow` a new callback each
  // tick and defeat its `memo`.
  const { archiveSession, deleteSession } = runtime;
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
  const [renameTarget, setRenameTarget] = useState<SessionListSummary | null>(null);
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
  const foldedGroups = useMemo(() => new Set(prefs.folded), [prefs.folded]);
  // Summaries, not full sessions: the list draws only title, provider, project
  // and recency, and holding the full objects here would rebuild every row on
  // each streamed delta the runtime writes back into task state.
  const listSessions = useStableSessionSummaries(taskState.data?.sessions);
  const visibleSessions = useMemo(() => {
    const sessions = filterArchivedSessions(listSessions, prefs.showArchived);
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
  }, [listSessions, prefs.showArchived, search, taskState.data?.projects]);
  const sections = useMemo(() => {
    const built = taskState.data
      ? groupSessions(taskState.data.projects, visibleSessions, new Date(), prefs)
      : [];
    return foldGroups(built, foldedGroups);
  }, [taskState.data, visibleSessions, prefs, foldedGroups]);
  const pinnedIds = useMemo(() => new Set(prefs.pinned), [prefs.pinned]);
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
  const handleRename = useCallback(
    (session: SessionListSummary) => setRenameTarget(session),
    [],
  );
  /** Pinning is local list organization, not daemon state: it is stored beside
   *  the grouping/ordering prefs, so it costs no protocol change and a pin on
   *  this device never surprises another. */
  const handlePin = useCallback((session: SessionListSummary) => {
    tapHaptic();
    updatePrefs({
      pinned: prefs.pinned.includes(session.id)
        ? prefs.pinned.filter((id) => id !== session.id)
        : [...prefs.pinned, session.id],
    });
  }, [prefs.pinned, updatePrefs]);
  /** Archiving is the default removal: it is recoverable, and the task stays on
   *  the daemon for every device. The Show archived toggle brings it back. */
  const handleArchive = useCallback((session: SessionListSummary) => {
    tapHaptic();
    archiveSession(session.id, session.archived_at == null).catch((cause) => {
      Alert.alert('Couldn’t archive task', cause instanceof Error ? cause.message : String(cause));
    });
  }, [archiveSession]);
  /** Deleting is destructive and irreversible, so it is confirmed first and
   *  the row is removed for every device once the daemon confirms. */
  const handleDelete = useCallback((session: SessionListSummary) => {
    Alert.alert(
      `Delete “${displaySessionTitle(session)}”?`,
      'This removes the task and its transcript from the daemon for every device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteSession(session.id)
              .then(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
              .catch((cause) => {
                Alert.alert(
                  'Couldn’t delete task',
                  cause instanceof Error ? cause.message : String(cause),
                );
              });
          },
        },
      ],
    );
  }, [deleteSession]);
  const toggleGroup = useCallback((groupId: string) => {
    tapHaptic();
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

  // Search leads the drawer rather than floating over its foot: it is what you
  // reach for on the way in, and at the bottom it sat behind the keyboard the
  // search itself raised. New chat floats instead, so it is reachable without
  // scrolling back to the top of a long list.
  const drawerToolbar = (daemon.profiles.length > 0 || daemon.phase === 'booting') ? (
    <View style={styles.drawerToolbar}>
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
      {/* Group/order control lives with search rather than riding the first
          group header: it applies to the whole list, and pinning it to a group
          meant it moved whenever the top group changed. */}
      <GlassSurface
        interactive
        style={[styles.filterButton, Platform.OS === 'android' && styles.rippleClip]}>
        <AppPressable
          accessibilityLabel="Group and order tasks"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setFilterOpen(true)}
          style={({ pressed }) => [styles.filterButtonInner, { opacity: pressed ? 0.6 : 1 }]}>
          <AppSymbol
            name={{ ios: 'arrow.up.arrow.down', android: 'sort', web: 'sort' }}
            size={17}
            tintColor={theme.text}
          />
        </AppPressable>
      </GlassSurface>
    </View>
  ) : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Pill, search and New task are all in normal flow above the list, so
        the list scrolls in its own region underneath them. */}
      <View style={[styles.drawerHeader, { paddingTop: insets.top + 8 }]}>
        <DaemonPill onPress={() => setDaemonPickerOpen(true)} />
        <AppPressable
          accessibilityLabel="Close task history"
          accessibilityRole="button"
          hitSlop={10}
          onPress={onClose}
          style={({ pressed }) => [styles.chromeIcon, { opacity: pressed ? 0.55 : 1 }]}>
          <AppSymbol
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={17}
            tintColor={theme.textSecondary}
          />
        </AppPressable>
      </View>

      {drawerToolbar}

      <SectionList
        sections={sections}
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
          // The fold state rides a trailing chevron for every group — project
          // and date alike — rather than a leading folder glyph. One position
          // and one direction to read: up when open, down when collapsed.
          const chevron = isFolded
            ? ({
                ios: 'chevron.down',
                android: 'keyboard_arrow_down',
                web: 'keyboard_arrow_down',
              } as const)
            : ({
                ios: 'chevron.up',
                android: 'keyboard_arrow_up',
                web: 'keyboard_arrow_up',
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
              <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>
                {section.title}
              </Text>
              <AppSymbol name={chevron} size={13} tintColor={theme.textTertiary} />
            </AppPressable>
          );
        }}
        renderItem={({ item }) => (
          <SessionRow
            drawerRowWidth={drawerRowWidth}
            item={item}
            pinned={pinnedIds.has(item.session.id)}
            running={Boolean(runtime.runtimes[item.session.id]?.running ?? sessionIsRunning(item.session))}
            selected={item.session.id === selectedSessionId}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onPin={handlePin}
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

      {/* Below the list and always present: Settings stays reachable whatever
          the connection is doing, unlike the toolbar above it. */}
      <View style={[styles.drawerFooter, { paddingBottom: insets.bottom + 8 }]}>
        <AppPressable
          accessibilityLabel="Settings"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.chromeIcon, { opacity: pressed ? 0.55 : 1 }]}>
          <AppSymbol
            name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
            size={19}
            tintColor={theme.textSecondary}
          />
        </AppPressable>
      </View>

      {/* Floating so it is reachable without scrolling back to the top of a
          long list. Hidden while disconnected: starting a chat is a daemon
          write, and a button that cannot do its job should not be offered. */}
      {daemon.phase === 'connected' && (
        <View
          pointerEvents="box-none"
          style={[styles.fabLayer, { paddingBottom: insets.bottom + 12 }]}>
          <View style={[styles.fabClip, Platform.OS === 'android' && styles.rippleClip]}>
            <AppPressable
              accessibilityLabel="New chat"
              accessibilityRole="button"
              onPress={showNewTask}
              style={({ pressed }) => [
                styles.fabInner,
                { backgroundColor: theme.inverse, opacity: pressed ? 0.7 : 1 },
              ]}>
              <AppSymbol
                name={{ ios: 'plus', android: 'add', web: 'add' }}
                size={17}
                tintColor={theme.onInverse}
              />
              <Text style={[styles.fabLabel, { color: theme.onInverse }]}>New chat</Text>
            </AppPressable>
          </View>
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
        <Text style={[styles.filterHeading, { color: theme.textTertiary }]}>Archived</Text>
        <SheetRow
          description="Archived tasks stay on the daemon until you delete them."
          label={prefs.showArchived ? 'Hide archived tasks' : 'Show archived tasks'}
          selected={prefs.showArchived}
          onPress={() => updatePrefs({ showArchived: !prefs.showArchived })}
        />
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
        <Blocks color={theme.accent} size={24} />
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

/** Reuse summaries whose drawn fields did not change, so a task updating in
 *  the background invalidates its own row rather than the whole list. */
function useStableSessionSummaries(sessions: readonly AgentSession[] | undefined) {
  const previous = useRef<SessionListSummary[]>([]);
  const fresh = useMemo(
    () => (sessions ?? []).map(sessionListSummary),
    [sessions],
  );
  const stable = useMemo(
    () => stabilizeSessionSummaries(previous.current, fresh),
    [fresh],
  );
  useEffect(() => {
    previous.current = stable;
  }, [stable]);
  return stable;
}
const SessionRow = memo(function SessionRow({
  drawerRowWidth,
  item,
  pinned,
  running,
  selected,
  onArchive,
  onDelete,
  onPin,
  onRename,
  onSelect,
}: {
  drawerRowWidth: number;
  item: SessionListItem;
  pinned: boolean;
  running: boolean;
  selected: boolean;
  onArchive: (session: SessionListSummary) => void;
  onDelete: (session: SessionListSummary) => void;
  onPin: (session: SessionListSummary) => void;
  onRename: (session: SessionListSummary) => void;
  onSelect: (sessionId: string) => void;
}) {
  const theme = useTheme();
  const rowWidth = Math.max(0, drawerRowWidth);
  const session = item.session;
  // A running task shows the spinner; a settled one names its state. Only one
  // of the two ever renders, so the trailing slot never says two things.
  const badge = running ? null : sessionStatusBadge(session);
  const statusColor = badge ? badgeToneColor(theme, badge.tone) : undefined;
  return (
    <TaskRowMenu
      accessibilityLabel={`${displaySessionTitle(session)}, ${providerLabel(session.provider)} in ${item.projectName}${pinned ? ', Pinned' : ''}${running ? ', Running' : badge ? `, ${badge.label}` : ''}`}
      archived={session.archived_at != null}
      pinned={pinned}
      onArchive={() => onArchive(session)}
      onDelete={() => onDelete(session)}
      onPin={() => onPin(session)}
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
          <ProviderTile provider={session.provider} />
          <View style={styles.sessionContent}>
            <View style={styles.sessionHeading}>
              {pinned && (
                <AppSymbol
                  name={{ ios: 'pin.fill', android: 'keep', web: 'keep' }}
                  size={11}
                  tintColor={theme.textGhost}
                />
              )}
              <Text numberOfLines={1} style={[styles.sessionTitle, { color: theme.text }]}>
                {displaySessionTitle(session)}
              </Text>
            </View>
            <Text numberOfLines={1} style={[styles.sessionProject, { color: theme.textTertiary }]}>
              {item.projectName}
            </Text>
          </View>
          {running ? (
            <View style={styles.sessionSpinner}>
              <Blocks color={theme.accent} size={14} />
            </View>
          ) : badge ? (
            <Text style={[styles.sessionStatus, { color: statusColor }]}>{badge.label}</Text>
          ) : null}
        </View>
      )}
      selected={selected}
      style={[styles.sessionMenu, { width: rowWidth }]}
    />
  );
});

/** The harness mark in a tinted rounded tile, so a row's agent is legible at a
 *  glance rather than as a bare glyph lost against the title. */
function ProviderTile({ provider }: { provider: SessionListSummary['provider'] }) {
  const theme = useTheme();
  const brand = providerBrandColor(provider);
  return (
    <View style={[styles.providerTile, { backgroundColor: theme.surfaceMuted }]}>
      <ProviderIcon color={brand ?? theme.textSecondary} provider={provider} size={17} />
    </View>
  );
}

function badgeToneColor(theme: ReturnType<typeof useTheme>, tone: NonNullable<ReturnType<typeof sessionStatusBadge>>['tone']): string {
  switch (tone) {
    case 'warning':
      return theme.warning;
    case 'danger':
      return theme.danger;
    case 'secondary':
      return theme.textSecondary;
    default:
      return theme.textGhost;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  drawerHost: { flex: 1 },
  drawerScene: { flex: 1 },
  drawerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  // Shared by the drawer's own controls (close, settings). Round, unlike the
  // toolbar's rounded rectangles: an icon button takes a circular ripple, and
  // the ripple is clipped to this radius, so the shape is what makes the press
  // feedback read as a circle rather than a square.
  chromeIcon: {
    alignItems: 'center',
    borderRadius: Radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  drawerFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    paddingTop: 8,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    // A folder is a control, so its own height is the tap target: the vertical
    // rhythm lives in this padding rather than in margins on the label, which
    // left the pressable only as tall as the text.
    marginBottom: 2,
    marginTop: 8,
    minHeight: 48,
    paddingLeft: 14,
    paddingRight: 12,
    paddingVertical: 10,
  },
  // Same rounded square as the drawer's other toolbar controls, so the row
  // reads as one unit rather than a pill beside a lone glyph.
  filterButton: { borderRadius: Radius.small, height: 50, width: 50 },
  filterButtonInner: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  filterHeading: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginHorizontal: 12,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  drawerToolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 10,
    paddingHorizontal: Spacing.three,
  },
  // Rounded rectangle, matching the desktop sidebar's search row (7pt) rather
  // than a full pill.
  searchCapsule: { borderRadius: Radius.small, flex: 1 },
  searchCapsuleInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  searchInput: { flex: 1, fontSize: 16.5, paddingVertical: 10 },
  // Same rounded rectangle as the toolbar's other controls, so the header
  // reads as one row rather than a pill beside squares.
  daemonButton: { borderRadius: Radius.small, maxWidth: 176 },
  // Absolute over the list so it floats above the rows without owning layout.
  // `box-none` on the layer keeps taps between it and the list passing through.
  fabLayer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.three,
  },
  // A pill, not a circle: the label is the affordance, and "New chat" is wider
  // than any icon button. The clip host rounds the solid fill and Android's
  // rectangular ripple.
  fabClip: { borderRadius: Radius.pill, overflow: 'hidden' },
  fabInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  fabLabel: { fontSize: 15, fontWeight: '600' },
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
  // Clears the floating New chat pill, which rises a few pixels past the footer
  // into the list's bottom edge.
  listContent: { paddingBottom: 16 },
  listContentEmpty: { flexGrow: 1 },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
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
    // Clips the selected fill and the Android ripple to the row's shape. No
    // height of its own: it wraps `sessionRow`, and a second height here only
    // ever disagreed with it — at 48 it silently clipped a 56pt row back down.
    borderRadius: Radius.small,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  sessionRow: {
    alignItems: 'center',
    // A rounded rectangle, not a pill: matches the desktop sidebar's 7pt row
    // radius, where a fully-round row reads as a chip rather than a list item.
    borderRadius: Radius.small,
    flexDirection: 'row',
    gap: 10,
    // 56 rather than the 48 minimum: a task title is the row you aim at most,
    // and at 48 the ripple read as barely taller than the text.
    height: 60,
    paddingHorizontal: 12,
  },
  sessionContent: { flex: 1, gap: 1, minWidth: 0 },
  sessionHeading: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  sessionProject: { fontSize: 12.5 },
  sessionStatus: { fontSize: 12, fontWeight: '600' },
  sessionSpinner: { alignItems: 'center', height: 14, justifyContent: 'center', width: 14 },
  providerTile: {
    alignItems: 'center',
    borderRadius: Radius.small,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  sessionTitle: {
    flexShrink: 1,
    fontSize: 15.5,
    fontWeight: '500',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
});
