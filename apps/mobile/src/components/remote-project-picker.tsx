import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Project, WorkingTreeEntry } from '@waku/client';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { Alert } from 'panelui-native/components/alert';
import { Button } from 'panelui-native/components/button';
import { Chip } from 'panelui-native/components/chip';
import { EmptyState } from 'panelui-native/components/empty-state';
import { Input } from 'panelui-native/components/input';
import { Item } from 'panelui-native/components/item';
import { Spinner } from 'panelui-native/components/spinner';
import { Typography } from 'panelui-native/components/typography';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppSymbol } from './app-symbol';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  browseDaemonDirectory,
  createProject,
  createProjectlessWorkspace,
  daemonKeys,
  persistProject,
  type TaskState,
} from '@/lib/daemon-api';
import { useDaemon } from '@/lib/daemon-context';
import { useKeyboardHeight } from '@/lib/keyboard-offset';

export function RemoteProjectPicker({
  visible,
  onDismiss,
  onSelect,
}: {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (project: Project) => void;
}) {
  const theme = useTheme();
  const daemon = useDaemon();
  const keyboardHeight = useKeyboardHeight();
  const queryClient = useQueryClient();
  const profileId = daemon.activeProfile?.id ?? 'disconnected';
  const [path, setPath] = useState<string | null>(null);
  const [pathDraft, setPathDraft] = useState('');
  const [submitting, setSubmitting] = useState<'folder' | 'empty' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const directory = useQuery({
    queryKey: daemonKeys.directory(profileId, path),
    queryFn: () => {
      if (!daemon.client) throw new Error('Kerenzikov daemon is disconnected');
      return browseDaemonDirectory(daemon.client, path);
    },
    enabled: visible && daemon.phase === 'connected' && Boolean(daemon.client),
    staleTime: 10_000,
  });
  const folders = useMemo(
    () => (directory.data?.entries ?? []).filter((entry) => entry.isDir),
    [directory.data?.entries],
  );

  useEffect(() => {
    setPath(null);
    setPathDraft('');
    setError(null);
  }, [profileId]);

  useEffect(() => {
    if (directory.data?.path) setPathDraft(directory.data.path);
  }, [directory.data?.path]);

  function visit(next: string | null) {
    if (submitting) return;
    setError(null);
    setPath(next);
  }

  async function saveProject(project: Project) {
    if (!daemon.client) throw new Error('Kerenzikov daemon is disconnected');
    const saved = await persistProject(daemon.client, project);
    queryClient.setQueryData<TaskState>(daemonKeys.taskState(profileId), saved.taskState);
    onSelect(saved.project);
    onDismiss();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function addFolder() {
    const target = directory.data?.path;
    if (!target || submitting) return;
    setSubmitting('folder');
    setError(null);
    try {
      await saveProject(createProject(target, Crypto.randomUUID()));
    } catch (cause) {
      setError(errorMessage(cause));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(null);
    }
  }

  async function addEmptyWorkspace() {
    if (!daemon.client || submitting) return;
    setSubmitting('empty');
    setError(null);
    try {
      const cwd = await createProjectlessWorkspace(daemon.client);
      await saveProject({ ...createProject(cwd, Crypto.randomUUID()), name: 'No project' });
    } catch (cause) {
      setError(errorMessage(cause));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(null);
    }
  }

  const message = error ?? (directory.error ? errorMessage(directory.error) : null);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onDismiss}
      presentationStyle="pageSheet"
      visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.screen, { backgroundColor: theme.background, paddingBottom: keyboardHeight }]}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
          <View style={[styles.header, { borderBottomColor: theme.separator }]}>
            <Button
              className="min-w-16"
              disabled={Boolean(submitting)}
              labelClassName="text-primary"
              onPress={onDismiss}
              variant="ghost">
              Cancel
            </Button>
            <Typography.Heading align="center" className="flex-1" type="h5">
              Choose Project
            </Typography.Heading>
            <Button
              accessibilityLabel="Add current folder"
              className="min-w-16"
              disabled={!directory.data?.path || Boolean(submitting)}
              labelClassName="text-primary"
              loading={submitting === 'folder'}
              onPress={() => void addFolder()}
              variant="ghost">
              Add
            </Button>
          </View>

          <View style={styles.pathArea}>
            <Input
              accessibilityLabel="Path on daemon host"
              autoCapitalize="none"
              autoCorrect={false}
              endContent={(
                <Button
                  accessibilityLabel="Open entered path"
                  disabled={!pathDraft.trim() || Boolean(submitting)}
                  onPress={() => visit(pathDraft.trim() || null)}
                  size="sm"
                  variant="ghost">
                  <AppSymbol
                    name={{ ios: 'arrow.right.circle.fill', android: 'arrow_circle_right', web: 'arrow_circle_right' }}
                    size={20}
                    tintColor={pathDraft.trim() ? theme.accent : theme.textTertiary}
                  />
                </Button>
              )}
              onChangeText={setPathDraft}
              onSubmitEditing={() => visit(pathDraft.trim() || null)}
              placeholder="Path on daemon host"
              returnKeyType="go"
              selectTextOnFocus
              spellCheck={false}
              startContent={(
                <View pointerEvents="none">
                  <AppSymbol
                    name={{ ios: 'folder', android: 'folder', web: 'folder' }}
                    size={16}
                    tintColor={theme.textTertiary}
                  />
                </View>
              )}
              value={pathDraft}
              variant="filled"
            />
            <View style={styles.locations}>
              <LocationButton
                label="Home"
                onPress={() => visit(directory.data?.home ?? null)}
              />
              <LocationButton
                disabled={!directory.data?.parent}
                icon={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }}
                label="Parent"
                onPress={() => visit(directory.data?.parent ?? null)}
              />
              <LocationButton
                disabled={!directory.data?.filesystem_root}
                icon={{ ios: 'internaldrive', android: 'hard_drive', web: 'hard_drive' }}
                label="File system"
                onPress={() => visit(directory.data?.filesystem_root ?? null)}
              />
            </View>
          </View>

          {message ? (
            <View style={styles.errorArea}>
              <Alert accessibilityLiveRegion="polite" variant="destructive">
                <Alert.Indicator iconProps={{ color: theme.danger }} />
                <Alert.Content>
                  {/* This app redefines `--color-destructive-foreground` as the
                      contrast pair for a *solid* destructive fill, so the
                      variant's own foreground lands white-on-pink here. The
                      glyph and the text take the house danger colour instead. */}
                  <Alert.Title className="text-destructive">{message}</Alert.Title>
                </Alert.Content>
              </Alert>
            </View>
          ) : null}

          <FlatList
            data={folders}
            keyExtractor={(item) => item.absolutePath}
            contentContainerStyle={folders.length ? styles.list : styles.emptyList}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={(
              <DirectoryEmpty loading={directory.isPending || directory.isFetching} />
            )}
            renderItem={({ item }) => <FolderRow entry={item} onOpen={() => visit(item.absolutePath)} />}
            showsVerticalScrollIndicator={false}
          />

          <View style={[styles.footer, { borderTopColor: theme.separator }]}>
            <Button
              accessibilityHint="Creates a private workspace on the daemon host"
              disabled={Boolean(submitting)}
              loading={submitting === 'empty'}
              onPress={() => void addEmptyWorkspace()}
              size="sm"
              variant="ghost">
              New empty workspace
            </Button>
            <Typography.Paragraph
              align="right"
              className="flex-1"
              muted
              numberOfLines={1}
              type="body-xs">
              {directory.data?.path ?? 'Loading folder…'}
            </Typography.Paragraph>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** One of the three jumps out of the current directory — a labelled pill, so
 *  the row reads as places rather than as another toolbar of glyphs. */
function LocationButton({
  label,
  icon = { ios: 'house', android: 'home', web: 'home' },
  disabled = false,
  onPress,
}: {
  label: string;
  icon?: Parameters<typeof AppSymbol>[0]['name'];
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Chip
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      size="md"
      start={<AppSymbol name={icon} size={13} tintColor={theme.textSecondary} />}>
      {label}
    </Chip>
  );
}

/** A folder in the listing: its tile, its name, and the chevron that says the
 *  row goes somewhere. The row itself is the PanelUI `Item`, so the press
 *  animation, role and disabled announcement come from the library.
 *
 *  The row keeps the app's own `surface` fill — `bg-card`, the token this
 *  app's palette maps it to — rather than taking `variant="muted"`. The tile
 *  inside the row is drawn on `surfaceMuted`, and a row in that same fill
 *  would swallow the tile that carries the folder glyph. */
function FolderRow({ entry, onOpen }: { entry: WorkingTreeEntry; onOpen: () => void }) {
  const theme = useTheme();
  return (
    <Item
      accessibilityHint="Opens this folder"
      className="bg-card"
      onPress={onOpen}
      size="sm">
      <Item.Media variant="icon">
        <AppSymbol
          name={{ ios: 'folder.fill', android: 'folder', web: 'folder' }}
          size={16}
          tintColor={theme.textSecondary}
        />
      </Item.Media>
      <Item.Content>
        <Item.Title numberOfLines={1}>{entry.name}</Item.Title>
      </Item.Content>
      <Item.Actions>
        <AppSymbol
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={14}
          tintColor={theme.textTertiary}
        />
      </Item.Actions>
    </Item>
  );
}

/** The listing's own two states — a browse in flight, and a folder with no
 *  subdirectories in it. They share a shape because they share a slot. */
function DirectoryEmpty({ loading }: { loading: boolean }) {
  const theme = useTheme();
  return (
    <EmptyState size="sm">
      <EmptyState.Header>
        <EmptyState.Media variant="icon">
          {loading ? (
            <Spinner />
          ) : (
            <AppSymbol
              name={{ ios: 'folder', android: 'folder_open', web: 'folder_open' }}
              size={18}
              tintColor={theme.textTertiary}
            />
          )}
        </EmptyState.Media>
        <EmptyState.Title>{loading ? 'Loading folder…' : 'No folders here'}</EmptyState.Title>
      </EmptyState.Header>
    </EmptyState>
  );
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error && cause.message.trim() ? cause.message : String(cause);
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 52, paddingHorizontal: 8 },
  pathArea: { gap: 9, paddingHorizontal: Spacing.three, paddingTop: 13 },
  errorArea: { paddingHorizontal: Spacing.three, paddingTop: 11 },
  locations: { flexDirection: 'row', gap: 7 },
  list: { gap: 7, padding: Spacing.three, paddingBottom: 28 },
  emptyList: { flexGrow: 1 },
  footer: { alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, minHeight: 58, paddingHorizontal: Spacing.three },
});
