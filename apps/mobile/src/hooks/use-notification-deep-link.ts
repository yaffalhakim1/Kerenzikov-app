import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { notificationSessionId } from '@/lib/notification-deep-link';

/**
 * Opens the task a notification was about when the user taps it. The daemon
 * attaches the session id to each push; this navigates to the app's
 * `/session/[id]` route, both for taps that launch the app from cold (the
 * "last response") and taps while it is already running.
 */
export function useNotificationDeepLink(): void {
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      const sessionId = notificationSessionId(
        response?.notification.request.content.data as Record<string, unknown> | undefined,
      );
      if (!sessionId) return;
      router.navigate({ pathname: '/session/[id]', params: { id: sessionId } });
    };

    // Cold start: the tap that launched the app.
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}
