import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { projectIdFor } from './push-project-id';

/**
 * Android push setup for the daemon's turn-finished/permission notices.
 *
 * The phone cannot keep its WebSocket alive in the background — the OS
 * suspends it — so instead the daemon reaches it through Expo's push service
 * (FCM on Android). This module owns the client half: request permission,
 * obtain the device's Expo push token, and hand it to `daemon-context` to
 * register with the daemon. Nothing here sends a push; that is the daemon's
 * job in `crates/waku-core/src/push.rs`.
 */

const ANDROID_CHANNEL_ID = 'task-events';

/**
 * A notification token, or null when this device cannot receive one: a
 * simulator/emulator without Play services, a user who declined permission,
 * or an Expo project with no push credentials configured.
 */
export type PushToken = {
  token: string;
  platform: 'android' | 'ios';
} | null;

/**
 * Asks for notification permission and returns the Expo push token.
 *
 * Every failure is a silent null rather than a throw: notifications are a
 * convenience, and a device that cannot receive them must still run the app.
 * The daemon simply never gets a registration and sends nothing.
 */
export async function getPushToken(): Promise<PushToken> {
  if (!Device.isDevice) return null;
  if (!(await ensurePermission())) return null;

  const projectId = projectIdFor(Constants.expoConfig?.extra);
  try {
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return { token: token.data, platform: Platform.OS === 'android' ? 'android' : 'ios' };
  } catch {
    // No push credentials on the Expo project, or FCM rejected the token
    // request. The app remains usable; only notifications are unavailable.
    return null;
  }
}

let cached: Promise<PushToken> | null = null;

/**
 * [`getPushToken`] fetched at most once per app launch. Reconnecting must not
 * re-ask the OS or re-hit FCM; the token does not change while the app runs.
 */
export function cachedPushToken(): Promise<PushToken> {
  cached ??= getPushToken();
  return cached;
}

/**
 * Shows notifications while the app is in the foreground too. Without this a
 * push that arrives as the user opens the app is swallowed — the daemon only
 * sends to backgrounded devices, but the app can foreground between the
 * daemon's decision and FCM's delivery.
 */
export function showNotificationsInForeground(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * The channel Android groups these notifications under. Created once at
 * startup; without a channel Android 8+ drops programmatic notifications.
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Task events',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

/** The notification channel a delivered push uses, or undefined off Android. */
export function androidChannelId(): string | undefined {
  return Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined;
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}
