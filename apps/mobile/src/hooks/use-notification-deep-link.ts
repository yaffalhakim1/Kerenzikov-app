import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { notificationDeepLink } from '@/lib/notification-deep-link';

/**
 * Opens the task a notification was about when the user taps it. The daemon
 * attaches a `waku://task/<id>` URL to each push; this turns that into a
 * router navigation, both for taps that launch the app from cold (the
 * "last response") and taps while it is already running.
 */
export function useNotificationDeepLink(): void {
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      const url = notificationDeepLink(
        response?.notification.request.content.data as Record<string, unknown> | undefined,
      );
      if (url) router.navigate(url as never);
    };

    // Cold start: the tap that launched the app.
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}
