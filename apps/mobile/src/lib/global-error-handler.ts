import { Platform } from 'react-native';

import { flushNow, recordError } from './error-log';

/**
 * `ErrorUtils` is installed by React Native as a **global**, not exported from
 * the package — importing it yields a value that is always `undefined`, and
 * the handler would silently never be installed.
 */
declare const ErrorUtils:
  | {
      getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void;
      setGlobalHandler: (
        callback: (error: unknown, isFatal?: boolean) => void,
      ) => void;
    }
  | undefined;

/**
 * Catch the errors React's boundary cannot.
 *
 * The route `ErrorBoundary` only sees errors thrown while rendering. Anything
 * thrown from a native callback, a timer, an unawaited promise, or a Reanimated
 * worklet never reaches React's tree at all — it reaches `ErrorUtils`, which
 * React Native installs as the global handler. Those are exactly the failures
 * that leave no trace in a release build, so they are recorded here too.
 *
 * The previous handler is preserved and still called. This is an observer, not
 * a replacement: swallowing the error after logging it would turn a crash into
 * a silent hang, which is worse than the crash.
 */
export function installGlobalErrorLogging(): void {
  try {
    if (typeof ErrorUtils === 'undefined') return;
    const previous = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      recordError(error, {
        scope: 'global',
        // `isFatal` is the difference between a screen that broke and a
        // process that is about to die, and it is not in the stack. The
        // platform is here rather than in the logger because that module stays
        // free of `react-native` so it can be unit-tested.
        extra: { isFatal: Boolean(isFatal), platform: Platform.OS },
      });
      // A fatal error kills the process before the flush timer fires, so this
      // is the last chance for the entry to reach the disk.
      flushNow();
      previous?.(error, isFatal);
    });
  } catch {
    // A logger that breaks startup is worse than no logger.
  }
}

/**
 * Record a promise rejection that nothing handled.
 *
 * React Native reports these to `ErrorUtils` on some platforms and not others,
 * so this is wired explicitly rather than assumed. A rejection with no handler
 * is usually a network or daemon call that failed off the render path — the
 * kind of thing that is invisible until it is written down.
 */
export function installUnhandledRejectionLogging(): void {
  try {
    const tracking = require('promise/setimmediate/rejection-tracking') as {
      enable: (options: {
        allRejections: boolean;
        onUnhandled: (id: string, error: unknown) => void;
        onHandled: () => void;
      }) => void;
    };
    tracking.enable({
      allRejections: true,
      onHandled: () => {},
      onUnhandled: (_id, error) => {
        recordError(error, { scope: 'unhandledRejection', level: 'warn' });
        flushNow();
      },
    });
  } catch {
    // The tracker is a bundled polyfill and can be absent; nothing to do.
  }
}
