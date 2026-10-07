import type { ProviderKind } from '@waku/client';
import Constants from 'expo-constants';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { AppPressable } from '@/components/app-pressable';
import { Blocks } from '@/components/blocks';

import { AppSymbol } from '@/components/app-symbol';
import { ProviderIcon } from '@/components/provider-icon';
import { Sheet, SheetRow } from '@/components/sheet';
import { NativeTint, Radius, Spacing } from '@/constants/theme';
import {
  PROVIDERS,
  useDaemonSettings,
  useUpdateDaemonSettings,
} from '@/hooks/use-daemon-data';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/lib/theme-preference-context';
import { THEME_PREFERENCES, themePreferenceLabel } from '@/lib/theme-preference';
import {
  checkForUpdateCached,
  currentVersionCode,
  peekUpdateCheck,
  type AvailableUpdate,
} from '@/lib/app-update';
import {
  orderedProviderToggles,
  withComputerUse,
  withProviderDisabled,
} from '@/lib/daemon-settings';
import { tapHaptic } from '@/lib/haptics';
import { useDaemon } from '@/lib/daemon-context';
import { providerLabel } from '@/lib/session-presentation';

function UpdateRow() {
  const theme = useTheme();
  const [update, setUpdate] = useState<AvailableUpdate | null>(
    () => peekUpdateCheck() ?? null,
  );
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const version = Constants.expoConfig?.version ?? '';

  const check = useCallback(async () => {
    setChecking(true);
    setStatus(null);
    setFailed(false);
    // Reading the installed build number is inside the `try`: a build that
    // cannot report one must surface as "could not check" in this row, not
    // throw during render and take the whole Settings screen down.
    let current: number;
    try {
      current = currentVersionCode(Constants.expoConfig);
    } catch (cause) {
      setFailed(true);
      setStatus(cause instanceof Error ? cause.message : String(cause));
      setChecking(false);
      return;
    }
    try {
      const found = await checkForUpdateCached(fetch, current);
      setUpdate(found);
      if (!found) setStatus('Kerenzikov is up to date.');
    } catch (cause) {
      setFailed(true);
      setStatus(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // A recent answer renders straight away. Re-checking on every mount is
    // what made this row flash through a spinner each time Settings opened.
    const cached = peekUpdateCheck();
    if (cached === undefined) {
      void check();
    } else if (!cached) {
      setStatus('Kerenzikov is up to date.');
    }
  }, [check]);

  return (
    <>
      <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>Updates</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>Version</Text>
          <Text style={[styles.rowValue, { color: theme.textTertiary }]}>
            {version || '—'}
          </Text>
        </View>
        <View
          style={[
            styles.row,
            { borderTopColor: theme.separator, borderTopWidth: StyleSheet.hairlineWidth },
          ]}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>
            {update ? `Update to ${update.versionName}` : 'Updates'}
          </Text>
          {/* Nothing to act on when the build is current, so the row shows no
              button at all: an always-present "Check" both invited a pointless
              tap and flashed while it ran. A failed check still offers a retry,
              which is the one case the user has something to do about. */}
          {checking ? (
            <Blocks color={theme.accent} size={18} />
          ) : update ? (
            <AppPressable
              accessibilityRole="button"
              onPress={() => Linking.openURL(update.url).catch(() => {})}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: NativeTint, opacity: pressed ? 0.7 : 1 },
              ]}>
              <Text style={styles.actionLabel}>Download</Text>
            </AppPressable>
          ) : failed ? (
            <AppPressable
              accessibilityRole="button"
              onPress={() => void check()}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: theme.surfaceMuted, opacity: pressed ? 0.7 : 1 },
              ]}>
              <Text style={[styles.actionLabel, { color: theme.text }]}>Retry</Text>
            </AppPressable>
          ) : null}
        </View>
      </View>
      <Text style={[styles.footer, { color: theme.textTertiary }]}>
        {update
          ? update.notes ?? 'Downloads the new APK; Android asks you to confirm the install.'
          : status ?? 'Updates are installed by Android after you confirm.'}
      </Text>
    </>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const daemon = useDaemon();
  const { preference, setPreference } = useThemePreference();
  const settings = useDaemonSettings();
  const update = useUpdateDaemonSettings();
  const [localError, setLocalError] = useState<string | null>(null);
  const [colorModeOpen, setColorModeOpen] = useState(false);
  const toggles = orderedProviderToggles(settings.data, PROVIDERS);
  const pending = update.isPending;

  async function apply(next: Parameters<typeof update.mutateAsync>[0]) {
    setLocalError(null);
    try {
      await update.mutateAsync(next);
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function toggleProvider(provider: ProviderKind, disabled: boolean) {
    if (!settings.data) return;
    void apply(withProviderDisabled(settings.data, provider, disabled));
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* One row that opens a sheet, rather than three inline rows: the
              setting is a single choice, and the current value is what the row
              is for — the alternatives only matter while choosing. */}
          <AppPressable
            accessibilityLabel={`Color mode, ${themePreferenceLabel(preference)}`}
            accessibilityRole="button"
            onPress={() => setColorModeOpen(true)}
            style={({ pressed }) => [
              styles.row,
              pressed ? { backgroundColor: theme.surfaceMuted } : null,
            ]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Color mode</Text>
            <Text style={[styles.rowValue, { color: theme.textTertiary }]}>
              {themePreferenceLabel(preference)}
            </Text>
            <AppSymbol
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={13}
              tintColor={theme.textTertiary}
            />
          </AppPressable>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>Daemon</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Switching and adding both live on the Daemons screen, so this row
              only reports which daemon is connected and opens it. The current
              name is the value: a bare "Daemons" row hides the one fact that
              matters here. */}
          <AppPressable
            accessibilityLabel={`Daemon, ${daemon.activeProfile?.name ?? 'none'}`}
            accessibilityRole="button"
            onPress={() => router.push('/daemons')}
            style={({ pressed }) => [
              styles.row,
              pressed ? { backgroundColor: theme.surfaceMuted } : null,
            ]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Daemon</Text>
            <Text style={[styles.rowValue, { color: theme.textTertiary }]}>
              {daemon.activeProfile?.name ?? 'None'}
            </Text>
            <AppSymbol
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={13}
              tintColor={theme.textTertiary}
            />
          </AppPressable>
          <AppPressable
            accessibilityLabel="Add daemon"
            accessibilityRole="button"
            onPress={() => router.push('/daemon-editor')}
            style={({ pressed }) => [
              styles.row,
              { borderTopColor: theme.separator, borderTopWidth: StyleSheet.hairlineWidth },
              pressed ? { backgroundColor: theme.surfaceMuted } : null,
            ]}>
            <AppSymbol
              name={{ ios: 'plus', android: 'add', web: 'add' }}
              size={16}
              tintColor={theme.accent}
            />
            <Text style={[styles.rowLabel, { color: theme.text }]}>Add daemon</Text>
            <AppSymbol
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={13}
              tintColor={theme.textTertiary}
            />
          </AppPressable>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>Library</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppPressable
            accessibilityRole="button"
            onPress={() => router.push('/skills')}
            style={({ pressed }) => [
              styles.row,
              pressed ? { backgroundColor: theme.surfaceMuted } : null,
            ]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Skills</Text>
            <AppSymbol
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={13}
              tintColor={theme.textTertiary}
            />
          </AppPressable>
          {/* Usage is something you look at deliberately, not while working, so
              it belongs beside the other library screens rather than in the
              header of every task. */}
          <AppPressable
            accessibilityRole="button"
            onPress={() => router.push('/usage')}
            style={({ pressed }) => [
              styles.row,
              { borderTopColor: theme.separator, borderTopWidth: StyleSheet.hairlineWidth },
              pressed ? { backgroundColor: theme.surfaceMuted } : null,
            ]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Usage</Text>
            <AppSymbol
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={13}
              tintColor={theme.textTertiary}
            />
          </AppPressable>
        </View>

        {!settings.data ? (
          <View style={styles.loading}>
            <Blocks color={theme.accent} size={24} />
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>Agents</Text>
            <View
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {toggles.map(({ provider, disabled }, index) => (
                <View
                  key={provider}
                  style={[
                    styles.row,
                    index > 0 ? { borderTopColor: theme.separator, borderTopWidth: StyleSheet.hairlineWidth } : null,
                  ]}>
                  <ProviderIcon provider={provider} size={15} />
                  <Text style={[styles.rowLabel, { color: theme.text }]}>
                    {providerLabel(provider)}
                  </Text>
                  <Switch
                    accessibilityLabel={`${providerLabel(provider)} ${disabled ? 'disabled' : 'enabled'}`}
                    disabled={pending}
                    ios_backgroundColor={theme.overlayStrong}
                    thumbColor={theme.surface}
                    trackColor={{ false: theme.overlayStrong, true: NativeTint }}
                    value={!disabled}
                    onValueChange={(enabled) => toggleProvider(provider, !enabled)}
                  />
                </View>
              ))}
            </View>
            <Text style={[styles.footer, { color: theme.textTertiary }]}>
              A disabled agent disappears from the picker on every device, not just this one.
            </Text>

            <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>
              Computer use
            </Text>
            <View
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>
                  Allow the agent to drive the daemon host
                </Text>
                <Switch
                  accessibilityLabel="Computer use"
                  disabled={pending}
                  ios_backgroundColor={theme.overlayStrong}
                  thumbColor={theme.surface}
                  trackColor={{ false: theme.overlayStrong, true: NativeTint }}
                  value={settings.data.computer_use_enabled}
                  onValueChange={(enabled) => void apply(withComputerUse(settings.data!, enabled))}
                />
              </View>
            </View>
            <Text style={[styles.footer, { color: theme.textTertiary }]}>
              Computer use runs on the daemon host. Which apps it may drive is managed from the
              desktop.
            </Text>
          </>
        )}

        {localError ? (
          <Text style={[styles.error, { color: theme.danger }]}>{localError}</Text>
        ) : null}

        {Platform.OS === 'android' ? <UpdateRow /> : null}

        <Text style={[styles.footer, { color: theme.textGhost }]}>
          Settings are stored on the daemon and shared by every connected device.
        </Text>
      </ScrollView>

      <Sheet
        onDismiss={() => setColorModeOpen(false)}
        title="Color mode"
        visible={colorModeOpen}>
        {THEME_PREFERENCES.map((option) => (
          <SheetRow
            key={option}
            label={themePreferenceLabel(option)}
            onPress={() => {
              tapHaptic();
              setPreference(option);
              setColorModeOpen(false);
            }}
            selected={preference === option}
          />
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 36, paddingHorizontal: Spacing.three },
  loading: { paddingTop: 60 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    paddingHorizontal: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 7,
    marginLeft: 12,
    marginTop: 18,
    textTransform: 'uppercase',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
  },
  rowLabel: { flex: 1, fontSize: 15.5 },
  rowValue: { fontSize: 15.5 },
  action: { borderRadius: Radius.small, paddingHorizontal: 12, paddingVertical: 6 },
  actionLabel: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  footer: { fontSize: 12, lineHeight: 17, marginLeft: 12, marginTop: 8 },
  error: { fontSize: 12.5, lineHeight: 17, marginLeft: 12, marginTop: 12 },
});
