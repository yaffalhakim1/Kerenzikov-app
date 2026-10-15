import { router } from 'expo-router';
import { Alert } from 'panelui-native/components/alert';
import { Button } from 'panelui-native/components/button';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppSymbol } from '@/components/app-symbol';
import { Blocks } from '@/components/blocks';
import { Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { useDaemon } from '@/lib/daemon-context';

/** How long a dropped connection may stay quiet before it is announced; the
 * immediate retry usually lands well within this. */
const OUTAGE_GRACE_MS = 3_000;
/** How long the restored confirmation stays. */
const RESTORED_MS = 2_500;

export type ConnectionNotice =
  | {
      kind: 'reconnecting';
      title: string;
      detail: string | null;
      /** An attempt is in flight right now. */
      attempting: boolean;
    }
  | { kind: 'error'; title: string; detail: string }
  | { kind: 'restored'; title: string };

/**
 * What the connection banner should say, or null when the link needs no
 * words. An interrupted connection gets a grace period before it is
 * announced, so a blip the immediate retry heals never shows; a daemon that
 * has not been reached at all is announced at once, since nothing else on
 * screen explains the wait. A restored confirmation follows only a notice
 * that was actually on screen.
 */
export function useConnectionNotice(): ConnectionNotice | null {
  const daemon = useDaemon();
  const name = daemon.activeProfile?.name ?? 'the daemon';
  const outage = daemon.phase === 'reconnecting' ? daemon.outage : null;
  const [restoredUntil, setRestoredUntil] = useState<number | null>(null);
  const shown = useRef(false);

  const now = Date.now();
  const announceAt = outage ? outage.since + (outage.interrupted ? OUTAGE_GRACE_MS : 0) : null;
  const visibleOutage = outage !== null && announceAt !== null && now >= announceAt;
  const countdown = visibleOutage && outage.nextRetryAt !== null;
  useWakeups(countdown ? 1_000 : null, [
    announceAt !== null && now < announceAt ? announceAt : null,
    restoredUntil,
  ]);

  useEffect(() => {
    if (daemon.phase === 'error' || visibleOutage) {
      shown.current = true;
    } else if (daemon.phase === 'connected') {
      if (shown.current) {
        shown.current = false;
        setRestoredUntil(Date.now() + RESTORED_MS);
      }
    } else if (daemon.phase !== 'reconnecting') {
      // A fresh selection or a manual disconnect owes nobody a confirmation.
      shown.current = false;
    }
  }, [daemon.phase, visibleOutage]);

  if (daemon.phase === 'error') {
    return {
      kind: 'error',
      title: `Can’t connect to ${name}`,
      detail: daemon.error ?? 'Something went wrong.',
    };
  }
  if (visibleOutage) {
    const attempting = outage.nextRetryAt === null;
    const seconds = attempting ? 0 : Math.max(1, Math.ceil((outage.nextRetryAt! - now) / 1_000));
    const progress = attempting
      ? outage.attempts === 0 ? null : 'Trying again…'
      : `Retrying in ${seconds}s`;
    const reason = outage.attempts > 0 ? outage.reason : null;
    return {
      kind: 'reconnecting',
      title: outage.interrupted ? `Reconnecting to ${name}…` : `Can’t reach ${name}`,
      detail: [progress, reason].filter(Boolean).join(' · ') || null,
      attempting,
    };
  }
  if (daemon.phase === 'connected' && restoredUntil !== null && now < restoredUntil) {
    return { kind: 'restored', title: `Reconnected to ${name}` };
  }
  return null;
}

/** Re-renders on an interval while one is set, otherwise once at the
 * earliest future moment given, so timed copy updates without polling. */
function useWakeups(intervalMs: number | null, moments: Array<number | null>): void {
  const [, setTick] = useState(0);
  const current = Date.now();
  let nextWake: number | null = null;
  for (const moment of moments) {
    if (moment === null || moment <= current) continue;
    if (nextWake === null || moment < nextWake) nextWake = moment;
  }
  useEffect(() => {
    if (intervalMs !== null) {
      const timer = setInterval(() => setTick((tick) => tick + 1), intervalMs);
      return () => clearInterval(timer);
    }
    if (nextWake === null) return;
    const timer = setTimeout(() => setTick((tick) => tick + 1), Math.max(0, nextWake - Date.now()));
    return () => clearTimeout(timer);
  }, [intervalMs, nextWake]);
}

/**
 * The connection's state of health, wherever a screen needs to explain a
 * stalled daemon: reconnecting progress with a way to retry now, a hard
 * failure with a way to fix the connection, and a brief confirmation once
 * the link is back. Inline it sits in a list; floating it hovers over
 * content on an opaque surface.
 */
export function ConnectionBanner({ floating = false }: { floating?: boolean }) {
  const notice = useConnectionNotice();
  if (!notice) return null;
  return <NoticeCard floating={floating} notice={notice} />;
}

/**
 * The PanelUI variant each state wears. An interrupted link is a warning, a
 * daemon that cannot be reached at all is a failure, and a restored one is a
 * success. A floating banner takes `default` instead of its state's variant:
 * it hovers over the transcript, and only `default`'s opaque surface keeps the
 * text underneath from reading through a 10% status tint. The state is still
 * carried by the icon's colour, which is how the floating banner read before.
 */
function alertVariant(
  notice: ConnectionNotice,
): 'default' | 'success' | 'warning' | 'destructive' {
  switch (notice.kind) {
    case 'error':
      return 'destructive';
    case 'restored':
      return 'success';
    default:
      return 'warning';
  }
}

function NoticeCard({ floating, notice }: { floating: boolean; notice: ConnectionNotice }) {
  const theme = useTheme();
  const daemon = useDaemon();
  const reducedMotion = useReducedMotion();

  const tint = notice.kind === 'error'
    ? theme.danger
    : notice.kind === 'restored' ? theme.success : theme.warning;
  const detail = notice.kind === 'restored' ? null : notice.detail;

  return (
    // The entrance is Reanimated's, not the core `Animated` this used to fade
    // through: the two do not compose, and core `Animated` puts the work back
    // on the JS thread, which is the one thing a banner appearing mid-scroll
    // cannot afford. Inline margins live here rather than on the Alert, whose
    // own `w-full` would push a horizontal margin past its parent's edge.
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(160)}
      style={floating ? undefined : styles.inline}>
      <Alert
        accessibilityLiveRegion="polite"
        variant={floating ? 'default' : alertVariant(notice)}>
        <Alert.Indicator>
          {notice.kind === 'reconnecting' && notice.attempting ? (
            <Blocks color={tint} />
          ) : (
            <AppSymbol name={noticeIcon(notice)} tintColor={tint} />
          )}
        </Alert.Indicator>
        <Alert.Content>
          <Alert.Title>{notice.title}</Alert.Title>
          {detail ? <Alert.Description>{detail}</Alert.Description> : null}
        </Alert.Content>
        {notice.kind === 'reconnecting' && (
          <Button
            accessibilityLabel="Retry daemon connection now"
            className="self-center"
            disabled={notice.attempting}
            onPress={() => void daemon.reconnect()}
            size="sm"
            variant="ghost">
            Retry now
          </Button>
        )}
        {notice.kind === 'error' && (
          <>
            <Button
              accessibilityLabel="Retry daemon connection"
              className="self-center"
              onPress={() => void daemon.reconnect()}
              size="sm"
              variant="ghost">
              Retry
            </Button>
            {daemon.activeProfile && (
              <Button
                accessibilityLabel="Edit daemon connection"
                className="self-center"
                onPress={() => router.push({
                  pathname: '/daemon-editor',
                  params: { id: daemon.activeProfile!.id },
                })}
                size="sm"
                variant="ghost">
                Edit
              </Button>
            )}
          </>
        )}
      </Alert>
    </Animated.View>
  );
}

function noticeIcon(notice: ConnectionNotice): Parameters<typeof AppSymbol>[0]['name'] {
  switch (notice.kind) {
    case 'error':
      return { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' };
    case 'restored':
      return { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' };
    default:
      return { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' };
  }
}

const styles = StyleSheet.create({
  inline: {
    marginBottom: 10,
    marginHorizontal: Spacing.three,
  },
});
