import {
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetSectionList,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetMethods,
} from "@expo/ui/community/bottom-sheet";
import { MenuView, type MenuAction } from "@expo/ui/community/menu";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type {
  AgentSession,
  Project,
  ReviewDiffSource,
  WorkingTreeEntry,
} from "@waku/client";
import { TerminalView, type TerminalViewRef } from "expo-libghostty";
import * as Crypto from "expo-crypto";
import { Alert } from "panelui-native/components/alert";
import { Button } from "panelui-native/components/button";
import { EmptyState } from "panelui-native/components/empty-state";
import { Item } from "panelui-native/components/item";
import { Spinner } from "panelui-native/components/spinner";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppPressable } from "@/components/app-pressable";
import { AppSymbol } from "@/components/app-symbol";
import { DiffView } from "@/components/diff-view";
import { liquidGlass } from "@/components/glass-surface";
import { MonoFont, NativeTint, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import {
  collectWorkspaceDiff,
  daemonKeys,
  listWorkspaceTree,
  readWorkspaceTextFile,
} from "@/lib/daemon-api";
import { useDaemon } from "@/lib/daemon-context";
import { sessionCwd } from "@/lib/mobile-runtime";
import {
  latestReviewTurnSource,
  parseNumstat,
  reviewDiffSourceLabel,
  splitReviewPatch,
  type ReviewPatchFile,
} from "@/lib/task-surfaces";

export type TaskSurface = "terminal" | "files" | "review";

type ReviewPatchSection = ReviewPatchFile & { data: ReviewPatchFile[] };

const SNAP_POINTS = Platform.OS === "ios" ? undefined : ["58%", "100%"];
const MAX_FILE_CHARACTERS = 250_000;

const SURFACE_DETAILS: Record<
  TaskSurface,
  {
    title: string;
    subtitle: string;
    icon: Parameters<typeof AppSymbol>[0]["name"];
  }
> = {
  terminal: {
    title: "Terminal",
    subtitle: "Shell in this task’s workspace",
    icon: { ios: "terminal", android: "terminal", web: "terminal" },
  },
  files: {
    title: "Files",
    subtitle: "Workspace files",
    icon: { ios: "folder", android: "folder", web: "folder" },
  },
  review: {
    title: "Review",
    subtitle: "Workspace changes",
    icon: {
      ios: "doc.text.magnifyingglass",
      android: "difference",
      web: "difference",
    },
  },
};

export function TaskSurfaceSheet({
  surface,
  visible,
  session,
  project,
  onDismiss,
}: {
  surface: TaskSurface | null;
  visible: boolean;
  session: AgentSession;
  project: Project | undefined;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const sheet = useRef<BottomSheetMethods>(null);

  useEffect(() => {
    if (visible && surface) sheet.current?.present();
    else sheet.current?.dismiss();
  }, [surface, visible]);

  return (
    <BottomSheetModal
      ref={sheet}
      backgroundStyle={
        surface === "terminal" || !liquidGlass
          ? { backgroundColor: theme.surface }
          : undefined
      }
      enableDynamicSizing={false}
      enablePanDownToClose
      snapPoints={SNAP_POINTS}
      onDismiss={onDismiss}
    >
      <BottomSheetView style={styles.sheet}>
        {surface ? (
          <SurfaceBody project={project} session={session} surface={surface} />
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

function SurfaceBody({
  surface,
  session,
  project,
}: {
  surface: TaskSurface;
  session: AgentSession;
  project: Project | undefined;
}) {
  const root = project ? sessionCwd(session, project) : null;
  if (surface === "terminal") {
    return <TerminalSurface root={root} />;
  }
  if (surface === "files") {
    return <FilesSurface root={root} />;
  }
  return <ReviewSurface root={root} session={session} />;
}

/** The sheet's title bar: a PanelUI `Item` with no press handler, so it reads
 *  as a static row rather than announcing itself as a control. The icon tile,
 *  the title and the subtitle are its media and text slots; the caller's
 *  action — a Refresh button — is its trailing slot. */
function SurfaceHeader({
  surface,
  subtitle,
  action,
}: {
  surface: TaskSurface;
  subtitle?: string;
  action?: ReactNode;
}) {
  const theme = useTheme();
  const details = SURFACE_DETAILS[surface];
  return (
    <Item
      className="gap-2.5 rounded-none"
      size="sm"
      style={[styles.header, { borderBottomColor: theme.border }]}
    >
      <Item.Media variant="icon">
        <AppSymbol
          name={details.icon}
          size={15}
          tintColor={theme.textSecondary}
        />
      </Item.Media>
      <Item.Content>
        <Item.Title numberOfLines={1} style={styles.headerTitle}>
          {details.title}
        </Item.Title>
        <Item.Description numberOfLines={1} style={styles.headerSubtitle}>
          {subtitle ?? details.subtitle}
        </Item.Description>
      </Item.Content>
      {action ? <Item.Actions>{action}</Item.Actions> : null}
    </Item>
  );
}

function TerminalSurface({ root }: { root: string | null }) {
  const theme = useTheme();

  if (!root) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.surface }]}>
        <PanelMessage
          detail="This task does not have an available workspace."
          title="No workspace"
        />
      </View>
    );
  }
  if (Platform.OS === "web") {
    return (
      <View style={[styles.fill, { backgroundColor: theme.surface }]}>
        <PanelMessage
          detail="The native terminal is available on iOS and Android."
          title="Unavailable on web"
        />
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: theme.surface }]}>
      <TerminalSession root={root} />
    </View>
  );
}

function TerminalSession({ root }: { root: string }) {
  const daemon = useDaemon();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const terminal = useRef<TerminalViewRef>(null);
  const terminalId = useRef(Crypto.randomUUID()).current;
  const [error, setError] = useState<string | null>(null);
  const [exited, setExited] = useState(false);

  useEffect(() => {
    const client = daemon.client;
    if (!client || daemon.phase !== "connected") return;
    let disposed = false;
    setError(null);
    setExited(false);
    const unsubscribe = client.subscribe(terminalId, terminalId, (event) => {
      if (event.event.kind === "terminalOutput") {
        const payload = event.event.payload as { data?: unknown };
        if (typeof payload.data !== "string") return;
        void terminal.current?.write(payload.data).catch((cause) => {
          if (!disposed) setError(errorMessage(cause));
        });
      } else if (event.event.kind === "terminalExited") {
        setExited(true);
        void terminal.current?.finish(0).catch(() => {});
      } else if (event.event.kind === "terminalError") {
        setError(
          typeof event.event.payload === "string"
            ? event.event.payload
            : "The terminal connection failed.",
        );
      }
    });

    void client
      .request(
        { type: "openTerminal", cwd: root, cols: 80, rows: 24 },
        terminalId,
        terminalId,
      )
      .catch((cause) => {
        if (!disposed) setError(errorMessage(cause));
      });

    return () => {
      disposed = true;
      unsubscribe();
      void client
        .notify({ type: "closeTerminal" }, terminalId, terminalId)
        .catch(() => {});
    };
  }, [daemon.client, daemon.phase, root, terminalId]);

  const reportTransportError = useCallback((cause: unknown) => {
    setError(errorMessage(cause));
  }, []);

  return (
    <View style={styles.terminalBody}>
      <TerminalView
        ref={terminal}
        fontSize={12}
        style={styles.fill}
        theme={{
          background: theme.surface,
          foreground: theme.text,
          cursorColor: theme.text,
          selectionBackground: colorScheme === "dark" ? "#40546f" : "#c8d8ee",
        }}
        onInput={({ nativeEvent }) => {
          const client = daemon.client;
          if (!client || daemon.phase !== "connected" || exited) return;
          void client
            .notify(
              {
                type: "writeTerminal",
                data: nativeEvent.data,
              },
              terminalId,
              terminalId,
            )
            .catch(reportTransportError);
        }}
        onResize={({ nativeEvent }) => {
          const client = daemon.client;
          if (!client || daemon.phase !== "connected") return;
          void client
            .notify(
              {
                type: "resizeTerminal",
                cols: clampU16(nativeEvent.cols),
                rows: clampU16(nativeEvent.rows),
              },
              terminalId,
              terminalId,
            )
            .catch(() => {});
        }}
      />
      {daemon.phase !== "connected" || error || exited ? (
        // A caption over the native terminal, not a control: it stays a plate
        // of the sheet's own surface so a long daemon error wraps to two lines
        // instead of being clipped to a pill.
        <View
          pointerEvents="none"
          style={[styles.terminalStatus, { backgroundColor: theme.surface }]}
        >
          <Text
            numberOfLines={2}
            style={[
              styles.terminalStatusText,
              { color: error ? theme.danger : theme.textSecondary },
            ]}
          >
            {error ?? (exited ? "Shell exited" : "Reconnecting…")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function FilesSurface({ root }: { root: string | null }) {
  const daemon = useDaemon();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const profileId = daemon.activeProfile?.id ?? "disconnected";
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  useEffect(() => {
    setExpanded([]);
    setSelectedPath(null);
  }, [root]);

  const tree = useQuery({
    queryKey: daemonKeys.workspaceTree(profileId, root ?? "none", expanded),
    queryFn: () => listWorkspaceTree(daemon.client!, root!, expanded),
    enabled: Boolean(daemon.client && daemon.phase === "connected" && root),
    placeholderData: keepPreviousData,
  });
  const file = useQuery({
    queryKey: daemonKeys.workspaceFile(
      profileId,
      root ?? "none",
      selectedPath ?? "none",
    ),
    queryFn: () => readWorkspaceTextFile(daemon.client!, root!, selectedPath!),
    enabled: Boolean(
      daemon.client && daemon.phase === "connected" && root && selectedPath,
    ),
  });

  if (!root) {
    return (
      <View style={styles.fill}>
        <SurfaceHeader surface="files" />
        <PanelMessage
          detail="This task does not have an available workspace."
          title="No workspace"
        />
      </View>
    );
  }

  if (selectedPath) {
    const content = (file.data ?? "").slice(0, MAX_FILE_CHARACTERS);
    const truncated = (file.data?.length ?? 0) > MAX_FILE_CHARACTERS;
    return (
      <View style={styles.fill}>
        <SurfaceHeader
          action={
            <HeaderTextButton
              label="Refresh"
              onPress={() => void file.refetch()}
            />
          }
          subtitle={selectedPath}
          surface="files"
        />
        {/*
          `AppPressable`, not PanelUI `Item`, because this row is inside the
          native sheet: `Item` presses through `AnimatedPressable`, and
          Reanimated cannot update props on a view inside `@expo/ui`'s native
          host — the press never lands. Same reason the picker rows in
          `session-option-sheets` are `AppPressable`.
        */}
        <AppPressable
          accessibilityHint="Returns to the workspace file list"
          accessibilityRole="button"
          onPress={() => setSelectedPath(null)}
          style={({ pressed }) => [styles.backRow, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppSymbol
            name={{
              ios: "chevron.left",
              android: "arrow_back",
              web: "arrow_back",
            }}
            size={13}
            tintColor={NativeTint}
          />
          <Text style={styles.backLabel}>Files</Text>
        </AppPressable>
        {file.isPending ? (
          <LoadingMessage />
        ) : file.error ? (
          <PanelMessage
            detail={errorMessage(file.error)}
            title="Couldn’t read file"
          />
        ) : (
          <BottomSheetScrollView
            contentContainerStyle={[
              styles.fileContent,
              { paddingBottom: Math.max(insets.bottom, 18) + 12 },
            ]}
            horizontal={false}
            showsVerticalScrollIndicator
          >
            <Text selectable style={[styles.fileText, { color: theme.text }]}>
              {content}
            </Text>
            {truncated ? (
              <Alert className="mt-3" variant="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                    File truncated in this viewer.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}
          </BottomSheetScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <SurfaceHeader
        action={
          <HeaderTextButton
            label="Refresh"
            onPress={() => void tree.refetch()}
          />
        }
        surface="files"
      />
      {tree.isPending ? (
        <LoadingMessage />
      ) : tree.error ? (
        <PanelMessage
          detail={errorMessage(tree.error)}
          title="Couldn’t load files"
        />
      ) : (
        <BottomSheetFlatList<WorkingTreeEntry>
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 18) + 12,
          }}
          data={tree.data ?? []}
          keyExtractor={(entry) => entry.relativePath}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <PanelMessage
              detail="The workspace has no visible files."
              title="No files"
            />
          }
          renderItem={({ item }) => (
            <Item
              accessibilityHint={
                item.isDir
                  ? item.expanded
                    ? "Collapses folder"
                    : "Expands folder"
                  : "Opens file"
              }
              aria-expanded={item.isDir ? item.expanded : undefined}
              className="gap-2 rounded-none"
              onPress={() => {
                if (!item.isDir) {
                  setSelectedPath(item.relativePath);
                  return;
                }
                setExpanded((current) =>
                  current.includes(item.absolutePath)
                    ? current.filter((path) => path !== item.absolutePath)
                    : [...current, item.absolutePath].sort(),
                );
              }}
              pressOpacity={0.6}
              pressScale={1}
              size="xs"
              style={[
                styles.fileRow,
                { paddingLeft: 14 + Math.min(item.depth, 12) * 16 },
              ]}
            >
              <Item.Media>
                <AppSymbol
                  name={
                    item.isDir
                      ? {
                          ios: item.expanded ? "chevron.down" : "chevron.right",
                          android: item.expanded
                            ? "expand_more"
                            : "chevron_right",
                          web: item.expanded ? "expand_more" : "chevron_right",
                        }
                      : { ios: "doc", android: "draft", web: "draft" }
                  }
                  size={item.isDir ? 12 : 14}
                  tintColor={theme.textTertiary}
                />
              </Item.Media>
              <Item.Content>
                <Item.Title numberOfLines={1} style={styles.fileRowLabel}>
                  {item.name}
                </Item.Title>
              </Item.Content>
            </Item>
          )}
        />
      )}
    </View>
  );
}

const STANDARD_REVIEW_SOURCES: Array<{
  id: Exclude<ReviewDiffSource, object>;
  source: Exclude<ReviewDiffSource, object>;
}> = [
  { id: "uncommitted", source: "uncommitted" },
  { id: "unstaged", source: "unstaged" },
  { id: "staged", source: "staged" },
  { id: "committed", source: "committed" },
  { id: "branch", source: "branch" },
];

function ReviewSurface({
  root,
  session,
}: {
  root: string | null;
  session: AgentSession;
}) {
  const daemon = useDaemon();
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const profileId = daemon.activeProfile?.id ?? "disconnected";
  const lastTurn = useMemo(() => latestReviewTurnSource(session), [session]);
  const [source, setSource] = useState<ReviewDiffSource>("uncommitted");

  useEffect(() => setSource("uncommitted"), [session.id]);

  const diff = useQuery({
    queryKey: daemonKeys.workspaceDiff(profileId, root ?? "none", source),
    queryFn: () => collectWorkspaceDiff(daemon.client!, root!, source),
    enabled: Boolean(daemon.client && daemon.phase === "connected" && root),
    placeholderData: keepPreviousData,
  });
  const files = useMemo(
    () => splitReviewPatch(diff.data?.patch ?? ""),
    [diff.data?.patch],
  );
  const sections = useMemo<ReviewPatchSection[]>(
    () => files.map((file) => ({ ...file, data: [file] })),
    [files],
  );
  const stats = useMemo(
    () => parseNumstat(diff.data?.numstat ?? ""),
    [diff.data?.numstat],
  );
  const actions = useMemo<MenuAction[]>(
    () => [
      ...(lastTurn
        ? [
            {
              id: "last-turn",
              title: reviewDiffSourceLabel(lastTurn),
              image: "clock.arrow.circlepath" as const,
              state:
                typeof source === "object" ? ("on" as const) : ("off" as const),
            },
          ]
        : []),
      ...STANDARD_REVIEW_SOURCES.map((item) => ({
        id: item.id,
        title: reviewDiffSourceLabel(item.source),
        state: source === item.source ? ("on" as const) : ("off" as const),
      })),
    ],
    [lastTurn, source],
  );

  if (!root) {
    return (
      <View style={styles.fill}>
        <SurfaceHeader surface="review" />
        <PanelMessage
          detail="This task does not have an available workspace."
          title="No workspace"
        />
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <SurfaceHeader
        action={
          <HeaderTextButton
            label="Refresh"
            onPress={() => void diff.refetch()}
          />
        }
        subtitle={reviewDiffSourceLabel(source)}
        surface="review"
      />
      <View
        style={[styles.reviewControls, { borderBottomColor: theme.border }]}
      >
        <MenuView
          actions={actions}
          colorScheme={scheme}
          onPressAction={({ nativeEvent }) => {
            if (nativeEvent.event === "last-turn" && lastTurn) {
              setSource(lastTurn);
              return;
            }
            const item = STANDARD_REVIEW_SOURCES.find(
              (choice) => choice.id === nativeEvent.event,
            );
            if (item) setSource(item.source);
          }}
        >
          {/* Non-pressable trigger content: `MenuView` wraps its children in a
           *  `Pressable`, and a nested pressable swallows the gesture on
           *  Android (see `task-row-menu.tsx`). */}
          <View
            accessible
            accessibilityLabel="Choose review source"
            accessibilityRole="button"
            style={[styles.sourceButton, { backgroundColor: theme.overlay }]}
          >
            <Text style={[styles.sourceLabel, { color: theme.text }]}>
              {reviewDiffSourceLabel(source)}
            </Text>
            <AppSymbol
              name={{
                ios: "chevron.up.chevron.down",
                android: "unfold_more",
                web: "unfold_more",
              }}
              size={12}
              tintColor={theme.textTertiary}
            />
          </View>
        </MenuView>
        <Text style={styles.reviewStats}>
          <Text style={{ color: theme.textTertiary }}>
            {stats.files} {stats.files === 1 ? "file" : "files"}{" "}
          </Text>
          <Text style={{ color: theme.success }}>+{stats.additions}</Text>
          <Text style={{ color: theme.textGhost }}> </Text>
          <Text style={{ color: theme.danger }}>−{stats.deletions}</Text>
        </Text>
      </View>
      {diff.isPending ? (
        <LoadingMessage />
      ) : diff.error ? (
        <PanelMessage
          detail={errorMessage(diff.error)}
          title="Couldn’t load review"
        />
      ) : (
        <BottomSheetSectionList<ReviewPatchFile, ReviewPatchSection>
          contentContainerStyle={[
            styles.reviewList,
            { paddingBottom: Math.max(insets.bottom, 18) + 12 },
          ]}
          sections={sections}
          keyExtractor={(file) => file.key}
          stickySectionHeadersEnabled
          ListHeaderComponent={
            !diff.data?.completeContext ? (
              <Alert className="m-3" variant="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>This comparison has partial context.</Alert.Title>
                </Alert.Content>
              </Alert>
            ) : null
          }
          ListEmptyComponent={
            <PanelMessage
              detail="There are no changes in this comparison."
              title="No changes"
            />
          }
          renderSectionHeader={({ section }) => (
            <Item
              className="gap-2 rounded-none border-b border-border bg-card"
              size="xs"
              style={styles.diffFileHeader}
            >
              <Item.Media>
                <AppSymbol
                  name={{ ios: "doc", android: "draft", web: "draft" }}
                  size={13}
                  tintColor={theme.textTertiary}
                />
              </Item.Media>
              <Item.Content>
                <Item.Title numberOfLines={1} style={styles.diffPath}>
                  {section.path}
                </Item.Title>
              </Item.Content>
            </Item>
          )}
          renderItem={({ item }) => (
            <View
              style={[
                styles.diffSection,
                { borderBottomColor: theme.border },
              ]}
            >
              <DiffView diff={item.patch} mode="review" />
            </View>
          )}
        />
      )}
    </View>
  );
}

function HeaderTextButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Button hitSlop={8} onPress={onPress} size="sm" variant="ghost">
      {label}
    </Button>
  );
}

/** The slot-filling wait: PanelUI's spinner over the surface's own words. The
 *  spinner carries no label of its own — the caption beside it already says
 *  what the wait is, so a labelled spinner would announce it twice. */
function LoadingMessage() {
  const theme = useTheme();
  return (
    <View style={styles.loading}>
      <Spinner size="lg" />
      <Text style={[styles.loadingText, { color: theme.textTertiary }]}>
        Loading…
      </Text>
    </View>
  );
}

/** A PanelUI empty state: the title and the detail are its heading and its
 *  supporting line, centred in whatever slot the surface hands it. */
function PanelMessage({ title, detail }: { title: string; detail: string }) {
  return (
    <EmptyState size="sm">
      <EmptyState.Header>
        <EmptyState.Title>{title}</EmptyState.Title>
        <EmptyState.Description>{detail}</EmptyState.Description>
      </EmptyState.Header>
    </EmptyState>
  );
}

function clampU16(value: number): number {
  return Math.min(65_535, Math.max(1, Math.round(value)));
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

const styles = StyleSheet.create({
  sheet: { flex: 1, minHeight: 0 },
  fill: { flex: 1, minHeight: 0 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerTitle: { fontSize: 15, fontWeight: "600" },
  headerSubtitle: { fontSize: 11.5, marginTop: 1 },
  terminalBody: { flex: 1, minHeight: 0, position: "relative" },
  terminalStatus: {
    borderRadius: Radius.small,
    bottom: 10,
    maxWidth: "80%",
    paddingHorizontal: 9,
    paddingVertical: 6,
    position: "absolute",
    right: 10,
  },
  terminalStatusText: { fontSize: 11 },
  backRow: {
    minHeight: 38,
    paddingHorizontal: 15,
    paddingVertical: 0,
  },
  backLabel: { color: NativeTint, fontSize: 14.5, fontWeight: "500" },
  fileContent: { paddingHorizontal: 14, paddingTop: 4 },
  fileText: { fontFamily: MonoFont, fontSize: 11.5, lineHeight: 17 },
  fileRow: {
    minHeight: 39,
    paddingRight: 14,
    paddingVertical: 0,
  },
  fileRowLabel: { flex: 1, fontSize: 13.5 },
  reviewControls: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  sourceButton: {
    alignItems: "center",
    borderRadius: Radius.small,
    flexDirection: "row",
    gap: 8,
    minHeight: 32,
    paddingHorizontal: 10,
  },
  sourceLabel: { fontSize: 13, fontWeight: "500" },
  reviewStats: { fontSize: 11.5 },
  reviewList: { paddingTop: 0 },
  diffSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  diffFileHeader: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  diffPath: { fontSize: 12.5, fontWeight: "500" },
  loading: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    padding: 24,
  },
  loadingText: { fontSize: 12.5 },
});
